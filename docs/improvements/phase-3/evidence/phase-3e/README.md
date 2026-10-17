# Evidence Phase 3E — Final Verification

Tanggal: 14–15 Oktober 2026, Asia/Jakarta. Regresi berasal dari 14 Oktober; restore dan finalisasi dilanjutkan 15 Oktober. JSON memakai UTC. Objek adalah working tree pada HEAD `e78af99e234687377d0f35a91128e66ac2ace72f`, bukan commit rilis bersih atau production.

## Metode dan batas

- `initial-file-hashes.json` mencatat 440 file existing non-ignored sebelum pekerjaan; `git-status-before.txt` mempertahankan konteks perubahan pengguna. Build memperbarui generated/ignored outputs.
- Host Windows, Node 22.18.0, npm 11.18.0. CI repository menggunakan Ubuntu/Node 24. Menyetel `CI=1` pada Playwright lokal tidak membuktikan GitHub Actions telah berjalan.
- Fixture `atlas-phase3e-review` dibuat baru setelah memastikan project belum ada, Docker socket lokal, dan port test kosong. PostgreSQL tmpfs/55432, Redis/56379, RabbitMQ/55672 hanya pada loopback. ID, image, port, dan tmpfs dicatat dalam `fixture.json`; runner memeriksa identitas sebelum tes yang mengubah data.
- Integration/E2E mengosongkan **hanya database fixture baru** antar tes. Tidak ada database existing/reset, migration-history edit, penghapusan volume existing, production deployment, atau aktivasi retention destructive. Deviasi volume anonim diagnostik pada 15 Oktober dijelaskan di bawah.
- E2E memakai suite/config repository, dengan setup tambahan `isolate-vault.cjs` untuk cwd/vault temp per suite dan lokasi tsconfig eksplisit. Assertion, mocks UUID/archiver dan threshold tidak diubah. Browser memakai vault temp dari config Playwright asli; API `NODE_ENV=test`, Next `NODE_ENV=production`. Production-mode API container diuji terpisah.
- `auditAll` mempertahankan exit 1 asli dari npm; `audit-policy.json` menerapkan fungsi policy repository tanpa menimpa artefak audit fase sebelumnya. Runtime audit adalah gate terpisah.
- `recovery.cjs` mengadaptasi runner 3C dalam memori hanya pada nama fixture, credential sintetis, queue dan destinasi evidence. Broker fixture dihentikan/dihidupkan; hanya proses API milik harness di-crash/restart. Row lease expired disiapkan eksplisit, bukan menunggu sepuluh menit.
- `restore.cjs` memakai assertion production smoke, privilege, manifest DB/vault, key dan restore dari runner 3B, dengan image kandidat baru dan project unik. Bagian rollback ke Phase 2 sengaja tidak dieksekusi karena tidak kompatibel dengan archive per-attempt; report mencatat gate tersebut. Tidak ada klaim rollback baru lulus.
- Saat sesi dilanjutkan 15 Oktober, proses restore lama tidak ditemukan dan tidak ada report selesai; fixture/image Docker 14 Oktober sudah tidak tersedia. Keadaan ini bukan hasil restore gagal/lulus. `interruption.json` mencatat batas bukti; `containers-resume-before.json` menjadi baseline Docker baru. Source baseline 440 file masih cocok. Rebuild lanjutan memakai output `*-resume.json` agar bukti lama tidak tertimpa. Runner restore-only diperbaiki untuk tidak lagi menginspeksi tag release lama yang tidak digunakan.
- Proxy smoke memakai network/container sintetis tanpa host port; script membersihkan container/network fixture miliknya. Volume existing tidak dihapus.
- **Deviasi prosedur:** probe registry pada 15 Oktober memakai image RabbitMQ dengan declared volume dan `--rm`. Satu volume anonim baru probe otomatis dibuat/dihapus oleh Docker; tidak ada broker dijalankan atau volume existing dimount. Ini tetap menyimpang dari instruksi jangan menghapus volume. `diagnostic-volume-review.json` menyimpan event dan identitas volume; `registry-probe.json` membatasi kesimpulan konektivitas. Hindari image dengan declared volume untuk probe sementara berikutnya.

## Artefak

`<check>.json` mencatat perintah, waktu dan exit code; `<check>.log` adalah output lokal (di-ignore Git). `validation-summary.json` menyimpan jumlah tes/hasil yang dapat direview tanpa log. `coverage.json` memuat coverage per file. `harness-attempts.json` mempertahankan kegagalan harness, terpisah dari kegagalan aplikasi. `drill-*.json` memuat checkpoint production-mode restore; `recovery-drill.json` memuat worker/broker recovery.

`preservation-check.json`, `containers-after.json` dan `changed-files.json` membuktikan lingkup perubahan akhir. Hash mencakup source/dokumen non-ignored, bukan seluruh filesystem atau data production. Backup/config/token fixture tetap pada direktori OS temp privat yang disebut report; jangan meng-commit backup, trace/token atau config tersebut.

Run restore final: [drill-1792059490242.json](drill-1792059490242.json), **10/10 checkpoint passed**. `containers-after.json` mencatat 14 container drill stopped, delapan named volume project retained, dan tiga container existing identik dengan baseline lanjutan. Satu anonymous volume probe registry yang dihapus otomatis adalah deviasi terpisah, tidak termasuk delapan named volume tersebut. `artifact-qa.json` mencatat pemeriksaan sintaks/format/tautan dokumen. `summarize.cjs` memvalidasi exit code, jumlah tes dan restore report sebelum menulis summary/preservation/manifest.

## Reproduksi

Gunakan checkout sendiri dengan dependency root lockfile terpasang. Runner lokal ini memakai lokasi npm Windows; sesuaikan resolusi CLI untuk OS lain tanpa mengubah fixture guard. Jangan menimpa evidence lama: salin folder hasil sebelum menjalankan ulang.

1. Pastikan Docker lokal, project `atlas-phase3e-review` belum ada, port 55432/56379/55672/4400/4401/3300 bebas. Jalankan `docker compose -p atlas-phase3e-review -f docker-compose.test.yml up -d --wait`. Jangan menghidupkan ulang project lama yang mungkin berisi data penting.
2. Catat ID ketiga container, `com.docker.compose.service`, image, loopback ports dan tmpfs ke `fixture.json` dalam bentuk array `{ service, id, image, ports, tmpfs }`. Jangan menggunakan identitas container dari eksekusi terdahulu.
3. Dari root, `node docs/improvements/phase-3/evidence/phase-3e/run-check.cjs generate`, lalu `migrate`. Provision melalui `scripts/database/create-runtime-role.sql` memakai `psql -X -v ON_ERROR_STOP=1` **pada container PostgreSQL fixture**. Fixture runtime password: `phase3e-test-runtime-password-not-production`; ini bukan credential production.
4. Jalankan check `unit`, `security`, `lintApi`, `lintWeb`, `typesApi`, `typesWeb`, `format`, `auditRuntime`, `auditAll`, `buildApi`, `buildWeb`. Build dijalankan per workspace agar tidak bergantung pada cache Turbo. Tidak ada `--fix`/major upgrade.
5. Jalankan `grants`, `integration`, `e2e`, `migrationStatus`, `browser` **berurutan**. Browser memerlukan build selesai; `--retries=0` membuktikan hasil tanpa retry. Jangan menjalankan cleanup suite bersamaan dengan browser/recovery.
6. `node docs/improvements/phase-3/evidence/phase-3e/run-operation.cjs recovery` setelah browser berhenti. `proxy` memakai fixture terpisah.
7. Jalankan operasi `imageApi`, `imageWeb`, lalu `restore`. Image tags khusus `atlas-api:phase3e-verify`/`atlas-web:phase3e-verify`; image ID immutable dicatat drill. Restore otomatis membuat project/volume baru tanpa host ports, berhenti pada assertion gagal, dan menghentikan container miliknya di akhir. Volume dipertahankan.
   Untuk menyimpan hasil lanjutan tanpa menimpa log lama, tambahkan `--resume` setelah nama operasi. Pada 15 Oktober hanya image dan restore dilanjutkan; container review 14 Oktober tidak dibuat ulang atau dipakai ulang.
8. Setelah seluruh tes berhenti, verifikasi ulang ID fixture lalu `docker compose -p atlas-phase3e-review -f docker-compose.test.yml stop`. PostgreSQL tmpfs adalah data sintetis disposable; jangan menambahkan `down -v`.

Dokumentasi runner browser diperiksa melalui skill Context7: [Playwright webServer](https://github.com/microsoft/playwright/blob/main/docs/src/test-webserver-js.md), [projects/retries](https://github.com/microsoft/playwright/blob/main/docs/src/test-projects-js.md). Repo tetap memakai config multi-server dengan `reuseExistingServer=false`.
