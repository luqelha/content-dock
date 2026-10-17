# Phase 4A evidence

Lihat [laporan](../../PHASE-4A-REPORT.md), [kontrak metrics](../../OBSERVABILITY.md), dan [runbooks](../../OPERATIONAL-RUNBOOKS.md). Status terminal dan pemeriksaan preservation dirangkum dalam `validation-summary.json` setelah drill selesai.

Baseline `initial-file-hashes.json` mencakup 559 file non-ignored existing; `git-status-before.txt` mempertahankan konteks working tree pengguna. `containers-before.json` merekam 17 container sebelum validator Docker/fault fixture. Fase sebelumnya tidak ditulis ulang.

`check-<operation>-<timestamp>.json` mencatat perintah, waktu, exit code dan SHA-256 `.log` lokal. Log di-ignore Git dan tidak menjadi bukti staging. `drill-<timestamp>.json` menyimpan identitas fixture, checkpoint, fault, notifikasi firing/resolved, recovery download dan preservation container. Semua percobaan gagal tetap dipertahankan; nama project baru dipakai pada retry.

Perintah validator: `types`, `lint`, `unit`, `security`, `audit`, `journal`, `observability`, `rules`, `prometheus`, `alertmanager`, `imageApi`, `imageJournal`. `unit` menjalankan coverage dan threshold repository; `observability` menjalankan Node tests dan tool resmi Prometheus/Alertmanager. Validator tidak menggunakan nama resource existing. Container tool diberi nama unik, tanpa jaringan, mount config read-only; container/volume tidak dihapus otomatis.

Drill runtime memakai `node scripts/observability/resilience-drill.cjs --run-isolated`. Pastikan image versi eksplisit di Compose sudah tersedia. Jangan menjalankan fault command manual terhadap service lain. Direktori temp privat yang disebut report berisi config/credential sintetis dan bukan artefak untuk di-commit. Tidak ada nama secret production atau akses staging yang ditemukan/digunakan.

Perubahan batas: remote CI Phase 3F menguji snapshot sebelumnya. Perubahan Phase 4A diuji lokal dan menambahkan gate observability pada workflow untuk run berikutnya; jangan memakai run 3F untuk mengklaim CI atas source baru ini. Release gates staging TLS/secrets/grants, recovery off-host dan rollback pair resmi tetap terbuka.
