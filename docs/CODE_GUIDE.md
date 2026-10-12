# Panduan kode NADAKITA LIVE

## Mulai membaca dari sini

Proyek ini memakai HTML statis, CSS, dan JavaScript modules tanpa tahap build.
HTML di root adalah entry point halaman; konten dinamis dirender ke `#app`.
Urutan stylesheet dan script sengaja dipertahankan karena memengaruhi tampilan
dan bootstrap aplikasi.

1. Baca HTML halaman yang ingin dipahami.
2. Baca `js/preview.js` untuk shell, navigasi, dan markup awal.
3. Baca `js/live/app.js` untuk bootstrap, data live, auth, booking, dan dashboard.
4. Baca modul fitur terkait, lalu adapter data jika perlu memahami API.

## Struktur dan tanggung jawab

| Lokasi | Isi |
| --- | --- |
| `*.html` | Metadata, preload font, stylesheet, dan entry point script setiap halaman |
| `css/` | Styling dasar, fitur live, dan penyempurnaan tipografi/transisi |
| `js/preview.js` | Shell dan template halaman; bukan sumber kebenaran pesanan |
| `js/navigation.js` | Pengaturan perpindahan halaman dan reveal konten |
| `js/countdown.js` | Countdown berdasarkan jadwal acara |
| `js/show-guide.js` | Pilihan malam dan rundown |
| `css/show-guide-neon.css` | Penyempurnaan visual Show Guide; hanya dimuat di schedule.html setelah CSS dasar |
| `js/song-previews.js` | Preview audio artis; file audio disediakan terpisah |
| `js/ticket-zones.js` | Diagram venue malam, harga kategori yang diberikan caller, dan highlight zona; tidak mengambil data sendiri |
| `js/live/app.js` | Koordinasi halaman customer, auth, booking, dan data publik |
| `js/live/show-detail.js` | Presentasi detail artis, format jadwal Inggris dan fallback portrait; menerima data dari app.js, tanpa query baru |
| `css/artist-detail.css` | Layout detail artis desktop/HP serta player audio bertema gelap |
| `css/shows-focus.css` | Panel ringkas format konser pada The Shows; dua kolom desktop, bertumpuk pada HP |
| `js/live/admin.js` | Workspace admin dan modul pengelolaan |
| `js/live/config.js` | Konfigurasi publik Supabase; jangan masukkan secret/service-role key |
| `js/live/native-client.js` | Client HTTP native untuk Auth, REST, dan Storage |
| `js/live/supabase.js` | Adapter data, session, pemeriksaan role, dan pelaporan error |
| `js/live/ticket-wallet.js` | Tampilan tiket, QR, dan proses download |
| `js/live/ticket-svg.js` | Layout SVG tiket dan pemenggalan teks |
| `js/live/ticket-themes.js` | Tema/artwork tiket per artis dan kategori |
| `js/vendor/` | Library pihak ketiga; tidak diformat atau diubah dalam cleanup |
| `assets/` | Gambar, font, dan audio |
| `supabase/migrations/` | Riwayat schema, RPC, dan kebijakan database |
| `tests/` | Pengujian kontrak, logic, dan browser terisolasi |

## Cara membaca fungsi

Komentar Bahasa Indonesia menjelaskan tujuan fungsi utama dan alasan bagian
yang tidak langsung jelas. Komentar tidak mengulang setiap baris kode.
Di `app.js`, mulai dari `start()` dan `startPage()`, lalu ikuti handler halaman.
Di `admin.js`, mulai dari `mountAdmin()` dan `render()`, lalu fungsi `page...`.
Di wallet tiket, ikuti model data → render → QR → download.

Template HTML/SVG di dalam string sengaja tidak diubah formatter. Mengubah
whitespace string dapat mengubah hasil render, teks, atau file tiket yang diunduh.
Pemisahan template besar menjadi modul tambahan adalah refactor lanjutan,
bukan bagian dari tahap formatting yang menjaga perilaku ini.

## Format yang konsisten

Aturan tersedia di `.prettierrc.json`, `.prettierignore`, dan `.editorconfig`.
Gunakan indentasi dua spasi, LF, dan formatter yang sama. Dari root:

```powershell
npx.cmd --yes --ignore-scripts --package=prettier@3.6.2 prettier --write '*.html' 'js/**/*.js' 'css/**/*.css'
npx.cmd --yes --ignore-scripts --package=prettier@3.6.2 prettier --check '*.html' 'js/**/*.js' 'css/**/*.css'
```

Formatter menggunakan cache npm sementara, bukan dependency runtime aplikasi.
Jangan memformat vendor atau mengedit migrasi lama untuk perubahan kosmetik.

## Verifikasi

```powershell
node tests/audit_contract.mjs
node tests/test_native_client.mjs
node tests/test_ticket_design.mjs
node tests/test_ticket_wallet.mjs
python tests/test_login_browser_mock.py
python tests/test_admin_mock.py
python tests/test_connected_booking_regression.py
python tests/test_admin_role_browser.py
python tests/test_navigation_browser.py
```

Tes browser memerlukan Chrome, Playwright, dan akses menjalankan server lokal.
Mock digunakan untuk menghindari pembuatan pesanan/check-in nyata.
`test_source_equivalence.mjs` dan `test_html_equivalence.py` membandingkan source
dengan snapshot sebelum cleanup; snapshot berada di direktori sementara dan
bukan bagian dari distribusi aplikasi.

Untuk CSS, `test_css_equivalence.py SNAPSHOT` membandingkan aturan/deklarasi
yang dibaca Chrome beserta urutannya. Spasi delimiter dan ejaan desimal
dinormalkan; isi string kutipan dan nilai properti tidak diabaikan.
CSS hasil format memakai blok multiline, satu deklarasi per baris, sehingga
selector, media query, dan override lebih mudah dilacak. Urutan stylesheet
dan selector tetap sama. Perubahan kosmetik tidak boleh digabung dengan
pengubahan breakpoint, harga, autentikasi, atau alur pesanan.

Role admin/customer tetap dipisahkan. Pemeriksaan frontend bukan pengganti
otorisasi backend/RLS/RPC. Cleanup ini tidak mengubah database atau deployment.
