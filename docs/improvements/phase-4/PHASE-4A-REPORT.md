# Phase 4A — Observability & Operational Resilience

Tanggal: **15 Oktober 2026, Asia/Jakarta**. Objek: working tree pada HEAD `e78af99`, termasuk perubahan pengguna dari fase sebelumnya. Evidence Phase 3F tetap historis dan tidak dipakai sebagai CI untuk source Phase 4A.

**Implementasi dan verifikasi lokal Phase 4A lulus.** [Drill final](evidence/phase-4a/drill-1792068888186.json) lulus **9/9 checkpoint** pada project baru `atlas-phase4a-765b8399c3`; seluruh notifikasi outage yang diperiksa diterima firing lalu resolved oleh journal internal. Tidak ada rollout staging/production atau paging manusia.

| Verifikasi                          | Hasil aktual                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Unit dan coverage                   | 193 passed, 25 suite; threshold existing dipertahankan                                                              |
| Integration / API E2E               | 26 / 19 passed pada fixture DB terpisah; vault E2E memakai temp per suite                                           |
| Health/worker unit baru             | 13 passed: privacy, stale/hung probe, channel replacement, drain dan settlement/fencing                             |
| Alert rules                         | 18 scenario promtool meliputi seluruh 16 alert; canonical hold duration, firing, recovery dan false positives diuji |
| Journal / Compose exposure          | 2 Node tests passed: persistence/bounds/label allowlist dan private/loopback ports serta broker mount merge         |
| Typecheck / lint / security / audit | Lulus; runtime dependency audit tidak melampaui gate moderate                                                       |
| Build                               | API dan journal image dibangun; 105 emitted JavaScript files lokal cocok dengan API image setelah normalisasi CRLF  |
| Dashboard                           | Grafana UID provisioned benar, datasource sehat, seluruh 26 PromQL berhasil dieksekusi                              |

Durasi checkpoint end-to-end fixture: Redis **88,147 dtk**, broker **89,717 dtk**, pause PostgreSQL **90,678 dtk**, vault penuh **90,796 dtk**, crash/lease recovery **121,503 dtk**, active-worker drain/restart **13,385 dtk**. Angka mencakup hold duration alert, delivery dan pemeriksaan recovery; bukan pure service restart time atau SLA production. Canary ZIP tetap memiliki SHA-256 `cc2e23cd8e462662d6f7efbda0c98ac7eeeab8ecc5537e33a6efdf82e9f46697` sesudah fault/restart.

API image yang diuji adalah `sha256:43d8ad230b4f9c12ac6d891f1308d6e0e9e0b383ada86d5a1e3882e1ea7decf5`; [pembandingan compiled code](evidence/phase-4a/image-code-verification.json) memverifikasi 105 file tanpa mismatch. Ini bukan bukti publish registry/release provenance. Dua panel tidak mempunyai series pada akhir drill: response cache tidak menerima workload CMS pada fixture ini, dan pending age kosong karena seluruh Pending telah terselesaikan; PromQL tetap valid.

Implementasi metrics, private health listener, dashboard provisioned, alert pipeline, drain dan failure-injection runner tersedia. Hasil terminal pemeriksaan dan drill dirangkum dalam [validation-summary.json](evidence/phase-4a/validation-summary.json). Laporan ini tidak memberi otorisasi deployment production atau menyatakan gate release Phase 3F sudah closed.

## Perubahan yang dibangun

- Registry metrics per proses memakai `@prometheus-io/client` 0.16.1; HTTP middleware mencakup response error/guard/404 dengan route template, Prisma operation latency/inflight, cache outcome, dependency health/freshness, export states/age/lease/dispatch, worker outcomes/duration/inflight, vault space, process CPU/RSS/event loop, retention errors dan drain.
- Listener privat 9091 menyajikan metrics, liveness dan readiness/worker health. RMQ wrapper mengamati setup/close consumer channel, bukan hanya TCP. Probe deadline dan satu pending operation per dependency membatasi antrean probe. Readiness memakai freshness; metrics tidak memasukkan raw URL, tenant/user/job, email, token, SQL atau error-message sebagai label.
- Redis offline queue dinonaktifkan dan connection/reconnect budget dibatasi. Cache failure log tidak lagi mencetak upstream error message. Auth tetap fail closed ketika Redis tidak tersedia; bukan klaim login always-available.
- SIGTERM/SIGINT menghentikan admission/dispatcher, menunggu request/handler/publish aktif sebelum menutup DB/transport. Default grace 330 detik dengan Compose 360 detik; fixture menguji drain aktif pada grace 15 detik. Retention destructive tetap disabled/dry-run.
- Stack Prometheus 3.15.0, Alertmanager 0.34.1, Grafana 13.2.4 dan durable internal alert journal. Dashboard UID `atlas-operations` berisi 26 panel dengan datasource provisioned. Port ops hanya loopback; metrics API dan journal tidak dipublish pada production Compose.
- Aturan alert operasional, 18 scenario timing/firing/recovery promtool, Node tests journal/exposure, 13 unit baru, dan gate `test:observability` pada workflow CI. Workflow belum dijalankan remote untuk source Phase 4A.

Kontrak lengkap, interpretasi metric/replica dan perintah deployment ada pada [OBSERVABILITY.md](OBSERVABILITY.md). Penanganan incident, failure injection dan batas operasi ada pada [OPERATIONAL-RUNBOOKS.md](OPERATIONAL-RUNBOOKS.md).

## Validasi dan evidence aktual

`check-*.json` merekam command, waktu, exit code serta digest log; semua attempt dipertahankan. Unit/coverage saat implementasi lulus **193 tes / 25 suite**, termasuk seluruh 13 unit observability baru. Threshold coverage repository, termasuk worker 100% branches/lines, tidak diturunkan. Typecheck, lint API, security regression, runtime dependency audit, promtool/amtool config dan rule tests telah dijalankan; hasil akhir diverifikasi oleh summary, bukan diasumsikan dari daftar ini.

Drill baru memakai runtime role `atlas_app` yang dibuktikan dengan verifier read-only, dataset/credential sintetis, project acak baru dan port loopback acak. Ia memeriksa real export sampai ZIP plaintext valid, privacy metrics, dependency outage dengan firing/resolved delivery, bounded full vault, crash/expired lease, active-job drain dan Grafana datasource/panel queries. Sukses hanya bila seluruh checkpoint terminal passed dan container existing terjaga.

Fixture memakai sampling satu detik/scrape dua detik, **tanpa mengubah hold duration rules canonical**. DB berada pada tmpfs; vault memakai named tmpfs 64 MiB dan keeper agar arsip bertahan selama API crash/restart. Data fixture disposable setelah seluruh mount dilepas; volume retained bukan backup. Waktu recovery fixture bukan SLA RTO/RPO production.

## Attempt dan masalah harness yang dipertahankan

1. `drill-1792068213259.json`: fixture Prometheus semula memakai scrape interval dua detik tetapi timeout lima detik. Config production 15/5 detik valid; fixture diperbaiki menjadi 2/1 detik. Belum ada fault dieksekusi.
2. `drill-1792068399816.json`: runtime Prometheus sudah sehat, tetapi binding port network internal kosong. [Port probe](evidence/phase-4a/port-probe.json) membuktikan perilaku Docker Desktop ini. Fixture kini mempunyai network data internal dan network inspeksi baru; hanya API/ops yang mendapat binding loopback, sementara DB/broker tetap tidak dipublish.
3. `drill-1792068691002.json` adalah snapshot nonterminal sebelum runner berakhir 0. [Interruption record](evidence/phase-4a/interruption-atlas-phase4a-730ac3d36d.json) mencatat tidak ada proses runner tersisa, readiness API/Prometheus 200 dari pemeriksaan read-only, serta stop sembilan container milik fixture. Tidak ada fault sempat dimulai. Keepalive runner kini menahan event loop sampai async checks dan final cleanup selesai.

Registry juga menyatakan paket `prom-client` deprecated saat preflight dependency. Dependency sementara itu dihapus dan diganti penerus resmi; lockfile akhir hanya menambah 38 baris dari snapshot Phase 3F, tanpa upgrade dependency unrelated. Audit runtime lulus setelah perubahan.

## Batas hasil

Alert journal membuktikan delivery **internal** dan mempertahankan 200 notifikasi terakhir; ia bukan human paging atau audit log tak terbatas. Owner/on-call, receiver nyata dan escalation policy harus ditetapkan operator. Tidak ada pesan email/Slack/paging eksternal yang dikirim.

DB metric mengandung client queue wait dalam operation latency; pool-wait terpisah, kapasitas koneksi serta full disk inode exhaustion tidak diinstrumentasi langsung. Broker exporter default agregat, sehingga shared broker memerlukan konfigurasi queue terkontrol. Workload/performance multi-host, clock skew, broker disk failure dan seluruh ambiguous DB commit scenarios tidak diklaim selesai oleh drill ini.

Metrics/health management listener mengandalkan network isolation, tanpa authentication bawaan. Jangan mengeksposnya ke WAN. Threshold dan resource budgets merupakan baseline awal, bukan SLO terukur. Watchdog canary/synthetic export terjadwal dan paging manusia belum diaktifkan pada lingkungan nyata.

Staging TLS/secrets/grants, off-host recovery, pasangan rollback resmi serta release approval tetap merupakan gate terbuka dari Phase 3F. Tidak ada migration, role escalation, queue purge, reset DB existing, penghapusan volume existing, perubahan applied history, atau aktivasi retention destructive.
