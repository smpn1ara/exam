# SIPADU CBT - Sistem Informasi Penilaian Terpadu & Computer Based Test

Aplikasi ujian berbasis komputer (CBT) modern yang dibangun menggunakan **React 19**, **Vite**, **Tailwind CSS v4**, dan **Supabase PostgreSQL**.

---

## 🚀 Fitur Unggulan

- **Multi-Role**: Akses untuk **Siswa**, **Guru**, dan **Administrator**.
- **Bank Soal & Tipe Soal Lengkap**:
  - Pilihan Ganda (PG)
  - PG Kompleks (*Multi-Select*)
  - Benar / Salah (AKM: Sesuai / Tidak Sesuai)
  - Menjodohkan (*Matching Pairs* — opsi jawaban diacak otomatis)
  - Soal Esai / Uraian Bebas dengan panduan koreksi
- **Anti-Cheat Terintegrasi**: Deteksi keluar layar penuh, pergantian tab, minimize browser, serta penguncian otomatis.
- **Autosave Realtime & Sinkronisasi**: Heartbeat berkala memastikan jawaban tersimpan aman ke database Supabase.
- **Database Supabase Cloud**: Menggunakan database PostgreSQL realtime Supabase dengan mode fallback offline otomatis.

---

## 💻 Cara Menjalankan di Lokal / Komputer

1. **Clone repository ini**:
   ```bash
   git clone https://github.com/username/repository.git
   cd repository
   ```

2. **Install dependensi**:
   ```bash
   npm install
   ```

3. **Jalankan server pengembangan (Development)**:
   ```bash
   npm run dev
   ```
   Buka browser Anda di `http://localhost:3000`.

4. **Build untuk Produksi**:
   ```bash
   npm run build
   ```
   Hasil build siap saji tersimpan di folder `dist/`.

---

## 🌐 Cara Menjalankan Lewat GitHub Pages

Repository ini sudah dilengkapi dengan alur otomatis **GitHub Actions** (`.github/workflows/deploy.yml`):

1. Masuk ke halaman repositori Anda di GitHub.
2. Klik tab **Settings** -> menu **Pages** di sisi kiri.
3. Pada bagian **Build and deployment** -> **Source**, pilih opsi **GitHub Actions**.
4. Lakukan *Push* ke branch `main` atau `master`.
5. GitHub Actions akan secara otomatis melakukan kompilasi dan aplikasi Anda dapat diakses di:
   `https://<username-github>.github.io/<nama-repo>/`

---

## ☁️ Cara Deploy ke Vercel

1. Buka [Vercel](https://vercel.com/) dan buat project baru dari repository GitHub ini.
2. Pengaturan otomatis Vercel:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Klik **Deploy**. Aplikasi akan online dalam waktu kurang dari 1 menit.

---

## 🔑 Akun Bawaan (Default Login)

| Role | User ID / Username | Password |
|---|---|---|
| **Admin** | `ADM-001` | `admin123` |
| **Guru** | `GUR-001` | `guru123` |
| **Siswa** | `SIS-001` | `siswa123` |

*(Centang opsi "Login sebagai Admin / Guru" jika login dengan akun Admin atau Guru).*
