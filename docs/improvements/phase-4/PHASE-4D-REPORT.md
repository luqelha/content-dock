# Phase 4D — Long-Term Maintenance

Finalisasi: **17 Oktober 2026, Asia/Jakarta**, dengan implementasi dan evidence baseline sejak 16 Oktober. Cakupan: advisory dev tooling, kebijakan retention, browser/accessibility dan lifecycle dependency. Pekerjaan berlangsung di working tree yang sudah berisi Phase 1–4C; perubahan existing dipertahankan.

## Implementasi

1. **Advisory dan review berkala.** Audit root lockfile memakai lookup berbatas waktu, metadata hash/timestamp dan status unavailable saat gagal mengambil data. Audit runtime tetap wajib; tiga exception dev/build existing tidak diperluas atau diperpanjang. Full audit masih 48 entri (41 High, 7 Moderate) dari tiga advisory dasar; runtime zero. Registry masih mengiklankan braces/sprintf-js versi vulnerable, sementara parent typography mematok parser 6 meskipun parser 7.1.6 patched tersedia. [Maintenance cadence](LONG-TERM-MAINTENANCE.md) mencatat jalur, owner role, mitigasi, pemicu upgrade dan deadline **13 November 2026**.
2. **Lifecycle dependency.** Workflow maintenance mingguan mengambil audit dan snapshot `npm outdated` seluruh workspace. Dependabot mengusulkan npm/GitHub Actions/Dockerfile updates tanpa auto-merge. Policy machine-readable menolak runtime Node di luar window support, tanggal invalid dan policy expired. Node 24 menjadi baseline CI/Docker/local version file, Node 22.12+ tetap window kompatibilitas yang direview; npm 10.9.9 dipatok pada manifest dan CI. Snapshot mencakup 95 deklarasi dependency langsung, locked engines/deprecation metadata dan current/wanted/latest. Migrasi Prisma, Jest, ESLint/TS ESLint, Next/React serta alignment Node types mempunyai track dan review gate tersendiri; latest tag prerelease tidak di-upgrade otomatis.
3. **Retention policy dan inventory.** [Kebijakan retention](RETENTION-POLICY.md) membedakan TTL akses export, grace file, metadata, audit, media/avatar, backup, CI artifacts dan metrics. SQL inventory menjalankan transaksi read-only dengan timeout dan output agregat tanpa identifiers/payloads. Fixture enam row membuktikan klasifikasi terminal lama, lease aktif dan nonterminal lama, sekaligus memeriksa jumlah row tidak berubah. Window metadata 30 hari dan backup harian/mingguan tetap usulan untuk approval pemilik data. Tidak ada purge metadata atau perubahan grants runtime.
4. **Browser matrix.** Seluruh suite kini memakai Chromium, Firefox dan WebKit. Runner memakai project Docker baru, PostgreSQL tmpfs, runtime role terpisah, temporary vault dan HTTPS loopback untuk Secure cookies. Cookie Secure/HttpOnly diperiksa dari browser, SameSite=Lax dari Set-Cookie aktual; enumerasi cookie WebKit Windows dapat melaporkan None. Ini bukan bukti TLS publik atau Safari/perangkat nyata. [Matriks dan checklist manual](BROWSER-ACCESSIBILITY.md) menetapkan baseline dan batasnya.
5. **Accessibility dan kompatibilitas konkret.** Ditambahkan skip link dashboard, perbaikan kontras light/dark/error, nama tautan kembali/editor dan kontrol URL preview, status copy, serta nama tombol Cancel/Done yang sesuai teks terlihat. Backdrop dekoratif disembunyikan dari AT dengan close control yang tetap tersedia. Password toggle mengambil fokus eksplisit agar WebKit menyembunyikan field sebelumnya saat fokus berpindah. Provider Motion menghormati reduced motion pengguna. Axe memeriksa WCAG A/AA 2.0/2.1/2.2 pada state terpilih tanpa pengecualian rule; scan menunggu animasi selesai.
6. **Export download/reload.** Reproduksi minimal pada WebKit 27.2 Windows menunjukkan native attachment link menghasilkan download, sedangkan atribut download tidak mengeluarkan event. Tautan ZIP memakai anchor native dan Content-Disposition server. Form export mengumumkan busy state; pengujian reload menunggu Server Action/layout revalidation selesai agar tidak menabrak navigasi Firefox. Authorization, tenant isolation dan response ZIP tetap melalui BFF/API existing.
7. **Review incomplete.** Temuan yang dapat ditindaklanjuti langsung diperbaiki: FormControl tidak lagi merujuk ID deskripsi yang tidak dirender, hint status/slug tetap terhubung, dan target rail sidebar diperbesar dari 16 ke 24 px. Pemeriksaan DOM membuktikan referensi deskripsi valid, serta hint slug tetap mempunyai accessible description. Incomplete turun dari 27 ke 15 occurrence; hanya focus guards/inert modal dan background kontras overlap yang tersisa, dengan owner dan target review pada [accessibility review](ACCESSIBILITY-REVIEW.md).

## Validasi

**Implementasi dan gate engineering lokal selesai.** Hasil terstruktur final, source/log hashes dan snapshot tercatat pada [validation summary](evidence/phase-4d/validation-summary.json). Gate operasional/manusia di bawah tetap terbuka.

| Pemeriksaan                         | Hasil                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| Full build API/web; final build web | Lulus                                                                                 |
| Typecheck API/web dan lint          | Lulus                                                                                 |
| Unit API + coverage thresholds      | 220 test / 27 suites dan 1 snapshot lulus                                             |
| Consumer contracts Node             | 7 lulus                                                                               |
| Security Node                       | 32 lulus                                                                              |
| Lifecycle + advisory policy         | 6 lulus; 2 advisory tests juga termasuk Security Node                                 |
| Audit runtime                       | 0 vulnerability                                                                       |
| Full audit policy                   | 48 entri / 3 advisory dasar; exception dev-only valid hingga deadline existing        |
| Registry lifecycle                  | Snapshot available, 95 deklarasi langsung; latest/wanted dipisahkan                   |
| Retention fixture                   | Read-only; 6 row tetap 6; 2 kandidat terminal lama, 1 nonterminal lama, 1 lease aktif |
| Browser final                       | 33/33 pada Chromium, Firefox, WebKit; 0 retry, skip dan flaky                         |
| Axe final                           | 51 scan; 0 automated violations; 15 incomplete rule occurrences untuk review          |

Tidak ada threshold coverage yang diturunkan. Full install tidak ditimpa untuk pengujian ini: penambahan dev dependency axe dilakukan dengan ignore-scripts, dan npm 10.9.9 memvalidasi root lock melalui `ci --dry-run --ignore-scripts --audit=false`. Build/unit/browser menggunakan toolchain lokal Node 22.18.0; remote CI Node 24 belum dijalankan dari sesi ini.

[Evidence README](evidence/phase-4d/README.md) berisi command reproduksi. Semua percobaan gagal dipertahankan sebagai `attempt-N-browser-summary.json`: awalnya kontras, nama/ARIA, fokus WebKit dan HTTP/Secure cookie; berikutnya native download, transient opacity saat scan dan enumerasi SameSite; lalu race reload Firefox. Perbaikan diverifikasi bertahap, tanpa menyembunyikan kegagalan melalui retry. Log Next start masih memberi warning output standalone existing; suite host ini tidak membuktikan entrypoint/container image production.

Run 16 Oktober sudah mencapai 33/33; setelah review incomplete tambahan, matriks lengkap diulang pada **17 Oktober** dan kembali 33/33. Build/lint/typecheck frontend, audit runtime/full, serta snapshot registry diperbarui pada 17 Oktober. Lookup full audit pertama hari itu timeout; pengulangan berhasil, tetap 48 entri dan policy failures kosong. Unit/API checks dari 16 Oktober tetap berlaku karena source API tidak berubah pada tindak lanjut ini. Fixture final dihentikan; volume dipertahankan.

## Gate yang tetap terbuka

- Ketiga advisory tooling memerlukan remediasi upstream atau migrasi dependency yang teruji; review berikutnya sebelum 13 November 2026. Exception bukan bukti paket sudah patched. Snapshot lock tidak memuat deprecated flags pada baseline; ini tidak membuktikan registry tidak mendeprecate paket.
- Pemilik data harus memutuskan window retention/legal hold, menguji restore DB+vault+key off-host dan memberi otorisasi sebelum deletion. `STORAGE_RETENTION_ENABLED=false`, `STORAGE_RETENTION_DRY_RUN=true` tetap baseline. Tidak ada metadata purge yang diterapkan.
- NVDA/VoiceOver, Safari macOS/iOS, perangkat mobile nyata, zoom/forced-colors dan review axe incomplete perlu evidence manusia sesuai checklist. Automated checks bukan audit WCAG penuh.
- Workflow/Dependabot di remote GitHub belum diverifikasi. Tidak ada klaim deployment, image release baru, TLS publik, grants target atau production readiness dari hasil lokal ini.

Rollback UI/tooling mengembalikan kelompok source, manifest dan root lock terkait secara konsisten lalu membangun ulang. Tidak ada migration baru pada fase ini. Jangan mengubah expiry/grants/storage sebagai rollback cepat. Persetujuan release, backup/recovery dan retention dari fase sebelumnya tetap berlaku.
