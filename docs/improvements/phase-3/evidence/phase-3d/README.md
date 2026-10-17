# Evidence verifikasi Phase 3D

14 Oktober 2026, Asia/Jakarta. Semua path/perintah di bawah relatif repository root. Penilaian: [PHASE-3D-VERIFICATION.md](../../PHASE-3D-VERIFICATION.md), performa: [PERFORMANCE-REPORT.md](../../PERFORMANCE-REPORT.md).

## Artefak

| File                                                                    | Makna                                                                                          |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `environment.json`, `git-status-before.txt`, `initial-file-hashes.json` | Identitas lingkungan dan snapshot working tree; bukan snapshot production                      |
| `typesApi.json`, `typesWeb.json`                                        | Typecheck normal, keduanya exit 0                                                              |
| `strictApi.json`                                                        | Command, 35 diagnostic/22 file, exit 2; config tidak diubah                                    |
| `lintApi.json`, `lintWeb.json`                                          | Lint tanpa mutation/auto-fix, exit 0                                                           |
| `unit.json`, `security.json`                                            | Unit/security commands dan exit code; 153 unit, 101 security subset, 24 Node                   |
| `buildApi.json`, `buildWeb.json`                                        | Build per-workspace dengan output baru, exit 0                                                 |
| `contract-probe.json`                                                   | Schema aktual controller, projection/pagination dengan stub Prisma, AST explicit-any inventory |
| `media-benchmark.json`                                                  | Enam kondisi media, 12 sampel/kondisi; CPU/RSS/dataset/limitations                             |
| `runtime-target.json`                                                   | Docker read-only dan health fixture ECONNREFUSED; tidak ada HTTP benchmark                     |
| `preservation-check.json`                                               | 415 hash existing diperiksa, 0 berubah/hilang                                                  |
| `validation-summary.json`, `changed-files.json`                         | Ringkasan hasil dan daftar artefak baru dengan hash                                            |

Raw output setiap npm check tersedia lokal sebagai `<name>.log` di direktori ini. `.log` mengikuti ignore rule repository; JSON menyimpan hasil terstruktur, diagnostic strictness dan command agar bukti tetap dapat dibaca tanpa menganggap log ignored otomatis ikut commit. Hasil dari dua fase lain tidak ditimpa.

## Reproduksi

Gunakan dependency workspace yang sudah terpasang sesuai lockfile; runner tidak menginstal package. Menjalankan ulang command akan menimpa evidence command bersangkutan, sehingga archive evidence dahulu bila ingin mempertahankan run ini.

```powershell
node docs/improvements/phase-3/evidence/phase-3d/run-check.cjs typesApi
node docs/improvements/phase-3/evidence/phase-3d/run-check.cjs typesWeb
node docs/improvements/phase-3/evidence/phase-3d/run-check.cjs strictApi
node docs/improvements/phase-3/evidence/phase-3d/run-check.cjs lintApi
node docs/improvements/phase-3/evidence/phase-3d/run-check.cjs lintWeb
node docs/improvements/phase-3/evidence/phase-3d/run-check.cjs unit
node docs/improvements/phase-3/evidence/phase-3d/run-check.cjs security
node docs/improvements/phase-3/evidence/phase-3d/contract-probe.cjs
node docs/improvements/phase-3/evidence/phase-3d/media-benchmark.cjs
node docs/improvements/phase-3/evidence/phase-3d/run-check.cjs buildApi
node docs/improvements/phase-3/evidence/phase-3d/run-check.cjs buildWeb
node docs/improvements/phase-3/evidence/phase-3d/probe-target.cjs
```

Runner memberikan fixture environment dan URL loopback port 1 agar tes/build tidak memakai layanan database/cache/broker existing; tidak membaca private env untuk mendapatkan credential. Build masih mengikuti perilaku framework untuk file env lokal, tetapi nilai environment runner dipasang eksplisit. Build menghasilkan `dist`/`.next`; tidak memulai aplikasi/worker. Probe kontrak tidak mengimpor `AppModule`/`main` dan tidak membuat PrismaClient atau layanan Redis.

Jalankan microbenchmark sendiri setelah checks lain selesai. Proses anak baru untuk setiap kondisi mengurangi pengaruh sisa allocation antar-kondisi; host/Docker background dan native GC tetap dapat memengaruhi hasil. Dua concurrency bukan before/after optimization. Jangan menganggap p95/p99 dari 12 sampel sebagai tail estimate stabil.

`snapshot` dan `preservation` pada runner dipakai untuk audit file sebelum/sesudah. Jangan menjalankan `snapshot` ulang atas evidence lama tanpa mengarsipkannya. `summarize.cjs` membangun ringkasan/manifest setelah semua check dan laporan tersedia.

## Batas validasi

Source checks, mock tests, microbenchmark, dan production build lokal tidak menggantikan integration/E2E/browser/remote CI atau production smoke. API port 4400 tidak tersedia saat pemeriksaan; benchmark historis yang membuat fixture data tidak dieksekusi. Tidak ada pengoperasian database/service existing, deployment, collector, maupun perubahan application code. Strictness probe gagal secara sengaja untuk mengukur gap; kegagalannya tetap dilaporkan.
