# Atlas operational runbooks

Gunakan bersama [kontrak observability](OBSERVABILITY.md) dan [evidence Phase 4A](PHASE-4A-REPORT.md). Semua tindakan service/data harus menunjuk deployment yang telah diidentifikasi. Jangan menggunakan nama container, port, key, atau database dari fixture laporan untuk operasi production.

## First response

1. Catat waktu, deployment/instance, alert, impact pengguna, pemilik incident dan perubahan release terakhir. Owner/on-call production masih harus ditetapkan operator; journal lokal tidak mengirim paging manusia.
2. Bedakan `up` scrape dari `atlas_dependency_up`, freshness, dan readiness. `up=1` hanya membuktikan exporter dapat menjawab. Buka dashboard `Atlas — Operational Resilience`, lalu lihat queue/export dan HTTP metrics pada jendela yang sama.
3. Baca structured logs berdasarkan event/instance, tanpa menyalin header auth, cookie, URL DB/AMQP, key, SQL payload atau raw user input. Simpan log incident pada akses privat.
4. Periksa perubahan deployment, resource/disk dan connectivity sebelum restart. Liveness tetap sehat selama dependency outage; jangan membuat restart loop dari kegagalan readiness saja.
5. Setelah tindakan, verifikasi dependency fresh, readiness, canary export selesai dan dapat didekripsi, tenant/auth boundary, serta notifikasi resolved. Catat hasil dan durasinya; jangan menandai incident selesai hanya karena container `running`.

## API unavailable

Alert: `AtlasApiUnavailable`. Periksa apakah scraper/config/network gagal atau proses benar-benar berhenti. Probe `/health/live` melalui jalur privat. Bila proses hidup tetapi event loop/RSS/CPU tertekan, hentikan rollout dan periksa traffic/resource; jangan sekadar menambah replica jika DB/broker sudah jenuh. Bila perlu restart, gunakan graceful shutdown di bawah. Setelah crash, pastikan instance lama tidak kembali bercampur dengan worker versi yang tidak kompatibel, lalu verifikasi lease/outbox dan download lama.

## Dependency outage

Alert: `AtlasDependencyUnavailable`, `AtlasBrokerExporterUnavailable`, `AtlasBrokerNoConsumers`.

- **PostgreSQL:** validasi host/port, storage, connection budget dan server error log pada target yang benar. Gunakan runtime verifier read-only sesuai runbook database; jangan mengganti credential API menjadi owner, menambah grant luas, atau reset migration. Probe memakai bounded transaction; DB operation p95 mengandung client wait dan tidak dapat memisahkan lock/pool wait. Periksa aktivitas/lock melalui akses operator yang disetujui. Setelah kembali, tunggu probe fresh dan lakukan canary.
- **Redis:** periksa service/network/persistence. Offline command queue dimatikan sehingga error cepat; cache interceptor dapat fallback, tetapi auth rate limiting tetap fail closed ketika Redis tidak tersedia. Jangan mengklaim login tetap tersedia selama outage. Restart hanya service target bila penyebabnya jelas; jangan flush Redis production sebagai tindakan awal. Pastikan readiness dan auth/rate-limit kembali normal.
- **RabbitMQ:** periksa broker exporter, transport dan consumer channel, ready/unacked dan dispatcher heartbeat. Koneksi TCP sehat tidak membuktikan consumer siap. Jangan purge queue atau menghapus ExportTask untuk meredakan alert. Pending DB merupakan outbox durable; setelah broker pulih dispatcher mencoba lagi (interval 30 detik, publish timeout 5 detik). Periksa fresh export hingga Completed dan plaintext ZIP valid.
- **Storage:** ikuti runbook vault; readiness gagal bila filesystem tidak dapat diperiksa atau benar-benar penuh.

## Stale telemetry

Alert: `AtlasProbeStale`, `AtlasDispatcherStalled`. Pastikan scraper dan event loop hidup. Bedakan hasil lama `dependency_up=1` dari probe fresh. Sampler tidak menambahkan probe baru bila driver operation sebelumnya belum settle. Periksa pending operation, DB pool/locks dan network timeout sebelum restart terkoordinasi. Jangan mengubah gauge menjadi sehat atau meningkatkan threshold hanya untuk menghilangkan alert. Jika hanya exporter/config yang gagal, pulihkan telemetry dan tetap verifikasi aplikasi secara langsung.

## Export backlog

Alert: `AtlasExportBacklog`, `AtlasExpiredLease`, `AtlasDispatcherStalled`, `AtlasExportFailures`, `AtlasBrokerNoConsumers`.

1. Bandingkan record DB unexpired (`max` gauges antar replica) dengan queue ready/unacked, consumer readiness dan rate outcome. Completed/Failed count dalam gauge bukan total seumur hidup; worker counter adalah delivery, bukan unique jobs.
2. Periksa broker/database/storage terlebih dahulu. `retry` meninggalkan pemulihan kepada outbox/lease; `failed` adalah job final yang dapat dibuat ulang pengguna. Stale completion tidak boleh menimpa hasil attempt baru.
3. Lease normal 10 menit, compression budget 5 menit. Setelah crash, pemulihan Processing menunggu lease expired lalu polling berikutnya; jangan reset token/lease secara manual pada data live. Rehearsal mempercepat expiry hanya pada fixture baru, bukan prosedur production.
4. Jangan rename/delete archive per-attempt atau menurunkan worker ke reader Phase 2. Rollback harus membawa reader kompatibel dan fencing. Gate pasangan rollback resmi tetap terbuka dari Phase 3F.
5. Setelah pulih, buktikan fresh export, authenticated download dan canary lama masih identik; pantau backlog age menurun dan alert resolved. Retry counter dapat mempertahankan warning sampai jendela lima menit berlalu.

## Vault space

Alert: `AtlasVaultSpaceLow`, `AtlasRetentionErrors`. Periksa mount yang benar, free bytes/inodes dan filesystem error; metric statfs di sini mengukur bytes, bukan inodes atau seluruh disk host. Hentikan writes/rollout bila ruang habis. Tambah kapasitas atau pindahkan data melalui rencana recovery yang direview. Jangan menghapus arsip/media otomatis, menjalankan collector destructive, memutar key sembarangan atau mengganti mount kosong sebagai perbaikan cepat.

Retention tetap `ENABLED=false`, `DRY_RUN=true`. Error collector juga dapat terjadi pada inventory dry-run; baca event dan permission/filesystem sebelum mengulang. Backup DB + vault + key harus konsisten; restore off-host belum dibuktikan oleh fase ini. Full-disk drill hanya memenuhi tmpfs 64 MiB milik fixture, tanpa memenuhi disk host.

## HTTP errors or latency

Alert: `AtlasHttpErrors`, `AtlasHttpLatency`. Pilih route template yang bermasalah dan lihat status class, p95, DB operation p95/inflight, cache outcome, CPU/RSS/event loop serta dependency health. Error-rate rule memiliki traffic floor untuk mengurangi alert pada satu request. Histogram bucket/threshold awal bukan SLO. Periksa downstream/lock/query plan dan perubahan release sebelum menambah replica atau timeout. Jangan memasukkan URL aktual/query/email/tenant ke label untuk diagnosis; gunakan log privat terkontrol dengan correlation yang direview.

## Graceful shutdown and deployment drain

SIGTERM/SIGINT menandai instance draining terlebih dahulu, menghentikan outbox admission dan menolak request/delivery baru, kemudian menunggu HTTP, worker dan publish aktif sebelum `app.close()` menutup DB/Redis/transport. `/health/ready` dan `/health/worker` menjadi 503, `/health/live` tetap 200 selama drain. Pointer yang ditolak worker saat draining tetap dapat direkonsiliasi dari DB outbox.

Default grace **330 detik**, hard exit setelah grace +5 detik, Compose stop grace **360 detik**. Ini memberi ruang untuk compression budget lima menit; actual maximum-duration export belum dibuktikan dengan benchmark production. Drain yang habis waktu keluar nonzero dan perlu rekonsiliasi lease setelah restart. Jangan SIGKILL rutin atau menjalankan versi worker lama/baru bersamaan. Jika orchestrator memakai timeout berbeda, selaraskan nilainya sebelum rollout.

Keberhasilan ditunjukkan oleh event `SHUTDOWN_DRAIN_STARTED` dan `SHUTDOWN_DRAIN_FINISHED` dengan outcome `clean`, exit 0, job aktif Completed sebelum exit, serta canary lama tetap dapat diunduh setelah restart. Counter shutdown mungkin tidak terscrape sebelum proses berhenti; simpan structured logs. Jangan mengasumsikan exit 0 membuktikan seluruh broker queue kosong.

## Alert delivery

Alert: `AtlasAlertDeliveryFailed`, `AtlasAlertmanagerUnavailable`, `AtlasAlertJournalUnavailable`. Periksa Prometheus rule state, Alertmanager target/route/inhibition/silence dan receiver response. Journal baru menjawab 200 setelah atomic write; 503 harus membuat Alertmanager retry. Journal mempertahankan 200 notifikasi terakhir dengan whitelist label. Gunakan Alertmanager untuk state aktif, bukan hanya daftar notifikasi historis.

Receiver default hanya journal internal. Untuk paging manusia, tetapkan owner/on-call, secret reference, route severity/escalation dan tujuan yang disetujui, lalu lakukan test firing **dan resolved** melalui receiver nyata. Jangan menulis webhook URL/token ke config version control. Tidak ada email/Slack/paging eksternal yang dikirim oleh pekerjaan Phase 4A ini. Outage pada journal dapat membuat notifikasi terlambat; gunakan akses langsung Prometheus/Alertmanager bila jalur receiver yang sama gagal.

## Failure injection rehearsal

Jalankan hanya pada project lokal baru yang dibuat runner:

```powershell
node scripts/observability/validate.cjs imageApi
node scripts/observability/validate.cjs imageJournal
npm run test:observability
npm run drill:resilience
```

Runner menolak Docker remote/override dan reuse project. Ia memverifikasi ID/label container sebelum tiap fault, memakai port loopback acak dan network terpisah, serta membatasi full-disk ke named tmpfs 64 MiB. Keeper mempertahankan mount vault selama API crash/restart. PostgreSQL di-pause, bukan di-stop, agar tmpfs DB fixture tidak hilang di tengah pengujian. Data/credentials sintetis; migrator owner dipisahkan dari runtime `atlas_app`.

Fixture mempercepat sampling menjadi satu detik dan scrape menjadi dua detik dengan timeout satu detik. Hold duration pada alert canonical tidak diubah. Uji SIGTERM menahan lock AuditLog sepuluh detik hanya di DB fixture, menyuntik Pending job sintetis, kemudian membuktikan worker aktif selesai sebelum exit dengan grace fixture 15 detik. Ini bukan latihan lock/fault pada data live.

Evidence menyimpan waktu, outcome, event firing/resolved, hash download, image/container IDs, hasil grants dan cleanup. Raw log disanitasi dan di-ignore Git; config/key/token sintetis berada di temp privat. Runner menghentikan seluruh container project miliknya dan mempertahankan volume. Tmpfs fixture bersifat disposable dan hilang setelah seluruh mount dilepas; volume retained bukan backup data. Tidak ada `down -v`, reset DB existing, migration-history edit, atau collector destructive.
