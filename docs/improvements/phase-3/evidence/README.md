# Evidence — Phase 3A

Tanggal pemeriksaan: 13 Oktober 2026, timezone pelaporan Asia/Jakarta. Semua perintah di bawah dijalankan dari root repository dengan dependency lokal existing. Log dinormalisasi ke UTF-8 dari redirect PowerShell; isi hasil tidak difilter untuk menyembunyikan kegagalan. Tidak ada install/update dependency atau DB mutation.

## Pengujian yang dieksekusi

| Perintah | Exit | Artefak / interpretasi |
| --- | --- | --- |
| `npm run lint --workspace=@atlas/api` | 0 | [lint-api.log](lint-api.log) |
| `npm run lint --workspace=@atlas/web-admin` | 0 | [lint-web.log](lint-web.log) |
| `npm exec --workspace=@atlas/api -- tsc --noEmit --incremental false` | 0 | [types-api.log](types-api.log), kosong karena tidak ada diagnostic |
| `npm exec --workspace=@atlas/web-admin -- tsc --noEmit --incremental false` | 0 | [types-web.log](types-web.log), kosong karena tidak ada diagnostic |
| `npm run build --workspace=@atlas/api` | 0 | [build-api.log](build-api.log) |
| `npm run build --workspace=@atlas/web-admin` | 0 | [build-web.log](build-web.log) |
| `npm run test:cov --workspace=@atlas/api -- --runInBand --coverageDirectory=C:/Users/LENOVO/AppData/Local/Temp/atlas-phase3a-20261013/coverage --coverageReporters=json-summary --coverageReporters=text` | 0 | [unit-coverage.log](unit-coverage.log), 109/19; [coverage-summary.json](coverage-summary.json), path diubah menjadi relatif untuk portabilitas |
| `npm run test:security` | 0 | [security.log](security.log), 57 API subset unit + 22 Node |
| `npm ci --dry-run --ignore-scripts --no-audit` | 0 | [lock-dry-run.log](lock-dry-run.log); tidak melakukan clean install |
| `npm audit --json --package-lock-only --omit=dev` | 0 | [audit-runtime.json](audit-runtime.json), 0 |
| `npm audit --json --package-lock-only` | 1 | [audit-all.json](audit-all.json), 48 findings; command berhasil memperoleh laporan, exit nonzero sesuai temuan |
| `npm explain braces postcss-selector-parser sprintf-js --json` | 0 | [dependency-paths.json](dependency-paths.json), jalur dependency terpasang; tidak mengubah dependency |
| `npm exec -- playwright test --list --reporter=list` | 0 | [browser-discovery.log](browser-discovery.log), discovery 2 tes, tidak menjalankan browser/webServer |
| `npm exec --workspace=@atlas/api -- tsc --noEmit --incremental false --strictNullChecks --noImplicitAny` | 2 | [strictness-impact.log](strictness-impact.log), 29 diagnostic / 19 file; hanya eksperimen compiler flags, config existing tidak diubah |
| `node <temporary-directory>/worker-lease-probe.cjs` | 0 | [worker-lease-probe.log](worker-lease-probe.log); **mereproduksi defect**, bukan membuktikan worker bebas defect |

Log lengkap [validation-summary.json](validation-summary.json) memisahkan checks yang dijalankan dari checks yang tidak diulang. Integration/E2E/DB grants/browser runtime/remote CI/image build/smoke/restore/benchmark tidak dieksekusi pada Phase 3A. Lihat laporan baseline untuk bukti Phase 2 dan batasnya.

## Reproduksi probe worker tanpa layanan

[worker-lease-probe.cjs](worker-lease-probe.cjs) adalah fixture assessment, bukan perubahan aplikasi atau suite regresi terintegrasi. Menjalankannya dari root repository:

```powershell
node docs/improvements/phase-3/evidence/worker-lease-probe.cjs
```

Probe mentranspile WorkerController source aktual dengan TypeScript lokal. DB, compressor dan clock dimock; tidak membuka koneksi jaringan, memanggil Prisma nyata atau menulis archive. Urutan:

1. Attempt A mendapat lease lalu menunggu compressor mock.
2. Clock mock maju 600001 ms, melewati lease 10 menit.
3. Attempt B mengambil ulang job yang sama lalu menyimpan Completed.
4. A dilanjutkan dengan kegagalan kompresi; final update berdasarkan id saja menulis Failed.

Hasil `confirmed: true`, `afterNewAttempt: Completed`, `afterStaleAttempt: Failed`. Ini memverifikasi tidak adanya ownership guard di jalur tersebut; tidak membuktikan frekuensi race produksi atau efek file concurrent. Timeout compressor nyata 5 menit tidak disimulasikan, karena skenario target adalah attempt yang tertunda melampaui lease. Selanjutnya diperlukan real DB/broker/restart test pada lingkungan terisolasi.

## Provenance dan pelestarian file

- [git-status-before.txt](git-status-before.txt): status awal dengan untracked individual; 110 modified, 18 deleted, 99 untracked.
- [initial-file-hashes.json](initial-file-hashes.json): 332 file existing dalam inventaris Git non-ignored. Bukan backup isi file dan tidak mencakup ignored storage/env/generated outputs.
- [phase2-integrity.json](phase2-integrity.json): 126/126 SHA-256 cocok dengan manifest Phase 2, tidak ada mismatch. Kesamaan hash membuktikan kontinuitas file, bukan production readiness.
- [preservation-check.json](preservation-check.json): tidak ada perubahan isi pada file existing yang diinventarisasi; deleted paths lama tetap deleted; tidak ada status baru di luar direktori assessment.
- [docker-state.json](docker-state.json): read-only local inspection untuk container Atlas terkait. Bukan inspeksi host production; stopped test containers tidak dihidupkan kembali.

Artefak hanya berisi path/hash, fixture tes, output compiler/build/test dan hasil audit dependency. Tidak mencakup isi `.env`, database dump, file pengguna atau encryption key. Build/test dapat memperbarui output lokal ignored; hal itu tidak disebut sebagai perubahan source.
