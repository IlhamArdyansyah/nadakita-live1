# Panel headliner The Shows — 11 Oktober 2026

## Ruang lingkup dan keputusan

Panel sesudah tiga card artis sebelumnya memakai judul sangat besar dan ruang
kosong di kanan. Revisi memakai heading `JUST THE HEADLINER.`, copy pendek,
serta daftar semantik berisi one artist, one stage, dan one night per ticket.
Panel putih/hitam mengikuti token warna, garis, dan font lokal yang sudah ada.
Link `PLAN YOUR NIGHT` membuka Show Guide melalui navigasi normal.

Di desktop isi dibagi dua kolom; pada lebar 800px ke bawah daftar ditempatkan
sesudah copy. Jarak dari card dipadatkan. Tidak ditambahkan animasi, gambar,
dependency, query, perubahan harga, atau perubahan audio.
CSS hanya dimuat oleh `shows.html`; markup tetap di `pageShows()`.

## Verifikasi

- `python tests/test_shows_focus.py`: PASS pada 320, 390, 768, 1024, 1440px.
  Memeriksa susunan kolom, panel desktop maksimal 430px, tidak ada overflow,
  heading/label, tiga card artis, kestabilan tipografi setelah reveal,
  target link minimal 44px, fokus keyboard, dan navigasi Enter ke Show Guide.
- Test awal gagal karena panel belum tersedia. Membalik media query dari
  `max-width` ke `min-width` juga gagal pada pemeriksaan kolom desktop.
  Media query dipulihkan sebelum pengujian akhir.
- `python tests/test_navigation_browser.py`: PASS, 30 kombinasi halaman/lebar,
  termasuk Discover This Night ke detail artis dan player audio.
- `node tests/audit_contract.mjs` dan syntax check `js/preview.js`: PASS.
- Screenshot panel desktop dan HP diperiksa. Pink heading di atas putih
  mempunyai rasio kontras sekitar 3,02:1 (teks besar/bold).

Browser memakai Chrome terpasang dengan profil Playwright terisolasi karena
DevTools MCP tidak tersedia. Supabase dimock hanya pada batas jaringan; tidak
dibuat akun/pesanan dan tidak ada penulisan database atau deployment.
Ini verifikasi terarah, bukan klaim seluruh suite historis lulus.

Screenshot: [desktop](artifacts/shows-focus/panel-1440.png),
[HP kecil](artifacts/shows-focus/panel-320.png).
