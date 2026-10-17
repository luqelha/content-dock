# Phase 4C — Type Safety & Architecture Quality

Tanggal: **16 Oktober 2026, Asia/Jakarta**. Lingkup mengikuti gap P3D-04, P3D-05, dan P3D-06: dua compiler flags, kontrak content full/summary, typed request, JSON boundaries, dan pengurangan duplikasi yang terukur.

## Implementasi incremental

1. **Baseline:** probe `tsc --noEmit --incremental false --strictNullChecks --noImplicitAny` menghasilkan **42 diagnostic: 30 source dan 12 test**. Angka 35 pada laporan 3D adalah baseline historis; source observability/test tambahan sudah hadir ketika pekerjaan ini dimulai.
2. **Request dan lifecycle:** tipe context dibedakan sebelum authentication, sesudah JWT, sesudah RBAC, dan untuk refresh token. Controller tenant memakai `userId` yang dihasilkan JWT strategy. Activity tracking memeriksa field dari hasil handler sebagai `unknown`; atribusi actor, authorized tenant, dan invalidation sesudah commit dipertahankan. JWT strategies memakai getter konfigurasi wajib dan menolak payload non-object.
3. **Nullable state:** callback commit/rollback diberi tipe array eksplisit; category traversal memakai nullable parent; lookup credential yang hilang ditolak sebelum password comparison. Timer dan optional server ditangani tanpa definite-assignment assertion. Test synchronization memakai deferred promise; assertion existing tetap dijalankan.
4. **Gate compiler:** `strictNullChecks=true` dan `noImplicitAny=true` aktif pada konfigurasi API, termasuk unit/integration/E2E tests. Tidak ada exclusion file atau `@ts-ignore` untuk menghilangkan diagnostic. Satu `@ts-expect-error` pada contract test sengaja membuktikan bahwa summary tidak mempunyai `body`.
5. **Content contract:** Prisma projections dipisah menjadi summary dan full. Overload service mewakili kedua hasil; return type tidak lagi menjanjikan `Content` lengkap untuk summary. OpenAPI mendokumentasikan `data`, `meta`, author yang aman, nullable category/publication date, dan tanggal ISO. `oneOf` item membedakan full dari summary dengan larangan `body` pada cabang summary; empty page tetap valid.
6. **Consumer contract:** schema Zod existing menghasilkan tipe frontend dan memvalidasi JSON pada `lib/api.ts`, media actions, serta semua pemanggilan `workspaceRequest`. Generic bebas tanpa decoder sudah dihapus. Status export adalah union tertutup dengan terminal-state switch yang exhaustive. Satu tipe media dipakai reader dan actions; content table/dashboard mengambil tipe dari schema.
7. **Persistent export:** payload JSON dibaca lewat decoder, status diverifikasi terhadap empat nilai yang didukung, dan ownership respons diambil dari row database. Worker menolak bounds/payload invalid sebelum compression, menandai failure dengan lease fence yang sama, serta mempertahankan penanganan ambiguous completion dan archive cleanup.
8. **Duplikasi:** extension dan decoder upload memakai satu daftar format dengan lookup milik object sendiri. Avatar tetap menolak GIF/PDF. Pemisahan service besar atau dependency baru tidak diperlukan.

## Contract dan regression tests

- HTTP contract test memakai controller, service, validation pipe dan serializer Nest asli; Prisma dan guards diganti fixture. Payload default/full/summary, null, tanggal, metadata pagination, empty page, invalid selector, enum Prisma, safe author projection, dan OpenAPI snapshot diperiksa.
- Compile-time contract membuktikan overload full/summary dan menolak pembacaan `body` dari summary.
- PostgreSQL integration test memakai projection nyata untuk konten draft/published, nullable category, parent kategori root, tanggal, dan tenant isolation. Suite durability existing menguji nested callbacks, commit/rollback, gagal audit, file cleanup, outbox, serta worker fencing.
- Export contracts menghubungkan producer dengan parser consumer untuk seluruh status; malformed JSON, invalid dates/progress, corrupt claimed job, dan JWT config/claims invalid mempunyai regression tests.
- Node consumer tests mengeksekusi source boundary frontend dengan I/O stubs: JSON invalid secara struktur, media URL mapping, cookies, tenant override, FormData, `no-store`, HTTP errors, dan terminal export state. React request cache wrapper tetap digunakan; test stub tersebut tidak mengukur memoization saat server render.
- Snapshot OpenAPI disimpan sebagai compatibility gate. CI menjalankan Node contract tests secara eksplisit; API contracts termasuk suite unit/coverage existing. Perubahan snapshot memerlukan review terhadap wire contract, bukan pembaruan otomatis di CI.

## Validasi dan reproduksi

Hasil final terstruktur, jumlah test, coverage, source hashes dan command ada pada [validation summary](evidence/phase-4c/validation-summary.json). Bukti database disimpan pada direktori Phase 4C, terpisah dari laporan terdahulu.

| Pemeriksaan                        | Hasil final                                                        |
| ---------------------------------- | ------------------------------------------------------------------ |
| API strictness target              | 42 diagnostic awal -> 0; kedua flags aktif                         |
| Typecheck, lint, build API dan web | Lulus                                                              |
| Unit dan snapshot OpenAPI          | 220 test / 27 suites; 25 API contracts; 1 snapshot                 |
| Consumer contracts Node            | 7 test lulus                                                       |
| Regresi keamanan Node              | 32 test lulus                                                      |
| PostgreSQL integration / API E2E   | 27 / 19 test lulus pada fixture baru                               |
| Coverage global                    | Lines 61,50%; statements 60,28%; branches 51,47%; functions 49,53% |
| Coverage worker                    | Lines dan branches 100%; gate existing tetap berlaku               |
| Explicit `any` API source          | 8 lokasi tersisa, diinventarisasikan untuk scope berikutnya        |

```powershell
npm.cmd run typecheck
npm.cmd run test:contracts
npm.cmd run test:cov --workspace=@atlas/api -- --runInBand
npm.cmd run lint
npm.cmd run build
npm.cmd run test:quality:db
```

Runner database membuat project Docker baru, memverifikasi local daemon/project/container identity, memakai PostgreSQL tmpfs dan vault E2E sementara. Setelah selesai fixture dihentikan dan volume dipertahankan. Runner ini membutuhkan port test bebas; tidak boleh diarahkan ke database aplikasi existing.

Pemeriksaan individual dengan log/hash dapat direproduksi melalui `node scripts/quality/phase4c-check.cjs <check>`; daftar tersedia di [evidence README](evidence/phase-4c/README.md).

Coverage attempt pertama gagal pada dua test JWT karena fixture masih membaca environment test, dan satu cabang payload null worker belum tercakup. Fixture kemudian mengisolasi hasil getter config, kasus stored payload null ditambahkan, dan contract tests diulang. Bukti attempt pertama dipertahankan sebagai `attempt-1-unit.json`; hasil final ada pada `check-unit.json`. Ambang coverage existing tidak diubah.

## Compatibility dan batas

Wire format content/media tetap sama: default/full mencakup body, summary menghilangkannya, kategori nullable, dates berupa ISO string saat JSON serialization. Tidak ada perubahan dependency, lockfile, schema database atau migration dalam Phase 4C. Respons sukses yang malformed sekarang gagal sebagai contract error; ini perubahan perilaku yang disengaja. Stored export corrupt gagal sebelum compression.

**Dua flag target selesai; ini bukan aktivasi seluruh keluarga `strict`.** `strictPropertyInitialization`, `strictFunctionTypes`, `useUnknownInCatchVariables`, larangan explicit `any`, dan `noUncheckedIndexedAccess` belum dijadikan gate global. `skipLibCheck` tetap aktif. Inventaris AST explicit `any` tersisa dilampirkan agar pekerjaan lanjutan mempunyai scope yang jelas; dua flag target memang tidak melarang explicit `any`.

Producer Prisma/Swagger dan consumer Zod tetap merupakan lapisan terpisah yang diikat contract tests. Ini belum generated OpenAPI client atau compatibility checker universal untuk seluruh endpoint. Auth actions, invitation Redis JSON, dan sebagian legacy handlers mempunyai boundary terpisah yang belum disatukan. Tidak ada klaim remote CI, browser end-to-end, fresh Docker image, staging atau production release dari pemeriksaan lokal ini.

Rollback per kelompok dapat mengembalikan parser/DTO/service projection secara bersamaan tanpa data migration. Pertahankan middleware/guard authorization, safe author selection, audit transaction, upload validation, dan lease fencing. Mengembalikan flag compiler saja mengurangi gate quality dan tidak memperbaiki runtime contract.

Referensi metode: [Nest OpenAPI generic responses](https://github.com/nestjs/docs.nestjs.com/blob/master/content/openapi/operations.md), [Nest union schemas](https://github.com/nestjs/docs.nestjs.com/blob/master/content/openapi/types-and-parameters.md), dan [Zod parsing/type inference](https://github.com/colinhacks/zod/blob/main/packages/docs/content/basics.mdx), diperiksa melalui Context7. Kode diverifikasi terhadap versi dependency terpasang.
