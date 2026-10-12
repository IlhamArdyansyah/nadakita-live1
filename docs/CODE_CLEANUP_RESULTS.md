# Hasil cleanup JS dan HTML

- Diformat: 14 HTML entry point dan 14 JavaScript first-party.
- Ditambahkan: komentar fungsi penting, panduan pembacaan kode, konfigurasi formatter/editor.
- Dipertahankan: URL, urutan aset, string template, perilaku runtime, vendor, CSS, aset, dan database.
- Harness pengujian diperbarui agar import multiline/whitespace hasil formatter tetap dapat diuji; assertion perilaku tidak dihapus.
- Lolos: tes kontrak, native client, 15 desain tiket, wallet tiket, login mock, admin mock, booking terhubung mock, dan pemisahan role admin/customer.
- Lolos: formatter check, sintaks semua JS first-party, kesetaraan AST 14 JS (termasuk nilai string/template), dan kesetaraan elemen/atribut/teks/urutan script 14 HTML.
- Perbandingan visual identik pada tujuh halaman mobile pertama. Login memiliki selisih pixel kecil pada bintang dekoratif, walau markup, ukuran container, font, dan transform sama. Suite visual penuh belum dinyatakan lolos.
- Tidak dilakukan: ekstraksi seluruh template besar, pemindahan direktori utama, perubahan database, atau deployment permanen.
- Preview HP belum disinkronkan pada tahap ini karena suite visual penuh masih memiliki temuan yang perlu diselesaikan.

Panduan: [CODE_GUIDE.md](CODE_GUIDE.md).

## Cleanup seluruh HTML, JS, CSS — 11 Oktober 2026

- Diproses dan lolos formatter check: 14 HTML, 15 JS first-party, 11 CSS.
  HTML/JS sudah konsisten sehingga tidak perlu rewrite. Enam CSS yang masih
  padat kini multiline: `preview.css`, `live.css`, `type-refinement.css`,
  `booking-flow.css`, `show-guide.css`, `countdown.css`.
- Memakai Prettier 3.6.2 dari cache lokal dan konfigurasi proyek yang sudah ada.
  Tidak menambah package/dependency atau memformat vendor, SQL, dan aset.
- Snapshot disimpan di direktori sementara `nadakita-source-format-912e73750c0c40e0a2ebb505873a4c98`.
  Tidak membuat repository/commit karena workspace belum mempunyai Git.
- PASS: kesetaraan AST 15 JS (termasuk nilai string/template runtime),
  markup/atribut/urutan script 14 HTML, dan aturan Chrome untuk semua 11 CSS.
  Pembandingan CSS hanya menormalkan whitespace delimiter dan angka desimal;
  teks kutipan, nilai properti, aturan cascade dan breakpoint tetap diperiksa.
- PASS: syntax seluruh JS first-party, formatter seluruh HTML/JS/CSS,
  audit contract, native client, 15 tema tiket, ticket wallet, venue map,
  countdown English, dan favicon.
- PASS browser mock: 30 kombinasi navigasi/lebar layar, 6 alur booking untuk
  tiga artis desktop/HP, 4 kombinasi role admin/customer, dan tiga skenario login.
  Tidak ada penulisan ke Supabase, order nyata, atau deployment.
- Harness audit menerima spasi setelah `position:`; assertion fixed-position
  tetap ada. Harness visual menunggu decode gambar dan font pseudo-element,
  mencatat semua pixel failure, lalu tetap mengembalikan exit code gagal.
- Suite visual ketat: DOM, teks, link, lebar dan ukuran screenshot sama pada
  20 kombinasi; 16 identik pixel, 4 berbeda pada area foto atau bintang login.
  Kontrol memakai source identik juga gagal pixel pada Shows HP dan Login HP;
  kontrol Home kedua lebar lolos. Temuan mengarah ke variasi rasterisasi browser,
  bukan bukti perubahan layout, tetapi suite pixel penuh tetap **belum lolos**.
  Assertion tidak dihapus, diberi toleransi, atau dilewati.
- Template HTML/SVG di dalam JavaScript tetap dipertahankan verbatim; tidak
  dilakukan ekstraksi modul besar/pengubahan struktur direktori pada pass ini.
  Perintah formatting README/panduan sekarang mencakup CSS juga.
