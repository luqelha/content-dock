# Phase 3F — Release Gate Closure

Tanggal: **15 Oktober 2026, Asia/Jakarta**. Status: **belum closed; release ditahan**. Phase ini menjalankan remote CI untuk snapshot kandidat dan menelusuri akses operasional. Tidak ada deklarasi production-ready dari hasil discovery atau bukti lokal historis.

## Identitas kandidat dan remote CI

Snapshot kandidat revisi: `ef2e90b207e3bad000ddb669f483ea363702261d`, tree `fc12baee632c93f856bb0d4670d15830c6b0b5ab`, branch `release/phase-3f-20261015110330`. [Manifest kandidat revisi](evidence/phase-3f/revision-2/candidate.json) mencatat 348 file beserta Git blob IDs, perubahan dari HEAD awal, pengecualian output lokal, serta hash index pengguna sebelum operasi. Parent-nya adalah [kandidat pertama](evidence/phase-3f/candidate.json), `16d13ae50c5f4df7912e5b6da751e74cff4a7698`.

Kandidat dibuat memakai index Git sementara dan `commit-tree`, kemudian dipush tanpa force ke branch baru. Branch/index pengguna dan `main` dipertahankan. Filter push pada workflow diperluas untuk `release/phase-3f-*`, sehingga run memakai workflow kandidat tanpa memerlukan perubahan default branch atau PR. Tidak ada deployment job dalam workflow tersebut.

[Run CI kandidat revisi](https://github.com/luqelha/atlas-platform/actions/runs/38724658176) terikat pada SHA kandidat, bukan pada dirty working tree. Status terminal, step conclusions, log digest dan artifact metadata dicatat dalam [release evidence](evidence/phase-3f/release-evidence.json). Snapshot observasi `remote-ci-*.json` dipertahankan, termasuk status berjalan dan kegagalan. Log job `.log` berada lokal dan di-ignore Git.

[Run pertama](https://github.com/luqelha/atlas-platform/actions/runs/38724067559) **gagal** pada `format:check:reliability`: `tests/browser/auth-forms.spec.ts` belum sesuai Prettier. Instalasi dependency, migration dan tiga tes database-role sudah berhasil sebelum tahap tersebut. Perbaikannya hanya membagi pemanggilan `page.screenshot` menjadi beberapa baris; assertion tidak diubah. Check format lokal lulus setelah perbaikan, kemudian snapshot revisi dipush ke branch baru. Run gagal, log dan hash-nya tetap dipertahankan.

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
| Remote CI                                           | Run kandidat benar-benar dipicu di GitHub; hasil terminal dan kelulusan diperiksa dalam release evidence JSON                                                            |
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

Untuk menutup gate yang tersisa diperlukan target staging dan operator, host restore terpisah berikut backup/key custody dan RTO/RPO, serta pasangan image rollback kompatibel. Ini adalah penghambat eksekusi spesifik, bukan checklist yang dinyatakan lulus.
