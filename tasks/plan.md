# Perapihan JS dan HTML NADAKITA LIVE

Prioritas pengguna: bereskan source JS/HTML yang masih padat dan sulit dibaca.
Tahap ini tidak memindahkan URL, mengubah fitur, atau menyentuh database.

1. Simpan snapshot source sebelum perubahan; catat baseline tes yang relevan.
2. Format HTML entry points, lalu JS milik proyek menggunakan formatter sementara
   versi pin 3.6.2. Vendor dikecualikan. Isi template/string dipertahankan.
3. Tambahkan penjelasan Bahasa Indonesia pada fungsi/batas modul penting.
4. Sesuaikan harness tes yang bergantung pada spasi/import satu baris, tanpa
   mengurangi assertion atau mengganti behavior yang diuji.
5. Bandingkan AST, markup, screenshot dan alur browser dengan snapshot awal.
6. Dokumentasikan peran file dan cara formatting ulang; sinkronkan preview publik
   hanya sesudah verifikasi. Pemecahan besar modul tetap merupakan tahap terpisah,
   bukan dicampur dengan format mekanis ini.

Risiko: template HTML menyimpan whitespace bermakna; formatter disetel tidak
memformat embedded template. Tes sintaks berbasis teks perlu memahami multiline.
Tidak ada repository git; snapshot source adalah checkpoint sebelum format.

Status: formatting dan dokumentasi JS/HTML selesai. AST, markup, formatter,
sintaks dan tes alur utama lolos. Suite pixel belum sepenuhnya lolos pada
dekorasi login; sinkronisasi preview ditahan. Lihat docs/CODE_CLEANUP_RESULTS.md.

Perintah verifikasi: node --check untuk seluruh JS, tes adapter/tiket/kontrak Node,
browser role/login/booking/admin/navigasi, formatter --check, perbandingan AST dan
screenshot before/after. Catat kegagalan lama/environment secara terpisah.

## Perapihan menyeluruh HTML/JS/CSS — 11 Oktober 2026

Permintaan terbaru mencakup seluruh source aplikasi, termasuk CSS yang belum
ikut pada cleanup terdahulu. Ruang lingkup: format mekanis first-party dengan
aturan yang sudah ada, tanpa refactor alur, perubahan template/string runtime,
pemindahan URL, pengubahan stylesheet order, atau perubahan Supabase.

1. Simpan snapshot HTML, JS, CSS dan verifikasi baseline tes Node.
2. Format ketiga jenis source; vendor, aset, SQL dan artefak tetap dikecualikan.
3. Bandingkan AST JS, markup HTML, aturan CSS hasil parsing browser,
   kemudian cek syntax, formatter, alur utama, dan before/after visual.
4. Perbarui perintah format dokumentasi agar juga mencakup CSS.

Repo belum memakai Git; snapshot lokal menjadi checkpoint. Tes berbasis teks
boleh menerima whitespace formatter, tetapi assertion perilaku tidak dikurangi.
