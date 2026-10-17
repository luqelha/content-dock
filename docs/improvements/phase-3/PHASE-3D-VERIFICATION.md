# Phase 3D — Verifikasi Performance & Code Quality

Tanggal: **14 Oktober 2026, Asia/Jakarta**. Objek: working tree pada HEAD `e78af99e234687377d0f35a91128e66ac2ace72f`, termasuk perubahan pengguna yang belum di-commit. Penamaan **3D** mengikuti permintaan pengguna; materinya adalah Phase E (performance) dan G (type safety/maintainability) pada brief, bukan Phase D reliability yang telah dikerjakan dalam 3C.

## Kesimpulan

**Verifikasi selesai; kriteria implementasi Phase 3D baru terpenuhi sebagian.** Kontrol media, pagination, keamanan, dan build yang sudah ada tetap lulus pemeriksaan lokal. Belum ada bukti optimasi before/after setara, backend strictness belum aktif, dan kontrak daftar content belum lengkap. Tidak ada perubahan aplikasi, API publik, dependency, migration, konfigurasi, atau refactoring dalam verifikasi ini.

Hasil baru: 153 unit test, 101 security API (subset unit), 24 security Node, lint/typecheck/build API dan web lulus. Probe backend dengan dua flag tambahan menghasilkan **35 diagnostic pada 22 file: 24 source + 11 test**. Microbenchmark validator gambar menjalankan **72 operasi tanpa kegagalan**, tetapi tidak mengukur HTTP atau kapasitas production. Lihat [laporan performa](PERFORMANCE-REPORT.md) dan [evidence/reproduksi](evidence/phase-3d/README.md).

## Baseline dan metode

- Membaca laporan Phase 1/2, daftar perubahan Phase 2, assessment 3A, laporan 3C, audit asli di lokasi Temp yang dirujuk 3A, manifest/lockfile, schema/migration, CI, Compose production, dan runbook terkait. Laporan historis tidak diperlakukan sebagai tes baru.
- Stack tetap npm workspaces/Turbo, Nest 11.2.7, Prisma 5.22.0, Next 16.3.8/React 19.2.8, TypeScript 5.9.3, Sharp 0.35.5. PostgreSQL, Redis, RabbitMQ, dan worker export berada dalam arsitektur yang sudah ada; worker berjalan dalam proses API.
- Lingkungan verifikasi Windows/Node 22.18.0; bukan CI Ubuntu/Node 24. Tidak ada install/upgrade package.
- Snapshot SHA-256 mencakup **415 file existing non-ignored**. Pemeriksaan preservasi akhir: **0 berubah/hilang**. Ini tidak mencakup seluruh ignored/generated files; build memperbarui output lokal `dist`/`.next`.
- Unit/security memakai mock dan fixture sementara. Probe kontrak memakai controller asli dalam container Nest tanpa listener/DB/broker, dengan guard pengganti hanya untuk pembuatan schema. Query service diperiksa dengan stub Prisma, bukan SQL.
- Microbenchmark memakai validator upload asli dan Sharp terpasang, sepenuhnya dalam memori, setelah suite lain selesai dan sebelum build dimulai. Tidak mengubah konfigurasi Sharp aplikasi.
- Docker hanya diinspeksi; tidak ada start/stop/recreate container, migration, reset/truncate DB, collector, deployment atau penghapusan volume. Tidak membaca/mencetak secret konfigurasi aktual.

## Matriks penerimaan

| Area                                                                              | Status                                    | Bukti dan batas                                                                                                                                                                  |
| --------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Benchmark before/after setara                                                     | **Verified incomplete** untuk evidence    | Hanya ada baseline HTTP historis; belum ada pasangan sebelum/sesudah optimasi. Microbenchmark saat ini bukan pembanding workload HTTP.                                           |
| Workload cold-cache, multi-tenant, mixed writes, dataset besar, export under load | **Not yet verified**                      | Target fixture HTTP `127.0.0.1:4400` mengembalikan ECONNREFUSED. Tidak mengarahkan benchmark ke stack development existing.                                                      |
| Validasi media dan batas input                                                    | **Verified completed**, lingkup lokal     | Decode/re-encode, MIME mismatch/truncation rejection, batas ukuran source, vault encryption dan regression lulus. Tidak menyatakan seluruh format/batas/concurrency sudah diuji. |
| Pagination media dan lazy loading                                                 | **Partially completed**                   | Default 50/max 100, tenant filter dan urutan createdAt/id terverifikasi. Grid/picker lazy; list view masih eager.                                                                |
| Thumbnail, variants, media streaming                                              | **Verified incomplete**, peluang optimasi | Tidak ada pembuatan varian; API membaca file penuh. Perlu benchmark manfaat sebelum memilih implementasi.                                                                        |
| API contracts                                                                     | **Partially completed**                   | DTO/validation dan media array schema ada. Content-list schema hilang; tipe summary dan boundary JSON belum aman.                                                                |
| TypeScript strictness                                                             | **Partially completed**                   | Web `strict=true` lulus; API dua flag masih false; probe 35 diagnostic.                                                                                                          |
| Refactoring terukur                                                               | **Partially completed**                   | Kandidat dan urutan modul sudah diidentifikasi; tidak ada refactor baru maupun bukti manfaat sesudah refactor. Volume perubahan bukan kriteria keberhasilan.                     |
| Regresi/build lokal                                                               | **Verified completed**                    | Hasil eksekusi di bawah. Bukan bukti remote CI atau release production.                                                                                                          |

## Temuan dan tindakan

Severity di bawah adalah prioritas engineering lokal, bukan rating vulnerability yang sudah dieksploitasi.

### P3D-01 — Evidence optimasi end-to-end belum memadai

**Sedang / Verified incomplete.** `scripts/benchmark.mjs:43` mengukur satu tenant, 25 records, 1.000 cached GET, concurrency 25. Hasil historis belum mencakup CPU/RSS proses API/worker, latency query, cache hit/miss, cold cache, workload campuran, atau dataset besar. Loop benchmark juga tidak menetapkan deadline per request; harness terhenti perlu ditangani sebelum pengujian failure/load panjang.

Akibatnya, angka 556 req/s tidak dapat dipakai untuk menetapkan kapasitas atau menyimpulkan perubahan terbaru lebih cepat. Lengkapi harness dan telemetry, simpan hasil per-run tanpa menimpa baseline, lalu bandingkan implementasi dalam kondisi identik. Tidak ada kebutuhan migration untuk instrumentasi. Rollback cukup pada harness; budget produksi memerlukan hasil dan keputusan operator. Rincian matrix ada di [PERFORMANCE-REPORT.md](PERFORMANCE-REPORT.md).

### P3D-02 — Resource media concurrent belum dibatasi di level aplikasi

**Sedang / New issue identified, dampak kapasitas belum terverifikasi.** `apps/api/src/modules/storage/validate-upload.ts:30` menjalankan Sharp langsung per request. Batas input 2/5 MiB, 16 juta pixel, 100 pages dan processing timeout 5 detik ada; tidak terlihat admission limit/antrean upload lintas request. `docker-compose.prod.yml` belum menetapkan CPU/memory limits untuk API, Redis, RabbitMQ atau worker.

Pada fixture sintetis JPEG 4000×4000, empat operasi concurrent mencatat peak sampled RSS **630,38 MiB** untuk keseluruhan proses probe; satu operasi concurrent **268,31 MiB**. Tidak ada OOM/failure. Ini bukti kebutuhan mengukur budget, bukan prediksi RSS production atau batas concurrency universal. [Sharp timeout](https://github.com/lovell/sharp/blob/main/docs/src/content/docs/api-output.md) tidak mencakup waktu menunggu thread libuv, sehingga bukan deadline end-to-end request.

Usulan: benchmark upload HTTP bersama workload read/export, lalu pilih admission limit kecil yang dapat dikonfigurasi dan respons overload terdefinisi. Alternatif worker terpisah lebih invasif dan belum dibenarkan oleh bukti ini. Pertahankan validator, tenant authorization, dan cleanup transaksi; uji format invalid, parallel upload, timeout/overload serta memori. Jangan menetapkan limit produksi atau mengaktifkan queue baru hanya berdasarkan microbenchmark. Tidak perlu migration untuk admission limit; rollback harus mempertahankan validasi keamanan.

### P3D-03 — Thumbnail/streaming belum ada, lazy loading belum merata

**Sedang / Verified incomplete sebagai peluang optimasi.** `validate-upload.ts:39` hanya re-encode tanpa resize. `file-vault.service.ts:58` membaca file encrypted maupun legacy seluruhnya; `files.controller.ts:41` mengirim buffer. BFF `apps/web-admin/src/app/api/files/[filename]/route.ts` meneruskan stream upstream, tetapi tidak menghilangkan buffering di API. Grid/picker memakai lazy loading, sedangkan `media-list.tsx:163` masih `<img>` tanpa `loading="lazy"`.

Batas query mencegah pengambilan semua metadata, tetapi gambar asli tetap dapat mahal. Usulan berurutan: ukur byte transfer/latency gallery, buat varian thumbnail additive dengan fallback original jika bermanfaat, lalu nilai streaming legacy dan encrypted media secara terpisah. Alternatif tetap original plus lazy loading memiliki risiko compatibility lebih rendah. Jangan menghapus original, mengubah format archive, atau menjadikan private media cache publik. AES-GCM harus tetap terautentikasi; streaming decrypt naif yang mengirim plaintext sebelum verifikasi tag bukan pengganti aman bagi perilaku buffered saat ini. Uji tenant denial, corrupted ciphertext, file lama, PDF, animasi, orientasi, delete/rollback dan pembatalan download. Varian membutuhkan keputusan metadata/retention tersendiri; rollback reader harus tetap bisa memakai original.

### P3D-04 — Schema content-list dan tipe summary tidak mewakili payload

**Sedang / Verified incomplete.** `apps/api/src/modules/cms/controllers/content.controller.ts:65` hanya memberi description pada respons 200. Probe Swagger controller aktual menghasilkan `{ "description": "Return paginated contents." }`, tanpa `content/schema`. Media GET memiliki array schema yang benar.

`content.service.ts:63` menyatakan `Promise<PageDto<Content>>`, tetapi `summary=true` pada baris 97 menghilangkan `body`. Probe service membuktikan pemilihan field tersebut dengan stub Prisma; bukan eksekusi SQL. Dashboard memang memakai summary. Client yang mengandalkan tipe `Content` lengkap atau generator OpenAPI tidak mendapat jaminan payload yang tepat.

Frontend juga mendefinisikan `MediaItem` dan `MediaItemResponse` secara terpisah, serta `ContentStatus` terpisah dari enum Prisma. Nilainya saat ini cocok, sehingga ini **risiko drift**, bukan mismatch enum aktual. `lib/workspace-api.ts:10` menerima generic dari caller tetapi mengembalikan JSON tanpa validasi; beberapa fungsi `lib/api.ts` juga mengembalikan `res.json()` tanpa tipe respons eksplisit. `ExportJob.status` dan state UI export masih `string`, belum union/exhaustive handling.

Usulan: definisikan response DTO full/summary dan envelope yang sesuai payload existing, tambahkan explicit schema paginated, lalu pilih shared domain types atau generated client setelah schema lengkap. [Nest OpenAPI](https://github.com/nestjs/docs.nestjs.com/blob/master/content/openapi/operations.md) mengharuskan schema eksplisit untuk generic yang hilang saat runtime. Tambahkan pemeriksaan compatibility/schema diff dan uji consumer full/summary, null category, dates, pagination, export status, error response. Mengubah tipe/docs tidak perlu mengubah JSON atau DB; rollout/rollback menjaga wire format. Generated client dan runtime validation merupakan pilihan berbeda, bukan jaminan otomatis satu sama lain.

### P3D-05 — Backend strictness masih memiliki gap terukur

**Sedang / Verified incomplete.** `apps/api/tsconfig.json:16` tetap `strictNullChecks=false`, `noImplicitAny=false`. Probe non-emitting dua flag menghasilkan 35 diagnostic/22 file. Dibanding 3A (29/19; 24 source + 5 test), **source tetap 24, test bertambah 6 diagnostic** setelah suite bertambah. Kenaikan jumlah ini tidak dengan sendirinya membuktikan regresi runtime.

Inventaris AST source menemukan **35 explicit `any` backend, 0 frontend**; tidak mencakup tests/dependency/generated declarations dan tidak mendeteksi seluruh aliran `any` dari JSON. `noImplicitAny` tidak melarang explicit `any`; dua flag ini juga bukan seluruh keluarga [`strict`](https://github.com/microsoft/TypeScript-Website/blob/v2/packages/tsconfig-reference/scripts/tsconfigRules.ts). `skipLibCheck` tetap aktif. Lint API menonaktifkan aturan no-explicit-any.

Urutan modul yang disarankan:

| Kelompok                                                                         | Diagnostic source | Perubahan terarah dan validasi                                                                            |
| -------------------------------------------------------------------------------- | ----------------: | --------------------------------------------------------------------------------------------------------- |
| Typed request: auth/export/storage/tenant/user controller + activity interceptor |                13 | Kontrak principal/tenant/request; jaga authentication dan audit attribution.                              |
| Prisma transaction callback arrays                                               |                 2 | Beri tipe state eksplisit; integration commit/rollback wajib saat implementasi.                           |
| JWT config                                                                       |                 2 | Required secret getter yang gagal saat config invalid; jangan memakai assertion tanpa runtime check.      |
| Category nullable/tree + user nullable lookup                                    |                 3 | Narrow/null handling; uji missing user, root category dan cycle.                                          |
| Media MIME maps + storage retention + compression timer                          |                 4 | Typed allowed formats, optional/null narrowing dan lifecycle timer; upload/retention/archive regressions. |
| Test mocks/callbacks                                                             |        11 di test | Tipe mock sesuai kontrak, tanpa menghapus assertion atau melemahkan tes.                                  |

Lakukan per modul dengan diagnostic baseline agar jumlah tidak naik, lalu aktifkan dua flag global setelah included source/test siap. Jangan menutup diagnostic dengan `any`, `@ts-ignore`, non-null assertion massal atau exclusion file. Full strict memerlukan pengukuran tambahan. Tidak perlu data migration; rollback per commit harus mempertahankan semantics transaksi/otorisasi.

### P3D-06 — Refactoring perlu difokuskan pada boundary dan duplikasi nyata

**Rendah / Partially completed.** `lib/api.ts`, `lib/workspace-api.ts`, dan `actions/media.ts` mengulang API URL/fetch/error handling; dua interface media mengulang field, dan MIME map validator/service terpisah. Abstraksi yang sudah membantu—shared validation pipe, pagination DTO, private-file URL helper, transaction hooks, archive filename helper—tetap ada.

Usulan kecil pertama adalah berbagi tipe media dan parser respons, kemudian menyatukan error status/request ID pada boundary yang kompatibel. Pertahankan React request memoization, cookie access, tenant header, FormData, `no-store`, partial bulk-delete result dan 404 handling. Ukur keberhasilan melalui pengurangan definisi kontrak ganda serta regresi perilaku, bukan jumlah baris dihapus. Pemindahan seluruh HTTP layer atau pemisahan service besar belum dibenarkan. Tidak ada dead code/dependency yang dihapus tanpa bukti consumer.

## Pengujian yang benar-benar dijalankan

| Pemeriksaan                                       | Hasil aktual                                                                                        |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| API unit                                          | **23 suite, 153/153 lulus**                                                                         |
| Security API                                      | **12 suite, 101/101 lulus**, subset unit                                                            |
| Security Node                                     | **24/24 lulus**                                                                                     |
| Lint API/web, tanpa `--fix`                       | Keduanya exit 0                                                                                     |
| Typecheck API/web, `--noEmit --incremental false` | Keduanya exit 0                                                                                     |
| Build API/web per-workspace, tanpa Turbo cache    | Keduanya exit 0                                                                                     |
| Probe dua flag backend                            | Exit **2**, 35 diagnostic; ini hasil gap yang dicatat, bukan tes yang disembunyikan                 |
| Probe kontrak/pagination/projection               | Exit 0; 4 input pagination invalid ditolak, query tenant/take/skip sesuai, gap schema terkonfirmasi |
| Media microbenchmark                              | **72/72 sukses**, enam kombinasi dataset/concurrency                                                |
| Preservasi snapshot                               | **415 file, 0 berubah/hilang**                                                                      |

Coverage tidak dihitung ulang; tidak ada klaim peningkatan coverage. Integration, API E2E, browser, database grants, recovery drill, image build, runtime audit dan remote CI **tidak dieksekusi ulang**; hasil 3C tetap historis. Build lokal bukan runtime smoke. API test fixture tidak tersedia; stack development existing menunjukkan dua API unhealthy dan Nginx restarting, sebagaimana risiko lama. Kondisi itu tidak dipakai sebagai bukti kegagalan build kandidat.

## Perubahan, deployment, dan tindak lanjut

Hanya menambah laporan ini, [PERFORMANCE-REPORT.md](PERFORMANCE-REPORT.md), serta script/evidence di `evidence/phase-3d/`. Tidak ada optimasi/refactoring aplikasi yang diimplementasikan. Baseline fungsional awal dan akhir sama; yang bertambah adalah bukti, inventaris diagnostic, dan temuan kontrak/resource. Tidak ada klaim persen improvement before/after.

Tidak memerlukan deployment/migration/rollback aplikasi. Artefak verifikasi dapat diabaikan tanpa mengubah perilaku aplikasi; jangan membatalkan perubahan pengguna sebelumnya untuk menghapus laporan. Daftar file dan hash tersedia pada `evidence/phase-3d/changed-files.json`.

Prioritas berikutnya: (1) lengkapi kontrak full/summary dan typed boundaries, (2) migrasikan dua strict flags per modul dengan regresi relevan, (3) jalankan benchmark terisolasi yang representatif beserta telemetry, lalu putuskan admission limit/thumbnail/index/refactor berdasarkan hasil. Pertahankan collector default-off/dry-run dan private media authorization.

**Belum ada deklarasi production-ready.** Remote CI kandidat, image/runtime target, secrets/grants/TLS, restore dan rollout/rollback compatibility tetap mengikuti gerbang laporan 3B/3C. Ketiadaan bukti lingkungan tersebut adalah **Not yet verified**, bukan bukti kontrol production gagal.
