# Spesifikasi perapihan kode NADAKITA LIVE

Status: menunggu persetujuan pengguna. Spesifikasi ini belum merupakan perubahan kode.

## Tujuan

Membuat proyek lebih mudah dipelajari, dipelihara, dan dijelaskan tanpa mengubah
tampilan, fitur, URL halaman, perilaku error, maupun data yang sudah disetujui.
Penjelasan ditulis dalam Bahasa Indonesia pada level modul/fungsi dan alasan
logika penting, bukan komentar berulang untuk setiap baris sintaks.

## Stack dan kondisi awal

- Website statis HTML/CSS/JavaScript, tanpa framework atau proses build wajib.
- JavaScript klasik untuk shell/visual publik; ES modules untuk integrasi live.
- Supabase diakses melalui adapter REST native milik proyek.
- Browser QA memakai Python/Playwright; tes logika JavaScript memakai Node.
- Belum ada package.json atau formatter konsisten; tidak ada repository git.
- app.js mencampur routing, auth, booking, wallet, dan konten publik.
- admin.js menampung sepuluh modul, termasuk Admin Profile yang baru ditambahkan.
- README masih memuat status QA lama dan alur confirm_demo_order yang sudah pensiun.
- Ada tes lama yang belum hijau/kurang portabel; itu harus dicatat sebagai baseline,
  bukan dihapus, dilemahkan, atau dinyatakan lolos.

## Struktur sasaran

URL HTML di root, lokasi aset, dan entry point js/live/app.js tetap kompatibel.

```text
*.html                       halaman dengan URL yang tetap
assets/                      foto, font, audio, dan ilustrasi yang tetap
css/                         stylesheet; urutan cascade dipertahankan
js/                          navigasi, countdown, audio, guide, dan shell publik
js/live/app.js               bootstrap dan pemilihan halaman
js/live/pages/               auth, booking, account, dan konten publik
js/live/admin/               modul operasional admin dan helper khusus admin
js/live/shared/              helper yang benar-benar digunakan lintas halaman
js/live/native-client.js     adapter Auth/PostgREST/Storage, tetap kompatibel
js/live/ticket-*.js           tema, SVG, QR, dan ekspor tiket
js/vendor/                   pustaka pihak ketiga, tidak diedit
supabase/migrations/         riwayat SQL, tidak diubah atau dijalankan ulang
tests/                       pengujian; impor dan runner diperbarui bila perlu
tests/artifacts/             hasil screenshot/ekspor QA, terpisah dari test source
docs/                        panduan arsitektur dan penjelasan modul
docs/history/                laporan perubahan terdahulu yang dipindahkan utuh
scripts/                     tooling pengembangan bila diperlukan
```

Pemecahan modul mengikuti dependensi nyata setelah pembacaan kode, bukan membuat
folder/helper generik yang tidak digunakan. Tidak ada circular import. Dokumen
yang dipindahkan tetap dipertahankan isinya dan semua tautannya diperbarui.

## Gaya kode dan penjelasan

- Format konsisten: indentasi dua spasi untuk HTML/CSS/JS, semicolon pada JS,
  UTF-8, dan newline yang konsisten. Template HTML tidak diubah kontennya.
- Nama fungsi baru menjelaskan tugasnya; nama/id DOM, kontrak RPC, slug, query
  parameter, class CSS, dan event publik tidak diubah.
- Komentar/JSDoc menjelaskan tanggung jawab, input/output, efek samping, dan
  alasan pengaman yang tidak jelas dari sintaks.
- Kode vendor/minified dan SQL historis dikecualikan dari format otomatis.

Contoh gaya:

```js
/**
 * Membuka halaman setelah font dan gambar awal siap.
 * Urutan ini dipertahankan agar kartu tidak bergeser saat navigasi.
 */
async function revealCompletedPage() {
  await waitForVisibleAssets();
  markPageReady();
}
```

Contoh ini ilustrasi dokumentasi, bukan API baru yang harus ditambahkan.

## Tooling dan perintah

Perintah yang sudah tersedia:

```powershell
python -m http.server 5500 --bind 127.0.0.1
node tests/audit_contract.mjs
node tests/test_native_client.mjs
node tests/test_ticket_design.mjs
node tests/test_ticket_wallet.mjs
python tests/test_admin_role_browser.py
python tests/test_connected_booking_regression.py
python tests/test_navigation_browser.py
python tests/test_login_browser_mock.py
python tests/test_admin_mock.py
powershell -ExecutionPolicy Bypass -File tests/run_all.ps1
```

Usulan tambahan: formatter development-only yang versinya dipin dan dikunci
lockfile, dengan npm run format dan npm run format:check. Persetujuan spesifikasi
mencakup penambahan tooling ini; tidak ada dependency runtime/build wajib baru.
Versi/tool dan perintah final diverifikasi sebelum instalasi, scripts dependency
dinonaktifkan saat instalasi. Runner tetap mencatat setiap kegagalan dengan benar.

## Strategi verifikasi

1. Catat baseline sebelum refactor: tes lulus, tes gagal, dan masalah environment.
2. Format mekanis terpisah dari pemecahan modul; cek syntax/import setiap tahap.
3. Jalankan tes kontrak, adapter native, tema/tiket, pemisahan role, login,
   booking pembeli, modul admin, dan transisi navigasi.
4. Browser terisolasi dengan Auth/data sintetis; tidak membuat pesanan atau
   check-in di database asli. Cek desktop/mobile, error console, dan overflow.
5. Bandingkan tampilan dan urutan reveal sebelum/sesudah. Tidak boleh muncul
   perubahan font/foto/warna atau tombol pembeli untuk admin.
6. Jika pemindahan modul membutuhkan penyesuaian harness tes, pertahankan semua
   assertion dan skenario. Tes tidak boleh disederhanakan agar menjadi hijau.
7. Screenshot dan output runner mengungkap batas QA; jangan klaim kamera HP,
   email, payment, atau seluruh suite sudah teruji jika belum.

## Batas perubahan

Selalu:

- Kerjakan bertahap, pertahankan behavior dan urutan async.
- Update import, link dokumentasi, dan runner untuk lokasi baru.
- Dokumentasikan arsitektur dan cara menjalankan/mengubah tiap modul.
- Pertahankan lisensi/vendor, aset pengguna, order lama, dan pemeriksaan akses.

Minta persetujuan tambahan:

- Perubahan fitur, tampilan, API publik, metode autentikasi, atau dependency runtime.
- Migrasi database, perubahan RLS, deployment permanen, atau penghapusan aset.

Jangan:

- Menjalankan migration lagi atau mengubah Supabase production dalam refactor ini.
- Menghapus tes gagal, menambahkan skip, atau melemahkan assertion.
- Membuka service-role key, token, data pelanggan, atau kredensial di dokumentasi.
- Mengubah QR payload, harga/kategori, checkout review, atau aturan admin.
- Menghapus laporan/hasil pengguna hanya karena dianggap file lama.

## Kriteria selesai

- Bootstrap terpisah dari tanggung jawab auth/booking/account/admin yang besar.
- Source milik proyek terbaca dan format konsisten; vendor/SQL tetap utuh.
- Setiap modul penting punya penjelasan fungsi dan alur data yang sesuai kode.
- README mencerminkan alur review organizer dan pembatasan akun admin sekarang.
- Struktur dokumen/source/artifact jelas, tanpa import atau tautan rusak.
- Tidak ada regresi pada tes baseline yang semula lulus; kegagalan lama dan
  masalah environment dilaporkan eksplisit, tidak disembunyikan.
- Preview HP, jika masih aktif, disinkronkan hanya setelah tahap terverifikasi.

## Persetujuan

Pengguna menyetujui scope: perapihan menyeluruh dan dokumentasi, behavior tetap,
formatter development-only boleh ditambahkan, tanpa perubahan database.
Setelah persetujuan, susun tasks/plan.md dan tasks/todo.md sebelum implementasi.
