# Phase 3B — Deployment, backup/restore and rollback

Tanggal review: 13 Oktober 2026 (Asia/Jakarta). Status: **preflight dan full runtime drill lokal telah lulus, termasuk fresh export setelah rollback dan restore**. Pengguna sudah menyetujui stack lokal baru dengan data sintetis. Bukti final: [drill-1791871073983.json](evidence/phase-3b/drill-1791871073983.json). Otorisasi ini tidak mencakup production deployment. Lihat [gate matrix](PRODUCTION-READINESS.md).

## 1. Batas operasi dan prerequisites

Untuk drill otomatis, dapatkan persetujuan eksplisit **stack Docker lokal baru, terisolasi, data sintetis**. Jangan mengarahkan runner ke staging existing/production. Current Docker context harus socket lokal; tidak boleh `DOCKER_HOST` override. Runner tidak menerima URL DB atau URL aplikasi eksternal.

Persetujuan production deployment berbeda dari persetujuan drill. Instruksi task bagian Mandatory Safety Constraints meminta berhenti pada batas otorisasi untuk operasi persistent data, external infrastructure atau live services. Riwayat penolakan policy Phase 2 tidak diatasi dengan menggunakan jalur lain.

Prasyarat lokal:

1. Docker Desktop engine Linux dan Compose yang mendukung `!reset` (preflight memakai Compose v5.5.1).
2. Node sesuai root engines; dependency lokal untuk security tests.
3. Ruang disk/memory cukup untuk dua project terpisah; source akan dihentikan sebelum restore untuk membatasi pemakaian. Semua volume dipertahankan.
4. Candidate images dari working tree serta previous pair `atlas-api:security-phase2` / `atlas-web:security-phase2` tersedia. Ini previous local fixture, bukan release production resmi. Jangan tag image sembarang sebagai previous release.
5. Simpan key/config/dump hanya pada private OS temp directory yang dicatat report. Direktori mengandung secret sintetis; jangan commit/upload. Windows mengandalkan ACL profil/temp pengguna, bukan semata POSIX mode 0600.

## 2. Build dan preflight yang aman diulang

Jalankan dari root repo:

```powershell
docker build -f apps/api/Dockerfile -t atlas-api:phase3b-candidate .
docker build -f apps/web-admin/Dockerfile -t atlas-web:phase3b-candidate .
node --check scripts/security/phase3b-drill.cjs
node --check scripts/security/phase3b-smoke.cjs
node scripts/security/phase3b-drill.cjs --preflight
```

Catat exit code native tool (`$LASTEXITCODE` pada PowerShell) dan log. PowerShell 5 dapat memperlakukan stderr Docker sebagai `NativeCommandError`; jangan menyimpulkan build gagal dari wrapper saja. Build pertama API pada fase ini memang gagal npm `ECONNRESET`; retry berhasil. Root lockfile tetap menjadi input `npm ci`.

Preflight tidak menjalankan migrate, provisioning, startup, backup atau restore. Ia memakai Compose production existing ditambah override temporary: project unik, internal network, semua published ports dihapus, TLS profile tidak aktif, retention disabled. Jangan mencetak hasil `compose config` mentah; hasil resolved config berisi secret.

## 3. Jalankan drill hanya setelah lingkungan lokal disetujui

```powershell
node scripts/security/phase3b-drill.cjs --approved-isolated-local
```

Hasil final lokal: rollback 20.074 detik, backup setelah quiesce 1.053 detik, restore + pemeriksaan 34.726 detik; seluruh sembilan tabel dan empat file snapshot cocok, tanpa row snapshot hilang. Angka fixture kecil ini bukan SLA RTO/RPO production. Seluruh container drill dihentikan dan volume dipertahankan.

Runner mencetak nama check dan menyimpan report `evidence/phase-3b/drill-<timestamp>.json`. Semua child command punya timeout; HTTP probe juga punya deadline. Jika gagal, report harus tetap failed; jangan menyalin failure menjadi pass atau menghapus log. Periksa hanya resource dengan project name dari report. Jangan menggunakan `docker compose down -v` atau membersihkan stack lama.

Urutan yang akan dijalankan:

1. Resolve candidate/previous API+web ke immutable image ID. Tolak remote Docker dan project/resource bernama sama yang sudah ada.
2. Generate credential owner/runtime/JWT/proxy/broker/key yang terpisah. Render dan validasi config, tanpa menampilkan secret.
3. Mulai PostgreSQL/Redis/RMQ baru; migrate dengan owner; provision `atlas_app` menggunakan SQL existing. Tidak menjalankan integration/E2E helper yang melakukan TRUNCATE fixture existing.
4. Jalankan verifier runtime read-only dan delapan negative SQL probes dalam rollback transaction. Setiap probe harus ditolak SQLSTATE `42501`; unexpected success menggagalkan drill. Periksa schema CREATE tambahan dan sequence grants.
5. Mulai API production, web standalone dan Nginx. Inspect image ID, non-root app user, network tunggal internal, tanpa port host, volume prefix project. Smoke melalui Nginx dari dalam network.
6. Buat dua akun/tenant terpisah, category/content, upload PNG dan export. Verifikasi auth, forged tenant, cross-tenant content/media/export access, unauthenticated downloads, decrypted ZIP tenant records, BFF file response, validasi error dan protected page redirect. Test tidak mengemulasikan login Server Action/browser Secure cookies.
7. Quiesce ingress, web dan API/worker; deploy previous API+web ID secara terkoordinasi. Nginx dihentikan dan dimulai kembali agar upstream DNS di-resolve ulang ke container aplikasi yang aktif. Ulang smoke dan privileges, termasuk membuat export baru sampai selesai; migration history harus tetap sama. Kembalikan kandidat dan ulang verifikasi.
8. Ambil manifest vault lalu stop semua app writers; baca manifest sembilan tabel. Buat custom-format `pg_dump`, tar encrypted vault read-only. Simpan digest backup; stop source infrastructure. Backup file membutuhkan database dan key/config dari checkpoint yang sama.
9. Buat restore project baru. Pastikan public schema kosong; buat role non-owner dengan atribut yang sama. Restore dengan `pg_restore --exit-on-error --single-transaction`, tanpa `--clean`/`--no-acl`/`--no-owner`. Owner tetap `atlas_owner`; ACL aplikasi berasal dari dump; CONNECT runtime diberikan eksplisit.
10. Compare hash+row count seluruh tabel, ulang privilege verifier. Restore vault hanya ke volume project baru yang tidak mengandung file, termasuk ownership file. Muat key/config dari private saved environment file. Mulai app tanpa menjalankan migrasi ulang terhadap backup.
11. Compare semua hash file vault sebelum writes baru; ulang smoke atas data yang sama dan buat export baru sampai selesai pada worker yang dipulihkan. Media dan export plaintext harus identik. Key yang hilang dan salah harus ditolak oleh FileVault. Catat elapsed recovery, rollback, fixture rows dan kehilangan row; angka lokal bukan RTO/RPO production.
12. Stop resource project yang dibuat, pertahankan semua volume dan backup. Report failed jika final stop gagal. Helper backup/restore yang berhasil sudah exited; tidak ada penghapusan volume.

Kelulusan runtime membutuhkan **seluruh** assertion sukses dan `status: passed`. `preflight-passed-runtime-not-executed` bukan hasil runtime. Re-run memakai project baru; jangan reuse/mengosongkan database dari percobaan sebelumnya. Branch runtime runner sudah lulus pada laporan final. Dua kegagalan harness awal (evaluasi query sequence dan opsi Compose create) diperbaiki lalu seluruh alur diulang; semua laporan gagal tetap disimpan. Pada operasi berikutnya, tetap bedakan incompatibility/probe mismatch dari defect aplikasi.

## 4. Gate staging / production yang tidak digantikan drill lokal

Operator mencatat target, owner, window, source/release manifest, current and previous image digest pair, dan dependency/version compatibility. Inventaris DB/volume/mount; pastikan target tidak sama dengan stack development lama atau production yang belum diotorisasi.

Verifikasi secret tanpa nilainya: JWT access/refresh/proxy berbeda dan cukup kuat, key storage 64 hex dan tersedia dari escrow, DATABASE_APP_URL non-owner, credential migrator tidak ada pada API, CORS/domain benar, NODE_ENV production, retention false. Runtime verifier existing dijalankan melalui runtime connection:

```text
psql <approved-runtime-connection> -X -v ON_ERROR_STOP=1 -f scripts/database/verify-runtime-role.sql
```

Placeholder connection harus dipasok lewat mekanisme secret operator; jangan menempel URL berpassword ke ticket/log/shell history. Verifier ini read-only. **Jangan menjalankan negative DDL/TRUNCATE probes atau `test:security:db` terhadap lingkungan real**; probe aktif runner hanya untuk fresh synthetic DB.

Migrate dengan approved owner sebelum startup API. Untuk instalasi baru, provision runtime role sesudah migration dan sebelum API; untuk role existing, review privileges dan grant additive ExportTask sesuai [database runbook](../../../scripts/database/README.md), jangan rerun create-role atau mengganti role owner untuk menyelesaikan error.

TLS publik: cek DNS ke host yang benar, chain/hostname/expiry, HTTP→HTTPS redirect dan forwarded HTTPS/client identity melalui Caddy→Nginx. Jalankan browser login/logout/refresh, workspace switching, upload/export/download dengan Secure/HttpOnly/SameSite cookies. Jangan menganggap validasi Caddy/Nginx lokal membuktikan TLS publik. Remote CI harus punya URL run dan SHA yang sesuai release.

Readiness `/api/health` membuktikan DB/Redis saja. Wajib export synthetic selesai untuk broker/consumer. Tetapkan monitoring queue depth/unacked, export age/failed tasks, DB pool, disk free, resource budget dan owner on-call. Uji Redis/RMQ outage dan active-job drain secara terpisah setelah lingkungan/failure window disetujui; runner ini belum mencakup semua failure injection Phase D.

## 5. Backup/restore operasional

Sebelum perubahan release, tentukan RTO/RPO, backup timestamp, data volume, backup location, encryption/access policy, key version dan role mapping. Database dump sendiri tidak berisi global roles; `pg_dumpall --globals-only` dapat berisi sensitive role information dan membutuhkan kebijakan tersendiri. Untuk production, dokumentasikan apakah global roles dibackup secara aman atau direkonstruksi dari provisioning terkelola. Jangan restore globals cluster lain secara buta.

Masukkan maintenance mode/stop ingress writes, hentikan API/embedded worker setelah antrean/in-flight diketahui aman, lalu ambil DB+vault checkpoint. Jika tidak quiesce, diperlukan mekanisme snapshot consistency yang teruji. P3A-03 stale lease berarti jangan membiarkan versi worker lama dan baru berjalan bersamaan. Dump consistent per DB tidak otomatis menjamin file consistency.

Restore ke cluster/database **baru dan kosong**, bukan overwrite target existing. Restore roles/ownership/ACL, DB, vault, key/config yang tepat. Verify migration history, seluruh business table counts/digests, metadata→file references, decrypt media/export, auth dan cross-tenant denial. Fresh Redis/RMQ tidak memulihkan cache/rate-limit counters/invitations; backup requirement untuk state tersebut harus disepakati. Pending/leased job recovery setelah broker state hilang perlu latihan tersendiri; drill yang dijalankan memulihkan completed exports, lalu membuktikan worker dapat menyelesaikan export baru.

Jangan cut over hanya karena `pg_restore` exit 0. Key salah/missing, file hilang, atau runtime role terlalu luas menggagalkan restore gate. Off-host storage, retention dan restore owner harus tervalidasi; plaintext dump/token/config tidak boleh masuk evidence publik. Retention collector tetap disabled.

## 6. Rollback operasional

Trigger: startup/readiness gagal, auth/tenant boundary gagal, download corrupt, atau critical error rate melewati threshold yang ditetapkan operator. Bekukan rollout dan catat timestamp; stop ingress dan new jobs. Drain/stop API+embedded worker serta web sebelum switch pair, jangan campurkan incompatible worker versions.

Gunakan previous **immutable release digest pair yang direview**. Pertahankan DATABASE_APP_URL non-owner, key, DB/vault mounts dan environment contract. Rollback aplikasi tidak berarti rollback schema: migration additive dipertahankan; jangan edit applied migration atau menjalankan down migration otomatis. Jika previous version tidak kompatibel, hentikan rollback aplikasi dan ikuti reviewed forward-fix/recovery plan.

Recreate edge agar upstream alamat benar, verifikasi health, auth, tenant separation, upload/download dan worker export. Buktikan data/checkpoint serta migration history tidak berubah tanpa rencana. Cutover baru dilakukan setelah semua check lulus; jika gagal, tetap maintenance dan eskalasi ke owner. Restoring data dapat kehilangan writes sesudah backup sehingga merupakan keputusan terpisah dengan approval/RPO yang eksplisit.

## 7. Tambahan Phase 3C

Sebelum rollout perbaikan lease, baca [RELIABILITY-REVIEW.md](RELIABILITY-REVIEW.md#deployment-dan-rollback): migration `20261013000000_export_lease_token` additive, drain seluruh worker lama, reader archive per-attempt dan batas rollback wajib direview. Jangan mencampur worker lama yang belum memeriksa token dengan worker baru. `STORAGE_RETENTION_ENABLED=false` dan `STORAGE_RETENTION_DRY_RUN=true` tetap baseline. Bukti drill 3B tidak otomatis membuktikan rollback format archive 3C.

## Tambahan Phase 3E — 15 Oktober 2026

Gunakan [laporan final](FINAL-IMPROVEMENT-REPORT.md) untuk gate terkini dan [evidence/reproduksi 3E](evidence/phase-3e/README.md) untuk fixture yang diuji. Bukti regresi, image build dan worker recovery lokal sudah tersedia. Runner restore 3E memeriksa kandidat terbaru pada project source/restore baru, tanpa rollback ke Phase 2 dan tanpa bergantung pada image release lama. Keberhasilan restore kandidat tidak membuktikan rollback release.

Sebelum release, rekam URL/SHA CI, immutable image digest API/web kandidat dan rollback yang kompatibel, bukti TLS/cookies/trusted identity, secret/key escrow serta grants target, owner/hasil restore off-host dan RTO/RPO. Drain semua worker lama sebelum migration additive/deploy. Pertahankan retention default-off/dry-run. Tidak ada otorisasi deployment production atau deletion retention yang diberikan oleh laporan ini.

## Referensi prosedural Phase 3B

Dokumentasi resmi diperiksa melalui Context7: [Compose project names](https://github.com/docker/docs/blob/main/content/reference/compose-file/version-and-name.md), [Compose merge/reset](https://github.com/docker/docs/blob/main/content/reference/compose-file/merge.md), [Compose networking](https://github.com/docker/docs/blob/main/content/manuals/compose/how-tos/networking.md), [PostgreSQL 15 pg_dump](https://www.postgresql.org/docs/15/app-pgdump.html), [PostgreSQL dump/restore dan global objects](https://www.postgresql.org/docs/15/backup-dump.html).
