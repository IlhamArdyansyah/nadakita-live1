# QA Jakarta stadium hero — 11 Oktober 2026

## Perubahan

- Gambar `Neon Jakarta Over GBK Stadium.png` dari pengguna disalin tanpa editing
  ke `assets/images/banners/neon-jakarta-gbk-hero.png`.
- `jakartaHero()` di `js/preview.js` merender gambar dekoratif, judul HTML,
  CTA ke Shows dan tanggal/venue. Catatan akademik di hero dihapus atas permintaan
  pengguna; keterangan simulasi di footer dan bagian tiket tetap ada.
- `css/jakarta-hero.css` hanya memengaruhi hero Home. Desktop memakai foto
  full-bleed, gradasi gelap kiri, `ONE CITY.` 90% ukuran judul dan satu orbit
  statis tipis. HP memakai teks dahulu dan stadion di bawah.
- Native image memakai ukuran intrinsik, eager loading default dan priority high;
  reveal yang sudah ada menunggu decode gambar yang terlihat. Tidak ditambah
  animasi, library, fetch database, login atau perubahan booking.
- `hero_banner_url` admin sekarang mengganti `img.src`; setting title/subtitle
  tetap berfungsi. Fallback CSS banner lama tetap didukung jika tidak ada image.

## Verifikasi

- Tes browser baru gagal sebelum implementasi: hero Jakarta belum tersedia.
- `python tests/test_jakarta_hero.py`: PASS pada 320, 390, 768, 1024, 1440, 1672 px.
  Gambar berhasil dimuat, elemen abstrak lama tidak muncul, headline tidak overflow,
  teks/tanggal/CTA tetap di viewport, dan posisi/dimensi/font tidak berubah 500 ms
  setelah reveal. Keyboard CTA menuju Shows; aksesibilitas region/heading dicek.
- Setting banner/title/subtitle admin diuji dengan mock; gambar gagal tetap
  menampilkan judul dan CTA tanpa memblokir reveal. Orbit tidak beranimasi dalam
  reduced motion. Tidak ada page error.
- Mutation check: membalik kondisi native-image override membuat assertion
  banner admin gagal; perubahan mutation langsung dikembalikan.
- `python tests/test_navigation_browser.py`: PASS 30 halaman, mobile/desktop.
- `python tests/test_venue_live.py`: PASS delapan halaman dengan Supabase read-only;
  image hero Home dimuat dan venue/harga tetap benar. Tidak ada penulisan database.
- Syntax JS, kontrak audit, renderer venue dan format file perubahan: PASS.

## Screenshot

- [Desktop](artifacts/jakarta-hero/hero-1440.png)
- [Mobile](artifacts/jakarta-hero/hero-390.png)
- [Home dengan data asli](artifacts/jakarta-hero/live-home-1440.png)

## Batasan dan review

DevTools MCP tidak tersedia; tes memakai Chrome terpasang dengan profil Playwright
terisolasi. Tidak mengklaim seluruh suite historis atau Core Web Vitals produksi
lolos. PNG sekitar 2,53 MB, tidak diubah/dioptimasi agar aset pengguna tetap asli.
Pada koneksi lambat, proses reveal tetap memiliki batas tunggu gambar 2,5 detik
yang sudah ada; foto bisa muncul belakangan, tetapi teks dan CTA tidak berpindah.
Pengukuran jaringan lambat/optimasi format gambar dapat dikerjakan terpisah.

Review: styling scoped, teks bukan bitmap, gambar dekoratif tanpa alt redundan,
CTA native/keyboard, source asset dipertahankan, konfigurasi admin terjaga.
Database, harga kategori, auth, booking dan hosting tidak diubah. Workspace tidak
memiliki git repository; snapshot source sebelum perubahan disimpan di TEMP.
