# Browser compatibility and accessibility maintenance

Target engineering: Chrome/Edge, Firefox dan Safari versi stabil yang masih didukung vendor, desktop dan viewport sempit. Baseline CSS aplikasi mengikuti Tailwind 4: Chrome 111+, Safari 16.4+, Firefox 128+ ([dokumentasi compatibility](https://tailwindcss.com/docs/compatibility)). Ini batas teknologi, bukan bukti seluruh versi tersebut sudah diuji. Playwright memeriksa bundled Chromium, Firefox dan WebKit yang mengikuti lockfile; WebKit di Windows/Linux tidak membuktikan Safari di macOS/iOS atau perangkat nyata. Legacy browsers di bawah baseline belum didukung.

## Gate otomatis

```powershell
npm ci
npx playwright install --with-deps chromium firefox webkit
npm run build
npm run test:maintenance:browser
```

Runner lokal memerlukan Docker lokal dan port 3300, 3443, 4400, 55432, 56379, 55672 bebas. Ia memverifikasi project baru, database kosong pada tmpfs, port loopback dan identitas container sebelum migration fixture. API memakai role runtime terpisah dan vault sementara. Container existing tidak dipakai. Fixture dihentikan saat selesai; volume dipertahankan. Jangan mengarahkan suite ke database existing. CI memakai services miliknya sendiri melalui `npm run test:browser`.

CI/runner membuka UI di `https://127.0.0.1:3443`, melalui terminator TLS test-only menuju Next production server loopback 3300. Pasangan certificate/key self-signed adalah fixture publik; jangan dipakai atau dipercaya pada deployment. `ignoreHTTPSErrors` hanya milik context/readiness Playwright terisolasi. Secure/HttpOnly/SameSite cookies tetap diaktifkan dan diperiksa tanpa mencetak token. HTTPS diperlukan agar perbedaan penerimaan Secure cookie pada HTTP loopback antar engine tidak mengaburkan hasil. Ini tidak memverifikasi TLS publik, reverse proxy production atau certificate chain target. Mode lokal tanpa CI tetap memakai server HTTP user-started existing; gunakan runner di atas untuk bukti matriks dengan Secure cookies.

Semua skenario browser dijalankan pada tiga engine: auth/password visibility/validasi, viewport 360px, tenant switch dan isolasi download, keyboard dialog, editor, upload/preview, export reload/download, dan logout. Accessibility menggunakan `@axe-core/playwright` dengan tag WCAG A/AA 2.0, 2.1, dan 2.2. Tidak ada rule yang dikecualikan untuk membuat hasil hijau. State yang dipindai mencakup halaman publik dalam dua theme, registration error, category list light/dark, category dialog, editor, upload, preview, dan export completed pada viewport 375px dark. Ini sampel state, bukan seluruh halaman/state aplikasi.

Attachment axe menyimpan `violations` dan `incomplete` per state; incomplete membutuhkan review manusia dan bukan pass aksesibilitas. JSON reporter, trace/screenshot saat gagal dan log fixture memudahkan investigasi. Gate keyboard juga memeriksa skip link, Tab/Shift+Tab, Escape dan pemulihan fokus. Scan menunggu finite animations dan opacity dialog selesai agar hasil mengukur state yang stabil. Reduced motion diaktifkan pada scan dark dan halaman publik. Provider `MotionConfig reducedMotion="user"` kini menghormati preferensi OS untuk transform/layout; opacity tetap dapat bertransisi sesuai [dokumentasi Motion](https://motion.dev/docs/react-accessibility). Ini belum audit setiap animasi JS.

## Pemeriksaan manusia sebelum release dan per kuartal

Role penanggung jawab: web maintainer untuk perbaikan dan QA/release owner untuk evidence. Catat tanggal, commit, OS, versi browser/AT, perangkat, hasil aktual, issue, dan reviewer. Status awal screen reader/perangkat nyata: **belum diverifikasi**, bukan lulus otomatis.

Triage konkret hasil incomplete dan target review dicatat pada [accessibility follow-up](ACCESSIBILITY-REVIEW.md).

| Kombinasi                              | Prosedur dan kriteria                                                                                                                                                                                       |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NVDA + Firefox/Chrome pada Windows     | Login/error diumumkan sekali dan fokus ke feedback; navigasi landmark/heading; nama dan state password toggle jelas; workspace menu, label editor, error field, progress export dan download dapat dipahami |
| VoiceOver + Safari pada macOS/iOS      | Ulangi auth, workspace switching, dialog upload/preview dan export menggunakan keyboard/rotor/touch; dialog tidak bocor fokus dan kembali ke pemicu                                                         |
| Keyboard saja                          | Skip link melewati navigasi, fokus tampak, urutan logis, dialog Tab/Shift+Tab terkurung dan Escape menutup; tanpa keyboard trap di editor/menu                                                              |
| Zoom/reflow/contrast                   | 200% dan 400% zoom, viewport 320 CSS px, light/dark, Windows forced colors; informasi dan tindakan tetap tersedia, scroll tabel lokal diperbolehkan, tidak bergantung pada warna saja                       |
| Android Chrome dan iPhone Safari nyata | Touch target, soft keyboard, date picker, chooser/file upload, preview, download dan rotasi layar; desktop emulation belum memenuhi baris ini                                                               |
| Reduced motion                         | Preferensi OS mengurangi perpindahan/animasi termasuk Framer Motion; loading/progress tetap terbaca                                                                                                         |

Temuan serious/critical pada jalur inti memblokir release; temuan lain harus memiliki issue, owner dan target perbaikan. Jangan menandai WCAG conformance, audit screen reader, Safari nyata atau seluruh versi baseline sebagai selesai hanya dari axe/Playwright. Metode otomatis mengikuti [Playwright accessibility testing](https://github.com/microsoft/playwright/blob/main/docs/src/accessibility-testing-js.md), diperiksa melalui Context7.
