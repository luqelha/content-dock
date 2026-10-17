# Security remediation Phase 1

Tanggal: 11 Oktober 2026. Repository: `C:/Projects/webdev/atlas-platform`.

Sumber audit dibaca menyeluruh dari
`C:/Users/LENOVO/AppData/Local/Temp/atlas-audit-20261011/FULL-PROJECT-AUDIT.md`.
Validasi dan implementasi fase ini dibatasi pada C-01 serta H-01 sampai H-04.
Working tree sudah berisi perubahan sebelum remediasi; daftar di bawah hanya
mencakup perubahan fase ini, bukan seluruh diff terhadap HEAD.

**Status: implementasi source/config dan verifikasi teknis Phase 1 selesai pada
state akhir, termasuk rebuild image, integration/E2E, dan smoke API dengan role
runtime terbatas. Penutupan operasional H-03/H-04 masih menunggu penerapan pada
container development existing dan production. Lint existing dan advisory di luar
target masih tersisa. Ini belum merupakan persetujuan release production.**

## Validasi, akar masalah, dan perbaikan

| ID | Bukti aktual dan keterjangkauan | Perbaikan dan dampak |
| --- | --- | --- |
| C-01 Critical | Next 16.3.0 cocok dengan rentang advisory. Windows dan Cache Components nonaktif memenuhi sebagian prasyarat advisory Windows, tetapi exposure server Windows tidak dibuktikan. Docker menggunakan Linux. Source tidak memakai `next/image` atau `next/og`; absennya import bukan bukti optimizer tidak bisa dijangkau. Tidak ada payload RCE dijalankan. | Next dan eslint-config-next dipin 16.3.8; sharp turunan menjadi 0.35.5. Tidak ada major upgrade. Audit akhir tidak lagi mencantumkan next/sharp. Regresi Server Actions dilakukan pada fungsi sebenarnya dengan boundary framework/network dimock, bukan melalui browser atau HTTP Next. |
| H-01 High | Guard memilih endpoint lewat regex URL case-sensitive, sedangkan Express menerima route ekuivalen. Probe sebelum perbaikan dengan counter Redis 31: login biasa 429, trailing slash dan huruf besar mencapai handler 200. Regex Nginx juga terlalu sempit. | Metadata `@AuthRateLimit()` pada login/register dibaca melalui Reflector dan handler yang sudah dipilih router. Nginx memakai regex case-insensitive dengan trailing slash opsional. Bucket, threshold 30/menit, Redis Lua atomik, Retry-After, dan perilaku gagal Redis dipertahankan. Strategi akun/IP dan rantai proxy M-01 tidak diubah. |
| H-02 High | compression 1.8.1 terpasang global; request kompresibel yang diputus mempunyai jalur ke middleware. Multer 2.2.0 dipakai media/avatar dengan memoryStorage. Parser media berada di belakang JWT/RBAC, avatar di belakang JWT; klaim advisory unauthenticated tidak otomatis berlaku pada endpoint project. Advisory disk-storage leak tidak sama dengan jalur memoryStorage project. | compression 1.8.2 dan Multer 2.4.0. Adapter Nest 11.2.7 membawa Multer tersebut secara native. Core/common diselaraskan ke 11.2.7 untuk menjaga identitas exception dan kontrak status 400/413. Validator/transformer di-resolve eksplisit dari workspace agar bootstrap tetap bekerja ketika npm melakukan hoisting. Whitelist dan validasi input tetap aktif. |
| H-03 High | Compose development memublikasikan 5432/6379/5672/15672 tanpa host IP. `docker ps` mengonfirmasi container lama bind 0.0.0.0 dan IPv6. Akses LAN/WAN tidak diuji. | Keempat mapping sekarang bind 127.0.0.1. Tes memeriksa hasil normalisasi Docker Compose. Container development lama tidak direcreate: binding aktif masih membutuhkan penerapan pada maintenance window. Named volume dan data existing tidak disentuh. |
| H-04 High | API production dan migrator memakai URL yang dibangun dari POSTGRES_USER bootstrap. Hak role production aktual tidak diperiksa. Role bootstrap di database test baru memang superuser; ini tidak membuktikan keadaan production existing. | API wajib memakai DATABASE_APP_URL terpisah; migrator tetap memakai owner existing. Script provisioning membuat login atlas_app tanpa superuser/BYPASSRLS/DDL/ownership/membership. Grant hanya DML enam tabel bisnis serta SELECT/INSERT AuditLog; migration bookkeeping tidak dapat diakses. Script dibuktikan pada PostgreSQL 15 test terisolasi, bukan production. |

Tata letak tiga package Nest pada lockfile juga dipertahankan di workspace API
agar optional peer `@nestjs/microservices` dan dependency RMQ dapat ditemukan oleh
Node. Metadata versi/integrity tidak diubah saat penyesuaian lokasi; hasilnya
direkonsiliasi dengan `npm install` dan lolos `npm ci --dry-run`. Regression test
memeriksa resolusi peer, identitas kelas exception, serta konstruksi aplikasi HTTP
dan RMQ tanpa membuka koneksi broker.

Tidak ada migration existing, schema Prisma, data development/production, atau
kebijakan otorisasi yang dihapus. RLS tidak diaktifkan dalam fase ini. Tidak ada
`npm audit fix --force`, `--legacy-peer-deps`, atau override dependency tersisa.

## Compatibility dan batas perubahan

- Next 16.3.0 → 16.3.8; eslint-config-next mengikuti versi yang sama. React tetap
  19.2.8 dan Prisma/client tetap 5.22.0. Persyaratan Node dan peer dependency Next
  diperiksa lewat metadata registry. Build dijalankan lokal pada Node 22.18 dan
  image web dibangun pada Node 24.
- compression 1.8.1 → 1.8.2; Multer 2.2.0 → 2.4.0; Nest common/core/platform-express
  11.1.28 → 11.2.7. Package Multer kini dinyatakan sebagai dependency langsung karena
  source API mengimpornya. Package Nest lain tetap pada versi terkunci sebelumnya
  apabila tidak diperlukan untuk adapter ini; `npm ls` tidak melaporkan konflik
  peer pada graph Nest final.
- Perubahan API publik tidak direncanakan. Regression test menjaga success response,
  error upload 400/413, cookie session, dan validasi input. Varian URL auth yang dahulu
  melewati limiter sekarang menerima 429 ketika bucket habis, sesuai tujuan perbaikan.
- Multer 2.4.0 menganggap tepat `limits.fileSize` sebagai ukuran yang diperbolehkan;
  tes memastikan 5 MiB diterima dan 5 MiB + 1 byte ditolak. Perilaku batas ini perlu
  diketahui consumer yang sebelumnya mengandalkan penolakan pada ukuran persis batas.
- `DATABASE_APP_URL` adalah konfigurasi baru yang wajib pada Compose production.
  Deployment dengan env lama akan gagal validasi Compose sampai role dan URL baru
  dipersiapkan. Gunakan [runbook DB](scripts/database/README.md), bukan mengganti URL
  production sebelum provisioning dan verifikasi selesai.
- Owner/migrator existing tidak diturunkan haknya atau dipindahkan ownership-nya
  secara otomatis. Default PUBLIC CONNECT/TEMPORARY juga tidak dicabut global.
  Runtime tidak menerima hak persistent DDL. Peninjauan ACL lintas-client dan owner
  migration terpisah tetap merupakan pekerjaan operasional lanjutan.
- Tabel baru tidak otomatis memperoleh grant runtime. Setiap migration berikutnya
  harus menyertakan peninjauan grant agar tabel administratif tidak ikut terekspos.

## File dan lokasi perubahan

| File | Baris relevan | Perubahan fase ini |
| --- | --- | --- |
| [apps/web-admin/package.json](apps/web-admin/package.json) | 25, 43 | Next dan eslint-config-next 16.3.8 |
| [apps/api/package.json](apps/api/package.json) | 28, 30, 34, 44, 46 | Nest kompatibel, compression dan Multer patched |
| [package-lock.json](package-lock.json) | entri workspace dan package terkait | Pembaruan npm serta penempatan common/core/adapter di workspace API untuk optional peer; versi/integrity hasil registry dipertahankan |
| [package.json](package.json) | 11–12 | Perintah security test dan DB regression |
| [auth-rate-limit.decorator.ts](apps/api/src/common/decorators/auth-rate-limit.decorator.ts) | 1–4 | Metadata endpoint auth |
| [rate-limit.guard.ts](apps/api/src/common/guards/rate-limit.guard.ts) | 3–16 | Reflector menggantikan pemeriksaan raw URL |
| [auth.controller.ts](apps/api/src/modules/auth/controllers/auth.controller.ts) | 18, 26, 36 | Tandai handler login/register |
| [nginx.conf](nginx/nginx.conf) | 16 | Lokasi rate limit menerima URL ekuivalen |
| [application-validation.pipe.ts](apps/api/src/common/pipes/application-validation.pipe.ts) | 1–13 | Resolve validator/transformer workspace secara eksplisit |
| [main.ts](apps/api/src/main.ts) | 2, 30 | Gunakan factory validation yang sama |
| [test-utils.ts](apps/api/test/e2e/test-utils.ts) | 1–2, 17 | Bootstrap E2E menggunakan konfigurasi validation production yang sama |
| [docker-compose.yml](docker-compose.yml) | 12, 21, 33–34 | Binding loopback empat port development |
| [docker-compose.prod.yml](docker-compose.prod.yml) | 21 | URL runtime terpisah dari migrator |
| [.env.production.example](.env.production.example) | 4–7 | Contoh URL dan prasyarat provisioning |
| [create-runtime-role.sql](scripts/database/create-runtime-role.sql) | seluruh file baru | Provisioning transactional, tanpa penggantian role existing |
| [verify-runtime-role.sql](scripts/database/verify-runtime-role.sql) | seluruh file baru | Pemeriksaan role dan effective privileges dalam transaksi read-only |
| [README DB](scripts/database/README.md) | seluruh file baru | Runbook penerapan, batas grants, dan rollback |
| [auth-rate-limit.spec.ts](apps/api/test/unit/security/auth-rate-limit.spec.ts) | seluruh file baru | 15 tes rate limiter |
| [runtime-dependencies.spec.ts](apps/api/test/unit/security/runtime-dependencies.spec.ts) | seluruh file baru | 8 tes compression/multipart |
| [application-validation.spec.ts](apps/api/test/unit/security/application-validation.spec.ts) | seluruh file baru | 4 tes transform/whitelist/validasi |
| [deployment.test.cjs](scripts/security/deployment.test.cjs) | seluruh file baru | 5 tes config, versi resolved/lock, regex Nginx, dan bootstrap HTTP/RMQ |
| [web-auth.test.cjs](scripts/security/web-auth.test.cjs) | seluruh file baru | 7 tes auth actions + 1 tes decode image jinak |
| [database-regression.cjs](scripts/security/database-regression.cjs) | seluruh file baru | 3 tes role/Prisma/grants pada DB khusus test |
| [Laporan ini](SECURITY-REMEDIATION-PHASE-1.md) | seluruh file baru | Bukti, status, dan pekerjaan lanjutan |

## Regression test dan hasil verifikasi

Regression test baru: **43 tes** = 27 unit API + 13 Node tests + 3 DB tests.
Tes baru menggunakan fixture lokal; tidak ada brute-force atau eksploitasi terhadap
server production. Tes auth actions memock cookies/headers/redirect/fetch; tes upload
memakai controller dan interceptor media sebenarnya dengan persistence/auth boundary
dimock, sedangkan E2E existing tetap menguji JWT/database sebenarnya.

| Pemeriksaan akhir | Hasil |
| --- | --- |
| API build (`npm run build --workspace=@atlas/api`) | Lulus |
| Web build (`npm run build --workspace=@atlas/web-admin`) | Lulus pada Next 16.3.8 |
| Typecheck API/web (`tsc --noEmit --incremental false`) | Keduanya lulus |
| Root lint | Gagal pada tiga error formatting existing di user.controller.spec.ts:94,101,106; tidak diperbaiki karena L-01 di luar scope |
| Web lint terpisah | Lulus |
| ESLint file API yang diubah/ditambahkan | Lulus |
| Unit API + coverage | 14 suite, 79 tes lulus; lines 31,73%, branches 12,89% |
| Integration API | 2 suite, 13 tes lulus ulang pada state akhir dan DB test terisolasi |
| E2E API | 2 suite, 9 tes lulus ulang pada state akhir |
| Security unit API | 27 tes lulus, termasuk dalam 79 unit di atas |
| Security config/web/image/bootstrap | 13 tes lulus; bootstrap mengonstruksi HTTP/RMQ tanpa koneksi broker |
| Security DB | 3 tes lulus ulang pada state akhir; CRUD dibungkus rollback transaction |
| Provisioning role dan verification SQL | Lulus pada PostgreSQL 15 test; pengulangan provisioning menolak role existing, verification sesudah penolakan tetap lulus |
| Compose dev/prod/test | Valid; mapping dev loopback dan runtime URL terpisah terverifikasi |
| Nginx `nginx -t` | Lulus pada container sementara dengan config project |
| Docker web build | Lulus ulang dari lockfile akhir, tag atlas-web:security-phase1 |
| Docker API build | Lulus ulang dari lockfile akhir termasuk npm ci dan prune production, tag atlas-api:security-phase1 |
| Smoke image API final | Lulus: startup HTTP/RMQ, runtime atlas_app, DB/Redis health, register/login/profile, create/list tenant, validasi 400, serta real Redis threshold 30/31 dan route aliases 429 dengan Retry-After |
| Konsistensi lockfile | npm ci --dry-run lokal dan clean npm ci pada build Docker akhir lulus |
| Dependency audit | Berhasil dieksekusi, exit 1 karena advisory tersisa; rinciannya di bawah |

Selama fase ini **101 tes API lulus** (79 unit + 13 integration + 9 E2E), dibandingkan
74 pada baseline. Unit, integration, dan E2E telah lulus pada state akhir. Coverage hanya
coverage unit, bukan coverage gabungan semua suite.

Isolasi pengujian: project Docker `atlas-security-phase1-20261011`, PostgreSQL
loopback 55432, Redis awalnya 56379 lalu 56366, RabbitMQ 55672; database baru `atlas_test` pada tmpfs.
Dua migration existing hanya diterapkan pada database test baru. Container/volume
development existing dan seluruh production tidak diubah.

Pada kelanjutan verifikasi, Windows mencadangkan rentang TCP 56367–56466 sehingga
port Redis 56379 ditolak. Setelah pengguna meminta cara binding lain, override
Compose sementara hanya untuk project test mengubah mapping ke 127.0.0.1:56366.
Binding aktual diperiksa melalui docker inspect. Reservasi/izin Windows, firewall,
dan file docker-compose.test.yml project tidak diubah. Sintaks override diperiksa
melalui Context7 Docker Compose dan divalidasi oleh Compose 5.5.1. File override
dan hasil normalisasi disimpan bersama artefak verifikasi.

## Dependency audit akhir

| Cakupan | Sebelum | Sesudah |
| --- | --- | --- |
| Semua dependency | 97 entri: 5 Critical, 57 High, 35 Moderate | 92 entri: 4 Critical, 53 High, 35 Moderate |
| `--omit=dev` | 56 entri: 2 Critical, 22 High, 32 Moderate (laporan audit) | 51 entri: 1 Critical, 18 High, 32 Moderate |

`next`, `sharp`, `compression`, `multer`, dan `@nestjs/platform-express` tidak lagi
tercantum sebagai package terdampak pada hasil audit akhir. Jumlah di tabel adalah
entri package dependency, bukan jumlah kerentanan aplikasi yang sudah terbukti.

Critical runtime tersisa: `proxy-addr` 2.0.7. Advisory mensyaratkan trust subnet
IPv4-mapped IPv6 yang tidak dipakai konfigurasi project (`trust proxy` numerik 1).
Eksploitabilitas advisory ini tidak terbukti pada konfigurasi sekarang; tidak diubah
diam-diam untuk menjadikan audit bersih. Critical lain pada audit seluruh dependency:
`concurrently`, `handlebars`, `shell-quote`. High lain masih memerlukan triase jalur
runtime tersendiri, termasuk microservices, dependency tooling/editor, dan parser.

## Batas verifikasi dan pekerjaan belum selesai

- H-03 sudah diperbaiki di config, tetapi container development yang lama masih
  memerlukan recreate terencana tanpa menghapus volume. Exposure aktif belum ditutup
  oleh edit file saja; tidak ada klaim firewall/LAN/WAN telah diverifikasi.
- H-04 sudah diuji pada DB terisolasi, tetapi production role/grants belum diperiksa
  atau diterapkan. Role non-owner tidak menggantikan pemeriksaan tenant aplikasi.
- Hambatan Docker sudah terselesaikan setelah pengguna mengaktifkan engine. Log image
  lama mengonfirmasi error PackageLoader untuk @nestjs/microservices. Kedua image
  dibangun ulang dari lockfile akhir; startup HTTP/RMQ dan smoke API sekarang lulus.
  Image API tidak memublikasikan port host; probe berjalan di dalam container test.
- Container test yang dibuat fase ini dihentikan setelah verifikasi. Container/image
  tetap tersedia untuk inspeksi; log dan ID image final disimpan dalam artefak.
  Database test memakai tmpfs: dua migration existing dan provisioning role hanya
  diterapkan ulang pada instance test yang kosong setelah restart. Container/volume
  development existing dan production tidak disentuh.
- Browser/Playwright, HTTP Next Server Actions/CSRF, seluruh UI, dan pemrosesan
  gambar berbahaya tidak diuji dalam fase ini. Audit sebelumnya mencatat penolakan
  policy untuk menjalankan frontend port 3300 serta executable browser yang hilang.
  Jalur tersebut tidak dicoba ulang melalui alternatif; verifikasi yang digunakan
  adalah build, function regression, dan decode image jinak.
- Tiga error lint existing tetap memblokir quality gate. L-01 dan temuan Medium/Low
  lain tidak diperbaiki. Tidak ada tes dihapus atau ekspektasi keamanan dilonggarkan
  untuk membuat suite existing lulus.
- Pembaruan dependency sempat menemukan layout npm yang membuat optional validator
  tidak ter-resolve dan versi Nest ganda mengubah status error. Kondisi final memakai
  common/core/adapter yang sama dan factory validation eksplisit; E2E serta tes
  error 400/413 dan validasi telah lulus. `npm dedupe --dry-run` juga gagal dengan
  ERESOLVE tooling webpack; tidak dipaksakan dan tidak digunakan sebagai hasil akhir.

## Rekomendasi Phase 2

Sebelum menutup Phase 1 secara operasional, selesaikan penerapan H-03/H-04 yang
masih tertunda. Perubahan production tetap memerlukan persetujuan
terpisah sebagaimana instruksi pengguna.

1. Jadwalkan penerapan H-03/H-04 setelah review target dan secret; verifikasi binding
   aktif, effective grants production, smoke test, serta rollback.
2. Triase dan patch advisory dependency tersisa per jalur runtime; prioritaskan
   proxy-addr dan consumer RMQ, pisahkan tooling dari image runtime bila sesuai.
3. Tangani M-13 (pemisahan secret/token), M-01 (trusted proxy + strategi akun/IP),
   M-02/M-03/M-04 (error dan audit), lalu negative RBAC/cross-tenant tests.
4. Lanjutkan integritas kategori/cache, validasi isi upload, retensi file/export,
   dan partial bulk delete sesuai temuan Medium.
5. Selesaikan browser/accessibility audit melalui lingkungan yang diizinkan dan
   perbaiki L-01 secara terpisah agar quality gate dapat hijau.

## Sumber dan artefak

Context7 digunakan untuk dokumentasi Nest guard/Reflector, Next upgrade/security,
dan PostgreSQL 15 privileges. Context7 tidak menyediakan index persis Next 16.3.8
atau Nest 11.2.7; metadata registry, bundled Next docs, deklarasi/source dependency
terpasang, serta regression tests digunakan untuk memeriksa versi tepatnya.

- [Next Windows advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36)
- [Next AVIF advisory](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4)
- [Next 16.3.8 release](https://github.com/vercel/next.js/releases/tag/v16.3.8)
- [compression advisory](https://github.com/expressjs/compression/security/advisories/GHSA-vc2v-76pw-4v95)
- [Multer advisory](https://github.com/expressjs/multer/security/advisories/GHSA-wc9g-mqfw-jrwm)
- [Multer 2.4.0 release dan perubahan compatibility](https://github.com/expressjs/multer/releases/tag/v2.4.0)
- [proxy-addr advisory dan prasyarat trust subnet](https://github.com/jshttp/proxy-addr/security/advisories/GHSA-jqcg-44mw-7w3h)
- [Nest execution context](https://github.com/nestjs/docs.nestjs.com/blob/master/content/fundamentals/execution-context.md)
- [PostgreSQL 15 GRANT](https://www.postgresql.org/docs/15/sql-grant.html)

Log perintah, JSON audit sebelum/sesudah, dan snapshot file sebelum remediasi berada
di `C:/Users/LENOVO/AppData/Local/Temp/atlas-security-phase1-20261011/`.
Artefak sementara bukan penyimpanan jangka panjang; arsipkan bila perlu untuk review.
