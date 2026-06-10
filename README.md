# WayGround AI Helper

Ini adalah script browser yang menambahkan panel kecil di halaman WayGround dan memakai Groq API untuk membantu membaca soal lalu memilih opsi yang paling cocok.

## Fitur

- Menampilkan panel UI kecil di pojok kanan bawah.
- Mengambil teks soal dan opsi jawaban dari halaman.
- Mengirim data soal ke Groq API.
- Memilih opsi yang paling sesuai secara otomatis.
- Mendukung shortcut keyboard:
  - `Alt + Shift + D` untuk menampilkan atau menyembunyikan panel.
  - `Alt + Shift + S` untuk langsung menjalankan proses jawaban.

## Cara Pakai

### 1. Siapkan API Key

Script ini membaca API key dari `window.MY_GROQ_KEYS`.

Contoh:

```javascript
window.MY_GROQ_KEYS = ["API_GROQ_KAMU"];
```

Kalau tidak diset, script akan memakai key bawaan yang ada di file. Disarankan untuk menggantinya dengan key milik sendiri.

### 2. Jalankan Script

Gunakan bookmarklet ini di browser:

```javascript
javascript:(function(){window.MY_GROQ_KEYS=["API GROQ AI"];const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/gh/DragonGans/wayground@main/wayy-groq.js";document.body.appendChild(s);})();
```

Kalau mau pakai key sendiri, ubah bagian `window.MY_GROQ_KEYS` menjadi API key milikmu.

### 3. Gunakan di Halaman WayGround

Setelah script aktif:

1. Buka halaman soal di WayGround.
2. Tunggu panel `WAYGROUND AI` muncul di kanan bawah.
3. Klik tombol `MULAI` untuk menjalankan proses.
4. Jika perlu, gunakan shortcut `Alt + Shift + S`.

## Catatan

- Script ini bergantung pada struktur HTML halaman.
- Kalau selector soal atau opsi berubah, script mungkin tidak bisa membaca data dengan benar.
- Pastikan API key valid dan punya akses ke model yang dipakai.