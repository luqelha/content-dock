# Phase 3C — Hasil Reliability & Testing

Pekerjaan 13–14 Oktober 2026 (Asia/Jakarta). Scope: working tree yang sudah memuat Phase 1, 2, 3A dan 3B; perubahan pengguna dipertahankan. **Implementasi dan validasi lokal selesai; remote CI dan release production belum diverifikasi.**

## Hasil utama

- Race lease worker P3A-03 ditutup dengan token per claim, conditional completion/failure, dan archive unik per attempt. Stale attempt tidak bisa menimpa status atau file pemenang. Respons completion DB yang ambigu tidak memicu penghapusan hasil yang mungkin sudah commit.
- Scheduler retention tetap disabled dan sekarang memiliki `STORAGE_RETENTION_DRY_RUN=true` secara default, termasuk ketika jadwal diaktifkan. Collector memahami format archive lama dan baru; metadata purge tidak diaktifkan.
- CI diperkuat dengan restricted database-role regression, API browser memakai role tersebut, action SHA pins, checkout tanpa credential persistence, concurrency cancellation, deadline browser, gate formatting terarah, audit tooling dan artifact retention.
- Browser regression bertambah dari dua menjadi tiga skenario lengkap: workspace switching/CMS isolation, logout/protected routes dan download denial, error/retry export, keyboard/modal, mobile viewport, upload/preview, export/download setelah refresh. Suite **3/3 lulus tanpa retry** memakai API dan Next production build yang dikelola Playwright; vault test terpisah di temp directory.
- Tooling parser 7.x diperbarui ke 7.1.6 dalam range parent. Runtime audit tetap 0; residual tooling ditinjau pada [SECURITY-DEPENDENCY-REVIEW.md](SECURITY-DEPENDENCY-REVIEW.md). Gate menolak advisory baru/berubah, runtime exposure dan exception expired (review paling lambat 13 November 2026).

## Bukti pengujian

| Pemeriksaan | Hasil |
| --- | --- |
| Unit | **153/153**, dari baseline 109 |
| Security | **101 API** (subset unit) + **24 Node** |
| PostgreSQL integration | **26/26** |
| API E2E | **19/19** |
| Runtime database grants | **3/3** |
| Playwright Chromium | **3/3** |
| Broker outage/restart drill | **3/3 checks**, broker dan worker nyata |
| Clean install, Prisma generate/migrate fixture | Lulus |
| Lint, API/web typecheck, format gate | Lulus |
| API/web production build | Lulus |

Unit coverage aktual sebelum → sesudah: statements **41,68% → 50,39%**, branches **35,06% → 44,63%**, functions **34,93% → 40,55%**, lines **41,99% → 51,03%**. Worker dan RBAC mencapai 100% branch; retention 88,46%, AuthService 75%. Threshold global tidak diturunkan; worker, RBAC dan retention mendapat threshold khusus.

Broker drill mematikan hanya broker fixture, membuktikan task Pending tetap durable, menghidupkan broker dan menunggu outbox menyelesaikannya. Proses API milik harness kemudian dihentikan; worker baru mereklamasi row Processing dengan lease expired dan menghasilkan ZIP yang dapat didekripsi/download. Row expired disiapkan secara eksplisit pada DB fixture, bukan menunggu worker nyata macet sepuluh menit. Stale success/failure concurrent diuji terpisah dengan PostgreSQL nyata dan compression promise yang ditahan.

Lihat [TEST-COVERAGE-REPORT.md](TEST-COVERAGE-REPORT.md) dan [evidence](evidence/phase-3c/README.md) untuk log, exit code, kesalahan harness browser awal, serta batas setiap tes. Tidak ada klaim peningkatan throughput/latency: benchmark performance baru tidak dilakukan.

## Perubahan file dan compatibility

- Worker/storage: `worker.controller.ts`, `compression.service.ts`, `export.controller.ts`, helper `export-filename.ts`, `storage-retention.service.ts`, schema dan migration additive `20261013000000_export_lease_token`.
- Config: API env validation, kedua env templates, Compose production dry-run variable.
- CI/dependency: `.github/workflows/ci.yml`, `playwright.config.ts`, root/API manifests, root lockfile; audit gate/policy/tests dan recovery drill di `scripts/security/`.
- Tests: browser security flows, durability integration, retention, export recovery/download, RBAC dan refresh recovery; real encrypted ZIP regression diperluas.
- Dokumentasi: reliability, dependency, coverage, laporan ini, tambahan deployment runbook dan evidence.

Daftar exact path, status dan SHA-256 di [changed-files.json](evidence/phase-3c/changed-files.json). Pemeriksaan preservasi terhadap snapshot sebelum 3C di [preservation-check.json](evidence/phase-3c/preservation-check.json). Migration lama tidak diubah; tidak ada reset database real, penghapusan volume, production deployment, atau destructive retention terhadap storage existing.

## Gate yang masih diperlukan

1. Jalankan workflow GitHub Actions pada commit kandidat dan simpan URL/SHA. Local Windows/Node 22 bukan bukti Ubuntu/Node 24; tidak ada push/deploy dalam pekerjaan ini.
2. Untuk rollout, backup lalu drain **seluruh worker lama**, deploy migration additive dengan credential migration, lalu API/worker baru. Old worker tidak mengenal fencing. Reader baru mendukung archive lama; release lama tidak memahami archive per-attempt. Pilih rollback release yang kompatibel atau forward-fix sesuai [runbook](RELIABILITY-REVIEW.md#deployment-dan-rollback).
3. Image build sesudah 3C, public TLS/trusted identity, secret/grants target real, off-host restore dan rehearsal rollback format baru masih perlu bukti operator. Drill 3B tidak otomatis membuktikan compatibility format baru.
4. Tetapkan kebijakan retention dan tested restore sebelum memberi izin deletion; metadata growth tetap follow-up. Redis outage nyata, full-disk/multi-host pause, screen-reader dan Firefox/WebKit belum diuji.

Dengan batas tersebut, **belum ada deklarasi production-ready**. Pekerjaan Phase 3C menghasilkan implementasi, gates dan bukti lokal yang siap direview; acceptance remote CI/release tetap terbuka.
