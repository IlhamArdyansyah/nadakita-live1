# NADAKITA LIVE

Website reservasi tiket konser untuk tugas pengembangan web. Pengunjung melihat
acara, customer mengajukan reservasi, dan admin meninjau pesanan serta
memvalidasi e-ticket melalui QR.

**Simulasi akademik:** konser, jadwal, harga, denah GBK, dan tiket bukan penawaran
resmi atau akses masuk konser sungguhan. Tidak ada pembayaran nyata atau
afiliasi resmi dengan artis/pengelola venue.

Dokumentasi diperbarui **11 Oktober 2026**, berdasarkan HTML, CSS, JavaScript,
aset lokal, migrasi, dan laporan pengujian yang ada di workspace. Ini bukan
pernyataan bahwa seluruh kondisi database/layanan produksi telah diuji ulang.

## Daftar isi

- [Gambaran proyek](#gambaran-proyek)
- [Fitur dan hak akses](#fitur-dan-hak-akses)
- [Tampilan dan fitur terkini](#tampilan-dan-fitur-terkini)
- [Teknologi](#teknologi)
- [Menjalankan website](#menjalankan-website)
- [Konfigurasi Supabase](#konfigurasi-supabase)
- [Daftar halaman](#daftar-halaman)
- [Alur reservasi dan tiket](#alur-reservasi-dan-tiket)
- [Gambar dan audio](#gambar-dan-audio)
- [Demo HP dengan Cloudflare](#demo-hp-dengan-cloudflare)
- [Pengujian](#pengujian)
- [Panduan pengembangan](#panduan-pengembangan)
- [Troubleshooting](#troubleshooting)
- [Batasan](#batasan)
- [Dokumentasi pendukung](#dokumentasi-pendukung)

Folder, modul, relasi database, RPC, dan alur teknis dijelaskan di
[README_ALUR_DAN_STRUKTUR.md](README_ALUR_DAN_STRUKTUR.md).

## Gambaran proyek

Konsepnya **one city, three nights**: tiga malam dengan satu artis utama per malam.
Seed menggunakan The Weeknd, Justin Bieber, dan Bruno Mars pada 20–22 November
2026, dengan venue ilustratif GBK, Jakarta. Tampilan mengikuti data acara
database, bukan pengumuman konser resmi.

Tujuan proyek adalah menghubungkan informasi acara, pilihan zona, reservasi,
review admin, penerbitan tiket, dan pencatatan kehadiran dalam satu sistem.

## Fitur dan hak akses

| Peran      | Fitur                                                                                                             |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| Pengunjung | Home, daftar/detail artis, show guide, countdown, venue dan kategori                                              |
| Customer   | Register/login, recovery password, profil, reservasi, My Orders, pembatalan yang diizinkan, e-ticket/download PNG |
| Admin      | Kelola acara/zona, review order, peserta, validasi QR, laporan/CSV, konten, pengaturan, profil admin              |

Admin mempunyai **10 modul**: Overview, Concert Management, Ticket Management,
Orders & Transactions, Attendees, Ticket Validation, Analytics & Reports,
Website Content, General Settings, dan Admin Profile.

Admin tidak dipakai untuk booking customer. Menu dan redirect dibedakan; RPC
reserve/submit juga memeriksa role di database. Hak admin berasal dari
`admin_grants`, bukan nama, email, atau metadata profil yang bisa diubah user.

## Tampilan dan fitur terkini

| Bagian       | Implementasi saat ini                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Home         | Hero Jakarta/GBK neon, tiga card artis, countdown Inggris, dan venue map dengan kategori/harga malam terpilih                   |
| The Shows    | Tiga malam konser; panel `JUST THE HEADLINER.` dengan One Artist, One Stage, One Night dan link `PLAN YOUR NIGHT` ke Show Guide |
| Detail artis | Portrait, tanggal/hari dari jadwal acara, informasi venue/jam, tombol Tickets/Show Guide, player lagu, dan Concert Zones        |
| Show Guide   | Banner stadion, pilihan malam lengkap dengan artis/tanggal, timeline rundown, informasi sebelum datang, dan venue map           |
| Tickets      | Pilihan konser, highlight zona, jumlah tiket, stok, ringkasan total, serta cart bar untuk HP                                    |
| Checkout     | Buyer Details dari akun/profil bila tersedia; Attendees diisi terpisah, kemudian reserve dan submit untuk review                |
| My Orders    | Order milik akun, status review, tiket individual setelah approval, QR, download PNG, dan profil customer                       |
| Admin        | Workspace organizer terpisah, approval order, manajemen katalog, validasi QR dan pencatatan check-in                            |

Klik `DISCOVER THIS NIGHT` membuka halaman detail artis; player lagu tidak
dipasang di luar halaman detail. Pemilihan zona dari halaman publik menuju
Tickets untuk konser/zona tersebut, bukan langsung menambah jumlah atau membayar.

Navigasi memakai dokumen HTML biasa, preload font lokal, prefetch link internal,
dan reveal setelah render/font/gambar awal siap. Tidak ada SPA router atau jaminan
semua perpindahan instan pada jaringan lambat. Layout menggunakan tema paper,
hitam, pink, dan lime, dengan penyesuaian desktop/HP. Favicon N★ ada pada
semua 14 entry point HTML.

## Teknologi

| Bagian     | Implementasi                                                 |
| ---------- | ------------------------------------------------------------ |
| Frontend   | HTML statis, CSS, JavaScript ES modules                      |
| Client API | Adapter browser-native `fetch` di `js/live/native-client.js` |
| Backend    | Supabase Auth, Data API, PostgreSQL, RPC, Storage            |
| Otorisasi  | Role, hak eksekusi fungsi, dan Row Level Security (RLS)      |
| QR tiket   | Library lokal `js/vendor/qrcode-1.0.0.min.js`                |
| Scanner    | `html5-qrcode@2.3.8`, dimuat dari CDN saat kamera dijalankan |
| Download   | SVG dirender di browser lalu diekspor sebagai PNG            |
| Tes        | Node.js dan Python Playwright                                |

Tidak ada framework frontend atau proses build npm. Python HTTP server hanya
opsi untuk menyajikan file, bukan backend logic bisnis. Internet tetap diperlukan
untuk Supabase dan scanner CDN.

## Menjalankan website

### Persiapan

- Browser modern dengan JavaScript aktif.
- VS Code + Live Server **atau** Python 3.
- Internet dan konfigurasi Supabase yang sesuai.
- Node.js/Playwright hanya diperlukan untuk tes.

### Opsi A: Live Server

Buka folder di VS Code → klik kanan `index.html` → **Open with Live Server**.
Contoh URL: `http://127.0.0.1:5500/index.html`.

### Opsi B: Python

Dari root proyek:

```powershell
python -m http.server 5500 --bind 127.0.0.1
```

Buka `http://127.0.0.1:5500/index.html`. Biarkan terminal berjalan; `Ctrl+C`
menghentikan server. Jangan membuka lewat double-click/`file://`: modules dan
request layanan perlu HTTP/HTTPS. Tidak perlu `npm install` atau `npm run dev`.

## Konfigurasi Supabase

### Proyek yang sudah terhubung

URL proyek dan publishable key frontend ada di
[js/live/config.js](js/live/config.js). [SUPABASE_CONNECTED.md](SUPABASE_CONNECTED.md)
adalah catatan koneksi historis, bukan jaminan layanan selalu sehat atau seluruh
skenario produksi lolos.

**Jangan menjalankan ulang schema/seed awal di database yang sudah terisi.**
Periksa riwayat migrasi dan backup sebelum perubahan database.

### Salinan dengan proyek baru

1. Buat proyek Supabase milik sendiri.
2. Pada database baru/kosong, jalankan SQL satu per satu sesuai urutan berikut:

   ```text
   001_schema.sql
   002_operations.sql
   003_seed.sql
   004_artist_asset_paths.sql
   005_public_copy_refresh.sql
   006_function_privileges.sql
   007_performance_indexes.sql
   008_split_admin_write_policies.sql
   009_admin_review_workflow.sql
   20261010091945_separate_admin_customer_booking.sql
   ```

   File ada di [supabase/migrations](supabase/migrations). Ini urutan bootstrap
   manual salinan baru. Jangan mencampur SQL manual dan CLI tanpa mencocokkan
   migration history terlebih dahulu.

3. Isi `SUPABASE_URL` dan `SUPABASE_PUBLISHABLE_KEY` di `js/live/config.js`.
   Jangan masukkan secret/service-role key, password database, atau connection string.
4. Aktifkan Email Auth. Konfirmasi email/recovery mengikuti pengaturan Auth/SMTP.
   Register/reset UI meminta password minimal 10 karakter; aturan server bisa lebih ketat.
5. Atur Site URL dan redirect sesuai origin, misalnya
   `http://127.0.0.1:5500` dan `http://127.0.0.1:5500/reset-password.html`.
   `localhost`, `127.0.0.1`, port lain, dan Cloudflare adalah origin berbeda.
   Lihat [redirect Supabase](https://supabase.com/docs/guides/auth/redirect-urls).
6. Guest checkout didukung melalui anonymous sign-in. Bila digunakan, aktifkan
   Anonymous Sign-ins dan pertimbangkan anti-abuse. Untuk presentasi gunakan
   customer terdaftar/login; guest bukan akun email yang otomatis dapat dipulihkan.
7. Uji signup, login, recovery, reserve, review, download, dan check-in di proyek uji.

### Memberikan akses admin

Register akun khusus admin, konfirmasi email bila diwajibkan, dan ambil UUID
dari Auth Dashboard. Hanya operator tepercaya menjalankan contoh SQL berikut:

```sql
insert into public.admin_grants (user_id)
values ('GANTI_DENGAN_UUID_AKUN_ADMIN'::uuid)
on conflict (user_id) do nothing;
```

Ganti placeholder dengan UUID nyata. Login akun tersebut → `admin.html`.
Tidak ada form pendaftaran admin publik atau password admin bawaan.

## Daftar halaman

| File                                          | Fungsi                                                        |
| --------------------------------------------- | ------------------------------------------------------------- |
| `index.html`                                  | Home, countdown, highlight acara dan venue                    |
| `shows.html`                                  | Daftar malam konser dan panel format headliner                |
| `show.html?show=weeknd`                       | Detail + player + zona; slug lain `bieber`, `bruno`           |
| `schedule.html?show=weeknd`                   | Show Guide/rundown; malam dipilih lewat tab atau query `show` |
| `tickets.html`                                | Pilih acara, zona, jumlah, stok                               |
| `checkout.html`                               | Buyer, attendee, ringkasan, reserve dan submit                |
| `dashboard.html`                              | My Orders, profil, e-ticket                                   |
| `admin.html`                                  | Control room; modul lewat hash seperti `#validation`          |
| `login.html`, `register.html`                 | Login/registrasi                                              |
| `forgot-password.html`, `reset-password.html` | Recovery password                                             |
| `about.html`                                  | Konsep/informasi                                              |
| `screens.html`                                | Direktori preview untuk review UI                             |

## Alur reservasi dan tiket

```text
Pilih konser/zona/jumlah → Buyer Details + Attendees
  → Reserve Tickets → pending_demo (hold awal 10 menit)
  → Submit for Review → under_review (hold review 24 jam)
  → Admin approve → confirmed_demo → e-ticket + download PNG
  → Admin inspect QR → Check In → kehadiran tercatat
```

- Buyer mengikuti profil login bila tersedia; attendee diisi per tiket.
- Maksimal **4 tiket per reservasi**, divalidasi RPC.
- Reserve belum sama dengan submit; menunggu review belum mempunyai QR.
- Approval bukan pembayaran. Harga simulasi bukan pendapatan.
- Rejected, cancel valid, dan expiry membebaskan stok menurut status/waktu.
  Admin menjalankan rekonsiliasi expiry saat merender modul workspace;
  perhitungan stok juga mengecualikan hold lewat waktu. Tidak ada scheduler
  background terjadwal yang disertakan.
- Kamera/Inspect memeriksa; **Check In** mencatat kehadiran.
- Database memeriksa konser, order, dan penggunaan ulang.
- Order dengan tiket yang sudah check-in tidak boleh dibatalkan.
- RPC `confirm_demo_order` lama dinonaktifkan; jangan dipakai untuk bypass review.

Detail ada di [panduan alur](README_ALUR_DAN_STRUKTUR.md#status-order).

## Gambar dan audio

```text
assets/images/artists/the-weeknd.jpg
assets/images/artists/justin-bieber.jpg
assets/images/artists/bruno-mars.jpg

assets/audio/the-weeknd.mp3
assets/audio/justin-bieber.mp3
assets/audio/bruno-mars.mp3
```

Poster admin dapat menggantikan fallback lokal. Upload admin memakai Storage
bucket `nadakita-public`; UI membatasi JPEG/PNG/WebP dan maksimum 5 MB.

Konfigurasi lagu ada di [js/song-previews.js](js/song-previews.js). Kartu artis /
Discover This Night membuka detail dengan player. Lagu baru diputar setelah
pengunjung menekan Play; tidak ada autoplay. **Ketiga MP3 sudah tersedia.**
Konfigurasi judul saat ini:

| Artis         | Judul lagu           | File                |
| ------------- | -------------------- | ------------------- |
| The Weeknd    | Moth To A Flame      | `the-weeknd.mp3`    |
| Justin Bieber | DAISIES              | `justin-bieber.mp3` |
| Bruno Mars    | Locked Out Of Heaven | `bruno-mars.mp3`    |

Ganti properti `title` di bagian atas `js/song-previews.js` untuk mengubah judul.
Player menampilkan judul di atas dan nama artis di bawah tanpa tambahan “Audio preview”.
Properti `cover` opsional untuk thumbnail khusus; secara default memakai foto artis.
Durasi mengikuti file
sebenarnya, bukan angka preview yang dibuat-buat. File hilang/gagal menampilkan
pesan error dan `RETRY AUDIO`; `src` kosong menampilkan coming soon.

Lineup di Home dan The Shows memakai foto artis lokal dengan fallback poster SVG geometris,
dengan nama/tanggal berupa HTML dan tombol Discover This Night. Styling ada di
`css/lineup-posters.css`; pada HP, kartu ditumpuk satu per baris.

Detail artis menggunakan layout editorial dengan portrait HTML, jadwal Inggris
yang dihitung dari tanggal acara, player kartu terang dengan tombol play pink, dan kategori di sebelah
peta venue. Renderer dipisah ke `js/live/show-detail.js`, dengan stylesheet
khusus `css/artist-detail.css`. Harga dan link zona memakai komponen venue yang
sama dengan Tickets; tidak ada keranjang/pembayaran baru. Durasi player dibaca
dari file audio, dan kegagalan audio menyediakan Retry. Lihat
[QA detail artis](tests/ARTIST_DETAIL_QA.md).

Favicon memakai monogram N★ pada `assets/icons/favicon.svg`, dipasang di semua
14 entry point HTML. Ikon SVG tidak bergantung pada font atau layanan eksternal.
Tes: `node tests/test_favicon.mjs` dan `python tests/test_favicon_browser.py`.

Hero Home memakai gambar pengguna `assets/images/banners/neon-jakarta-gbk-hero.png`
tanpa mengubah file asli. Teks/tombol adalah HTML, dengan styling terisolasi di
`css/jakarta-hero.css`: overlay gelap di desktop, teks di atas dan stadion di bawah
untuk HP. Pengaturan admin `hero_title`, `hero_subtitle`, dan `hero_banner_url`
tetap berfungsi. Gambar diberi `fetchpriority="high"` dan ikut proses decode
sebelum reveal halaman. Lihat [QA Jakarta hero](tests/JAKARTA_HERO_QA.md).

Venue map malam memakai `assets/images/venue/gbk-concert-map-night-v3.png`
(ilustrasi AI tanpa teks/harga permanen). Zona interaktif dan legenda dirender
oleh `js/ticket-zones.js`, dengan styling terisolasi di `css/venue-night.css`.
Komponen yang sama dipakai di Home, Show Guide, detail artis, dan Tickets.
Harga berasal dari `ticket_categories` Supabase untuk malam yang dipilih, bukan
angka pada referensi gambar. Jika gagal dimuat, UI menampilkan `Price unavailable`
dan opsi retry; tidak memakai harga prototype sebagai harga live.

Dua baris catatan panjang di bawah peta sudah dihapus dari renderer bersama.
Label pendek `ILLUSTRATIVE · NOT TO SCALE` pada header peta masih ada.
Keterangan konsep di footer sudah dihapus, begitu juga link Customer Account dan
Admin Dashboard. Footer bawah hanya menampilkan © 2026 NADAKITA LIVE.; akses akun
tetap tersedia melalui navigasi Account. Catatan hero lama juga tidak
lagi ditampilkan. Penghapusan copy tersebut tidak mengubah fungsi peta, harga,
stok, atau validitas tiket.

Ini ilustrasi, bukan denah resmi/pemilihan nomor kursi. Tidak ada klaim gate,
pajak/biaya tambahan, atau akses konser nyata. Hak artis dan pihak ketiga tidak
otomatis menjadi milik proyek. Lihat [QA venue map](tests/VENUE_NIGHT_QA.md).

Show Guide memakai konsep editorial neon: banner stadion ringkas, pemilih malam
hitam/lime, dan timeline yang bersih. Teks serta kontrol tetap HTML, bukan gambar
halaman. Pada HP, tab malam tetap menampilkan nama artis dan informasi kedatangan
berada di bawah rundown. Styling halaman terakhir dimuat dari
`css/show-guide-neon.css`; lihat [QA Show Guide](tests/SHOW_GUIDE_NEON_QA.md).

## Demo HP dengan Cloudflare

Quick Tunnel menyediakan HTTPS sementara, bukan hosting tetap. Link bisa berubah
dan tanpa jaminan uptime. Rujukan:
[Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

**Jangan mengekspos root proyek** yang berisi SQL, tes, dan file internal.
Dari root, buat salinan khusus file publik:

```powershell
$previewRoot = Join-Path $env:TEMP ('nadakita-public-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $previewRoot | Out-Null
Get-ChildItem -File -Filter '*.html' | Copy-Item -Destination $previewRoot
Copy-Item -Path 'css', 'js', 'assets' -Destination $previewRoot -Recurse
python -m http.server 5501 --bind 127.0.0.1 --directory $previewRoot
```

Di terminal lain, setelah `cloudflared` terpasang dan ada di PATH:

```powershell
cloudflared tunnel --url http://127.0.0.1:5501 --no-autoupdate --protocol http2
```

Jika tidak di PATH, panggil lokasi executable yang terpasang. Gunakan link yang
dicetak terminal + `/login.html` atau `/admin.html#validation`. Izinkan kamera.
Untuk email confirmation/recovery, cocokkan redirect domain preview baru.

Contoh PowerShell bila muncul `cloudflared is not recognized` (ganti path dengan
lokasi executable di laptop):

```powershell
& 'C:\lokasi\cloudflared.exe' tunnel --url http://127.0.0.1:5501 --no-autoupdate --protocol http2
```

Nilai protokol adalah `http2`, bukan `https`. Port pada perintah tunnel harus sama
dengan port server. Preview yang dijalankan pada sesi pengembangan terakhir memakai
port `5512`; perintah setup di atas memakai `5501` untuk kedua proses.

Jika muncul **Error 1033**, periksa proses tunnel dan koneksi internet, lalu jalankan
ulang tunnel bila perlu. Gunakan URL baru yang tercetak, bukan bookmark URL lama.
Jika server lokal tidak bisa dibuka, aktifkan server dahulu. URL Quick Tunnel tidak
dicatat sebagai alamat tetap karena dapat berubah saat proses dibuat ulang.

Laptop, internet, server, dan tunnel harus tetap aktif. Preview adalah salinan,
bukan otomatis mengikuti source; buat/sinkronkan ulang file publik setelah edit.
Jangan menaruh secret dalam `js`/`assets` yang akan disalin.

## Pengujian

### Node

```powershell
node tests/audit_contract.mjs
node tests/test_native_client.mjs
node tests/test_ticket_design.mjs
node tests/test_ticket_wallet.mjs
node tests/test_venue_map.mjs
node tests/test_countdown_copy.mjs
node tests/test_favicon.mjs
```

### Browser

```powershell
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
python tests/test_login_browser_mock.py
python tests/test_connected_booking_regression.py
python tests/test_admin_role_browser.py
python tests/test_admin_mock.py
python tests/test_navigation_browser.py
python tests/test_venue_browser.py
python tests/test_jakarta_hero.py
python tests/test_countdown_english.py
python tests/test_show_guide_neon.py
python tests/test_artist_detail.py
python tests/test_shows_focus.py
python tests/test_lineup_posters.py
python tests/test_favicon_browser.py
# Opsional: katalog Supabase asli, read-only; tidak membuat reservasi.
python tests/test_venue_live.py
```

Sebagian harness memakai Chrome terpasang atau path Windows tertentu, bukan
Chromium bundled. Periksa launch configuration bila executable tidak ditemukan.
Tes pixel membutuhkan Pillow dan snapshot source sebelum cleanup beserta argumen.

### Kesetaraan source dan hasil terakhir

Snapshot adalah salinan source **sebelum** perubahan, bukan folder source yang
sedang berjalan. Buat snapshot baru untuk cleanup berikutnya; jangan memakai
path TEMP milik mesin lain atau menganggap snapshot historis selalu masih ada.

```powershell
# Isi dengan direktori snapshot dan plugin Babel dari instalasi Prettier lokal.
$sourceSnapshot = 'C:\TEMP\nadakita-before-cleanup'
$babelPluginPath = 'C:\LOKASI_PRETTIER\plugins\babel.mjs'
node tests/test_source_equivalence.mjs $sourceSnapshot $babelPluginPath
python tests/test_html_equivalence.py $sourceSnapshot
python tests/test_css_equivalence.py $sourceSnapshot
# Opsional: Pillow belum tercantum di requirements-dev.txt.
python -m pip install Pillow
python tests/test_format_visual_regression.py $sourceSnapshot
```

Cleanup terakhir memeriksa **14 HTML, 15 JS first-party, dan 11 CSS**.
Formatter, syntax, AST/string JS, markup HTML, dan aturan CSS browser lolos.
Regresi navigasi, booking, pemisahan role, serta login mock juga lolos.
Enam CSS yang sebelumnya padat sudah diubah menjadi blok multiline;
HTML/JS yang sudah sesuai format tidak ditulis ulang tanpa alasan.

Runner lama:

```powershell
powershell -ExecutionPolicy Bypass -File tests/run_all.ps1
```

Runner belum mencakup semua tes baru. Hasil historis dan batasan ada di
[hasil cleanup](docs/CODE_CLEANUP_RESULTS.md) dan [QA navigasi](tests/NAVIGATION_QA.md).
Suite pixel penuh belum dinyatakan lolos: ada variasi pixel foto dan bintang
dekoratif login, termasuk pada kontrol dengan source identik. Jangan
menghapus assertion untuk menutupi kegagalan atau menyatakan seluruh produksi lolos.

Mock tidak memverifikasi email delivery, database produksi, concurrency nyata,
kamera HP, atau audio sebenarnya. Uji isolasi order A/B, perebutan stok terakhir,
expiry, reject, scan ulang/konser salah, dan cancel setelah check-in di proyek uji.

## Panduan pengembangan

- Ikuti indentasi dua spasi, `.editorconfig`, `.prettierrc.json`.
- Pertahankan urutan stylesheet/script dan bootstrap.
- Jangan memformat vendor atau mengedit migrasi historis untuk kosmetik.
- Secret, password akun demo, dan data customer tidak masuk source.
- Backend/RLS/RPC tetap otoritas; menu tersembunyi bukan otorisasi.
- Perubahan database memakai migrasi baru dan diuji pada salinan.
- Pisahkan formatting dari perubahan perilaku.

Formatter opsional:

```powershell
npx.cmd --yes --ignore-scripts --package=prettier@3.6.2 prettier --write '*.html' 'js/**/*.js' 'css/**/*.css'
npx.cmd --yes --ignore-scripts --package=prettier@3.6.2 prettier --check '*.html' 'js/**/*.js' 'css/**/*.css'
```

Panduan fungsi: [docs/CODE_GUIDE.md](docs/CODE_GUIDE.md).

## Troubleshooting

| Masalah                      | Pemeriksaan                                                       |
| ---------------------------- | ----------------------------------------------------------------- |
| Halaman kosong/module gagal  | HTTP/HTTPS, JavaScript, Console dan Network                       |
| Login gagal                  | Email/password, confirmation, internet dan respons Auth           |
| Admin masuk halaman customer | UUID grant dan sesi yang benar; logout/login kembali              |
| Buyer kosong                 | Lengkapi profil; guest tidak punya profil lengkap otomatis        |
| Reserve ditolak              | Stok/sales window, kontak/attendee, maksimal 4 tiket, bukan admin |
| Tiket belum muncul           | Sudah submit? Sudah approve? Refresh My Orders; cek cancel        |
| Recovery URL salah           | Site URL/redirect, origin, port, dan domain tunnel                |
| Kamera gagal                 | HTTPS/localhost, izin, CDN; gunakan kode manual                   |
| already_used / wrong_concert | Status tiket dan konser terpilih; jangan memaksa Check In         |
| Lagu tidak diputar           | Tekan Play, lalu cek nama/path MP3 dan ketersediaan file          |
| Tunnel mati                  | Server/tunnel aktif, link baru, laptop online                     |
| Browser test gagal launch    | Cocokkan executable dengan harness                                |

## Batasan

- Belum ada payment gateway, pembayaran nyata, refund, atau invoice.
- Nilai reservasi simulasi bukan revenue/pembayaran diterima.
- Tidak ada nomor kursi atau denah resmi.
- Tidak ada jaminan beban ribuan pengguna atau kesiapan produksi.
- SMTP, hosting/domain tetap, monitoring, dan cleanup terjadwal perlu
  disiapkan/diperiksa sebelum penggunaan publik lebih luas.
- Template besar belum seluruhnya dipecah; cleanup terutama format/komentar.
- Role, RLS, RPC, dan dependensi tetap perlu audit sebelum peluncuran nyata.

## Dokumentasi pendukung

- [Alur dan struktur](README_ALUR_DAN_STRUKTUR.md)
- [Panduan kode](docs/CODE_GUIDE.md)
- [Hasil cleanup](docs/CODE_CLEANUP_RESULTS.md)
- [Pemisahan admin/customer](docs/ADMIN_CUSTOMER_ROLE_SEPARATION.md)
- [Review pesanan](ADMIN_REVIEW_UPDATE.md)
- [Desain e-ticket](docs/E_TICKET_DESIGN_AUDIT.md)
- [QA wallet](tests/TICKET_WALLET_QA.md)
- [QA navigasi](tests/NAVIGATION_QA.md)
- [QA Home/Jakarta hero](tests/JAKARTA_HERO_QA.md)
- [QA Show Guide](tests/SHOW_GUIDE_NEON_QA.md)
- [QA detail artis/audio](tests/ARTIST_DETAIL_QA.md)
- [QA panel The Shows](tests/SHOWS_FOCUS_QA.md)
- [QA venue map](tests/VENUE_NIGHT_QA.md)
- [Alur zona/booking](BOOKING_FLOW_REFINEMENT.md)
- [Koneksi Supabase](SUPABASE_CONNECTED.md)

Laporan lama adalah riwayat. Untuk cara pakai/alur terkini, utamakan dua README
ini dan source/migrasi terbaru.
