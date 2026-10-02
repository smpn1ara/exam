# Panduan Migrasi: Google Apps Script ke Supabase + React (Vercel & GitHub)

Aplikasi Computer Based Test (**SIPADU CBT**) ini telah berhasil dimigrasikan dari Google Apps Script & Google Sheets menjadi arsitektur modern berbasis **React SPA (Vite + TypeScript + Tailwind CSS)** dengan backend database relasional berkinerja tinggi **Supabase (PostgreSQL)**.

---

## 1. Menyiapkan Database Supabase (PostgreSQL)

1. Buka [https://supabase.com](https://supabase.com) dan login ke akun Anda.
2. Buat project baru (contoh nama: `cbt-online`). Pilih region terdekat (misal: `Singapore (ap-southeast-1)`).
3. Setelah database siap, buka menu **SQL Editor** di sidebar kiri dashboard Supabase.
4. Klik tombol **New query**, lalu salin seluruh isi file `supabase-schema.sql` (tersedia di root project ini) ke editor.
5. Klik tombol **Run**. Script ini akan secara otomatis:
   - Membuat seluruh tabel: `users`, `exams`, `questions`, `responses`, `logs`, `gambar`, `konfigurasi`, `master_data`.
   - Menyiapkan index performa tinggi untuk ratusan siswa serentak.
   - Mengatur Row Level Security (RLS).
   - Mengisi data awal akun demo (Admin, Guru, Siswa), sampel ujian, dan bank soal lengkap (PG, PG Kompleks, Benar/Salah, Menjodohkan, Esai).
6. Buka **Project Settings** -> **API**, lalu catat:
   - **Project URL** (contoh: `https://xyzabcdefg.supabase.co`)
   - **Project API Keys** -> `anon` / `public` key

---

## 2. Menghubungkan Frontend ke Supabase

### Opsi A: Melalui File `.env` (Direkomendasikan untuk Production & Vercel)
Buat file `.env` di root project dengan isi:
```env
VITE_SUPABASE_URL="https://xyzabcdefg.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Opsi B: Melalui Antarmuka Aplikasi (Live UI)
Klik tombol **"Supabase Database"** di pojok kanan atas tampilan login atau di dalam dashboard admin. Masukkan URL dan Anon Key Anda, lalu klik **Simpan & Hubungkan**. Aplikasi akan otomatis beralih dari mode demo lokal ke Supabase PostgreSQL aktif secara instan.

---

## 3. Alur Kerja Kontrol Versi dengan GitHub

Jalankan perintah berikut di terminal komputer Anda:

```bash
# 1. Inisialisasi Git
git init

# 2. Tambahkan semua file dan buat commit awal
git add .
git commit -m "feat: migrate CBT to Supabase and React SPA"

# 3. Ubah nama branch utama menjadi main
git branch -M main

# 4. Hubungkan ke repositori GitHub Anda
git remote add origin https://github.com/USERNAME_ANDA/NAMA_REPO_ANDA.git

# 5. Push ke GitHub
git push -u origin main
```

---

## 4. Hosting & CI/CD Otomatis di Vercel

1. Buka [https://vercel.com](https://vercel.com) dan masuk dengan akun GitHub Anda.
2. Klik tombol **"Add New Project"**.
3. Pilih repositori GitHub `NAMA_REPO_ANDA` yang baru saja Anda push.
4. Vercel akan otomatis mengenali framework **Vite**.
5. Buka accordion **Environment Variables** dan tambahkan 2 variabel berikut:
   - `VITE_SUPABASE_URL`: URL project Supabase Anda
   - `VITE_SUPABASE_ANON_KEY`: Anon public key Supabase Anda
6. Klik **Deploy**.
7. Dalam ~1 menit, aplikasi Anda akan live dengan URL HTTPS berkecepatan tinggi (CDN edge global).
8. Setiap kali Anda melakukan perubahan kode dan menjalankan `git push origin main`, Vercel akan secara otomatis membangun (build) dan memperbarui aplikasi tanpa downtime!

---

## 5. Fitur Utama yang Telah Terintegrasi Penuh

- **Login Split-Panel Skeuomorphic**: Mempertahankan estetika hangat dan taktil dari versi Apps Script.
- **Sistem Siswa**:
  - Halaman Daftar Ujian (Status: Aktif, Belum Mulai, Selesai, Dikunci, Waktu Habis).
  - Verifikasi PIN sesi per-ujian.
  - Fullscreen CBT room dengan perlindungan anti-curang (deteksi tab switch, minimize, blur, tombol Windows).
  - Timer hitung mundur dengan sistem **pause & resume** otomatis via field `remaining_seconds`.
  - Dukungan seluruh jenis soal: **Pilihan Ganda (PG)**, **PG Kompleks**, **Benar / Salah AKM**, **Menjodohkan (Matching)**, dan **Esai**.
  - Token Akhir Sesi sebelum pengumpulan jawaban.
  - Review hasil ujian dan pembahasan soal per butir.
- **Sistem Admin & Guru**:
  - Dashboard Overview statistik real-time.
  - Manajemen Jadwal Ujian (CRUD, durasi, PIN, KKM, filter rombel, pengacakan per jenis soal).
  - Bank Soal (input manual, batch paste dengan parser otomatis, import Excel, duplikasi antar ujian).
  - Laporan Hasil & Penilaian (filter kelas, download rekap Excel, download daftar nilai per kelas berformat kop sekolah resmi, modal koreksi esai manual).
  - Monitor Ujian Real-time (status peserta: belum login, login, mengerjakan, selesai, curang; buka blokir massal, selesaikan massal, reset ujian).
  - Manajemen Pengguna & Data Master (Kelas & Mapel).
  - Konfigurasi Sekolah & Generator Gambar.
