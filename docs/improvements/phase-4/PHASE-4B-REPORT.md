# Phase 4B — Performance Optimization

Tanggal: **16 Oktober 2026, Asia/Jakarta**. Implementasi dan verifikasi lokal selesai pada working tree yang mencakup perubahan fase sebelumnya. Dua indeks PostgreSQL dipertahankan setelah profiling dan perbandingan terkontrol membuktikan peningkatan dashboard serta workload campuran.

**Dashboard p95 turun 60,6%: 56,45 → 22,23 ms; throughput naik 325,0 → 901,1 req/s.** Mixed workload p95 turun 13,4%, throughput naik 21,8%. Seluruh **29.600 request pengukuran berhasil**. Ini hasil fixture lokal, bukan kapasitas atau SLA production.

## Bottleneck dan implementasi

Profiling memakai `pg_stat_statements`, telemetry Phase 4A, serta lima `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` per query. Pada 600 dashboard requests awal, query recent-content menghabiskan sekitar 11 detik total waktu DB dan published-count sekitar 4 detik. Query berjalan bersamaan; total waktu DB berbeda dari elapsed time workload.

| Query                                      | Median DB baseline hangat | Optimized | Plan / shared-hit blocks                                              |
| ------------------------------------------ | ------------------------: | --------: | --------------------------------------------------------------------- |
| Tenant + `ORDER BY updatedAt DESC LIMIT 8` |                 12,359 ms |  0,091 ms | Sequential scan + top-N sort → backward index scan; 3.348 → 11 blocks |
| Published count per tenant                 |                  9,060 ms |  0,472 ms | Sequential scan → index-only scan; 3.345 → 28 blocks                  |

`Content` mendapat indeks `(tenantId, updatedAt)` dan `(tenantId, status)`, dicatat dalam Prisma schema dan **dua migration additive**, satu `CREATE INDEX CONCURRENTLY` per file. Ukuran saat pemasangan pertama pada 80.025 konten masing-masing **5.447.680** dan **606.208 byte**, sekitar **5,77 MiB** total. Indeks updatedAt menambah biaya setiap update, storage, WAL dan vacuum; overhead jangka panjang belum diukur.

Kontrak JSON, pagination, otorisasi, cache invalidation, kuota export dan format archive tetap sama. Media-list/audit-list sudah menggunakan indeks existing dengan waktu DB sekitar 0,1 ms pada fixture; tidak ditambahkan indeks untuk keduanya. Bukti: [baseline hangat](evidence/phase-4b/profile-baseline-warm.json), [optimized](evidence/phase-4b/profile-optimized.json), [comparison](evidence/phase-4b/comparison.json).

## Metode dan environment

- Windows, Intel i5-13450HX, 16 logical CPU, sekitar 12 GiB RAM host. Load generator Node 22.18.0; API production-mode Node 24.22.0, NestJS 11.2.7, Prisma 5.22.0.
- PostgreSQL 15.19 di Docker tmpfs; shared buffers 128 MiB, work_mem 4 MiB. Redis 7 dan RabbitMQ terpisah. Satu API/embedded worker, pool Prisma 10 koneksi, telemetry aktif.
- Project baru `atlas-phase4b-2eb6875e73`, database baru, runtime restricted `atlas_app`; port API/management acak hanya loopback. DB/Redis/broker tidak dipublish. Owner hanya untuk fixture/migration; grants runtime diverifikasi sebelum/sesudah indeks.
- Empat tenant besar masing-masing memiliki 20.000 konten HTML sekitar 2 KiB, 25% published, 20 kategori, 2.000 metadata media dan 25.000 audit rows. Tenant kelima mempunyai 25 konten sebagai kontrol bentuk benchmark historis. Satu admin sintetis menjadi anggota kelima tenant.
- Urutan **A1 → B1 → B2 → A2**, dua round per block. A tanpa kedua indeks kandidat; B dengan keduanya. Image/proses API/pool/dataset pokok/concurrency/jumlah request sama. Sebelum setiap block: 100 dashboard/content reads untuk warmup.
- Perbandingan utama **A2 (`baseline-b`) vs B2 (`optimized-b`)**. A1 dipertahankan tetapi dikeluarkan dari klaim: kontrol cache hangat yang tidak memakai query kandidat juga jauh lebih cepat setelah warmup awal. A2 kembali ke dashboard p95 56–57 ms, sedangkan B1/B2 sekitar 21–25 ms.
- Percentile berasal dari gabungan raw latency dua round dengan jumlah request sama; throughput = total request / total elapsed load time. Timing client mencakup body read, JSON decode dan assertion. Angka per round tersedia dalam evidence.

`cold` berarti **response cache Redis dingin, buffer PostgreSQL hangat**. Revision dinaikkan sebelum cold workload; 100 URL halaman berbeda per tenant memastikan miss. Cache/Prisma metrics delta, normalized statement stats, API CPU/RSS dan event-loop samples disimpan. Prisma duration mencakup antrean client, bukan pool-wait terpisah.

Telemetry mengonfirmasi 100% hit pada kontrol 25-record dan 100% miss pada cold workload. Multi-tenant warm mempunyai hit rate **99,10% baseline / 98,75% optimized**; round kedua mengisi ulang cache setelah invalidation dari mixed round sebelumnya. Ini kontrol yang mayoritas hangat, bukan cache hit sempurna.

## Hasil HTTP steady state

N = request per arm dalam dua round; C = concurrency. Semua arm memiliki nol failure.

| Workload                         |      N / C | p50 sebelum → sesudah (ms) |          p95 (ms) |      p99 (ms) |             Req/s |
| -------------------------------- | ---------: | -------------------------: | ----------------: | ------------: | ----------------: |
| 25-record warm control           | 2.000 / 25 |              22,20 → 23,16 |     36,33 → 33,35 | 50,59 → 41,53 | 1.034,2 → 1.034,6 |
| Multi-tenant warm summary        | 2.000 / 25 |              17,04 → 17,70 |     25,16 → 24,71 | 28,04 → 30,67 | 1.421,6 → 1.384,5 |
| Multi-tenant cold response cache |   800 / 16 |              22,08 → 21,44 |     27,91 → 26,00 | 30,89 → 29,34 |     710,9 → 732,5 |
| Dashboard                        | 1.200 / 16 |              48,45 → 17,23 | **56,45 → 22,23** | 62,31 → 26,32 | **325,0 → 901,1** |
| Mixed read/write                 | 1.000 / 16 |              26,05 → 17,13 | **36,10 → 31,27** | 41,47 → 37,58 | **641,9 → 782,0** |
| Authenticated media read         |    400 / 8 |                6,01 → 6,64 |   **8,80 → 9,80** | 12,36 → 16,05 | 1.254,6 → 1.128,2 |

Mixed terdiri dari 20% PATCH konten dan masing-masing 20% dashboard, media-list, audit-list, content-list. PATCH mengubah updatedAt, menulis audit dan menginvalidasi cache setelah commit; nilai status diulang sehingga distribusi published tetap sama. Dataset pokok tidak bertambah; audit hasil PATCH dan versi baris bertambah sepanjang percobaan.

p95 PATCH dua round: **36,73 / 34,66 ms** baseline vs **33,45 / 34,47 ms** optimized. Tidak terlihat regresi penulisan pada sampel ini; bukan bukti overhead indeks nol pada bulk import. CPU API dashboard turun **6,34 → 4,31 ms/request**. Sample RSS sekitar **314–323 MiB** pada proses yang sama; tidak diklaim sebagai penghematan memory.

Media p95 naik sekitar **1 ms**, throughput turun 10,1%. Query ini tidak menggunakan indeks Content baru; variasi kontrol tetap dilaporkan. Kontrol cache hangat relatif tetap. Manfaat yang dipertahankan adalah dashboard/mixed, didukung perubahan query plan.

## Correctness dan validasi

- **193 unit tests / 25 suites**, coverage thresholds existing tetap lulus. Lint API, typecheck API, local API build dan Prisma validation lulus.
- **26 integration / 19 API E2E** lulus pada stack test baru terpisah. Evidence baru dipindahkan dari output default runner Phase 4A; laporan historis tidak diubah.
- Counts/urutan delapan recent IDs pada empat tenant dibandingkan dengan SQL independen; published filter dan summary projection benar. Konten/media tenant lain menghasilkan 404 meskipun actor menjadi anggota kedua tenant.
- Semua migration berhasil pada **database kosong tambahan**, repeated deploy lulus dan kedua indeks valid. Restricted runtime grants tetap sesuai.
- Enam export nyata, tiga sebelum/tiga sesudah, masing-masing **25.000 rows** pada tanggal tetap. ZIP didekompresi, nama entry/ukuran diperiksa, semua row harus milik tenant dan seluruh 25.000 ID harus unik. Penyelesaian sekitar 1,33–1,46 detik dengan polling 250 ms; tidak ada klaim optimasi export.
- Fixture dihentikan, volume retained, identitas/status container existing sama. Retention destructive tetap nonaktif.

Lihat [validation summary](evidence/phase-4b/validation-summary.json), [correctness](evidence/phase-4b/correctness.json), dan [preservation](evidence/phase-4b/preservation-2eb6875e73.json).

## Reproduksi, rollout dan rollback

[Evidence README](evidence/phase-4b/README.md) memuat command lengkap. Runner membuat project/DB sendiri dan memverifikasi container ID/label, tmpfs, named volumes, port loopback serta seluruh emitted JS terhadap build lokal. Secret berada di temporary directory; pointer lokal di `artifacts/benchmark` yang diabaikan Git. Direktori/label baru mencegah hasil lama tertimpa.

Operator menerapkan kedua migration dengan credential owner melalui pipeline existing; aplikasi tetap `atlas_app`. Jangan membungkus concurrent migration ini dengan transaction. Periksa disk/IO sebelum build dan `pg_index.indisvalid` sesudahnya. Pemasangan lokal sekitar 2,2 detik tidak memperkirakan durasi production.

Jika concurrent build gagal, periksa indeks/migration pada target teridentifikasi. Hapus hanya indeks invalid milik migration tersebut secara concurrent, tandai **migration gagal saja** sebagai rolled back melalui Prisma, lalu retry. `IF NOT EXISTS` tidak dipakai karena dapat menyembunyikan indeks invalid. Pemulihan migration dalam pekerjaan ini hanya pada fixture.

Rollback optimasi: operator melepas kedua indeks baru secara concurrent saat diizinkan; aplikasi tetap kompatibel dan data tetap tersedia. Sesuaikan schema/bookkeeping lewat prosedur migration lanjutan yang direview sebelum deploy selanjutnya. Jangan edit migration yang telah diterapkan. Tidak ada rollout staging/production pada pekerjaan ini.

## Batas hasil dan attempt gagal

Dataset ini mewakili beberapa alur operasional tanpa production traffic trace. Tenant berukuran sama, body kompresibel, load closed-loop singkat tanpa coordinated-omission correction, DB tmpfs. Tidak diukur: UI browser/WAN, scale-out, storage saturation, foto besar atau index bloat jangka panjang. Media-read memakai satu PNG solid-colour 1280×720 yang diunggah/disanitasi sungguhan; row media lain hanya metadata list/count. Kontrol 25 konten memakai body 2 KiB sehingga tidak byte-equivalent dengan smoke historis; jangan menghitung peningkatan terhadap angka 12 Oktober.

Dua preflight menolak tmpfs bernilai kosong dan volume anonim bawaan image; fixture dihentikan dan guard diperbaiki memakai pemeriksaan keberadaan mount/named volumes. Satu setup menunggu fetch tanpa deadline; runner dihentikan lalu fixture yang sama dilanjutkan dengan timeout. Upload awal gagal pada koneksi idle setelah seed sinkron, lalu tahap fixture berhasil sebelum pengukuran. Runner kini memberi event loop kesempatan memproses socket-close setelah Docker/psql sinkron.

Migration awal berisi dua concurrent statements dalam satu file dan gagal **25001/P3018** pada Prisma 5.22.0. Migration belum dirilis; perbaikan memisahkannya menjadi satu statement per migration, lalu diuji pada fixture dan database kosong. Failure evidence dipertahankan.

Build baseline baru gagal `ECONNRESET` dari registry npm. Benchmark memakai image lokal `sha256:43d8ad230b4f9c12ac6d891f1308d6e0e9e0b383ada86d5a1e3882e1ea7decf5`: 116 hash source/config awal identik dengan snapshot pembentuk image, dan **105 emitted JS files** cocok dengan build working tree setelah normalisasi CRLF. Migration Phase 4B diuji dari source lewat bind mount read-only. Status build image final dicatat terpisah pada validation summary; ini tidak menjadi klaim publish registry/remote CI.

Percobaan build image final `atlas-api:phase4b` juga berhenti berprogres pada `npm ci`; client build milik tugas dihentikan setelah lebih dari lima menit. **Fresh Docker image build belum terverifikasi.** Local API build, kesetaraan kode image benchmark, migration dan tes regresi telah lulus; image release final masih perlu dibangun saat registry dapat diakses.

Metode indeks dikonfirmasi melalui Context7 pada [Prisma: improving query performance using indexes](https://www.prisma.io/blog/improving-query-performance-using-indexes-2-MyoiJNMFTsfq). Perilaku migration diverifikasi dengan **Prisma 5.22.0** terpasang, karena dokumentasi terbaru dapat membahas generasi migration berbeda.
