# Phase 3C — Validation dan coverage

Pekerjaan: 13–14 Oktober 2026 (Asia/Jakarta). Bukti di [evidence/phase-3c](evidence/phase-3c/README.md). Tidak mengklaim remote GitHub Actions hijau dari hasil lokal.

## Baseline versus hasil implementasi

Baseline diukur ulang sebelum implementasi pada working tree sesudah 3B: 109 unit tests. Angka Phase 3A 35,32% branch adalah historis; baseline aktual 3C **35,06%** karena source denominator telah berubah pada 3B.

| Metrik unit Jest | Awal 3C | Akhir 3C |
| --- | ---: | ---: |
| Tests | 109 | 153 |
| Suites | 19 | 23 |
| Statements | 41,68% | 50,39% |
| Branches | 35,06% | 44,63% |
| Functions | 34,93% | 40,55% |
| Lines | 41,99% | 51,03% |

| Modul kritis | Branch awal | Branch akhir |
| --- | ---: | ---: |
| WorkerController | 40% | 100% |
| RbacGuard | 0% | 100% |
| AuthService (termasuk refresh) | 25% | 75% |
| StorageRetentionService | 76,92% | 88,46% |

Global thresholds existing (statements/lines 40, branches/functions 30) tetap. Gate per-file baru: worker dan RBAC lines/branches 100; retention lines 90, branches 85. Angka tabel mencakup seluruh source; Jest mengevaluasi threshold global tersisa setelah file dengan threshold khusus dipisahkan. Coverage tidak mencakup bukti integration/Node/browser, sehingga tidak menjumlahkan test count/coverage suite tersebut sebagai unit coverage.

## Eksekusi

| Pemeriksaan | Hasil aktual |
| --- | --- |
| Clean root npm ci | Lulus; Windows Node 22.18.0, npm 11.18.0. Warning install-script policy npm dicatat; Prisma generate eksplisit lulus. |
| Prisma generate + empat migration deploy | Lulus pada PostgreSQL tmpfs baru `atlas-phase3c-review`; applied migration existing tidak diedit. |
| Lint API/web, typecheck API/web | Lulus. |
| Format gate reliability | Lulus. Gate ini terbatas pada workflow, config/browser dan audit scripts; bukan klaim seluruh repo telah diformat. |
| Unit + coverage gate | 23 suites / 153 lulus. |
| Security API + Node | 101 API tests (subset unit) + 24 Node tests lulus. |
| PostgreSQL integration | 3 suites / 26 lulus, termasuk stale success/failure, quota concurrency, rollback dan after-commit failure. |
| API E2E | 3 suites / 19 lulus. |
| Restricted runtime-role regression | 3 lulus. Browser API memakai role ini; migration/fixture tests memakai owner disposable. |
| Audit runtime | 0 vulnerability, exit 0. |
| Audit tooling policy | Lulus dengan residual 48 entri / 3 advisory terdokumentasi; bukan audit bersih. |
| Production build API/web | 2 tasks berhasil, tanpa cache pada eksekusi tercatat. |
| Chromium browser | **3/3 lulus tanpa retry pada 14 Oktober**, CI-managed API/web, restricted role dan vault temp. Initial failures dipertahankan terpisah. |
| Broker/restart drill | **3/3 checks lulus pada 13 Oktober**: pending job saat broker down, reconnect/outbox recovery, fresh worker reclaim expired lease dan decryptable download. Hanya container test project baru dan proses API milik harness. |

Eksekusi awal beberapa checks memakai Node 26 dari resolusi `npm exec -- node`. Runner diperbaiki agar memakai `node` terpasang, dan unit/integration/E2E/lint/typechecks final diulang pada Node 22. Bukti awal di `first-pass/`; bukan klaim verifikasi Node 24 CI. Node 24 Ubuntu tetap perlu remote execution.

## Apa yang diuji

- Worker: malformed/duplicate delivery, atomic ownership, stale success/failure setelah replacement, workspace dihapus, storage gagal, DB claim/read/completion gagal, hasil completion ambigu, cleanup gagal. Kompresi Node test memakai writer, enkripsi, dekripsi dan ZIP nyata, termasuk dua attempt job sama dan partial cleanup.
- Authorization: revoked/downgraded membership, tenant path mismatch, permission rejection, membership DB outage; refresh digest salah, sesi revoked, cached result setelah logout, conditional rotation kalah dan Redis error sebelum/sesudah rotasi.
- Retention: disabled schedule, default dry-run saat enabled, explicit fixture deletion, live references/avatar/lease, file baru/legacy, attempt filenames, linked folder, database failure dan overlapping collector.
- Browser: login/logout, protected route, dua workspace dan CMS category creation/isolation, error export tidak ditemukan lalu membuat job baru, authorized/foreign/logged-out download, keyboard modal focus/restore, mobile viewport, upload/preview, export refresh/recovery. Tidak mengasumsikan status 200 hasil redirect berarti download berhasil: logged-out request memeriksa redirect 307 ke login tanpa mengikuti redirect.

Initial browser failures adalah koreksi harness: locator alert ambigu karena Next announcer; asumsi route tetap setelah switch (aplikasi kembali ke dashboard); request API otomatis mengikuti redirect login; header Location berupa path relatif perlu di-resolve terhadap origin. Assertion diperjelas, tidak dihapus atau dibuat skip. Suite baru tidak menuntut perubahan UI/API behavior.

## Batas bukti

Remote CI URL/SHA, Ubuntu Node 24/browser dependency install, image build sesudah 3C, TLS publik, deployment secret/grants dan rollback compatibility di target real belum diverifikasi. Screen-reader manual serta Firefox/WebKit belum diuji; mobile viewport bukan real-device certification. Redis outage pada suite ini diinjeksikan di mock, bukan menghentikan Redis nyata. Lease race memakai PostgreSQL nyata dengan kompresi yang ditahan oleh test; tidak mengklaim fault injection disk penuh atau pause multi-host nyata.

Tidak ada benchmark performance before/after baru. Durasi tests bukan latency/throughput aplikasi; angka Phase 2 tidak dipakai sebagai SLA atau bukti peningkatan performa.

## Verifikasi ulang Phase 3E — 14–15 Oktober 2026

Regresi 14 Oktober pada working tree yang sama: unit **153/153**, security API **101/101** (subset unit), security Node **24/24**, integration PostgreSQL **26/26**, API E2E **19/19**, restricted grants **3/3**, Chromium **3/3 tanpa retry**. Total **228 tes unik**, tidak termasuk pengulangan subset security. Lint/typecheck API/web, format reliability, Prisma generate/migrate/status dan build per workspace lulus. Coverage tetap statements **50,39%**, branches **44,63%**, functions **40,55%**, lines **51,03%**; threshold tidak diturunkan.

Broker outage/outbox/restart expired lease menjalankan **3/3 checkpoint** dengan layanan nyata pada fixture baru. Image API/web dibangun sesudah perubahan 3C; runtime npm audit tetap 0 dan audit seluruh dependency tetap 48 entri dengan policy exception dev-only yang berlaku. Data, exit code dan batas operasional ada di [laporan final](FINAL-IMPROVEMENT-REPORT.md) serta [evidence 3E](evidence/phase-3e/README.md). Pernyataan “image build sesudah 3C belum diverifikasi” pada bagian historis di atas telah diperbarui oleh bukti 3E.

Finalisasi 15 Oktober tidak mengulang seluruh suite karena 440 hash baseline existing cocok; pengujian operasional yang belum selesai dilanjutkan terpisah. Hasil ini tetap bukan bukti GitHub Actions Ubuntu/Node 24, screen-reader atau browser matrix.

Rebuild image API/web dan [production-mode restore 3E](evidence/phase-3e/drill-1792059490242.json) lulus pada 15 Oktober: **10/10 checkpoint**, exact row/file manifests, key negative controls dan fresh worker export setelah restore. Checkpoint ini dilaporkan terpisah dari 228 tes unik. Seluruh 14 container drill berhenti; named volume fixture dipertahankan. Deviasi volume anonim probe registry dicatat di laporan final.
