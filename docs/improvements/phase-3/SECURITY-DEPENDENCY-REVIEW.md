# Phase 3C — Dependency security

Tanggal: 13 Oktober 2026. Sumber instalasi: root npm workspace lockfile. Audit baseline di `evidence/phase-3c/audit-before.json`: 48 entri (41 High, 7 Moderate), tiga advisory dasar. Angka propagated dependency entries bukan jumlah exploit independen.

| Advisory | Jalur / exposure | Keputusan |
| --- | --- | --- |
| [braces GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | braces 3.0.3 ← micromatch ← Jest, Nest CLI, lint tooling; dev/CI glob input | Registry latest 3.0.3 masih affected, belum ada patch. Tidak melakukan major override/force fix. Batasi PR execution ke runner disposable tanpa production secrets dan timeout. |
| [postcss-selector-parser GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) | 7.1.4 ← shadcn ^7.1.0; dev CLI | Root resolved 7.x diperbarui ke patched 7.1.6 dalam range parent. API tidak memproses CSS selector dari request menggunakan package ini. |
| Advisory selector yang sama | 6.0.10 ← @tailwindcss/typography 0.5.20 (exact pin); build CSS | Parent latest masih pin 6.0.10. Residual didokumentasikan; tidak memaksakan major 7 ke parent yang mem-pin 6 tanpa compatibility corpus plugin. Build atas source PR tetap untrusted, dibatasi runner/timeouts. |
| [sprintf-js GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) | sprintf-js 1.0.3 ← argparse 1.x ← js-yaml 3.x/Jest-Istanbul tooling; dev/CI formatting | Registry latest 1.1.3 juga affected; belum ada patch. Input format tooling tidak berasal dari endpoint aplikasi. Tetap dipantau. |

Triage berasal dari audit npm, metadata registry `npm view`, dependency lock paths dan advisory resmi; bukan pengujian exploit. Tidak menyatakan tooling aman terhadap PR berbahaya. Residual review berikutnya paling lambat **13 November 2026**.

Audit diulang 14 Oktober: runtime tetap **0**, seluruh dependency tetap **48 entri / 3 advisory**. Percobaan awal mencapai timeout jaringan dan gate gagal; retry registry berhasil tanpa mengubah policy. Log timeout dipertahankan di evidence. Patch parser menutup jalur 7.x, tetapi tidak menurunkan total propagated entries karena jalur 6.x tetap affected.

`npm run audit:dependencies` menjalankan live audit, menyimpan JSON artifact, dan gagal untuk advisory baru/berubah, exposure non-dev, path parser vulnerable baru, report invalid, serta exception kedaluwarsa. Exception tidak berlaku untuk runtime. `npm audit --omit=dev --audit-level=moderate` tetap gate terpisah. Maintainer perlu meninjau pembaruan upstream sebelum deadline; jangan memperpanjang exception otomatis.

Supply chain CI: `contents: read`, `pull_request` (bukan pull_request_target), tanpa production credentials, checkout tanpa persist credentials, action checkout/setup-node/upload-artifact dipin ke SHA tag v4 yang diverifikasi dari upstream, npm ci dan root lock, timeout job/browser, cancel run superseded, artifact retention 7 hari. Service image masih memakai tag; digest policy dan release provenance tetap follow-up, bukan telah selesai. Report/trace browser memakai akun sintetis, tetap dapat mengandung token fixture sehingga artifact hanya disimpan singkat.

Rollback patch dependency: kembalikan entry parser 7.x pada root lock ke snapshot sebelumnya lalu npm ci; akan membuka advisory lagi, sehingga bukan rekomendasi normal. `apps/api/package-lock.json` historis tidak diubah/dipakai CI. Tidak ada `npm audit fix --force`, major upgrade, atau penambahan runtime dependency.
