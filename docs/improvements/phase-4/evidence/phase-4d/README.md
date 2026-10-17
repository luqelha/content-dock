# Phase 4D evidence

Baseline lokal 16 Oktober 2026, diperbarui dan difinalisasi **17 Oktober 2026**. [Laporan fase](../../PHASE-4D-REPORT.md) menjelaskan hasil dan batasnya. `validation-summary.json` menghubungkan exit code, log SHA-256, final source hashes, unit/browser results dan snapshot registry.

Reproduksi quality checks dari root:

```powershell
node scripts/maintenance/phase4d-check.cjs types-api
node scripts/maintenance/phase4d-check.cjs types-web
node scripts/maintenance/phase4d-check.cjs lint-web
node scripts/maintenance/phase4d-check.cjs unit
node scripts/maintenance/phase4d-check.cjs web-contracts
node scripts/maintenance/phase4d-check.cjs security-node
node scripts/maintenance/phase4d-check.cjs maintenance
npm run build
node scripts/maintenance/phase4d-check.cjs build-web
npm run audit:dependencies
npm run maintenance:dependencies:registry
npm run test:maintenance:browser
node scripts/maintenance/browser-summary.cjs final-browser-summary
```

Audit runtime terpisah: `npm audit --omit=dev --json --package-lock-only` dan simpan output JSON pada `runtime-audit.json` dengan exit code diperiksa. `node scripts/maintenance/phase4d-summary.cjs` hanya menghasilkan summary setelah seluruh evidence gate lokal terpenuhi. `npm ci --dry-run --ignore-scripts --audit=false` juga diuji melalui npm 10.9.9 tanpa mengganti npm global workstation.

`database-regression-*.json` menyimpan identitas fixture, migration/browser checks, cleanup, serta inventory retention. PostgreSQL baru memakai tmpfs; container existing tidak dipakai. Tidak ada purge metadata, penghapusan vault existing, atau aktivasi retention. Log mungkin diabaikan oleh `.gitignore`; regenerasikan dengan command di atas, dan verifikasi hash ketika menyertakan artifact.

`attempt-N-browser-summary.json` menyimpan kegagalan awal; laporan final tidak menimpa percobaan tersebut. Traces/screenshots rinci berada pada artifact runner lokal `test-results`/`playwright-report` (CI retention 7 hari), dan diganti oleh run browser berikutnya. Summary axe mempertahankan rule/node failures dan incomplete per state tanpa menyertakan token.

`attempt-5-browser-summary.json` adalah run 33/33 tanggal 16 Oktober sebelum review incomplete tambahan. Run final 17 Oktober juga 33/33; 51 scan menghasilkan 0 violations dan 15 incomplete occurrences. Detail selector dan pesan incomplete dipertahankan pada final summary, sehingga triage tetap tersedia setelah artifact runner kedaluwarsa. [Review temuan](../../ACCESSIBILITY-REVIEW.md) mencatat owner dan batas verifikasi.

`download-probe.json` berasal dari reproduksi sintetis `node scripts/maintenance/browser-download-probe.cjs` pada port HTTPS loopback 3445: native link dibanding atribut download di WebKit Windows. Ini membuktikan perilaku fixture/browser yang direkam, bukan seluruh versi Safari.

`full-audit.json`, `dependency-review.json`, `runtime-audit.json`, dan `dependency-lifecycle.json` adalah snapshot saat eksekusi, bukan klaim registry selamanya. `npm outdated` dapat mengiklankan prerelease melalui latest dist-tag. Review berikutnya wajib sebelum 13 November 2026; exception tidak diperpanjang otomatis. Remote CI, real-device/AT dan approval retention/restore tetap gate eksternal.
