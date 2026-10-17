# Phase 3F — Executed release evidence

Lihat [laporan Phase 3F](../../PHASE-3F-RELEASE-EVIDENCE.md) dan [release-evidence.json](release-evidence.json) untuk hasil terkini. Discovery adalah observasi sebelum pembuatan kandidat; status `blocked` remote CI pada file discovery tidak menimpa hasil run kandidat sesudahnya.

`initial-file-hashes.json` dan `git-status-before.txt` mempertahankan baseline pengguna sebelum perubahan fase ini. `candidate.json` memetakan Git tree/blob snapshot; `push.json` membuktikan ref remote hasil push. File `remote-ci-*.json` mempertahankan observasi API per waktu, URL/SHA, steps dan artifact metadata. Log job disimpan sebagai `.log` lokal yang di-ignore Git, dengan hash dan ukuran dalam evidence.

Runner discovery:

```powershell
node scripts/security/phase3f-release-audit.cjs
```

Runner ini hanya membaca Git/GitHub/Docker dan nama referensi konfigurasi. Ia tidak memvalidasi TLS/secret/grants target, melakukan restore, atau menguji rollback. Exit 2 berarti gate operasional tidak closed; exit 1 berarti kesalahan collector. Credential helper berjalan noninteraktif; token hanya digunakan dalam memori. Jangan mencetak credential/helper output atau Docker inspect environment.

Operasi kandidat yang telah dijalankan:

```powershell
node docs/improvements/phase-3/evidence/phase-3f/remote-ci.cjs prepare
node docs/improvements/phase-3/evidence/phase-3f/remote-ci.cjs push
node docs/improvements/phase-3/evidence/phase-3f/remote-ci.cjs inspect
```

`prepare` menolak overwrite manifest; `push` menolak branch yang sudah ada. Jangan menghapus evidence untuk mengulang dua operasi ini. Revisi kedua memakai argumen `2` setelah nama operasi, sehingga manifest/push/observasi disimpan ke `revision-2/`. Kandidat revisi mempertahankan kandidat awal sebagai parent. `inspect` aman diulang; setiap observasi memakai nama timestamp baru. Snapshot yang sudah dipush tetap immutable walaupun dokumentasi evidence lokal diperbarui sesudahnya.

Setelah run mencapai status terminal, jalankan `node docs/improvements/phase-3/evidence/phase-3f/finalize.cjs`. Finalizer memeriksa SHA/ref CI, keberadaan/conclusion langkah wajib, hash log, kesesuaian source/deployment dengan kandidat, preservation branch/index/source awal, inventaris container, syntax, format dan tautan sebelum menulis release evidence. Ia tidak menutup gate operasional yang tidak dijalankan. Koreksi expectation browser dan perubahan format dicatat terpisah dalam laporan.

Revisi ketiga sampai kelima memakai argumen `3`, `4`, dan `5`; masing-masing mempertahankan kandidat sebelumnya sebagai parent. Perintah `inspect 5` membaca run kandidat terbaru. Finalizer memilih manifest kandidat terbaru berdasarkan timestamp dan menolak finalisasi jika run belum mencapai status terminal.

Branch rilis dan commit sementara di object database Git dipertahankan untuk audit. Tidak ada checkout/reset/rebase/force-push atau commit pada branch pengguna. Perubahan aplikasi/test berupa format empat file dan koreksi expectation pesan login pada satu tes browser, ditambah assertion fokus alert. Logika aplikasi dan migration dipertahankan. CI menjalankan database disposable di GitHub runner; tidak menggunakan koneksi database lokal/staging/production.
