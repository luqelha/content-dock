# Evidence Phase 4C

`validation-summary.json` merangkum hasil aktual. `check-*.json` menyimpan command, exit code, waktu, dan SHA-256 log. Log `.log` mengikuti ignore rule repository dan tersedia lokal; hasil terstruktur tetap dapat dibaca setelah checkout. `source-file-hashes.json` mengidentifikasi source/config/test yang diverifikasi, bukan snapshot preservasi working tree sebelum pekerjaan.

`unit-results.json` menyimpan hasil Jest. Contract snapshot ada di `apps/api/test/unit/contracts/__snapshots__/`. `database-regression-*.json` mencatat project/container fixture, migration, integration, E2E dan cleanup. Dataset hanya dibuat pada database test baru; vault E2E berada pada temporary directory. Tidak ada credential production dalam evidence.

Pemeriksaan individual:

```powershell
node scripts/quality/phase4c-check.cjs types-api
node scripts/quality/phase4c-check.cjs types-web
node scripts/quality/phase4c-check.cjs lint-api
node scripts/quality/phase4c-check.cjs lint-web
node scripts/quality/phase4c-check.cjs unit
node scripts/quality/phase4c-check.cjs web-contracts
node scripts/quality/phase4c-check.cjs build-api
node scripts/quality/phase4c-check.cjs build-web
npm.cmd run test:quality:db
```

Runner individual menimpa evidence check bernama sama; salin evidence ke direktori baru sebelum mengukur kandidat berikutnya. Runner database memakai nama project dan hasil baru per eksekusi.
