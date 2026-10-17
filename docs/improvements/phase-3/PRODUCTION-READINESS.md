# Phase 3B ? Production & Disaster Recovery Gates

> Pembaruan Phase 3F, 15 Oktober 2026: lihat [release evidence](PHASE-3F-RELEASE-EVIDENCE.md) dan [hasil gate JSON](evidence/phase-3f/release-evidence.json). **Remote CI kandidat lulus**, run `38727582906`, commit `ab2c6e0`, termasuk 9 tes browser dan build kedua container. Staging TLS/secrets/grants, recovery off-host dan rollback release kompatibel belum dieksekusi: target dan previous release belum teridentifikasi setelah discovery repo/operator. **Release tetap ditahan.** Status 3B/3E di bawah adalah bukti historis sesuai batas lingkungannya.

**Pembaruan 15 Oktober 2026:** penilaian terkini ada pada [FINAL-IMPROVEMENT-REPORT.md](FINAL-IMPROVEMENT-REPORT.md). Bagian Phase 3B di bawah adalah bukti historis sebelum format archive/fencing 3C; status P3A-03 di sini telah ditutup oleh 3C. Regresi lokal 3E lulus, tetapi CI remote, TLS/secrets/grants target, recovery off-host dan rehearsal rollback release kompatibel tetap gate wajib. **Belum production-ready.**

Image kandidat terbaru telah lulus smoke production-mode serta restore DB/vault/key pada 15 Oktober: [10/10 checkpoint](evidence/phase-3e/drill-1792059490242.json), exact row/file hash dan fresh worker sesudah restore. Ini memperbarui bukti restore lokal untuk format archive 3C, tanpa memverifikasi rollback ke release lama. Deviasi prosedural satu volume anonim baru milik probe registry dicatat transparan di laporan final; tidak ada volume existing yang dihapus.

Tanggal: 13 Oktober 2026 (Asia/Jakarta). Objek: working tree yang dinilai Phase 3A, bukan HEAD/release production.

**Phase 3B selesai untuk lingkungan lokal yang disetujui; belum production-ready.** Pengguna menyetujui stack Docker lokal baru yang terisolasi dengan data sintetis. Production-mode smoke, isolation, effective database privileges, backup/restore dan deployment rollback telah dijalankan dan lulus. TLS publik, secret/grants production, remote CI dan kebijakan recovery production tetap merupakan external operational gates.

## Bukti final

Report final: [drill-1791871073983.json](evidence/phase-3b/drill-1791871073983.json), 15 checkpoint passed; source project atlas-phase3b-source-e634c942d6, restore project atlas-phase3b-restore-3af2f55ac3. [Validation summary](evidence/phase-3b/validation-summary.json) dan [runtime resources](evidence/phase-3b/runtime-resources.json) menyimpan image IDs, hasil check dan verifikasi akhir resource.

| Pemeriksaan          | Hasil aktual / batas bukti                                                                                                                                                                                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build API/web        | Keduanya berhasil. API pertama gagal registry npm ECONNRESET, retry berhasil. Web memakai cache; bukan pembuktian reproducible bit-for-bit.                                                                                                                                            |
| Security regression  | 57 tes API (8 suite) dan 22 tes Node lulus pada persiapan fase ini. Tidak diulang tanpa kebutuhan setelah perubahan yang hanya menyentuh runner/dokumen.                                                                                                                               |
| Startup production   | API dan web production berjalan melalui Nginx; health DB/Redis, login page dan protected-page redirect lulus. API/web memakai user node dan immutable local image IDs.                                                                                                                 |
| Resource isolation   | Network internal terpisah per project; tanpa published host ports; volume milik project; tidak ada connection ke DB existing.                                                                                                                                                          |
| Runtime grants       | Verifier atlas_app lulus pada source, rollback dan restore; bukan owner/superuser/BYPASSRLS, tanpa membership/CREATE/sequence grants. Delapan operasi terlarang ditolak dengan SQLSTATE 42501.                                                                                         |
| Tenant/auth smoke    | Dua akun dan dua tenant: auth, forged tenant 403, cross-tenant content/media/export 404, download tanpa auth 401. CMS create/read, upload PNG, BFF file dan error validasi lulus.                                                                                                      |
| Broker/worker        | Export baru selesai dan ZIP didekripsi pada initial deploy, setelah rollback, setelah kembali ke kandidat, dan setelah restore dengan Redis/RMQ baru. Records ZIP dibatasi tenant yang benar.                                                                                          |
| Rollback             | API+web berpindah ke previous Phase 2 image IDs, runtime tetap atlas_app, migration history identik; old media/archive tetap identik dan fresh export berhasil. Kandidat kemudian dipasang kembali dan diperiksa.                                                                      |
| Backup/restore       | Writers dihentikan; custom-format DB dump + encrypted vault + saved key/config dipulihkan ke cluster/database kosong dan volume baru. Seluruh hash/row count sembilan tabel serta empat file vault cocok sebelum writes baru. Media/export plaintext cocok; missing/wrong key ditolak. |
| Preservation/cleanup | 346 file existing tidak berubah/hilang. Seluruh 30 container original tetap mempunyai ID/name/image yang sama. Seluruh 41 container drill dari empat percobaan sudah berhenti; volume dipertahankan.                                                                                   |

## Pengukuran recovery lokal

- Rollback terkoordinasi beserta pemeriksaan: **20.074 detik**.
- Backup DB + vault setelah quiesce: **1.053 detik**; tidak mencakup waktu maintenance sebelumnya.
- Restore project baru, DB/vault/key/grants dan smoke aplikasi: **34.726 detik**; tidak mencakup final stop resource.
- Snapshot: Tenant 2, User 2, TenantUser 2, Category 1, Content 1, Media 1, AuditLog 12, ExportTask 3, migration records 3; empat encrypted files.
- Perbedaan/hilangnya row snapshot: **0**, berdasarkan count dan SHA-256 seluruh rows yang diurutkan. Hash seluruh file vault juga cocok. Export tambahan dibuat sesudah pembandingan restore untuk membuktikan worker dapat menulis lagi.

Angka ini hanya elapsed time fixture kecil lokal, **bukan SLA RTO/RPO production**, PITR, atau pembuktian recovery writes yang terjadi sesudah backup. Checkpoint dibuat saat writers berhenti; tidak ada simulasi kehilangan live data.

## Gate matrix

| Gate                               | Status                               | Bukti / tindak lanjut                                                                                                                                                |
| ---------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-B01 target/otorisasi             | Verified completed, lokal            | Persetujuan eksplisit pengguna untuk stack baru terisolasi dan data sintetis. Tidak mengizinkan production deployment.                                               |
| G-B02 build/config                 | Verified completed, lokal            | Build, preflight, image IDs dan startup lulus. Registry provenance/remote CI tetap terpisah.                                                                         |
| G-B03 isolation                    | Verified completed, lokal            | Actual network, port bindings, mounts, app user dan image identity diperiksa. Tidak membuktikan firewall host/WAN production.                                        |
| G-B04 database privileges          | Verified completed, lokal            | Verifier read-only dan active denial probes lulus; DML aplikasi bekerja. Jangan menjalankan active probes terhadap DB real.                                          |
| G-B05 production-mode smoke        | Verified completed, lokal HTTP       | Auth, tenant isolation, CMS, upload, BFF, export/download, error validation dan fresh workers lulus. Browser Server Action login/cookies tidak diuji oleh probe ini. |
| G-B06 backup/restore               | Verified completed, quiesced fixture | DB+vault+saved key/config, role recreation dan effective grants, exact manifests, decrypt dan fresh worker lulus.                                                    |
| G-B07 deployment rollback          | Verified completed, local image pair | Previous Phase 2 IDs, schema unchanged, restricted role retained, old data readable, new export works. Bukan bukti semua previous release kompatibel.                |
| G-B08 public TLS / browser cookies | External operational gate            | Domain staging, DNS/certificate/redirect, forwarded identity dan Secure/HttpOnly/SameSite browser behavior belum diverifikasi.                                       |
| G-B09 production secrets / grants  | External operational gate            | Operator perlu memeriksa real secret separation, escrow, efektif role/ACL tanpa mencatat nilainya.                                                                   |
| G-B10 recovery policy / RTO / RPO  | External operational gate            | Target, off-host backup, retention/access, key custody, recovery owner dan latihan dataset representatif belum disepakati/dibuktikan.                                |
| G-B11 release / remote CI          | External operational gate            | Previous release resmi, compatibility review, CI URL/SHA, immutable registry digests dan approval deploy masih diperlukan.                                           |

## Perubahan dan kegagalan yang dipertahankan

Ditambahkan [runner drill](../../../scripts/security/phase3b-drill.cjs), [HTTP smoke](../../../scripts/security/phase3b-smoke.cjs), [runbook](DEPLOYMENT-RUNBOOK.md) dan evidence. Tidak ada perubahan aplikasi, dependency, migration, production Compose, atau credential real.

Empat percobaan runtime tercatat: dua berhenti pada kesalahan harness, satu full pass, lalu satu full pass setelah menambah fresh export pada setiap tahap verify. Tidak ada kegagalan aplikasi yang disembunyikan:

1. [Percobaan pertama](evidence/phase-3b/drill-1791870678772.json): query sequence privilege mengevaluasi fungsi pada relation non-sequence karena urutan evaluasi SQL tidak dijamin. Diperbaiki dengan CASE yang membatasi pemanggilan fungsi ke relkind sequence.
2. [Percobaan kedua](evidence/phase-3b/drill-1791870788181.json): Compose create tidak mendukung --no-deps. Diganti dengan Compose up --no-start --no-build --no-deps untuk menyiapkan volume tanpa startup aplikasi.
3. [Full pass awal](evidence/phase-3b/drill-1791870928785.json): restore/rollback/decryption selesai; kemudian diperluas agar fresh worker execution setelah deployment/recovery ikut dibuktikan.
4. [Full pass final](evidence/phase-3b/drill-1791871073983.json): semua checkpoint termasuk perluasan tersebut lulus.

Setiap retry memakai project baru. Tidak ada database existing direset, volume dihapus, applied migration diedit, atau retention diaktifkan. Negative DDL/TRUNCATE hanya mengenai synthetic DB baru dan dibungkus transaksi yang di-rollback. Backup/key/token berada pada private OS temp directory yang tercatat di report, bukan evidence yang di-commit.

## Batas dan risiko tersisa

- **P3A-03 stale worker lease tetap terbuka.** Quiesced restart/rollback dan fresh exports tidak menguji attempt concurrent melewati lease expiry. Perbaikan masuk fase reliability; keberhasilan drill ini tidak menghapus risiko tersebut.
- Health endpoint hanya mengecek DB/Redis. Fresh export memberikan bukti worker/RMQ pada saat drill, bukan readiness monitoring permanen. Outage broker/Redis, pending/leased job recovery, duplicate delivery dan active-job drain belum diuji di fase ini.
- Previous pair adalah image Phase 2 lokal. Web candidate memakai build cache; distinct image IDs dapat berbeda pada packaging/attestation walau application content sama. Drill membuktikan mekanisme penggantian pair dan kompatibilitas state fixture, bukan rollback perubahan schema yang incompatible.
- Bootstrap role dipulihkan eksplisit karena pg_dump tidak memuat global roles. Owner tetap atlas_owner dan dump mempertahankan table ACL. Production role mapping/default ACL/tablespace perlu review operator.
- Redis/RMQ restore memakai instance baru; cache, rate-limit counters, invitations dan broker state lama tidak direstore. Recovery policy untuk state tersebut masih harus ditetapkan.
- Tidak ada RLS yang diklaim. Tenant isolation mengandalkan guard/query aplikasi; fixture menguji dua akun/tenant. PUBLIC CONNECT/TEMP tetap mengikuti provisioning existing; business DELETE memang diizinkan.
- Legacy API unhealthy/Nginx restarting tidak diubah. Base/service image tags masih mutable; full supply-chain pinning/attestation bukan hasil fase ini.
- Tidak ada benchmark throughput/latency baru atau klaim perbaikan kapasitas. Audit tooling dan masalah reliability Phase 3A tetap membutuhkan fase berikutnya.

## Baseline awal versus akhir

Awal Phase 3B: runtime/grants/restore/rollback belum diverifikasi, baru preflight dan bukti historis. Akhir: gate lokal tersebut memiliki bukti runtime aktual yang dapat diulang dan runbook telah dijalankan. Penilaian production tetap tertahan pada external operational gates dan risiko reliability di atas. Tindak lanjut: perbaikan lease worker/failure recovery, lalu jalankan gate domain staging, real secrets/grants, off-host restore policy dan remote CI pada target yang diotorisasi.
