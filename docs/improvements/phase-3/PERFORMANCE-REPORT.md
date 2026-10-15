# Phase 3D — Performance verification

Tanggal: 14 Oktober 2026 (Asia/Jakarta). **Tidak ada optimasi aplikasi atau perbandingan before/after baru.** Laporan ini membedakan benchmark HTTP historis, microbenchmark validator aktual, dan pekerjaan yang belum terverifikasi. Keputusan keseluruhan: [PHASE-3D-VERIFICATION.md](PHASE-3D-VERIFICATION.md).

## HTTP baseline: historis, tidak dijalankan ulang

Sumber: [benchmark.json](../../../artifacts/benchmark/benchmark.json), diukur 12 Oktober 2026. Windows/Node 22.18.0/i5-13450HX, satu tenant, 25 records, warm Redis cache, authenticated `GET /api/contents?page=1&take=20`.

| Metrik                                     |          Phase 2 historis | Phase 3D      |
| ------------------------------------------ | ------------------------: | ------------- |
| Requests / concurrency                     |                1.000 / 25 | Tidak diulang |
| p50 / p95 / p99                            | 37,81 / 78,73 / 210,71 ms | Belum terukur |
| Throughput                                 |                 556 req/s | Belum terukur |
| Errors                                     |                   0/1.000 | Belum terukur |
| CPU / memory API dan worker                |            Tidak tercatat | Belum terukur |
| Query latency / cache hit rate             |            Tidak tercatat | Belum terukur |
| Large dataset / mixed writes / export load |            Tidak tercakup | Belum terukur |

Health probe fixture port 4400 gagal dengan **ECONNREFUSED**. Docker yang aktif hanya stack development existing. Tidak menjalankan benchmark yang membuat akun/tenant/content pada stack tersebut, tidak mengubah port guard, dan tidak menimpa artefak benchmark historis. [Runtime-target evidence](evidence/phase-3d/runtime-target.json) mencatat hasil read-only.

## Media microbenchmark aktual

[Harness](evidence/phase-3d/media-benchmark.cjs), [hasil JSON](evidence/phase-3d/media-benchmark.json). Validator `validateUpload` dan Sharp **0.35.5** aktual; Windows, Node **22.18.0**, Intel Core **i5-13450HX**, 16 logical CPU. Tidak memakai server/database/filesystem vault/network.

Setiap kombinasi memakai proses Node baru, fixture RGB tiled gradient/XOR deterministik, dua warmups dan 12 operasi terukur. Concurrency 1 dan 4 diuji **sebagai workload berbeda**, bukan versi sebelum/sesudah optimasi. Semua dimensi output tetap sama dengan input; re-encode tidak menghasilkan thumbnail. Sharp concurrency aktual 16; konfigurasi aplikasi tidak diubah.

| Fixture        | Concurrent |   Input → output byte | p50 ms | p95 ms | p99 ms | Operasi/s | Gagal |
| -------------- | ---------: | --------------------: | -----: | -----: | -----: | --------: | ----: |
| JPEG 512×512   |          1 |       11.634 → 12.410 |   4,19 |   6,03 |   6,03 |    227,58 |  0/12 |
| JPEG 512×512   |          4 |       11.634 → 12.410 |   7,07 |  11,00 |  11,00 |    487,78 |  0/12 |
| PNG 2048×2048  |          1 | 1.597.964 → 1.597.964 |  28,41 |  30,73 |  30,73 |     34,83 |  0/12 |
| PNG 2048×2048  |          4 | 1.597.964 → 1.597.964 |  45,69 |  50,05 |  50,05 |     85,19 |  0/12 |
| JPEG 4000×4000 |          1 |     693.435 → 755.008 |  82,03 |  86,45 |  86,45 |     12,32 |  0/12 |
| JPEG 4000×4000 |          4 |     693.435 → 755.008 | 162,57 | 178,11 | 178,11 |     23,96 |  0/12 |

| Fixture / concurrency | CPU total ms | CPU ekuivalen satu core | RSS awal MiB | Peak sampled RSS MiB |
| --------------------- | -----------: | ----------------------: | -----------: | -------------------: |
| JPEG 512 / 1          |           63 |                 119,48% |        91,97 |                94,18 |
| JPEG 512 / 4          |           16 |                  65,04% |        95,80 |               106,46 |
| PNG 2048 / 1          |          735 |                 213,31% |       111,48 |               147,79 |
| PNG 2048 / 4          |          797 |                 565,82% |       111,46 |               200,45 |
| JPEG 4000 / 1         |        1.766 |                 181,38% |       144,54 |               268,31 |
| JPEG 4000 / 4         |        3.358 |                 670,56% |       144,43 |               630,38 |

CPU adalah selisih `process.cpuUsage()` seluruh thread dibagi wall time; angka >100% berarti penggunaan beberapa core, bukan persentase seluruh host. Run JPEG kecil hanya puluhan ms, sehingga resolusi pengukuran CPU sangat berpengaruh; angka tersebut tidak cukup untuk menyimpulkan efisiensi concurrency.

RSS mencakup runtime/ts-node, raw fixture (sekitar 45,8 MiB untuk 4000² RGB), buffer input/output, native allocations dan cache libvips. Sampling 10 ms ditambah akhir operasi dapat melewatkan peak; `lifetimeMaxRssKiB` juga disimpan, tetapi termasuk setup/warmup. Ini **bukan** delta memori validator murni, profil heap, memory leak, atau hasil container API. Satu raw fixture digunakan oleh operasi concurrent dalam tiap proses.

Dataset sangat sintetis/kompresibel, bukan corpus foto pengguna. p95 dan p99 sama dengan maksimum karena hanya 12 sampel per kondisi; bukan estimasi tail stabil. Tidak ada pengukuran upload Multer, encryption/storage, download, PDF/animasi, auth, queue wait, Redis/RabbitMQ, SQL, atau browser. Re-encode juga bisa memperbesar byte seperti JPEG di atas; fungsi ini melakukan validasi, bukan jaminan penghematan bandwidth. Total **72 sukses, 0 gagal**, tanpa perbandingan improvement.

## Pemeriksaan source: yang sudah ada dan batas bukti

| Area               | Hasil inspeksi                                                                            | Batas                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Tenant indexes     | Schema/migration memiliki `[tenantId, createdAt]` pada Content, AuditLog, Media           | EXPLAIN historis fixture kecil; query plan/dataset besar belum diukur ulang                      |
| Content list       | Count + bounded findMany, relation select; dashboard meminta summary tanpa body           | SQL query count/N+1 belum diinstrumentasi; dua pemanggilan Prisma bukan jaminan tepat dua SQL    |
| Media list         | Tenant filter, default 50/max 100, urutan createdAt/id, pagination di UI                  | Offset besar dan filter representatif belum diukur; bound row hasil tidak membatasi biaya scan   |
| Content pagination | Take max 100, offset pagination, sort createdAt                                           | Belum ada tie-break id pada content; stabilitas saat timestamps sama/concurrent writes perlu tes |
| Cache              | Tenant revision + URL key, TTL 60 detik; revision sesudah mutasi commit                   | Hit/miss/cold latency belum diukur; cache hit tetap melewati guard/membership                    |
| RBAC invalidation  | `RedisService.clearUserRbacCache` masih memakai `KEYS`                                    | Cardinality/latency belum diukur; nilai SCAN/invalidation alternatif setelah profiling           |
| Media              | Input bounded, decode/re-encode, encrypted vault, private no-store, gallery/picker lazy   | Tidak ada thumbnail; list view eager; API buffered read termasuk legacy                          |
| Export             | Cursor batch 500, backpressure stream, batas 100.000 rows/200 MiB/5 menit, RMQ prefetch 1 | Tidak ada export under load/worker CPU-RSS baru; worker berbagi proses API                       |
| Resource budgets   | Compose production tidak menetapkan CPU/memory limits                                     | Tidak menetapkan angka limit otomatis dari microbenchmark                                        |

Tidak ada alasan saat ini untuk menambah indeks secara spekulatif atau mengganti mekanisme cache/authorization. Auth, cache revision, encryption dan kompatibilitas file lama harus tetap dipertahankan pada optimasi berikutnya.

## Rencana benchmark yang dapat dibandingkan

1. Sediakan stack **disposable terpisah yang disetujui**, volume/storage test sendiri, DB test/review teridentifikasi dan runtime role terbatas. Port API 4400 harus bebas dan health mengonfirmasi `environment=test` serta nama DB sesuai. Jangan menunjuk DB development/production atau mematikan layanan existing untuk membebaskan port.
2. Rekam SHA/source snapshot, versi Node/dependency/image, CPU/memory limits, konfigurasi pool/Sharp/worker, dataset seed dan command. Untuk setiap optimasi, pertahankan kondisi sebelum/sesudah sama; isolasi pekerjaan host lain dan jalankan beberapa pengulangan.
3. Pertahankan warm-read 25-record historis untuk kontinuitas, tambah cold cache (namespace fixture saja), tenant skew/multi-tenant, mixed read/write dan corpus yang lebih besar. Contoh matriks awal: 1.000/10.000/100.000 content, body size tercatat, concurrent 1/10/25; ukuran ini usulan pengujian, bukan capacity target.
4. Tambahkan upload/retrieval dengan foto nyata fixture berizin, PNG/JPEG/WebP/GIF/PDF, legacy file dan dimensi mendekati budget; gallery grid/list/picker; serta export 500/10.000/100.000 rows bersamaan dengan HTTP reads. Ukur dampak event loop dan kegagalan/cancellation.
5. Kumpulkan p50/p95/p99 sukses **dan** error rate per skenario, throughput, CPU/RSS API/worker, SQL query duration/count/EXPLAIN, Redis hit/miss/memory dan RabbitMQ memory/queue depth. Tetapkan deadline request dan durasi run; validasi response shape/tenant serta ukuran dataset.
6. Archive artefak per run, bukan overwrite `artifacts/benchmark/benchmark.json`. Harness historis memang menimpa path tersebut; gunakan salinan baseline dan output terpisah sebelum pengulangan. Jangan menggabungkan angka dari workload berbeda sebagai improvement.
7. Pilih optimasi hanya jika bottleneck terukur dan regression/compatibility lulus. Tidak ada persen peningkatan, SLA, atau readiness production yang dapat dinyatakan dari verifikasi saat ini.

Kontrak request/response dan security regression harus tetap lulus pada setiap perubahan. Untuk schema/typed client, ukur compatibility dan diagnostic count; tidak perlu mengarang manfaat latency untuk refactor tipe yang tidak mengubah runtime.
