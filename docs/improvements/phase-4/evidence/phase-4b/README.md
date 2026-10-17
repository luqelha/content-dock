# Phase 4B evidence

Laporan: [PHASE-4B-REPORT.md](../../PHASE-4B-REPORT.md). Timestamp JSON UTC; tanggal laporan Asia/Jakarta.

- `fixture.json`: stack/image/environment/dataset serta 105 hash compiled JS yang cocok dengan build lokal.
- `measure-{baseline-a,optimized-a,optimized-b,baseline-b}.json`: A1/B1/B2/A2, dua round/block, raw latency, correctness assertions, CPU/RSS/event-loop, metrics delta dan normalized SQL statistics. B2/A2 juga mencatat mixed-operation latency.
- `profile-{baseline,optimized,baseline-warm}.json`: lima EXPLAIN ANALYZE/BUFFERS per query; profiling terpisah dari load.
- `comparison.json`: steady-state A2 vs B2, dihasilkan `scripts/performance/compare-phase4b.cjs`; batas hasil disertakan.
- `indexes-*.json`: waktu/validitas/definisi/ukuran indeks dan grants runtime.
- `correctness.json`, `export-*.json`: counts/order/filter, tenant boundaries, fresh/repeated migration, archive decode dan 25.000 unique rows per export.
- `database-regression-1792101217706.json`: integration 26/E2E 19 pada fixture test terpisah. Output baru dipindahkan dari direktori default runner Phase 4A; evidence historis tetap utuh.
- `validation-summary.json`, `source-file-hashes.json`: checks/provenance. Raw local logs mengikuti aturan ignore repository.
- `preservation-2eb6875e73.json`: fixture stopped, existing identities/states sama, volume retained.
- `failure-*.json`, `execution-notes.json`: attempt gagal; tidak semua attempt sukses.

## Mengulang dengan evidence baru

Docker harus lokal. Dari root, PowerShell; source saat ini sudah memuat migration kedua indeks sehingga setup memasangnya, lalu `indexes off` membuat baseline A1:

```powershell
npm.cmd run build --workspace=@atlas/api
docker build -t atlas-api:phase4b-baseline -f apps/api/Dockerfile .
$env:PHASE4B_EVIDENCE_DIR = "artifacts/benchmark/phase4b-repeat-$(Get-Date -Format yyyyMMdd-HHmmss)"
npm.cmd run benchmark:phase4b -- setup --run-isolated
npm.cmd run benchmark:phase4b -- indexes off
npm.cmd run benchmark:phase4b -- measure baseline-a
npm.cmd run benchmark:phase4b -- profile baseline
npm.cmd run benchmark:phase4b -- export baseline
npm.cmd run benchmark:phase4b -- indexes on
npm.cmd run benchmark:phase4b -- measure optimized-a
npm.cmd run benchmark:phase4b -- measure optimized-b
npm.cmd run benchmark:phase4b -- profile optimized
npm.cmd run benchmark:phase4b -- indexes off
npm.cmd run benchmark:phase4b -- measure baseline-b
npm.cmd run benchmark:phase4b -- profile baseline-warm
npm.cmd run benchmark:phase4b -- indexes on
npm.cmd run benchmark:phase4b -- export optimized
npm.cmd run benchmark:phase4b -- verify
npm.cmd run benchmark:phase4b:compare
npm.cmd run benchmark:phase4b -- stop
```

Eksekusi awal memakai image baseline tanpa migration baru: A1 langsung sesudah setup, pemasangan pertama lewat `indexes migrate`. Pola pengukuran berikutnya identik. Schema index tidak mengubah emitted JS; image API yang sama dipakai kedua arm.

Label lama ditolak; pilih direktori baru. `verify` membuat DB kosong tambahan dalam PostgreSQL milik fixture dan mengecek repeated deploy; jalankan sekali per fixture. Jika gagal, jalankan `stop` untuk fixture milik runner sebelum setup baru. `seed` dapat melanjutkan fixture teridentifikasi; guard count menolak dataset parsial.

Tidak ada `down -v`, penghapusan database existing, retention deletion atau target luar. Secret compose/state disimpan di temporary directory, bukan evidence. API image reuse memerlukan semua emitted JS cocok dengan build lokal; untuk eksekusi ini source/dependency snapshot juga diverifikasi terhadap Phase 4A.
