# Atlas observability contract

Phase 4A, 15 Oktober 2026. Implementasi ditujukan untuk API NestJS dan embedded export worker. Status eksekusi terkini ada pada [laporan Phase 4A](PHASE-4A-REPORT.md).

## Endpoints dan batas akses

Listener monitoring terpisah pada port **9091**, dengan empat endpoint read-only:

| Endpoint         | Kontrak                                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `/metrics`       | Prometheus exposition dari registry per proses, tanpa query/SQL/payload atau label identitas pengguna                                           |
| `/health/live`   | Proses dan event loop mampu melayani HTTP; tidak gagal hanya karena dependency outage                                                           |
| `/health/ready`  | 200 hanya bila tidak draining, probe DB/Redis/storage masih fresh dan up, transport serta channel consumer siap, dan outbox polling belum stale |
| `/health/worker` | Snapshot kesiapan embedded worker yang sama, termasuk jumlah handler aktif dan status komponen; bukan bukti keberhasilan setiap job             |

`/api/health` tetap kompatibel dengan kontrak sebelumnya (DB/Redis). Endpoint monitoring tidak ditambahkan ke router publik. Default standalone listener bind `127.0.0.1`; Compose production bind `0.0.0.0` **di network container tanpa published API/monitoring port**. Nginx hanya mengarah ke port aplikasi 4000. Jangan mem-publish 9091 ke WAN. Listener tidak menyediakan authentication; isolasi network merupakan batas aksesnya. Bila scraper berada di host lain, gunakan private network/VPN atau proxy mTLS yang dikelola operator.

Probe dijalankan terpisah dari scrape. Timeout 2,5 detik dan satu outstanding operation per dependency mencegah antrean probe yang tidak terbatas ketika driver hang. PostgreSQL memakai transaction timeout/maxWait dan `SET LOCAL statement_timeout`; tidak mengubah konfigurasi cluster atau grants. Redis tidak menerima command baru ke offline queue. Probe tidak menjalankan DDL/TRUNCATE atau membaca `_prisma_migrations`.

Freshness DB/Redis/storage adalah tiga kali interval sampling. Transport/channel menggunakan event koneksi/close yang aktual. Wrapper RMQ mengikuti callback setup channel; event close dari channel lama tidak boleh membatalkan kesiapan channel pengganti. Koneksi TCP saja tidak dianggap consumer siap. Health tetap harus dilengkapi canary export dan alert backlog untuk mendeteksi worker yang tersambung tetapi tidak menghasilkan output.

## Metrics

| Metric                                                                                                       | Interpretasi                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `atlas_http_requests_total{method,route,status_class}`                                                       | Seluruh response selesai/abort, termasuk guard failures dan 404; `route` template router atau `unmatched`                                                                                           |
| `atlas_http_request_duration_seconds` / `atlas_http_inflight`                                                | Latency histogram dan request aktif; middleware mencakup error sebelum handler/interceptor                                                                                                          |
| `atlas_dependency_up{dependency}`                                                                            | Hasil observasi database, redis, storage, broker, consumer                                                                                                                                          |
| `atlas_dependency_last_check_timestamp_seconds` / `atlas_dependency_probe_duration_seconds`                  | Freshness dan durasi probe; gauges up harus dibaca bersama freshness                                                                                                                                |
| `atlas_db_operation_duration_seconds{model,operation}` / `atlas_db_inflight_operations`                      | Durasi Prisma operation termasuk client queue wait; **bukan** pengukuran pool-wait terpisah atau ukuran pool koneksi                                                                                |
| `atlas_cache_access_total{outcome}`                                                                          | Hit, miss, read_error, write_error pada response cache; bukan semua penggunaan Redis                                                                                                                |
| `atlas_export_tasks{status}`                                                                                 | Jumlah record export yang belum expired, dari DB; gauge diulang setiap API replica, gunakan `max` antar replica, bukan `sum`                                                                        |
| `atlas_export_oldest_pending_timestamp_seconds`                                                              | Waktu pembuatan Pending tertua; 0 berarti tidak ada Pending, bukan backlog sejak epoch                                                                                                              |
| `atlas_export_expired_leases`                                                                                | Processing yang belum expired tetapi lease hilang atau telah lewat                                                                                                                                  |
| `atlas_export_dispatch_total{outcome}`                                                                       | Hasil poll outbox success/error, termasuk poll idle                                                                                                                                                 |
| `atlas_export_dispatch_last_tick_timestamp_seconds` / `atlas_export_dispatch_last_success_timestamp_seconds` | Heartbeat poll terpisah dari traffic; success idle tidak membuktikan broker dapat menerima publish                                                                                                  |
| `atlas_export_worker_total{outcome}` / `atlas_export_worker_duration_seconds`                                | Outcome delivery: completed, failed, retry, skipped, stale, draining. Delivery count bukan jumlah job unik                                                                                          |
| `atlas_export_worker_inflight` / `atlas_draining` / `atlas_shutdown_total`                                   | Handler aktif, admission drain, hasil drain; hasil shutdown juga wajib dibaca di structured log karena proses dapat berhenti sebelum scrape berikutnya                                              |
| `atlas_vault_available_bytes` / `atlas_vault_size_bytes`                                                     | Filesystem yang benar-benar memuat vault; bukan disk seluruh host                                                                                                                                   |
| `atlas_retention_errors_total`                                                                               | Kegagalan inventory/cleanup, termasuk dry-run. Tidak mengaktifkan collector                                                                                                                         |
| `atlas_process_*` / `atlas_nodejs_*`                                                                         | CPU, resident memory, heap, event loop dan metrics runtime standar client Prometheus                                                                                                                |
| `rabbitmq_queue_messages_ready`, `rabbitmq_queue_messages_unacked`, `rabbitmq_queue_consumers`               | Exporter native RabbitMQ, agregat broker default; bukan queue per-tenant. Dedicated broker direkomendasikan untuk interpretasi panel ini; shared broker memerlukan konfigurasi per-queue terkontrol |
| `alertmanager_notifications_failed_total` / `atlas_alert_journal_events{status}`                             | Kegagalan delivery dan jumlah notifikasi firing/resolved yang masih disimpan journal                                                                                                                |

Model, operation, HTTP method/status class, dependency dan outcome dibatasi ke himpunan tetap. Tidak ada label tenant ID, user ID, job ID, email, raw URL, query string, error message, SQL, JWT atau password. Counter/histogram process-local reset saat restart; gunakan `rate`/`increase`. Data job DB bertahan melewati restart; ketika DB probe gagal, gauges terakhir mungkin stale dan harus dibaca bersama `atlas_dependency_up`/timestamp.

## Dashboard dan alerting

Dashboard provisioned UID `atlas-operations` memiliki **26 panel**: API rate/p95, health/freshness, DB latency/inflight, cache, export/backlog/leases/dispatch, worker outcome/latency, queue ready/unacked/consumers, vault free, CPU/RSS/event loop, delivery/journal dan drain. Datasource UID `atlas-prometheus` memakai akses server-side ke Prometheus. Grafana anonymous access dan signup dimatikan; password admin harus secret terpisah.

Aturan mencakup API scrape hilang/down, dependency down, stale probe, pending backlog, expired lease, stalled dispatcher, worker failure/retry, vault <10%, error rate >5% dengan traffic minimum, HTTP p95 >2 detik, retention errors, broker exporter/consumer, serta kegagalan jalur alert. Threshold dan hold duration adalah baseline operasional awal, **bukan SLO/SLA yang telah diukur di production**. Delapan belas scenario promtool mencakup seluruh 16 alert: pending/firing, hold duration, recovery, absent series dan false-positive pada backlog kosong/traffic rendah.

Alur delivery: Prometheus → Alertmanager → **durable local journal**. Journal menerima webhook internal, menulis atomic file dan menyimpan 200 notifikasi terakhir dengan label allowlist. HTTP 200 baru dikirim setelah file tersimpan; error penulisan mengembalikan 503 agar Alertmanager melakukan retry. Ini bukti delivery internal, **bukan paging manusia**. Receiver on-call dan penanggung jawab nyata belum dikonfigurasi; pasang integrasi yang disetujui operator sebelum rollout. Jangan memasukkan webhook URL/token atau contoh secret nyata ke repository.

## Menjalankan stack

Gunakan release/image pair yang disetujui, database roles dan secret environment privat sesuai runbook deployment sebelumnya. File `.env.production.example` hanya contoh. Setelah memeriksa target dan approval rollout:

```powershell
docker compose --env-file <private-env-file> -f docker-compose.prod.yml -f docker-compose.observability.yml config --quiet
docker compose --env-file <private-env-file> -f docker-compose.prod.yml -f docker-compose.observability.yml up -d
```

Jangan mencetak resolved Compose config: nilainya memuat secrets. `migrate` adalah operasi owner yang tetap mengikuti [runbook deployment](../phase-3/DEPLOYMENT-RUNBOOK.md); jangan menjalankan `up` terhadap target existing yang belum direview. Endpoint lokal ops: Grafana `127.0.0.1:3301`, Prometheus `127.0.0.1:9090`, Alertmanager `127.0.0.1:9093`. Akses remote menggunakan tunnel yang disetujui, bukan bind WAN. Journal dan API metrics tidak memiliki published port pada konfigurasi production.

Versi image eksplisit: Prometheus 3.15.0, Alertmanager 0.34.1, Grafana 13.2.4. Runtime client adalah `@prometheus-io/client` 0.16.1, penerus resmi `prom-client` yang sudah deprecated. Batas awal stack: Prometheus 512 MiB/1 CPU, Alertmanager 128 MiB/0,5 CPU, journal 128 MiB/0,25 CPU, Grafana 384 MiB/0,5 CPU. Prometheus retention dibatasi 15 hari/2 GB. Ini budget awal yang perlu dibandingkan dengan workload; tidak membuktikan kapasitas production.

## Referensi dokumentasi

Instruksi client, transport status dan alert-rule testing diperiksa melalui Context7 pada [Prometheus Node client](https://github.com/prometheus/client_js), [NestJS RabbitMQ](https://docs.nestjs.com/microservices/rabbitmq), dan [promtool rule tests](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/). Provisioning mengikuti [Grafana](https://grafana.com/docs/grafana/latest/administration/provisioning/); exporter mengikuti [RabbitMQ](https://www.rabbitmq.com/docs/prometheus). Tag diverifikasi pada rilis resmi [Prometheus](https://github.com/prometheus/prometheus/releases/tag/v3.15.0), [Alertmanager](https://github.com/prometheus/alertmanager/releases/tag/v0.34.1), [Grafana](https://github.com/grafana/grafana/releases/tag/v13.2.4).
