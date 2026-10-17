# Phase 3C — Reliability & Testing

Tanggal: 13 Oktober 2026 (Asia/Jakarta). Scope: perubahan incremental pada working tree setelah Phase 3B. Hasil eksekusi dirangkum di [TEST-COVERAGE-REPORT.md](TEST-COVERAGE-REPORT.md). Production deployment dan aktivasi retention tidak dilakukan.

## Temuan dan implementasi

| ID | Risiko / bukti awal | Perubahan |
| --- | --- | --- |
| P3C-01 / P3A-03 — High | Worker menyelesaikan/gagalkan task berdasarkan ID saja. Probe 3A memperlihatkan Completed berubah menjadi Failed setelah stale worker kembali. Nama archive tetap memungkinkan overwrite/cleanup lintas attempt. | Atomic claim menerbitkan UUID `leaseToken`; read, completion dan failure memerlukan token, status Processing, lease dan expiry yang masih berlaku. Arsip terenkripsi memakai UUID per attempt. Stale completion hanya membersihkan arsip attempt-nya. |
| P3C-02 — Medium | Exception pada DB completion ikut tertangkap sebagai kegagalan kompresi, padahal update mungkin sudah commit. | Completion dipisah dari catch kompresi. Respons DB ambigu tidak menandai Failed dan tidak menghapus arsip; nack tanpa hot requeue, outbox memulihkan expired lease. |
| P3C-03 — Medium | Jadwal retention default-off, tetapi enabled=true langsung memanggil collect(false). | `STORAGE_RETENTION_DRY_RUN` default true; jadwal harus diaktifkan dan dry-run dimatikan secara terpisah untuk deletion. Format archive baru dan lama dikenali. Lease aktif, expiry, referensi upload/avatar, grace 48h, file legacy dan linked folder tetap dilindungi. |
| P3C-04 — Medium | CI belum menjalankan effective runtime-role regression; hanya runtime audit, action mutable, browser coverage terbatas. | Provision role pada DB disposable, tes grants, browser API menggunakan runtime role, SHA action pins, credential persistence off, concurrency cancellation, audit tooling dan browser deadline. |

## Batas state machine

Pending atau Processing dengan lease expired boleh di-claim jika job belum expired. Claim memasang token baru dan lease 10 menit; kompresi tetap dibatasi 5 menit, 100.000 rows dan 200 MiB. Completed/Failed/expired jobs tidak diproses ulang. Kegagalan kompresi pada lease aktif menghasilkan Failed dan pengguna dapat membuat export baru; outage DB meninggalkan job untuk outbox retry. Broker gagal tidak menghapus task yang sudah commit.

File per attempt menjadi immutable setelah kompresi. Database completion memublikasikan filename, bukan rename ke satu nama bersama. Download tetap memeriksa tenant, requester, expiry dan status, kemudian memvalidasi nama file milik job. `export-<job>.zip` lama tetap dapat diunduh; nama download publik tetap sama. File yang ditinggal akibat crash/ambiguity tersedia untuk inventory setelah grace, bukan dihapus spekulatif.

Tidak ada heartbeat baru atau retry tanpa batas untuk kegagalan kompresi. Clock antar replica tetap perlu tersinkronisasi. Token mencegah stale writes walau worker pause melebihi lease; batas waktu mengendalikan pekerjaan normal. Metadata ExportTask tidak dipurge dan role runtime tetap tidak mendapat DELETE.

## Deployment dan rollback

1. Lakukan backup DB + vault + key sesuai runbook dan pilih maintenance window. Hentikan/drain **semua** worker/API versi lama sebelum menyalakan worker baru. Old code tidak mengenal token dan tidak aman dicampur dengan worker baru.
2. Jalankan migration additive `20261013000000_export_lease_token` memakai credential migration, lalu generate/build client yang cocok. Tidak mengubah migration lama; grant tabel existing sudah mencakup kolom baru.
3. Deploy API/worker baru bersama, lalu web. Verifikasi role, export baru, download lama/baru, outbox dan pending-job recovery. Retention tetap disabled/dry-run.
4. Jika rollback diperlukan, hentikan/drain worker baru terlebih dahulu. Pertahankan kolom additive dan file. Release lama hanya memahami filename tetap: **jangan mengklaim rollback penuh kompatibel** dengan export baru. Gunakan release rollback yang membawa reader kompatibel dan fencing, atau dokumentasikan export per-attempt tidak tersedia hingga forward-fix. Jangan rename/delete archive otomatis atau rollback schema dengan DROP.

Ini persyaratan operator; migration pada database nyata dan rollout production belum diotorisasi/dijalankan. Drill restore 3B merupakan bukti historis sebelum format baru; bukan rehearsal rollback format baru.

## Retention safety dan batas verifikasi

Inventory manual `node scripts/storage-retention.cjs` tetap read-only. Scheduler tetap default-off. Mengaktifkan deletion memerlukan kebijakan retention, restore path yang terbukti dan otorisasi operator. Tidak ada metadata purge, penghapusan volume, atau collector destructive terhadap storage existing pada fase ini. Tes deletion hanya memakai direktori temp fixture.

Collector bukan mekanisme transaksi lintas DB/filesystem. Grace 48h jauh melebihi lease/expiry normal; operator tetap harus menghentikan collector saat restore/import yang dapat memperkenalkan referensi ke file tua. Key availability dan decryptability harus dibuktikan sebelum persetujuan retention. Jangan menganggap dry-run memberi izin deletion.
