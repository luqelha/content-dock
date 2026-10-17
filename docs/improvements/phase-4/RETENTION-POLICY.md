# Retention policy and activation gates

Status **16 Oktober 2026: inventory-only**. Pemilik data harus menyetujui jangka penyimpanan berdasarkan kontrak dan kebutuhan organisasi sebelum ada penghapusan baru. Angka usulan di bawah bukan kebijakan legal atau izin purge. Penanggung jawab operasional adalah role repository/platform maintainer; persetujuan data dan legal dipegang pemilik organisasi, dan restore oleh operator backup. Nama penanggung jawab nyata harus dicatat pada change ticket target.

| Kelas data                                 | Perilaku sekarang                                                                                                                     | Keputusan maintenance                                                                                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Export ZIP                                 | Akses berakhir 24 jam setelah job dibuat, berdasarkan `expiresAt`; semua attempt dilindungi selama lease hidup                        | Pertahankan TTL akses. Kandidat file harus melewati grace 48 jam berdasarkan mtime, expiry dan lease; bukan penghapusan tepat pada jam ke-24                                                  |
| Upload/avatar                              | Referensi Media dan User dilindungi collector; hanya nama terenkripsi yang dikenali dan orphan lebih tua dari 48 jam menjadi kandidat | Referensi aktif tidak mempunyai TTL otomatis. Ukur orphan melalui `StorageRetentionService.collect()` dengan default dry-run; hasil filename tetap private                                    |
| ExportTask metadata                        | Tidak ada purge; runtime role tidak mempunyai DELETE pada tabel ini                                                                   | Usulan review: terminal Completed/Failed, expired lebih dari 30 hari, tanpa lease aktif. Pending/Processing/unknown yang expired masuk investigasi, bukan kandidat purge. Tetap tidak dihapus |
| AuditLog                                   | Append-only bagi runtime; tidak ada purge                                                                                             | Pemilik data menetapkan window audit/legal hold. Jangan memakai TTL export sebagai TTL audit; jangan memberi DELETE pada runtime                                                              |
| User, tenant, content, category, media row | Lifecycle melalui fitur aplikasi/otorisasi existing                                                                                   | Tidak diberi TTL maintenance global; perubahan lifecycle memerlukan desain ownership, audit dan pemulihan tersendiri                                                                          |
| Backup DB + encrypted vault + key escrow   | Gate recovery Phase 3 tetap berlaku                                                                                                   | Usulan kapasitas awal: 30 backup harian + 12 mingguan off-host. Setujui kebutuhan RPO/RTO, kapasitas dan legal hold dahulu; uji restore terpadu, termasuk key, sebelum rotasi/hapus           |
| CI reports, traces, screenshots            | Validation 7 hari; scheduled maintenance 14 hari                                                                                      | Artifact browser dapat berisi data fixture dan DOM. Gunakan hanya akun sintetis; batasi akses. Evidence yang dikomit perlu sanitasi dan review; tidak terkena expiry upload-artifact          |
| Metrics                                    | Prometheus 15 hari/2 GB                                                                                                               | Review kapasitas bulanan; logs dan Grafana tidak otomatis mengikuti window Prometheus                                                                                                         |

## Inventaris yang dapat direproduksi

Operator memilih database secara eksplisit melalui koneksi yang tersedia di environment lokal, lalu menjalankan:

```powershell
psql -X -v ON_ERROR_STOP=1 -f scripts/database/retention-inventory.sql
```

Gunakan `PGSERVICE`/mekanisme credential operator; jangan menaruh password pada command atau evidence. Script memakai transaksi **REPEATABLE READ READ ONLY**, statement timeout 30 detik, lock timeout 3 detik dan ROLLBACK. Output hanya agregat umur/jumlah tanpa ID tenant/user, payload, nama file atau secret. Query melakukan count seluruh tabel, jadi jadwalkan off-peak pada database besar; kegagalan timeout harus dicatat, bukan dianggap inventory kosong. Ini inventaris metadata, bukan rekonsiliasi disk dengan backup.

`npm run test:maintenance:browser` menguji script terhadap enam row sintetis di PostgreSQL tmpfs baru: terminal lama, failed lama, lease aktif, pending lama, recent expired, dan live. Runner memeriksa dua kandidat terminal, satu nonterminal lama, satu lease aktif, dan memastikan jumlah row tetap enam. Bukti ini tidak mewakili inventory deployment.

## Urutan aktivasi dan penghentian

1. Catat scope tenant/data, owner, jangka penyimpanan, legal hold, RPO/RTO dan change ticket yang disetujui. Backup DB/vault/key harus konsisten dan off-host; lakukan restore serta pembacaan arsip/media dengan runtime role terbatas.
2. Jalankan beberapa inventory pada workload target, ukur byte/umur/jumlah dan error, lalu review sampel secara private. Pengecualian legal hold, referensi, active lease dan in-flight writes harus terjaga.
3. Review implementasi deletion terpisah. Collector existing hanya menangani file, tidak metadata. Purge metadata perlu batch limit, recheck eligibility, audit terpisah, concurrency/fencing, dan role operator khusus; jangan memperluas grants API.
4. Persetujuan eksplisit operator diperlukan sebelum mengubah `STORAGE_RETENTION_ENABLED=false`, `STORAGE_RETENTION_DRY_RUN=true` ke mode destructive. Dry-run schedule dapat dipakai hanya setelah inventory target disetujui. Tidak ada setting destructive yang diaktifkan oleh Phase 4D.
5. Saat kandidat tidak wajar, lease/ref mismatch atau error, hentikan schedule (`ENABLED=false`), pertahankan dry-run, bekukan deletion dan investigasi. Menonaktifkan collector tidak mengembalikan file yang sudah hilang; pemulihan memerlukan backup dan key yang sudah diuji.

Review bulanan, setelah perubahan schema/storage/lease, serta setiap restore drill. Bukti persetujuan/restore target masih menjadi gate eksternal; lihat [runbook deployment](../phase-3/DEPLOYMENT-RUNBOOK.md) dan [runbook insiden](OPERATIONAL-RUNBOOKS.md).
