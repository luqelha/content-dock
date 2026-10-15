# Security remediation — Phase 1 dan Phase 2

Status 13 Oktober 2026: **belum dinyatakan siap production**. Perbaikan kode dan pemeriksaan lokal utama lulus. Alur browser inti sudah lulus melalui MCP Playwright atas pilihan eksplisit pengguna, pada frontend lokal dan database test terisolasi. Deployment production tidak diakses.

Laporan audit acuan: `C:/Users/LENOVO/AppData/Local/Temp/atlas-audit-20261011/FULL-PROJECT-AUDIT.md`, dibaca dan dicocokkan dengan implementasi. Temuan dependency dibedakan dari eksploitasi aplikasi yang terbukti. Scope diperluas oleh pengguna dari Critical/High ke semua Medium/Low. Working tree sudah berubah sebelum remediasi; perubahan pengguna dipertahankan.

## Critical dan High

| ID | Akar masalah dan bukti | Solusi dan hasil |
| --- | --- | --- |
| C-01 | Next16.3.0 masuk rentang advisory; prasyarat Windows tidak berlaku pada image Linux. Eksploitasi RCE aplikasi tidak dibuktikan. | Next/eslint-config-next16.3.8, dalam major16. Build host dan clean image web lulus. Runtime audit0. |
| H-01 | Pencocokan URL literal melewatkan trailing slash dan variasi kapital yang diterima router. | Limiter berdasarkan metadata handler, regex edge case-insensitive dengan slash opsional. Regression varian URL dan Redis lulus. |
| H-02 | compression/Multer runtime berada pada rentang advisory DoS dan dipakai aplikasi. | compression1.8.2, multer2.4.0, Nest11.2.7 dan patch transitive terarah. Startup HTTP/RMQ, upload dan suite API lulus. Tidak menjalankan serangan DoS. |
| H-03 | Empat port development dipublish ke semua interface. | Compose loopback; pada 12 Oktober tiga container dev direcreate dengan named volume yang sama. Docker membuktikan 5432/6379/5672/15672 hanya127.0.0.1. Tidak menghapus volume/data. |
| H-04 | Compose runtime menggunakan identitas owner/migrasi. | DATABASE_APP_URL wajib untuk runtime, migrator tetap terpisah. atlas_app diuji tanpa owner/superuser/BYPASSRLS/DDL/TRUNCATE/migration access. AuditLog hanyaSELECT/INSERT; ExportTask SELECT/INSERT/UPDATE. Image API benar-benar berjalan dengan role ini; production role belum diprovision/diperiksa. |

## Medium dan Low: akar masalah, perbaikan dan batasnya

| ID | Akar masalah | Implementasi dan validasi |
| --- | --- | --- |
| M-01 | Server actions membuat limiter melihat IP server web; header pengguna tidak dapat dipercaya. | HMAC client identity + timestamp30detik, limiter IP dan hash akun; edge menimpa forwarding headers dan menerima PROXY protocol hanya pada port privat81. Unit identitas/limiter dan smoke Nginx dua IP berbeda/forged header/HTTPS lulus. TLS eksternal belum diuji. |
| M-02 | Error ORM/exception dapat memasukkan detail internal ke log/response. | Filter memakai pesan aman dan log terstruktur berisi event/code/requestID, tanpa query string/raw query/stack. Regression error Prisma dan unexpected exception lulus. |
| M-03 | Atribusi audit bergantung request sebelum actor login tersedia atau tenant header mentah. | Actor login dari hasil autentikasi; tenant hanya hasil otorisasi; entity membership dari userId; invitation acceptance dari tenant hasil operasi. Unit dan E2E login dengan forged tenant lulus. |
| M-04 | Business mutation, audit dan efek file/queue tidak satu batas commit. | Transaksi Prisma berbasis AsyncLocalStorage; nested transaction berbagi konteks; afterCommit/afterRollback untuk efek eksternal. Audit gagal membatalkan DB; file baru dibersihkan saat rollback; penghapusan file setelah commit. Gagal cleanup dicatat untuk retention. Integration rollback dan worker/outbox lulus. |
| M-05 | Cache content tidak berubah ketika kategori/author terkait berubah. | Revision cache per tenant setelah commit; profil menginvalidasi semua membership tenant. E2E relasi kategori/author lulus. Kegagalan Redis dicatat; stale cache maksimum sisa TTL60detik. |
| M-06 | Menghapus pilihan kategori menghasilkan undefined sehingga server tidak mengubah relasi. | Payload null eksplisit; regression payload lulus. |
| M-07 | Validasi parent tidak aman terhadap cycle/depth dan mutasi concurrent; unlink/delete dapat parsial. | Lock tenant FOR UPDATE, pemeriksaan ancestry/cycle, unlink/delete atomik. Integration concurrency A↔B dan rollback lulus. |
| M-08 | Daftar/payload/gambar/fetch tenant tidak dibatasi secara memadai. | Pagination default50/max100 dengan UI navigasi/search; content summary opt-in; React request cache tenant; lazy image; picker kategori paginated. E2E batas/payload lulus. Benchmark1000/1000 dan EXPLAIN indeks lulus pada fixture kecil. Thumbnail, profiling media/legacy vault, dan dataset representatif masih pekerjaan lanjutan; tidak diklaim selesai penuh. |
| M-09 | MIME upload saja tidak membuktikan isi file. | Sharp decode/re-encode dengan batas byte/pixel/frame/waktu; validasi signature PDF; spoof/truncated/oversized input ditolak. Regression upload lulus. Ini bukan antivirus atau sanitasi seluruh fitur PDF. |
| M-10 | Export/cache job volatil, quota/cleanup tidak durable, arsip/orphan tanpa batas memadai. | ExportTask PostgreSQL + outbox retry/worker lease/atomic claim; quota10/tenant/24h; archive100krows/200MiB/5min; job24h. Collector orphan48h melindungi referensi/lease/symlink, defaultdisabled/dry-run. Tes quota concurrent, broker failure/duplicate, retention dan ZIP nyata lulus; smoke real broker+download+tenant isolation lulus. Metadata job lama tetap disimpan; aktivasi retention production menunggu review. |
| M-11 | Dialog/fokus/editor/error login tidak memberi dukungan keyboard/ARIA memadai. | Primitive dialog modal, focus/Escape, label editor, pressed toolbar, native button picker, error login rolealert yang bertahan. Browser: focus trap12Tab, Escape/focus restore, editor mobile dan keyboard upload lulus. Aksi media mobile diperbaiki setelah temuan runtime. |
| M-12 | Regression dan branch coverage kurang, browser belum diverifikasi. | Unit109, integration23, E2E19; security57subset+22Node; coverage lines42.09/branches35.32. CI menambahkan typecheck/security/runtimeaudit/browser; gate lines/statements40%, branches/functions30%. Alur browser inti lewat MCP lulus; remote CI belum dijalankan. |
| M-13 | Secret/token validation tidak cukup membatasi tujuan JWT. | Secret>=32 dan berbeda, HS256, issuer/audience/token_use; E2E purpose swap dan concurrent refresh lulus. JWT lama perlu login ulang. |
| M-14 | Error request diubah menjadi array kosong/404 sehingga outage tampak data hilang. | ApiError berstatus aman, page errors diteruskan ke boundary retry, 404 hanya untuk detail benar-benar missing. Regression Node lulus. |
| M-15 | Bulk delete menampilkan sukses/menyingkirkan item walau sebagian gagal. | deletedIds/failedIds eksplisit; UI hanya menghapus sukses dan mempertahankan failed selection. Regression Node lulus. |
| L-01 | Formatting test tidak sesuai lint. | Format file yang berubah dalam fase ini; lint API dan web lulus tanpa warning. |
| L-02 | Kontrak password/null update tidak konsisten. | Registermin8; PartialType tidak mengabaikan null email/password. Regression lulus. |
| L-03 | Benchmark parameter salah dan target tidak cukup dijaga. | take menggantikan limit; wajib loopback4400 dan identity DBtest dari health sebelum mutasi. Guard regression dan benchmark aktual lulus. |
| L-04 | Status UI/type/error/konfigurasi legacy menyimpang. | ContentStatus DRAFT/PUBLISHED bersama; hapus ARCHIVED; error konsisten; strictBindCallApply/noFallthrough/casing; legacy nginx ditandai. Full strictNullChecks/noImplicitAny belum diaktifkan karena membutuhkan migrasi lintas modul terpisah. |
| L-05 | Job export hilang ketika halaman direfresh. | Job ID di query URL, polling memulihkan status/rentang tanggal, download tetap scope owner. Refresh browser memulihkan job/rentang tanggal; ZIP berhasil diunduh. |

## Hasil pengujian

| Pemeriksaan | Hasil |
| --- | --- |
| Build API dan web pada host | Lulus |
| Typecheck API dan web | Lulus |
| Lint API/web | Lulus,0error/0warning |
| Unit + coverage | 19suites,109tes lulus; statements41.78%, branches35.32%, functions34.93%, lines42.09% |
| Integration DB | 3suites,23tes lulus |
| E2E API | 3suites,19tes lulus |
| Security API | 8suites,57tes lulus; subset dari109unit, jangan dijumlahkan ganda |
| Security Node | 22tes lulus |
| Role database | 3tes lulus, termasuk larangan DELETE ExportTask |
| Image API clean npm ci/build | Lulus; HTTP/RMQ startup dengan atlas_app lulus |
| Image web clean npm ci/build | Lulus; rebuilt setelah pemulihan tanggal export |
| Real broker/export smoke | Lulus: queueworker, decryptable ZIP, tenant-scoped records, cross-tenant404, private no-store |
| Nginx/Caddy config | Keduanya valid; bukan bukti TLS publik |
| Nginx protocol smoke | Lulus: header palsu diganti, dua client PROXY protocol dibedakan, HTTPS proto dipertahankan |
| Dependency runtime | 0Critical/High/Moderate/Low; exit0 |
| Dependency semua termasuk dev | 48:41High+7Moderate; exit1, masih terbuka |
| Browser MCP | Login/logout, dialog keyboard, CMS/mobile, upload/preview, export/reload/download dan stale workspace lulus; dua tes runner tersedia/discovered, remote CI belum dijalankan |
| Benchmark | 1000requests,concurrency25,0fail,p50=37.81ms,p95=78.73ms,p99=210.71ms,556req/s |
| EXPLAIN ANALYZE | Query tenant terbatasi memakai indeks Content/AuditLog tenantId_createdAt; fixture kecil |
| Backup/restore DB test | Dump custom-format dipulihkan ke database test baru; jumlah dan hash isi sembilan tabel cocok. Tidak memulihkan production/file/key/grants |
| Smoke NODE_ENV=production lokal | Belum terverifikasi: health command pertama gagal quoting, pengulangan ditolak automatic approval review |

Bukti log dan daftar perubahan: [artifacts/security-phase2](artifacts/security-phase2/CHANGED-FILES.md). Benchmark: [benchmark.json](artifacts/benchmark/benchmark.json). Artefak build lengkap tersimpan di `C:/Users/LENOVO/AppData/Local/Temp/atlas-remediation-phase2-20261011`. Satu E2E awal salah path `/audit`; diperbaiki ke route sebenarnya `/audit-logs`, tanpa melonggarkan assertion. Lint awal putaran akhir gagal formatting perubahan baru, kemudian diperbaiki dan diulang sampai lulus.

## File, baris dan regression test

[CHANGED-FILES.md](artifacts/security-phase2/CHANGED-FILES.md) memuat file dan awal hunk baris perubahan relatif snapshot Phase2; [changed-files.json](artifacts/security-phase2/changed-files.json) memuat seluruh lokasi dan SHA256. Perubahan Phase1 dirinci pada [laporan Phase1](SECURITY-REMEDIATION-PHASE-1.md). Snapshot bukan HEAD Git karena sudah ada perubahan pengguna sebelum remediasi.

Regression utama:

- `apps/api/test/unit/security/*`: token/config/error redaction, trusted client identity, limiter, audit attribution, upload content, retention, runtime dependency startup dan validation.
- `apps/api/test/integration/category.service.int-spec.ts`: concurrency/cycle, unlink rollback; `durability.int-spec.ts`: commit hooks, media rollback, audit/outbox atomicity, broker retry, quota dan duplicate deliveries.
- `apps/api/test/e2e/security.e2e-spec.ts`: RBAC, tenant/category/profile isolation, revoke, bounds, summary, audit rollback, cache relations, login attribution dan refresh purpose/concurrency.
- `scripts/security/*.test.cjs`: payload/error/bulk web, HMAC/deployment, benchmark safety, archive ZIP/encryption/partial cleanup, YAML compatibility.
- `scripts/security/database-regression.cjs`, `runtime-smoke.cjs`, `proxy-smoke.cjs`: role nyata, worker/broker/download dan proxy protocol terisolasi.
- `tests/browser/security-flows.spec.ts`: login error persistence, protected route, keyboard modal, mobile editor, export reload. Penambahan tes tidak sama dengan bukti eksekusi.

## Dependency dan compatibility

Tidak memakai `npm audit fix --force` atau upgrade major otomatis. Patch dilakukan berdasarkan range/advisory dan dokumentasi resmi Context7. Nest11.2.7 diseragamkan; Tiptap3.31.4; Joi18.2.9; proxy-addr2.0.8. Swagger11.4.7 tetap major11 dengan override js-yaml5.4.3 untuk pin5.3.0 yang rentan, disertai tes dump/load. Shadcn menjadi devDependency tetapi CSS build tetap berfungsi.

Penempatan lockfile Nest dikembalikan konsisten dalam workspace API setelah hoisting merusak optional-peer resolution. Clean npmci di image API/web dan startup HTTP/RMQ membuktikan resolusi bekerja.

48 entri audit tooling berasal dari tiga advisory dasar: [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [postcss-selector-parser](https://github.com/advisories/GHSA-rj75-hqrm-r3gf), [sprintf-js](https://github.com/advisories/GHSA-hp3w-g68c-fv3c). Braces/sprintf-js belum mempunyai versi npm di luar range terdampak saat diperiksa. Typography masih memakai parser6; patch advisory ada pada major7, sehingga tidak dioverride major secara otomatis. Ini bukan48 eksploitasi aplikasi yang terbukti. CI harus mengolah kontribusi tidak tepercaya tanpa production secrets, dengan token read-only dan batas resource; upgrade tooling yang kompatibel tetap perlu ditindaklanjuti.

## Database, file dan rollout

Hanya migration baru additive `20261011000100_durable_export_tasks` ditambahkan. Migration dan grant dijalankan pada test tmpfs atlas_test; tidak pada database development/production. Tidak ada database/data/migration existing dihapus. H03 hanya mengganti binding container dev dengan named volume yang sama.

Urutan rilis: backup DB+storage+encryption key; review target; migrasi dengan owner; provision/review runtime role dan grant ExportTask; verifikasi role; deploy terkoordinasi API/web/edge; smoke staging; baru persetujuan deployment production. Gunakan [runbook role](scripts/database/README.md). Jangan mengembalikan kredensial owner ke API untuk menyelesaikan kegagalan grant.

Potensi perubahan perilaku: login ulang JWT; minimum password8; list default50/max100 untuk consumer eksternal; input upload invalid ditolak; metadata image dihapus; quota/expiry export. Selesaikan/unduh job Redis lama sebelum rilis atau buat ulang. Metadata ExportTask belum dipurge otomatis. Collector storage defaultfalse, dry-run inventory wajib direview sebelum aktivasi; backup key encryption harus dapat dipulihkan.

## Yang belum selesai dan gerbang production

1. Alur browser inti desktop/mobile/keyboard sudah diuji melalui MCP Playwright. Screen reader, matriks browser dan remote CI masih perlu verifikasi. Browser Codex tidak tersedia; pengguna secara eksplisit memilih MCP Playwright terpisah. Browser dipasang lewat installer resmi. Penolakan startup frontend3300 sebelumnya tidak dibypass.
2. Target host/domain/staging, TLS publik, firewall, production grants/secrets, backup-restore dan rollback belum diverifikasi. Tidak ada deployment production dilakukan.
3. Container API/Nginx development lama merupakan orphan konfigurasi lama: API masih port3000/unhealthy dan Nginx mencari service web yang tidak ada. Test image baru sehat, tetapi itu tidak memperbaiki stack lama secara otomatis. Jangan menerapkan compose production secara buta pada volume dev.
4. Advisory tooling48 belum terselesaikan, remote CI belum dijalankan, dan workload realistis/cold-cache/mixed writes/big media belum diukur. Tidak ada klaim SLA/kapasitas production.
5. Retention production, purge metadata historis, thumbnails/streaming legacy media, full TypeScript strictness dan kontrak generated tetap lanjutan terukur.
6. Automatic approval review menolak pengulangan startup/health container `atlas-phase2-production-mode-review` dengan `blocked by policy`, tanpa alasan terperinci. Container sudah dihentikan setelah percobaan awal gagal quoting; tidak ada upaya bypass. Operator dapat menjalankan smoke mode production pada staging yang disetujui. Build image dan smoke mode test tidak disamakan dengan bukti pemeriksaan ini.

Rekomendasi fase berikutnya: jalankan test runner browser di CI dan tutup staging gates terlebih dahulu; validasi restore DB+files+key pada lingkungan terpisah; tetapkan resource/load budget serta monitoring alert; lanjutkan dependency tooling kompatibel dan coverage cabang kritis. Status siap production baru dapat diberikan setelah gerbang tersebut terbukti, bukan berdasarkan build hijau saja.

## Hasil browser lanjutan ? 13 Oktober 2026

[Bukti browser terstruktur](artifacts/security-phase2/browser-verification.json), [dialog desktop](artifacts/security-phase2/browser-dialog-desktop.png), dan [export mobile](artifacts/security-phase2/browser-export-mobile.png). PNG yang diunggah adalah fixture baru repository, bukan file pengguna. Tool menolak fixture awal di Temp karena di luar allowed roots; pemilihan dibatalkan dan fixture baru dibuat dalam root yang diizinkan. Tidak memperluas izin tool atau memindahkan file terlarang.

Browser menemukan workspace pilihan sesi lama yang bertahan saat login baru, kontrol file picker tanpa keyboard, SVG yang masih diiklankan, dan overlay aksi media mobile yang menahan klik. Semuanya diperbaiki; regression success/failure login, cookie workspace stale, keyboard file chooser, preview mobile, tanggal export dan unduhan ditambahkan. Perubahan berada dalam scope M-09/M-11/M-13/M-14/L-05. Login sukses kini memilih ulang workspace untuk sesi baru.

Unit/integration/API E2E tetap memakai bukti putaran12Oktober karena source API tidak berubah setelah putaran itu. Lint, typecheck/build web, security57API+22Node dan image web diulang13Oktober setelah perbaikan browser. Typecheck sempat membaca file `.next/dev/types/validator.ts` saat generated file berubah; pengulangan stabil lulus, tanpa menghapus tes/mengabaikan type errors.

API_URL frontend diarahkan sementara ke test4400, kemudian `.env.local` dipulihkan byte-for-byte dari backup. Database test tmpfs sempat kosong setelah restart Docker; migration additive dan role test diprovision ulang, tanpa menyentuh DB development/production. Test API dan infrastruktur test ditinggalkan untuk pemeriksaan lanjutan; jangan menganggapnya deployment production.
