# Evidence Phase 3C

Tanggal pekerjaan: 13–14 Oktober 2026, Asia/Jakarta. Timestamp JSON/log memakai UTC. Scope working tree; bukan remote release/production.

- `initial-file-hashes.json`, `git-status-before.txt`: snapshot sebelum perubahan, termasuk perubahan pengguna dari fase sebelumnya.
- `coverage-before.json`, `unit-before.log`: pengukuran baseline ulang sebelum implementasi, 109 tests.
- `<check>.json` dan `<check>.log`: exit status, waktu, output pemeriksaan. `coverage-after.json`: coverage final.
- `audit-before.json`, `audit-after.json`, `dependency-paths.json`: dependency evidence. JSON audit asli juga dibuat oleh gate di `artifacts/dependency-audit/audit.json`.
- `browser-*-attempt.*`: kegagalan awal harness tetap dipertahankan. `browser.*` adalah eksekusi terbaru. HTML report/trace di root `playwright-report/` dan `test-results/` adalah generated artifacts, tidak diperlukan untuk instalasi aplikasi.
- `recovery-drill.json`: broker outage/reconnect dan restart worker reclaim expired lease dengan API, PostgreSQL, RabbitMQ dan ZIP nyata. Tidak menghentikan service existing di luar project baru.
- `first-pass/`: beberapa checks awal berjalan melalui Node 26 yang di-resolve oleh npm exec; checks yang relevan kemudian diulang pada Node 22 terpasang. Runner akhir memakai `node` langsung.
- `preservation-check.json`, `changed-files.json`: daftar perubahan relatif terhadap snapshot awal fase ini. Migration lama dan file yang tidak berkaitan dipertahankan.

## Reproduksi lokal

Gunakan clone/worktree sendiri, Node >=22.12, npm dan Docker. Jangan menjalankan cleanup helpers terhadap database existing. Stack yang digunakan pada sesi ini dibuat **baru** dengan project `atlas-phase3c-review`, PostgreSQL tmpfs di 55432, Redis 56379 dan RabbitMQ 55672; tidak menggunakan volume/data development.

1. Jalankan `npm ci` dan `npm run prisma:generate --workspace=@atlas/api`.
2. Pastikan nama project/port test bebas; buat project test baru dengan `docker compose -p atlas-phase3c-review -f docker-compose.test.yml up -d --wait`. Jangan menggunakan ulang project yang berisi data penting.
3. Set `DATABASE_URL=postgresql://atlas_test:atlas_test@127.0.0.1:55432/atlas_test?schema=public`, deploy migration dari workspace API. Provision role melalui `scripts/database/create-runtime-role.sql` pada container test saja dengan fixture password yang tercantum di runner (tidak pernah gunakan di production). Script provisioning menolak role existing.
4. Dari root: `node docs/improvements/phase-3/evidence/phase-3c/run-check.cjs <check>` untuk `unit`, `security`, `lint`, `typesApi`, `format`, `audit`, `auditRuntime`, `grants`, `integration`, `e2e`, `build`, `typesWeb`, `browser`. Integration/E2E/browser harus **berurutan** karena berbagi database; jangan jalankan browser saat fixture sedang direset.
5. Setelah browser/API test berhenti, `node scripts/security/phase3c-recovery.cjs`. Harness memverifikasi label project dan tmpfs, memakai port API 4401 dan vault temp, menghentikan/menghidupkan broker test dan menghentikan/restart proses API miliknya. Jangan jalankan bersamaan dengan suite lain.

Runner menyetel fixture env eksplisit dan tidak mengubah `.env` pengguna. Playwright CI server memakai vault temp dan API port 4400, web 3300. Mode lokal tanpa `CI` tetap memakai server yang disediakan pengguna dan target-health guard existing. Tidak ada deployment production, metadata purge, deletion collector terhadap storage existing, atau penghapusan volume pada sesi ini.

Raw logs dapat memuat ID/email akun sintetis serta stack error yang sengaja diinjeksikan. Tidak ada secret production dimasukkan dalam fixtures. Audit findings exception berlaku sampai 13 November 2026, bukan suppress permanen.

Sesudah validasi final 14 Oktober, hanya tiga container project `atlas-phase3c-review` dihentikan; container/volume tidak dihapus. Database fixture memakai tmpfs, sehingga reproduksi berikutnya perlu migration/provisioning ulang. Stack development existing tidak dihentikan atau diubah oleh cleanup ini.
