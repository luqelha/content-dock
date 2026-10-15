# Phase 3 — Prioritas sesudah Assessment 3A

Tanggal: 13 Oktober 2026. Dasar: [BASELINE-ASSESSMENT.md](BASELINE-ASSESSMENT.md) dan evidence di direktori ini. **Dokumen ini adalah rencana, bukan otorisasi implementasi/deployment. Tidak ada item di bawah yang diimplementasikan dalam 3A.**

## Urutan yang disarankan

| Urutan | Paket kerja | Dependensi | Risiko perubahan | Kriteria selesai |
| --- | --- | --- | --- | --- |
| 1 — P0 | B: staging/release/restore prerequisites (P3A-01/02) | Target/operator/secret dan lingkungan terisolasi yang disetujui | Tinggi jika menyentuh layanan/data; persiapan dokumen rendah | Target dan volume jelas, restore DB+files+key+grants terbukti, rollback rehearsal dan production-mode smoke terdokumentasi |
| 2 — P1 | F: buktikan CI yang sudah ada dan role gate (P3A-05) | CI runner dan service disposable | Rendah–sedang | Remote run lint/types/unit/integration/E2E/security/browser/audit/build hijau, artifact dapat ditinjau, runtime grants dites |
| 3 — P1 | D: lease ownership export (P3A-03) | Harness DB/broker/storage test terisolasi | Sedang; mungkin migration additive | Stale attempt tidak dapat finalisasi atau merusak output attempt baru; restart/redelivery/lease-expiry lulus |
| 4 — P1 | C: dependency tooling (P3A-04) | Triage registry/official docs per jalur + baseline CI | Rendah untuk patch compatible, sedang untuk parent upgrade | Advisory berkurang/ditutup atau residual diterima dengan alasan; runtime tetap 0, clean installs/build/test lulus |
| 5 — P1/P2 | B/D/F: readiness, resource, observability (P3A-06) | Bukti staging dan budget layanan | Sedang | Broker/worker failure terdeteksi, shutdown/restart teruji, timeout/budget/alert dipilih dari pengukuran |
| 6 — P2 | D: retention/restore policy (P3A-08) | Restore proof + kebijakan retention/otorisasi deletion | Tinggi untuk deletion, rendah untuk dry-run | Inventory benar; file aktif/legacy terlindungi; metadata growth terukur; aktivasi diputuskan operator |
| 7 — P2 | E: workload/media/query performance | Dataset representatif + telemetry | Sedang | Pengukuran before/after setara; optimasi hanya untuk bottleneck terbukti |
| 8 — P2/P3 | G: lock/doc drift lalu types bertahap (P3A-07/08) | Baseline root install + kontrak API | Rendah untuk docs, sedang untuk kontrak/types | Satu sumber lock jelas, docs aktual, diagnostics berkurang per modul tanpa perubahan kontrak diam-diam |

Persiapan B tidak perlu menahan pekerjaan aman C/F/G setelah implementasi diotorisasi; external production gate tetap menghalangi release. Jangan mengukur prioritas dari jumlah file atau jumlah audit entries saja.

## Paket B — Deployment dan disaster recovery

Masalah: kontrol source ada, tetapi target production dan prosedur pemulihan belum dibuktikan. Local Docker masih menjalankan stack API/Nginx legacy yang gagal health/restart. Lihat Compose production, root README dan `scripts/database/README.md`.

Usulan: susun deployment runbook konkret dengan identitas stack/image/volume, backup, urutan migrate → grants → verify role → API/web/edge → smoke → rollback. Gunakan environment baru yang disetujui untuk rehearsal. Tetapkan RPO/RTO bersama operator; jangan mengarang target numerik dari benchmark lokal.

Alternatif: bukti operator/staging yang sudah tersedia dapat ditinjau tanpa membuat lingkungan baru. Tidak perlu merombak arsitektur atau memisahkan worker sebelum ada kebutuhan terukur.

Compatibility/migration: pertahankan tiga migration existing, restricted runtime role, perubahan JWT yang memerlukan login ulang, pagination/kuota dan storage key. Jangan membuat ulang role existing secara otomatis. Rollback aplikasi memakai image kompatibel dan mempertahankan migration additive serta runtime credential; restore data hanya prosedur operator disetujui, bukan `down -v`.

Acceptance: health/auth/refresh/membership/tenant isolation, Redis/RMQ, upload/decrypt, export/download, error/retry dalam NODE_ENV=production; TLS/identity chain publik diuji terpisah; restore file/key/DB/grants benar-benar dapat digunakan. Container startup yang pernah ditolak policy tidak dicoba melalui jalur alternatif.

## Paket F — CI dan high-risk tests

Masalah: Playwright telah ada di workflow, tetapi belum ada remote execution proof; tes grants tidak masuk CI dan unit branch coverage kritis rendah.

Usulan: jalankan workflow existing pada lingkungan CI disposable; pertahankan `contents: read`, fixture secrets, timeout dan semua threshold. Tambahkan job/step provisioning restricted runtime test role dan `test:security:db` yang sudah tersedia. Pisahkan credential owner untuk migrate/fixture dari credential runtime smoke. Jangan menjalankan helper TRUNCATE dengan runtime role atau terhadap DB real.

Prioritas tes: RBAC/revocation/cross-tenant; refresh purpose/rotation/Redis failure setelah commit; rollback dan commit hooks; stale lease; storage failure/partial cleanup; cache invalidation setelah commit. Browser runner perlu bukti login/logout, switching tenant, unauthorized download dan error/retry selain dua skenario existing. Screen reader/multi-browser adalah matriks terpisah dari automated Chromium.

Compatibility/rollback: perubahan workflow tanpa schema/API change; revert step baru jika fixture salah, tetap pertahankan gate existing. Jika CI gagal, simpan failure log dan perbaiki akar masalah; tidak menghapus tes/menurunkan threshold. Pin action SHA/image digest dan release provenance dapat ditambahkan setelah memilih kebijakan pembaruan.

Acceptance: run URL/commit yang cocok, seluruh stage lulus, failure artifacts tersedia dan tidak mengandung secret; runtime audit tetap 0. Local discovery/build tidak menggantikan remote run.

## Paket D — Kepemilikan lease worker

Masalah P3A-03: `apps/api/src/modules/export/worker.controller.ts:49` dan `:62` menulis hasil berdasarkan id saja. Reproduksi assessment memakai source aktual: attempt A melewati lease, B selesai, A gagal kemudian menimpa hasil B. File archive juga memakai nama tetap per job, sehingga status check saja belum cukup untuk menjamin file aman.

Usulan: desain minimal berupa attempt/lease token yang diterbitkan saat atomic claim; semua completion/failure update harus compare-and-set terhadap token aktif dan status. Tulis output sementara unik per attempt; publish hanya ketika masih berhak, cleanup hanya file milik attempt. Definisikan expiry, timeout, retry dan perilaku ketika ownership hilang.

Alternatif: memakai nilai lease/version sebagai conditional ownership bila menjamin uniqueness dan atomicity; evaluated terhadap precision timestamp, retry dan multi-replica. Memperpanjang TTL saja tidak menutup stale writer. Memisahkan service worker tidak menyelesaikan ownership dengan sendirinya.

Compatibility/migration: pertahankan jobId, status API, tenant/user authorization dan quota. Jika field token diperlukan, migration **baru additive**, review grant hanya jika operasi tambahan diperlukan. Rollout API/worker harus mencegah versi lama dan baru menulis bersamaan; drain/stop workers pada window terencana. Jangan edit migration Phase 2.

Rollback: hentikan attempt baru/drain sesuai runbook; deploy image kompatibel, pertahankan kolom additive. Revert tidak boleh diam-diam mengaktifkan kembali stale writer saat replica campuran berjalan. Simpan archive valid sampai policy cleanup diputuskan.

Acceptance tests: expired-lease reclaim, old success/old failure setelah new success, duplicate deliveries, broker outage, DB error sebelum/sesudah claim, worker pause/restart, file write failure dan partial cleanup, download tenant/owner checks. Ulang dengan PostgreSQL/RMQ nyata pada fixture isolated; simulasi 3A bukan pengganti bukti tersebut.

## Paket C — Dependency yang tersisa

Masalah: 48 entri tooling berasal dari braces, postcss-selector-parser, sprintf-js. Source manifest/root lock/resolved paths telah disimpan; root runtime audit bersih.

Usulan langkah kecil:

1. Revalidate rilis registry dan advisory resmi saat implementasi; jangan menganggap hasil hari ini tetap berlaku.
2. Tinjau jalur shadcn → parser 7.1.4 terlebih dahulu: advisory menunjuk range <7.1.6 dan parent range ^7.1.0 memberi kandidat patch dalam major yang sama. Verifikasi candidate tersedia dan lock resolution, bukan menjanjikan patch sebelum diuji.
3. Tinjau typography → parser 6.0.10 lewat parent upgrade yang kompatibel; uji prose/editor CSS. Hindari memaksakan major 7 lewat override tanpa bukti kompatibilitas.
4. Untuk braces/sprintf-js, petakan seluruh parent dari `dependency-paths.json`, pilih update parent/removal hanya bila tak dipakai; jika patch belum tersedia, dokumentasikan input/tool execution exposure dan mitigasi CI.

Alternatif: isolasi tooling rentan dan documented risk acceptance saat belum ada update aman. Tidak ada `npm audit fix --force`, major upgrade massal atau override lintas-major otomatis.

Compatibility/rollback: satu dependency family per perubahan, root manifest+lock atomik; revert pasangan manifest/lock dari snapshot milik pekerjaan tersebut, bukan reset working tree pengguna. Tidak perlu DB migration. Test clean npm ci pada Node CI/container, lint/types/security/unit, web/API builds, bootstrap HTTP/RMQ dan regression YAML/Native image. Audit ulang runtime dan seluruh dependency; laporkan jumlah advisory dasar dan entry count terpisah.

## Paket observability, retention dan performance

Readiness saat ini memeriksa DB/Redis; tambahkan sinyal koneksi broker/consumer/outbox age atau health terpisah sesuai kebijakan availability, dengan timeout terukur. Shutdown hooks sudah dipasang; verifikasi in-flight export saat SIGTERM, reconnect, lease recovery dan grace period sebelum mengubah konfigurasi. Tentukan CPU/memory/disk limits berdasarkan concurrent upload/export, bukan menebak angka.

Minimum telemetry yang dinilai: latency/error API, DB query latency/pool wait, Redis availability/cache hits, broker queue depth/unacked, outbox age, expired lease, failed jobs, vault free space dan cleanup errors. Hindari log raw JWT/password/query sensitif. Dashboard/alert belum otomatis berarti on-call/response procedure ada; tetapkan penanggung jawabnya.

Retention: metadata ExportTask tidak dihapus otomatis dan collector mengenali encrypted orphans dengan grace 48h. Pertahankan disabled/dry-run, lease/reference checks, symlink protection dan legacy file compatibility. Purge metadata memerlukan policy dan role/operator terpisah; runtime saat ini sengaja tidak diberi DELETE ExportTask. Alternatif aman sementara: inventory/report growth tanpa deletion. File yang sudah dihapus tidak dapat dipulihkan hanya dengan rollback kode; restore proof wajib lebih dulu.

Performance: ulang workload historis warm-cache untuk keterbandingan, lalu cold-cache/multi-tenant/mixed read-write/dataset besar, media dan export. Catat p50/p95/p99, req/s, error rate, CPU/memory, dataset, query latency dan cache effectiveness. Teliti bounded media reads, thumbnails, streaming encrypted/legacy media dan indeks tenant berdasarkan EXPLAIN. Jangan mengubah indeks atau API pagination berdasarkan asumsi; rollback optimasi harus menjaga kontrak consumer dan archive compatibility.

## Paket G — Types dan drift

Masalah: root/nested lock berbeda dan dua dokumen masih menyatakan status export di Redis. Update dokumentasi dan keputusan canonical lock merupakan pekerjaan kecil pertama; periksa apakah ada consumer standalone API sebelum menghapus nested lock. Alternatif: generate/maintain secondary lock dengan workflow eksplisit jika memang dibutuhkan. Tidak mengubah runtime hanya untuk menyamakan dokumen.

Pengukuran API dengan `--strictNullChecks --noImplicitAny` menghasilkan **29 diagnostic pada 19 file: 24 pada source, 5 pada test**. Ini bukan full strict migration estimate dan tidak menangkap masalah yang tersembunyi oleh explicit `any`/skipLibCheck. Normal typecheck sekarang lulus; web sudah strict.

Urutan modular yang disarankan: typed request/auth/config (termasuk secret getters), transaction callback arrays, export/controller/storage unions, CMS nullable parent dan user null handling, lalu test mocks. Ukur ulang per kelompok; jangan mengaktifkan flags global sebelum seluruh included files siap. Shared/generated API contracts adalah keputusan lanjutan yang memerlukan review kompatibilitas consumer, bukan prasyarat assessment.

Compatibility/rollback: perubahan types tanpa mengubah JSON publik, schema atau enum DRAFT/PUBLISHED. Revert batch types jika diperlukan tanpa melonggarkan security tests. Acceptance: diagnostics berkurang, lint/typecheck/build dan regresi modul tetap lulus; gunakan test baru hanya untuk perubahan perilaku atau failure path yang bermakna.

## Batas penyelesaian

Phase 3A selesai dengan baseline terukur dan rencana ini. Tahap berikutnya baru dilakukan setelah pengguna memilih melanjutkan implementasi. Release production tetap memerlukan bukti gerbang operasional dan otorisasi deployment. Tidak ada klaim benchmark lebih cepat, coverage membaik, vulnerability sudah dipatch, atau retention telah diaktifkan oleh assessment ini.
