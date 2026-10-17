# Phase 3B evidence

13 Oktober 2026, Asia/Jakarta. Ringkasan machine-readable: [validation-summary.json](validation-summary.json). Penilaian: [PRODUCTION-READINESS.md](../../PRODUCTION-READINESS.md).

## Dijalankan

| Check                                                 | Hasil                                                                                                                               | Artefak                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Docker API build, percobaan pertama                   | Gagal npm registry ECONNRESET                                                                                                       | `build-api.log`                                                    |
| Docker API build, retry                               | Exit 0                                                                                                                              | `build-api-retry.log`                                              |
| Docker web build                                      | Berhasil; cached layers. Wrapper PowerShell awal melaporkan 1 akibat stderr handling; diulang dengan native exit capture dan exit 0 | `build-web.log`, `build-web-verified.log`                          |
| API Jest security                                     | 8 suite / 57 passed, exit 0                                                                                                         | `security-api.log`                                                 |
| Node regression                                       | 22 passed, exit 0                                                                                                                   | `security-node.log`                                                |
| `node --check` dua script baru                        | Exit 0                                                                                                                              | validation summary                                                 |
| `node scripts/security/phase3b-drill.cjs --preflight` | Exit 0; final preflight sesudah formatting juga exit 0                                                                              | `drill-preflight.log`, `drill-preflight-final.log`, `drill-*.json` |
| Container inventory sebelum/sesudah final preflight   | Identik; tidak membuat/stop container runtime                                                                                       | validation summary                                                 |
| Hash preservation file existing                       | 346 checked; tidak berubah/hilang                                                                                                   | [preservation-check.json](preservation-check.json)                 |

Log `*.log` mengikuti ignore rule repo existing; tersedia lokal, jangan diasumsikan otomatis masuk commit. JSON/Markdown evidence dan snapshot Git/hash merupakan artefak yang dapat ditinjau. `initial-file-hashes.json` mencakup file tracked/untracked non-ignored yang ada sebelum perubahan fase ini; bukan seluruh filesystem/generated output.

## Reproduksi checks

```powershell
docker build -f apps/api/Dockerfile -t atlas-api:phase3b-candidate .
docker build -f apps/web-admin/Dockerfile -t atlas-web:phase3b-candidate .
npm run test --workspace=@atlas/api -- --runInBand test/unit/security
node --test scripts/security/benchmark-safety.test.cjs scripts/security/deployment.test.cjs scripts/security/export-archive.test.cjs scripts/security/web-auth.test.cjs scripts/security/web-data.test.cjs
node --check scripts/security/phase3b-drill.cjs
node --check scripts/security/phase3b-smoke.cjs
node scripts/security/phase3b-drill.cjs --preflight
```

Jest pada sesi ini dipanggil langsung via Node dari cwd `apps/api`, dengan argumen `--runInBand test/unit/security`; tidak bergantung pada shell npm. Build web yang dikonfirmasi dan retry API memakai child process dengan stdout/stderr diarahkan ke file dan native exit code disimpan. Tidak ada failure yang disembunyikan.

## Runtime drill setelah persetujuan

Pengguna menyetujui stack Docker lokal baru, terisolasi, dengan data sintetis. Full drill kemudian dijalankan. Bukti final [drill-1791871073983.json](drill-1791871073983.json) memiliki status passed dan 15 checkpoint, termasuk fresh export setelah rollback dan setelah restore.

| Percobaan                                 | Hasil                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [1791870678772](drill-1791870678772.json) | Failed: sequence privilege function dievaluasi pada relation non-sequence. Perbaikan CASE menjaga pemanggilan fungsi.                                                                                                                                                                                                |
| [1791870788181](drill-1791870788181.json) | Failed: Compose create tidak mendukung --no-deps. Perbaikan memakai up --no-start --no-build --no-deps.                                                                                                                                                                                                              |
| [1791870928785](drill-1791870928785.json) | Full pass awal; native process exit 0 teramati.                                                                                                                                                                                                                                                                      |
| [1791871073983](drill-1791871073983.json) | Full pass final setelah memperluas smoke dengan fresh worker export pada setiap tahap verify. Report ditulis setelah final cleanup; sesi process handle tidak lagi tersedia setelah pergantian turn, sehingga native exit code final tidak dicatat terpisah. Status report dan stopped resources diverifikasi ulang. |

Report final merekam rollback 20.074 detik, backup 1.053 detik setelah quiesce, restore 34.726 detik termasuk smoke. Sembilan tabel dan empat file snapshot cocok; zero snapshot row loss. Ini elapsed time synthetic fixture, bukan production RTO/RPO.

[Runtime resources](runtime-resources.json) memverifikasi semua 41 container dari percobaan drill sudah berhenti; seluruh 30 container original masih memiliki ID/name/image yang sama. Seluruh volume dipertahankan. [Preservation check](preservation-check.json) memastikan 346 file existing tidak berubah/hilang. File baru/yang diperbaiki pada Phase 3B adalah runner, smoke, runbook, readiness report dan evidence; application source/config/dependencies/migrations tidak diubah.

Private config, backup dump/vault dan tokens fixture tersimpan di OS temp directory pada privateArtifacts.directory masing-masing report. Nilai secret tidak masuk report. Jangan commit/upload private directory. Metadata evidence sengaja tidak berisi Docker environment mentah.

## Gate yang belum dijalankan

Public TLS/domain staging, browser Server Action login/Secure cookies, real production secrets/grants, remote CI, off-host backup/key escrow policy, pending/leased job recovery, broker/Redis outage dan active-job drain tetap belum diverifikasi. Tidak ada production deployment, perubahan applied migration, database reset, volume removal atau aktivasi retention.

Preflight report terdahulu tetap berstatus preflight-passed-runtime-not-executed sebagai bukti historis tahap persiapan; gunakan final runtime report untuk hasil terkini. Tidak ada penolakan automatic approval review baru.
