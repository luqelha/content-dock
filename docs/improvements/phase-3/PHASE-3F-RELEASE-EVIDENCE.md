# Phase 3F — Release Gate Closure

Tanggal: **15 Oktober 2026, Asia/Jakarta**. Status: **belum closed; release ditahan**. Phase ini menjalankan remote CI untuk snapshot kandidat dan menelusuri akses operasional. Tidak ada deklarasi production-ready dari hasil discovery atau bukti lokal historis.

**Gate remote CI lulus** pada [run 38727582906](https://github.com/luqelha/atlas-platform/actions/runs/38727582906), commit `ab2c6e00d50e28684058b08cd5fedf9947d586f2`. Seluruh pengujian, audit dan build API/web container berhasil. Tiga gate operasional lainnya masih blocked dan belum dieksekusi; karena itu Phase 3F belum closed.

[Ringkasan dari job log](evidence/phase-3f/test-summary.json): **180 unit**, **26 integration**, **19 API E2E**, **9 browser**, **3 database-role**, dan **32 security Node** lulus. Security API subset juga lulus 119 tes; jangan menjumlahkannya sebagai tes unik di luar unit. Coverage lines 51,89%, sesuai threshold repository yang tidak diubah.

Image ID hasil build runner: API `sha256:d7bb9ba58681940983af83db4d1fa00ed4bb182c3592b04163d38318fe0b7a62`, web `sha256:68a1d0d4716dea6b75a0ee2352c0bf91c158cce728d5ba0ca33241b05889a202`. Keduanya berasal dari build run kandidat tersebut, belum dipublish ke registry sebagai release. Job log lokal memiliki SHA-256 `ade1081ed70d106c4c43ae9a986f3096b18a3c6bb90655ffee3d1c553d1dfe91`.

[Artifact validation-results](https://github.com/luqelha/atlas-platform/actions/runs/38727582906/artifacts/11969295954) berukuran 564.011 bytes dengan digest GitHub `sha256:acb76cf8c6ae3342cdd6add59e8bb3d13c7c53cd4451f4cf4f29c7a01af1a5ce`. Metadata mencatat expiry `2026-10-22T11:33:49Z`; job log dan ringkasan JSON disimpan lokal untuk audit sesudah artifact remote kedaluwarsa. Digest ini metadata GitHub, bukan klaim verifikasi download lokal artifact final.

## Identitas kandidat dan remote CI

Snapshot kandidat revisi kelima: `ab2c6e00d50e28684058b08cd5fedf9947d586f2`, tree `b7231cc0997f551f86d25883b286974b68980750`, branch `release/phase-3f-20261015112759`. [Manifest kandidat terbaru](evidence/phase-3f/revision-5/candidate.json) mencatat 348 file beserta Git blob IDs, perubahan dari HEAD awal, pengecualian output lokal, serta hash index pengguna sebelum operasi. Riwayat parent mempertahankan [kandidat pertama](evidence/phase-3f/candidate.json), [revisi kedua](evidence/phase-3f/revision-2/candidate.json), [revisi ketiga](evidence/phase-3f/revision-3/candidate.json), dan [revisi keempat](evidence/phase-3f/revision-4/candidate.json).

Kandidat dibuat memakai index Git sementara dan `commit-tree`, kemudian dipush tanpa force ke branch baru. Branch/index pengguna dan `main` dipertahankan. Filter push pada workflow diperluas untuk `release/phase-3f-*`, sehingga run memakai workflow kandidat tanpa memerlukan perubahan default branch atau PR. Tidak ada deployment job dalam workflow tersebut.

Run CI kandidat terikat pada SHA kandidat, bukan pada dirty working tree. URL run terbaru, status terminal, step conclusions, log digest dan artifact metadata dicatat dalam [release evidence](evidence/phase-3f/release-evidence.json). Snapshot observasi `remote-ci-*.json` dipertahankan, termasuk status berjalan dan kegagalan. Log job `.log` berada lokal dan di-ignore Git.

[Run pertama](https://github.com/luqelha/atlas-platform/actions/runs/38724067559) **gagal** pada `format:check:reliability`: `tests/browser/auth-forms.spec.ts` belum sesuai Prettier. Instalasi dependency, migration dan tiga tes database-role sudah berhasil sebelum tahap tersebut. Perbaikannya hanya membagi pemanggilan `page.screenshot` menjadi beberapa baris; assertion tidak diubah. Check format lokal lulus setelah perbaikan, kemudian snapshot revisi dipush ke branch baru. Run gagal, log dan hash-nya tetap dipertahankan.

[Run kedua](https://github.com/luqelha/atlas-platform/actions/runs/38724658176) **gagal** pada lint: 12 pelanggaran Prettier di `auth.service.ts`, `user.service.spec.ts`, dan `audit-attribution.spec.ts`. Ketiganya diformat; lint penuh API/web kemudian lulus lokal. [Pemeriksaan perbedaan format](evidence/phase-3f/formatting-verification.json) membandingkan canonical source dan emitted JavaScript untuk seluruh empat file dan semuanya identik sesudah normalisasi. Percobaan pembanding raw emit juga dipertahankan: emitter mempertahankan sebagian layout, sehingga raw output yang berbeda tidak dipakai sebagai bukti perubahan logika. Tidak ada assertion atau migration yang diubah.

[Run ketiga](https://github.com/luqelha/atlas-platform/actions/runs/38725529650) pada kandidat `57bc8f4` **gagal** di satu tes browser (8 passed / 1 failed, termasuk kegagalan ulang pada retry). Semua tahap sebelumnya, termasuk typecheck, security/grants, audit, unit/coverage, integration, E2E dan build aplikasi, lulus. Build container dilewati karena browser gagal. Tes masih mencari pesan upstream `Invalid credentials`, sedangkan UI sengaja memetakan 401/403 ke pesan netral `Email or password is incorrect.`; kontrak ini juga diuji pada `scripts/security/web-auth.test.cjs`. Expectation browser diperbarui ke pesan netral yang tepat, dengan assertion fokus alert; pemeriksaan alert tetap terlihat setelah 5,5 detik dipertahankan. Logika UI/API, timeout dan retry tidak diubah. Kandidat keempat kemudian dipush untuk menguji perubahan tersebut.

Regresi unit lokal sesudah perbaikan format juga **lulus 180 tes / 24 suite**; perintah, waktu dan exit code ada pada [local-unit.json](evidence/phase-3f/local-unit.json). Hasil lokal ini tidak menggantikan kesimpulan CI remote.

[Run keempat](https://github.com/luqelha/atlas-platform/actions/runs/38726724972) juga **gagal** pada tes browser yang sama: selector baru `getByRole("alert")` terlalu luas dan mencocokkan alert form serta route announcer Next.js. [Analisis job log](evidence/phase-3f/revision-4/browser-failure-analysis.json) memverifikasi pesan yang benar sudah dirender, serta identitas elemen pesaing `__next-route-announcer__`. Ini kesalahan revisi selector, bukan bukti kegagalan pesan UI. Revisi kelima membatasi locator ke `form` dan tetap memeriksa exact text, fokus alert serta persistence; tidak memakai `.first()`, skip, atau peningkatan retry.

Gangguan sementara pengambilan status/log API dan satu kegagalan pemeriksaan ref sebelum push dipisahkan dari kegagalan tes. Collector menyimpan error baru ke `collector-error-*.json`; status CI hanya diambil dari GitHub API, tidak ditebak dari error koneksi lokal.

Pengambilan archive artifact run ketiga ke temp privat juga timeout; [hasil download](evidence/phase-3f/revision-3/artifact-download.json) tidak mengklaim digest lokal telah diverifikasi. Metadata artifact dari GitHub tetap merekam ID, ukuran, expiry dan digest, sedangkan job log berhasil disimpan serta di-hash. Trace sintetis tidak dipublikasikan ke repository.

Run sukses historis [32331867993](https://github.com/luqelha/atlas-platform/actions/runs/32331867993) hanya menguji `e78af99` pada 20 Agustus 2026. Workflow remote saat discovery berbeda dari workflow lokal; run tersebut tidak diterima sebagai evidence Phase 3F.

## Hasil penelusuran operasional

[Discovery GitHub/Docker](evidence/phase-3f/discovery-1792061733010.json) dan [discovery operator](evidence/phase-3f/operator-discovery.json) merekam hasil operasi read-only berikut:

| Sumber pemeriksaan                           | Hasil aktual                                                                        | Implikasi untuk gate                                                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Git remote                                   | Remote `main` dan HEAD awal sama-sama `e78af99`; akses credential helper tersedia   | Remote CI dapat dijalankan pada branch kandidat terpisah                                                                  |
| GitHub environments / deployments / releases | HTTP 200; semuanya kosong                                                           | Tidak ada target staging atau previous release yang dapat diidentifikasi dari metadata tersebut                           |
| GitHub Actions secrets / variables           | HTTP 200; masing-masing 0 nama                                                      | Tidak ditemukan referensi akses staging/restore di konfigurasi repo; ini bukan bukti bahwa infra di tempat lain tidak ada |
| Konfigurasi lokal                            | `.env.production` tidak ada; hostname koneksi API/web hanya localhost/127.0.0.1     | Contoh `atlas.example.com` tidak diperlakukan sebagai staging aktual                                                      |
| Profil operator                              | Tidak ada profil AWS; satu alias SSH privat tanpa kaitan yang terbukti dengan Atlas | Tidak menghubungi host yang belum dapat diidentifikasi sebagai target tugas                                               |
| Image lokal                                  | Satu pasangan API/web `phase3e-verify`; tidak ada pasangan previous release berbeda | Tidak membuat tag rollback buatan dari image kandidat yang sama                                                           |

User belum mengetahui target staging/restore maupun referensi image rollback. Penelusuran yang tersedia tidak menemukan target yang dapat dibuktikan. Tidak ada DNS/domain, VM berbayar, secret production, backup production, atau release resmi yang dibuat untuk menggantikan informasi tersebut.

## Keputusan gate

| Gate                                                | Hasil / batas evidence                                                                                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Remote CI                                           | **Passed**: run `38727582906`, SHA `ab2c6e0`; seluruh langkah wajib, 9 tes browser dan build kedua container berhasil. Lihat release evidence JSON                       |
| Staging TLS, cookies, trusted identity              | **Blocked**: tidak ada endpoint staging teridentifikasi. Tidak ada klaim DNS/TLS/cookie staging telah diuji                                                              |
| Secret separation, escrow, effective grants staging | **Blocked**: tidak ada koneksi/runtime staging teridentifikasi. Tidak ada nilai secret dicetak; metadata GitHub tidak menggantikan verifier grant runtime                |
| Off-host restore                                    | **Blocked**: belum ada host pemulihan terpisah, akses backup/key escrow, recovery owner, atau target RTO/RPO. Tidak menjalankan restore ke target yang diasumsikan       |
| Compatible release rollback                         | **Blocked**: belum ada previous API/web digest pair yang dapat direview. Reader archive per-attempt dan fencing 3C wajib ada; release Phase 2 tidak memenuhi kontrak ini |

Image API lokal yang ditemukan: `sha256:44b58d1088b929aa639ab3c2dc714a6ea4ec22cf561ceaceb730e7a99a8bea7d`; web: `sha256:2d42bc9a27fb9cf0ffccfffddeaba259a02cc2489082112cf276776b9bfeb1a1`. Inventory Docker lokal tidak membuktikan immutable registry release provenance, pasangan rollback resmi, atau kesesuaian image deployment terhadap commit CI. Workflow CI membangun image lokal runner, tanpa publish registry.

Restore lokal 3E tetap valid dalam batas [evidence sebelumnya](evidence/phase-3e/README.md), tetapi tidak menutup recovery off-host. Rollback 3B tetap historis sebelum perubahan format/fencing 3C. Tidak ada rename/delete archive, down migration, aktivasi retention destructive, atau pengembalian runtime role menjadi owner.

## Artefak dan reproduksi

- [Release evidence JSON](evidence/phase-3f/release-evidence.json): keputusan gate, identitas kandidat/run, kegagalan, pemeriksaan source/preservation dan digest artefak.
- [Evidence README](evidence/phase-3f/README.md): perintah eksekusi dan batas runner.
- [Runbook deployment/recovery](DEPLOYMENT-RUNBOOK.md): prosedur runtime yang tetap memerlukan target teridentifikasi.

Prosedur filter branch diperiksa melalui Context7 pada [dokumentasi resmi GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow). `workflow_dispatch` tidak digunakan karena workflow default branch belum menyediakannya; syaratnya dijelaskan pada [dokumentasi manual run](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).

Assertion browser memakai locator berdasarkan role dan assertion yang melakukan retry sesuai [dokumentasi resmi Playwright](https://github.com/microsoft/playwright/blob/main/docs/src/test-assertions-js.md), juga diperiksa melalui Context7. Tidak ada peningkatan retry atau pelonggaran timeout untuk membuat run lulus.

Untuk menutup gate yang tersisa diperlukan target staging dan operator, host restore terpisah berikut backup/key custody dan RTO/RPO, serta pasangan image rollback kompatibel. Ini adalah penghambat eksekusi spesifik, bukan checklist yang dinyatakan lulus.
