# NADAKITA LIVE — Alur dan Struktur Proyek

Panduan perjalanan pengguna, urutan eksekusi, modul, database, dan operasi server.
Setup serta perintah menjalankan/tes ada di [README utama](README.md).
Dokumentasi diperbarui 11 Oktober 2026 berdasarkan source, bukan pemeriksaan
kondisi database produksi secara langsung pada saat penulisan.

## Daftar isi

- [Struktur folder](#struktur-folder)
- [Tanggung jawab modul](#tanggung-jawab-modul)
- [Bootstrap halaman](#bootstrap-halaman)
- [Tampilan dan komponen publik](#tampilan-dan-komponen-publik)
- [Autentikasi dan role](#autentikasi-dan-role)
- [Alur customer](#alur-customer)
- [Status order](#status-order)
- [Alur admin](#alur-admin)
- [E-ticket dan QR](#e-ticket-dan-qr)
- [Relasi database](#relasi-database)
- [Operasi backend](#operasi-backend)
- [Migrasi](#migrasi)
- [Navigasi dan audio](#navigasi-dan-audio)
- [Menelusuri kode](#menelusuri-kode)
- [Urutan demo](#urutan-demo)

## Struktur folder

Pohon berikut menampilkan file inti; screenshot dan laporan historis tidak
ditampilkan satu per satu.

```text
NADAKITA-LIVE-APP/
├── README.md                       # Setup, fitur, tes, troubleshooting
├── README_ALUR_DAN_STRUKTUR.md      # Dokumen ini
├── index.html                      # Home
├── shows.html / show.html          # Daftar/detail konser
├── schedule.html                   # Show Guide
├── tickets.html / checkout.html    # Pilihan dan reservasi
├── dashboard.html                  # Akun customer dan My Orders
├── admin.html                      # Control Room
├── login.html / register.html      # Auth
├── forgot-password.html            # Permintaan recovery
├── reset-password.html             # Password baru
├── about.html / screens.html       # Konsep dan direktori preview
├── assets/
│   ├── audio/                      # README + MP3 ketiga artis
│   ├── fonts/                      # Font lokal
│   ├── icons/favicon.svg           # Monogram N★ untuk tab browser
│   └── images/
│       ├── artists/                # Foto artis
│       ├── banners/                # Banner/ilustrasi
│       └── venue/                  # Peta ilustratif
├── css/
│   ├── preview.css                 # Base styling
│   ├── type-refinement.css         # Font, tipografi, readiness/transisi
│   ├── live.css                    # Halaman live, akun/admin
│   ├── booking-flow.css            # Booking, diagram zona, tiket
│   ├── venue-night.css             # Venue malam, legenda harga, responsive
│   ├── jakarta-hero.css            # Hero Home, overlay dan layout HP
│   ├── show-guide.css              # Guide/rundown
│   ├── show-guide-neon.css         # Banner stadion, panel malam gelap, layout HP
│   ├── artist-detail.css           # Portrait artis, player terang, kategori/peta
│   ├── lineup-posters.css          # Kartu foto artis pada Home dan The Shows
│   ├── shows-focus.css             # Panel format konser pada The Shows
│   └── countdown.css               # Countdown
├── js/
│   ├── preview.js                  # Shell dan markup awal
│   ├── navigation.js               # Reveal dan prefetch
│   ├── countdown.js                # Countdown
│   ├── show-guide.js               # Tab malam dan rundown
│   ├── song-previews.js            # Player detail artis
│   ├── ticket-zones.js             # Diagram dan highlight zona
│   ├── live/
│   │   ├── app.js                  # Bootstrap dan renderer live
│   │   ├── show-detail.js          # Presentasi detail artis dari katalog live
│   │   ├── admin.js                # Sepuluh modul admin
│   │   ├── config.js               # URL/publishable key
│   │   ├── native-client.js        # HTTP Auth/REST/RPC/Storage
│   │   ├── supabase.js             # Adapter bersama dan guard sesi
│   │   ├── ticket-wallet.js        # Model, QR, render, export tiket
│   │   ├── ticket-svg.js           # Layout SVG
│   │   └── ticket-themes.js        # Tema artis/kategori
│   └── vendor/                     # QR library dan lisensi
├── supabase/migrations/            # Schema, seed, RPC, RLS dan revisi
├── docs/                           # Panduan, spec, audit
├── tests/                          # Tes Node/browser dan bukti QA
├── tasks/                          # Rencana/checklist pengerjaan
├── requirements-dev.txt            # Dependency browser test
├── .editorconfig                   # Aturan editor
├── .prettierrc.json                 # Aturan formatter
├── .prettierignore                  # Pengecualian formatter
└── .gitignore                      # Pengecualian version control
```

HTML tetap di root agar URL tidak berubah. SQL, docs, tests, dan tasks bukan aset
runtime yang perlu dipublikasikan. Preview HP sebaiknya menyajikan salinan khusus
HTML, CSS, JS, dan assets saja.

## Tanggung jawab modul

| Modul                   | Fungsi                                                          | Kapan dibaca/diubah                                                |
| ----------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------ |
| HTML halaman            | Metadata, preload, urutan CSS/script, `body[data-page]`, `#app` | Entry point/aset halaman                                           |
| `preview.js`            | Header/footer, `main-content`, template awal                    | Shell visual                                                       |
| `live/app.js`           | Handler halaman, data publik, auth, booking/dashboard           | Koordinasi fitur customer                                          |
| `live/show-detail.js`   | Layout editorial artis, tanggal/jam dan fallback portrait       | Presentasi detail artis tanpa query tambahan                       |
| `live/admin.js`         | Layout/hash/renderer admin                                      | Pengelolaan, review, scan                                          |
| `live/supabase.js`      | `req`, session/role guard, format uang, escape, report          | Batas bersama akses data                                           |
| `live/native-client.js` | `fetch`, Auth/session, builder query, RPC/Storage               | Detail transport API                                               |
| `live/config.js`        | Konfigurasi publik                                              | Menghubungkan proyek Supabase sendiri                              |
| `live/ticket-wallet.js` | Model, eligibility, QR, download                                | My Orders/export                                                   |
| `live/ticket-svg.js`    | Ukuran, field, layout dan wrapping teks                         | Desain tiket                                                       |
| `live/ticket-themes.js` | Warna/artwork per artis/kategori                                | Variasi visual                                                     |
| `navigation.js`         | Readiness/reveal/prefetch                                       | Stabilitas perpindahan halaman                                     |
| `show-guide.js`         | Pilihan malam/rundown                                           | Jadwal                                                             |
| `ticket-zones.js`       | Diagram malam reusable, legenda harga dan zona aktif            | Home/guide/detail/tickets; harga Supabase, bukan teks dalam gambar |
| `countdown.js`          | Target acara/countdown                                          | Beranda                                                            |
| `song-previews.js`      | Konfigurasi/player audio                                        | Path MP3 dan player detail                                         |
| `shows-focus.css`       | Panel ringkas headliner, tiga fakta, dan link Show Guide        | The Shows saja; dua kolom desktop, bertumpuk pada HP               |

`preview.js` adalah shell/fallback visual, bukan sumber kebenaran order.
Harga, stok, status, kepemilikan, dan tiket issued mengikuti backend.

## Bootstrap halaman

```text
HTML + CSS + preload font
  → preview.js membentuk shell/main-content
  → app.js: start() → startPage()
  → konfigurasi/sesi/role sesuai halaman
  → renderer mengambil data dan memasang handler
  → navigation.reveal(): font/gambar terlihat siap
  → data-page-ready + event nadakita:page-ready
```

`body[data-page]` menentukan handler. Admin dimount hanya setelah role lolos.
Form auth disiapkan lebih awal agar restore session lambat/invalid tidak
mengunci login baru. Error mengikuti jalur report/alert.

Readiness mengurangi perubahan font/foto terlambat, bukan menghilangkan latency.
Halaman masih membutuhkan waktu memuat dan dapat mengalami kegagalan jaringan.

## Tampilan dan komponen publik

Home memakai hero Jakarta/GBK dengan teks dan tombol HTML di atas aset lokal,
bukan satu gambar halaman penuh. Pengaturan konten admin dapat mengganti judul,
subjudul, dan banner. Countdown berlabel DAYS, HOURS, MINUTES, SECONDS; target
jadwal dihitung dengan offset WIB (`+07:00`), bukan zona waktu perangkat.
State-nya upcoming, live, completed, atau unavailable, dengan satu timer aktif.

The Shows mempertahankan tiga card artis. Panel sesudah card menggunakan
`JUST THE HEADLINER.`, daftar One Artist/One Stage/One Night, dan tautan ke
Show Guide. Stylesheet `shows-focus.css` hanya dimuat di `shows.html`.

Home dan The Shows berbagi `showCard()` / `lineupArtwork()` di `preview.js`.
Foto berasal dari `assets/images/artists/`; SVG geometris menjadi fallback bila
foto gagal dimuat. `lineup-posters.css` menata nama besar, tanggal, tombol sejajar,
serta susunan satu kartu per baris pada lebar maksimal 800px. Artwork dan tombol
Discover This Night membuka detail artis tanpa memutar audio otomatis.

Footer bersama tidak lagi menampilkan keterangan konsep atau link Customer Account
dan Admin Dashboard. Bagian bawah hanya copyright; menu Account tetap di header.

Detail artis dirender `renderArtistDetail()` dari `live/show-detail.js` sesudah
katalog dan portrait awal tersedia. Hari/tanggal mengikuti `show_date`; jadwal
memakai `starts_at`/`gates_at` dengan fallback yang disediakan renderer.
`nadakita:show-ready` memasang player, bukan tombol audio pada card daftar.

Show Guide memakai pemilih malam gelap/lime, timeline, dan informasi kedatangan.
Perubahan malam melalui keyboard/tab/query memperbarui rundown; event
`nadakita:guide-change` menyinkronkan venue map untuk malam tersebut.

`NADAKITA_ZONES.map()` dipakai oleh Home, guide, detail, dan Tickets. Caller
memberikan kategori dan harga; renderer tidak melakukan query sendiri.
Di halaman publik kontrol zona menuju Tickets. Di Tickets, highlight map dan
baris kategori disinkronkan tanpa otomatis menambah kuantitas. Harga/loading,
error/retry, kategori kosong, dan kategori nonaktif ditangani secara terpisah.
Peta memakai gambar stadion malam ditambah label/kontrol HTML; harga bukan teks
permanen pada PNG. Dua baris catatan panjang bawah peta telah dihapus, sementara
header pendek `ILLUSTRATIVE · NOT TO SCALE` tetap ada.

Favicon `assets/icons/favicon.svg` terpasang di seluruh 14 HTML.
CSS, HTML, dan JS mengikuti format dua spasi/LF. Isi string/template runtime,
urutan stylesheet, event, query, dan alur data dipertahankan saat cleanup.

## Autentikasi dan role

1. Register mengirim email, password, nama ke Auth.
2. Confirmation mengikuti pengaturan Auth/SMTP proyek.
3. Login → `isAdmin()` → RPC `is_admin` → `admin_grants`.
4. Customer menuju dashboard; admin menuju control room.
5. Session disimpan native client pada browser. Origin berbeda memiliki storage
   berbeda; pindah localhost ke Cloudflare perlu login kembali.
6. Logout memanggil sign-out. Recovery menuju `reset-password.html` melalui URL
   yang diizinkan di pengaturan Auth.

`requireUser({ guest: true })` di checkout dapat membuat sesi anonymous jika
belum login dan Auth anonymous aktif. Itu bukan akun email otomatis; akses order
guest bergantung sesi browser. Untuk demo gunakan customer terdaftar.

Role tidak ditentukan oleh profil editable. Admin tidak bisa reserve/submit
order customer karena guard backend, selain menu/redirect frontend. Customer
biasa tidak boleh mengakses operasi admin. RLS dan RPC tetap diperiksa server.

## Alur customer

### Menemukan acara

Home → The Shows → detail artis. Data live diambil oleh `publicContent()`.
Detail memuat jadwal, poster, preview lagu, dan zona. Klik zona menuju Tickets
untuk konser/kategori terkait, belum membeli otomatis.

### Memilih tiket

`ticketPage()` mengambil show, categories, dan `get_stock()`. User memilih jumlah.
Total UI adalah ringkasan; harga authoritative dihitung RPC dari database,
bukan dipercaya dari nilai kiriman browser.

### Mengisi data

`checkoutPage()` membentuk Buyer Details, attendee sebanyak jumlah tiket, dan
ringkasan. Nama/email/telepon pembeli terisi dari akun/profil bila tersedia;
nama attendee tetap terpisah. Kontak dan nama peserta tetap divalidasi.

### Membuat hold

`create_demo_reservation` menerima show, pilihan kategori + attendee, kontak,
dan request key. Backend memeriksa sesi/role, show published, sales window,
kategori, stok, input, dan batas 4 tiket. Kategori dikunci dan kapasitas diperiksa
sebelum order/items dibuat dalam transaksi. Hold awal berlaku 10 menit.

Request key mendukung idempotensi server untuk key/data sama. Ini tidak berarti
setiap submit baru di UI setelah error otomatis memakai key lama: frontend
membuat key pada proses reserve. Jangan menyamakan dua hal tersebut.

### Mengajukan review

Setelah Reserve, user memeriksa ringkasan lalu Submit for Review.
`submit_demo_order` memeriksa owner, status dan expiry; mengubah order menjadi
`under_review` dengan expiry 24 jam dari submit. QR belum diterbitkan.

### Mendapatkan e-ticket

Admin approve menerbitkan tiket individual per attendee. Customer membuka/refresh
My Orders → melihat QR → download PNG. Order yang belum approved, rejected,
atau cancelled tidak eligible sebagai pass yang bisa digunakan.

## Status order

Nama teknis `_demo` tetap di database sebagai penanda simulasi. Label UI dibuat
lebih jelas; approval tidak pernah berarti Paid.

| Status           | Makna                            | Tiket/QR            | Stok                                                     |
| ---------------- | -------------------------------- | ------------------- | -------------------------------------------------------- |
| `pending_demo`   | Belum submit; hold awal          | Belum issued        | Ditahan selama hold belum expired (10 menit)             |
| `under_review`   | Menunggu admin                   | Belum issued        | Ditahan selama review belum expired (24 jam dari submit) |
| `confirmed_demo` | Approved                         | Issued per attendee | Terpakai                                                 |
| `rejected`       | Ditolak                          | Tidak eligible      | Dibebaskan                                               |
| `expired`        | Hold expired yang sudah ditandai | Tidak eligible      | Dibebaskan                                               |
| `cancelled`      | Dibatalkan                       | Invalid untuk masuk | Dibebaskan                                               |

```text
pending_demo ── submit ──► under_review ── approve ──► confirmed_demo
      │                         │                         │
      ├── expiry                ├── expiry                └── cancel (*)
      └── cancel                ├── reject
                                └── cancel

(*) Dilarang bila ada tiket pada order yang sudah check-in.
```

Perhitungan stok tidak menunggu scheduler: `get_stock()` mengecualikan hold
yang `expires_at` sudah lewat. Record tidak selalu otomatis berubah label menjadi
`expired` pada semua tampilan saat kapasitas kembali. Submit/review dapat
menandai expiry ketika menemukan hold terlambat. `render()` admin juga memanggil
`admin_reconcile_expirations` sebelum memuat modul untuk menandai hold awal/review
yang lewat waktu. Ini rekonsiliasi saat workspace digunakan, bukan job background
terjadwal; akun customer dapat perlu refresh untuk melihat perubahan status.

## Alur admin

`mountAdmin()` membentuk workspace; `render()` memilih fungsi `page...` melalui
hash URL. Customer mendapat access denied, bukan workspace.

| Hash          | Modul                 | Fungsi                                 |
| ------------- | --------------------- | -------------------------------------- |
| `#overview`   | Overview              | Ringkasan operasional                  |
| `#concerts`   | Concert Management    | Konser, artis, venue dan aset          |
| `#tickets`    | Ticket Management     | Harga, kategori, kapasitas dan stok    |
| `#orders`     | Orders & Transactions | Filter/review/cancel yang valid/CSV    |
| `#attendees`  | Attendees             | Peserta/tiket individual dan kehadiran |
| `#validation` | Ticket Validation     | Inspect, kamera, Check In              |
| `#reports`    | Analytics & Reports   | Nilai simulasi dan statistik/export    |
| `#content`    | Website Content       | Home/venue, FAQ, announcement          |
| `#settings`   | General Settings      | Pengaturan organizer                   |
| `#profile`    | Admin Profile         | Profil akun admin sendiri              |

### Review pesanan

1. Buka order `under_review` yang belum expired.
2. Periksa kontak, show, zona dan peserta.
3. Approve atau Reject; reject membutuhkan alasan minimal 5 karakter.
4. `admin_review_demo_order` memeriksa role, lock order, dan mencatat keputusan.
5. Approval membuat record tiket; keputusan tersimpan di audit log.

Approve ulang pada order yang sudah approved ditangani idempotent oleh RPC,
bukan menggandakan tiket. Endpoint customer `confirm_demo_order` lama sudah
dinonaktifkan dan tidak boleh digunakan sebagai bypass.

## E-ticket dan QR

### Rendering dan download

```text
Order approved + record tiket
  → ticketModel() + resolveTheme()
  → buildTicketSvg() + renderTicket()
  → mountTicketQR() memakai kode database
  → downloadTicket() → PNG lokal
```

Isi tiket: artis/malam, kategori, tanggal, venue, attendee, order ID, kode unik,
QR, dan status check-in. Tema mengikuti artis/kategori. QR berasal dari kode
issued, bukan QR dekoratif yang sama untuk semua peserta. Export di browser
tidak memerlukan upload data customer ke layanan export pihak ketiga.

QR harus privat: kode tetap bisa disalin. Kode unik bukan jaminan kebal pencurian;
akses admin dan database menentukan validitas. Status pada PNG adalah snapshot
saat download, bukan informasi live yang otomatis berubah.

### Scan dan Check In

1. Admin memilih konser.
2. Kamera membaca QR dan mengisi kode; input manual tersedia.
3. Scan/Inspect memanggil `admin_inspect_ticket` dengan `p_commit=false`.
4. Check In memanggil fungsi yang sama dengan `p_commit=true`.
5. Database lock tiket, cek order/konser/penggunaan, dan mencatat bila valid.
   `checkins.ticket_id` adalah primary key sehingga satu tiket tidak mempunyai
   dua record check-in.

| Hasil RPC       | Arti                                                           |
| --------------- | -------------------------------------------------------------- |
| `valid`         | Eligible dan belum digunakan; inspect belum mencatat kehadiran |
| `checked_in`    | Kehadiran berhasil dicatat                                     |
| `already_used`  | Sudah check-in                                                 |
| `wrong_concert` | Show terpilih berbeda dari tiket                               |
| `invalid`       | Tidak ditemukan atau order tidak valid untuk masuk             |

**Scan tidak otomatis Check In.** Kamera perlu HTTPS/localhost, permission, dan
koneksi CDN scanner. Kode manual menjadi fallback.

## Relasi database

```text
auth.users ──► profiles / admin_grants
     └──────► orders ◄──── shows ◄──── artists + venues
                 ├───────► order_items ◄──── ticket_categories ◄──── shows
                 └───────► tickets ◄──────── ticket_categories
                              └──────► checkins ◄──── auth.users (petugas)

audit_logs: jejak operasi
site_content / faqs / announcements / general_settings: konten dan konfigurasi
```

| Tabel                                   | Tanggung jawab                                       |
| --------------------------------------- | ---------------------------------------------------- |
| `auth.users`                            | Akun dikelola Supabase Auth                          |
| `profiles`                              | Nama/telepon terkait UUID akun                       |
| `admin_grants`                          | Hak admin dari operator tepercaya                    |
| `artists`, `venues`                     | Master artis/venue                                   |
| `shows`                                 | Jadwal, status, artis/venue                          |
| `ticket_categories`                     | Harga, kapasitas, sales window per show              |
| `orders`                                | Owner, show, kontak, total, status, expiry, review   |
| `order_items`                           | Kategori, jumlah, harga saat order, array attendee   |
| `tickets`                               | Peserta individual, kategori, kode unik, issued time |
| `checkins`                              | Tiket, waktu, staff; satu record per tiket           |
| `audit_logs`                            | Jejak operasi penting                                |
| `site_content`, `faqs`, `announcements` | Konten publik yang dikelola admin                    |
| `general_settings`                      | Pengaturan organizer/aplikasi                        |

Ownership, role, RLS, grant fungsi, dan guard RPC bekerja bersama. Beberapa
fungsi memakai `SECURITY DEFINER`; hak eksekusi dan validasi fungsi perlu
ditinjau bersama. RLS tabel saja tidak menjamin semua fungsi privileged aman.

## Operasi backend

| RPC                           | Pemanggil/fungsi                     | Dampak                                                      |
| ----------------------------- | ------------------------------------ | ----------------------------------------------------------- |
| `is_admin`                    | Role check                           | Membaca hak admin                                           |
| `get_stock`                   | Tickets/admin                        | Kapasitas minus order aktif                                 |
| `admin_manage_category`       | Admin Ticket Management              | Memperbarui kapasitas/harga/status dengan pemeriksaan guard |
| `admin_reconcile_expirations` | Render workspace admin               | Menandai hold pending/review yang lewat expiry              |
| `create_demo_reservation`     | Checkout/session customer atau guest | Order/items dan hold                                        |
| `submit_demo_order`           | Owner customer                       | Mengajukan review                                           |
| `admin_review_demo_order`     | Admin                                | Approve/reject; issue tiket bila approve                    |
| `cancel_demo_order`           | Owner/admin sesuai guard             | Pembatalan valid                                            |
| `admin_inspect_ticket`        | Admin                                | Inspect atau Check In sesuai flag                           |
| `admin_stats`                 | Admin                                | Statistik operasional, bukan pembayaran nyata               |

Data publik/CRUD juga menggunakan Data API dan policy tabel. Upload aset memakai
Storage `nadakita-public`. Jangan menyimpan identitas/QR customer di bucket publik.

## Migrasi

| File                                                 | Tujuan                                            |
| ---------------------------------------------------- | ------------------------------------------------- |
| `001_schema.sql`                                     | Schema, constraint, RLS, policy, Storage          |
| `002_operations.sql`                                 | RPC stok/reserve/tiket/check-in awal              |
| `003_seed.sql`                                       | Acara, artis, venue, kategori awal                |
| `004_artist_asset_paths.sql`                         | Path gambar artis                                 |
| `005_public_copy_refresh.sql`                        | Copy publik                                       |
| `006_function_privileges.sql`                        | Hardening hak eksekusi                            |
| `007_performance_indexes.sql`                        | Index query/relasi                                |
| `008_split_admin_write_policies.sql`                 | Policy write admin terpisah                       |
| `009_admin_review_workflow.sql`                      | Submit/review/hold 24 jam, direct confirm dicabut |
| `20261010091945_separate_admin_customer_booking.sql` | Guard admin tidak reserve/submit customer         |

Versi kini merupakan gabungan migrasi, bukan `001`/`002` saja. Jangan replay
schema/seed ke database aktif. Bootstrap baru dijelaskan di
[README](README.md#konfigurasi-supabase).

## Navigasi dan audio

- Navigasi dokumen HTML biasa, bukan SPA router.
- Prefetch link HTML internal saat hover/focus tidak mengeksekusi booking.
- Reveal menunggu render/font/gambar terlihat dengan batas waktu.
- Player berada di detail artis; slug `weeknd`, `bieber`, `bruno` dipetakan ke
  `the-weeknd.mp3`, `justin-bieber.mp3`, `bruno-mars.mp3`.
- Tidak ada autoplay; pengunjung menekan Play untuk mulai mendengarkan. Path disiapkan, file MP3 harus disediakan.
- Ketiga MP3 tersedia. Judul konfigurasi: The Weeknd — “Moth To A Flame”,
  Justin Bieber — “DAISIES”, Bruno Mars — “Locked Out Of Heaven”.
  Player kartu terang menyediakan play/pause, mute, dan seek yang mendukung keyboard.
  `title` dan `cover` dapat diisi pada konfigurasi; durasi/seek berasal dari media sesungguhnya.
  Judul berada di atas nama artis, tanpa teks tambahan “Audio preview”.
  Error menyediakan Retry; `src` kosong menyediakan status coming soon.
- Diagram zona menuju kategori Tickets; bukan pembelian langsung/nomor kursi.

Temuan visual dan batasan tes ada di
[hasil cleanup](docs/CODE_CLEANUP_RESULTS.md). Jangan menganggap semua transisi
sempurna pada semua perangkat dari satu hasil tes.

Cleanup terakhir memverifikasi 15 AST JS, 14 markup HTML, dan aturan seluruh
11 CSS; formatter/syntax serta tes alur utama lolos. Suite pixel ketat masih
menemukan variasi foto/bintang pada beberapa capture, termasuk kontrol dengan
source identik. Batas tersebut tidak disembunyikan dengan toleransi atau skip.

## Menelusuri kode

| Ingin memahami | Urutan membaca                                               |
| -------------- | ------------------------------------------------------------ |
| Halaman tampil | HTML → preview → `start()`/`startPage()` → renderer → reveal |
| Login          | `authPage()` → native Auth → `isAdmin()` → redirect role     |
| Booking        | `ticketPage()` → `checkoutPage()` → reserve RPC → submit RPC |
| Approval       | `render()` → `pageOrders()` → review RPC → tickets           |
| My Orders      | `dashboard()` → order query → wallet → QR → PNG              |
| Scan           | `pageValidation()` → scanner/Inspect → RPC → Check In        |
| Rundown        | show-guide → data acara → malam terpilih → baris jadwal      |

Komentar menjelaskan tujuan/alasan bagian penting, bukan setiap statement.
Template literal panjang mempertahankan string/whitespace saat formatting;
pemecahan lebih lanjut membutuhkan refactor terpisah dan tes perilaku.

## Urutan demo

1. Home → tiga artis → detail → Show Guide.
2. Login customer → satu kategori/tiket → isi attendee.
3. Reserve → review ringkasan → Submit; tunjukkan QR belum ada.
4. Admin di HP/profil browser lain → order terbaru → approve.
5. Customer refresh My Orders → e-ticket → download PNG.
6. Admin pilih show → scan QR dari layar laptop → valid.
7. Check In → Inspect ulang → already used.

Tab profil browser sama berbagi session; pisahkan dua role. Siapkan tiket
cadangan belum check-in serta kode manual. Gunakan order demo milik sendiri:
approve/check-in memang mengubah data. QR screenshot tes memakai kode sintetis,
bukan kode yang dapat divalidasi pada database live.

Ringkasan: frontend menerima input/menampilkan UI, Supabase mengelola akun/data,
RPC/RLS memeriksa operasi, admin menyetujui pesanan dan memvalidasi kehadiran.
Ini reservasi akademik, bukan sistem pembayaran komersial.
