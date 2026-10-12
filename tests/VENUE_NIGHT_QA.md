# QA venue map malam — 11 Oktober 2026

## Hasil

Konsep stadion malam hitam/pink terpasang pada Home, Show Guide, detail artis,
dan pemilihan tiket. Styling hanya berlaku pada komponen venue, bukan seluruh web.
Ilustrasi AI memiliki zona berwarna; teks, link, state dan harga adalah HTML.
Tidak ada harga referensi, klaim gate resmi, pajak tambahan atau numbered seating.

Harga katalog Supabase dibaca melalui REST publik, tanpa mengubah database:

| Kategori | Harga ketiga konser saat pengecekan |
| --- | --- |
| VIP EXPERIENCE | Rp2.250.000 |
| FESTIVAL A | Rp1.500.000 |
| FESTIVAL B | Rp1.200.000 |
| CAT 1 | Rp950.000 |
| CAT 2 | Rp650.000 |

Angka tabel adalah hasil pengecekan, bukan konfigurasi harga. Website tetap membaca
`ticket_categories` per `show_id`. Home memiliki pemilih malam; Show Guide mengikuti
tab malam. Respons fetch lama tidak menimpa malam baru. Kategori disimpan selama
halaman terbuka; reload membaca ulang. Checkout tetap memvalidasi harga/stok di server.

## Bukti verifikasi

- `node tests/test_venue_map.mjs`: PASS. Harga dinamis/0/null/invalid/negatif,
  state loading/empty/unavailable, escaping dan link kategori.
- Mutation check: mengizinkan harga negatif membuat tes gagal; kondisi asli
  dikembalikan dan tes kembali PASS.
- `python tests/test_venue_browser.py`: PASS pada 320, 390, 768, 1024, 1440 px.
  Empat halaman per ukuran, harga mock berbeda tiap malam, respons out-of-order,
  retry setelah HTTP 503, katalog kosong, keyboard Enter, zona disabled,
  highlight zona tanpa menambah quantity, dan tidak ada overflow horizontal.
- `python tests/test_venue_live.py`: PASS delapan halaman (390 dan 1440 px)
  memakai data Supabase asli. Request penulisan diblokir selain RPC pembacaan
  stok; tidak ada request terlarang. Seluruh respons katalog 2xx, tanpa page error.
- `python tests/test_connected_booking_regression.py`: PASS, ketiga artis pada
  mobile/desktop. Profil buyer, attendee manual, reservasi/review menggunakan
  mock, tanpa QR terbit sebelum approval.
- `python tests/test_navigation_browser.py`: PASS 30 halaman mobile/desktop.
  Heading/foto tidak berubah lagi setelah reveal; tidak ada page error/overflow.
- `node tests/audit_contract.mjs`, `test_native_client.mjs`,
  `test_ticket_wallet.mjs`, `test_ticket_design.mjs`: PASS.
- Syntax check empat JavaScript yang diubah: PASS. File perubahan diformat
  dengan Prettier 3.6.2 sesuai konfigurasi proyek.

Screenshot data asli:

- [Home desktop](artifacts/venue-night/live-index-1440.png)
- [Home mobile](artifacts/venue-night/live-index-390.png)
- [Tickets desktop](artifacts/venue-night/live-tickets-1440.png)
- [Tickets mobile](artifacts/venue-night/live-tickets-390.png)

## Keputusan implementasi

- `js/ticket-zones.js` satu renderer untuk semua halaman; caller memberikan data.
- `css/venue-night.css` menyimpan tema dan koordinat persentase berdasarkan
  gambar 3:2. Container query menaruh daftar harga di kanan jika ruang cukup,
  di bawah peta untuk layar kecil. Legenda menyediakan target keyboard/touch besar.
- `mountPublicVenue()` dalam `js/live/app.js` memakai query kategori yang sudah
  ada. Gagal fetch menampilkan `Price unavailable`, bukan harga prototype.
- `nadakita:guide-change` dari `js/show-guide.js` menyinkronkan map dan tab malam.
- Denah lama disimpan; tidak ada perubahan migrasi, database, auth atau workflow booking.

## Batasan

DevTools MCP tidak tersedia; pengujian memakai Chrome terpasang dengan profil
Playwright terisolasi. Tes ini tidak menyatakan seluruh suite historis/pixel proyek
lolos, tidak mengukur Core Web Vitals produksi, dan tidak menguji kamera/check-in
atau pembayaran. Stadion bukan denah resmi GBK. Label harga bisa lebih mudah
dibaca lewat legenda daripada peta pada HP kecil. Ilustrasi PNG sekitar 3,6 MB;
format WebP/AVIF dan pengukuran jaringan lambat dapat menjadi optimasi berikutnya.

Preview lokal yang sudah berjalan pada port 5500 telah diperiksa menyajikan
`venue-night.css` terbaru. Tidak dibuat hosting atau tunnel baru.

## Penyesuaian copy — 11 Oktober 2026

Sesuai permintaan pengguna, dua baris catatan `Illustrative venue map ...`
dan `Not an official GBK seating plan ...` di bawah peta dihapus dari renderer
bersama. Berlaku untuk Home, Show Guide, detail artis, dan Tickets.
Label pendek pada header peta, informasi footer, harga database, dan perilaku
pemilihan zona tetap dipertahankan. Tes renderer dan browser memeriksa
ketiadaan blok `.booking-map-note` tanpa menghapus pemeriksaan harga/interaksi.
