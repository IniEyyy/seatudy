# Seatudy

Seatudy adalah platform kursus online dengan tiga peran: **student**, **instructor**, dan **admin**.

- **Frontend:** React 19 + Vite
- **Backend:** Node.js + Express 5
- **Database:** PostgreSQL
- **Auth:** JWT
- **Real-time:** Socket.IO

---

## Struktur Project

```
seatudy/
├── react-app/            # Frontend (React + Vite)
│   └── src/
│       ├── components/   # Auth, Courses, Dashboard, Assignment, Review, Forum
│       ├── contexts/     # AuthContext, ThemeContext, ToastContext
│       ├── styles/       # theme.css (design token + komponen dasar)
│       └── App.jsx       # Routing
└── server/               # Backend (Express + PostgreSQL)
    ├── controllers/      # Route handlers
    ├── middlewares/      # Auth + upload (multer)
    ├── routes/           # API routes
    ├── db/
    │   ├── init.sql      # Schema database
    │   └── seed.sql      # Data demo (opsional)
    ├── uploads/          # File upload (dibuat otomatis)
    ├── db.js             # Koneksi PostgreSQL
    ├── index.js          # Entry point
    └── .env.example
```

---

## Quick Start (Windows)

Prasyarat: Node.js 20+ dan PostgreSQL 14+. Jika PostgreSQL belum terpasang, project ini bisa memakai PostgreSQL portable di `..\pgsql`.

Jika PostgreSQL portable sudah disiapkan di `..\pgsql`:

```bat
start-dev.cmd   :: start database + backend + frontend, lalu buka browser
stop-dev.cmd    :: hentikan backend, frontend, dan database
start-db.cmd    :: start database saja
stop-db.cmd     :: stop database saja
```

Database lokal: `seatudy` di `127.0.0.1:5432` (user `postgres`, password `postgres`).

---

## Menjalankan Secara Lokal

### 1. Clone

```bash
git clone https://github.com/IniEyyy/seatudy.git
cd seatudy
```

### 2. Backend

```bash
cd server
npm install
cp .env.example .env
```

Sesuaikan `.env` dengan konfigurasi PostgreSQL lokal:

```env
PORT=5000
FRONTEND_URL=http://localhost:5173

DB_USER=postgres
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=seatudy

JWT_SECRET=ganti_dengan_string_random_panjang
```

Buat database dan jalankan schema:

```bash
createdb seatudy
psql -U postgres -d seatudy -f db/init.sql
```

Opsional, isi data demo:

```bash
psql -U postgres -d seatudy -f db/seed.sql
```

Jalankan server:

```bash
npm start        # production
npm run dev      # auto-restart (node --watch)
```

### 3. Frontend

```bash
cd react-app
npm install
npm run dev
```

Frontend berjalan di `http://localhost:5173` dan memanggil API di `http://localhost:5000`.

---

## Akun Demo

Tersedia setelah menjalankan `db/seed.sql`:

| Role       | Email                     | Password       |
| ---------- | ------------------------- | -------------- |
| Admin      | admin@seatudy.local       | Admin@123      |
| Instructor | instructor@seatudy.local  | Instructor@123 |
| Student    | student@seatudy.local     | Student@123    |

Seed juga membuat akun tambahan untuk mengisi data demo:

- Instructor: `rina@seatudy.local`, `bagas@seatudy.local`, `maya@seatudy.local` — password `Instructor@123`.
- Student: `alya@seatudy.local`, `bima@seatudy.local`, `citra@seatudy.local`, `dimas@seatudy.local`, `eka@seatudy.local`, `fajar@seatudy.local`, `gita@seatudy.local`, `hendra@seatudy.local`, `intan@seatudy.local`, `joko@seatudy.local`, `kirana@seatudy.local`, `lukman@seatudy.local` — password `Student@123`.

Total data demo: 9 course, 19 materi, 18 assignment, 26 enrollment, 27 submission, 23 review, 18 pesan forum, dan 21 notifikasi. Seed bersifat idempotent, jadi aman dijalankan ulang.

---

## Environment Variables

| Variable       | Default                 | Keterangan              |
| -------------- | ----------------------- | ----------------------- |
| `PORT`         | `5000`                  | Port backend            |
| `FRONTEND_URL` | `http://localhost:5173` | Origin yang diizinkan CORS |
| `DB_USER`      | -                       | User PostgreSQL         |
| `DB_PASSWORD`  | -                       | Password PostgreSQL     |
| `DB_HOST`      | `localhost`             | Host PostgreSQL         |
| `DB_PORT`      | `5432`                  | Port PostgreSQL         |
| `DB_NAME`      | `seatudy`               | Nama database           |
| `JWT_SECRET`   | -                       | Secret untuk menandatangani JWT |

---

## Fitur

- [x] Registrasi & login JWT
- [x] Role-based access (student, instructor, admin)
- [x] CRUD course oleh instructor
- [x] Upload materi (file) + preview/download
- [x] Top up saldo & pembelian course
- [x] Enrollment (course berbayar wajib dibeli dulu)
- [x] Assignment, submission (teks + file), penilaian
- [x] Halaman "My Assignments" untuk student
- [x] Ringkasan submission semua assignment untuk instructor
- [x] Review & rating course
- [x] Forum diskusi per course
- [x] Notifikasi real-time (Socket.IO)
- [x] Admin dashboard (kelola user + lihat daftar course)
- [x] Dashboard berbeda per role dengan statistik dan aktivitas terbaru
- [x] Pencarian, filter, dan sorting pada katalog course
- [x] Toast notification konsisten (pengganti `alert`)
- [x] Dark mode (toggle di navbar & halaman auth, tersimpan di localStorage, mengikuti preferensi sistem)
- [x] Health check database di `GET /api/health`
- [x] Proteksi dasar: Helmet, rate limit login/register, JWT 8 jam

---

## Testing

```bash
cd react-app
npm run lint
npm run build
```

---

## Troubleshooting

**Port 5000/5173 sudah dipakai**

```bat
stop-dev.cmd
start-dev.cmd
```

Atau hentikan proses yang menempati port tersebut lewat Task Manager.

**PostgreSQL gagal start**

Cek log di `..\pgsql\pg.log`. Pastikan port `5432` tidak dipakai PostgreSQL lain, lalu jalankan `start-db.cmd` lagi.

**Lupa/reset database lokal**

```bash
psql -U postgres -c "DROP DATABASE IF EXISTS seatudy;"
psql -U postgres -c "CREATE DATABASE seatudy;"
psql -U postgres -d seatudy -f db/init.sql
psql -U postgres -d seatudy -f db/seed.sql
```

**Login berhasil tetapi halaman kosong/403**

Pastikan role akun sesuai halaman yang dibuka. Student hanya bisa membuka halaman student, instructor halaman instructor, sedangkan admin dapat membuka dashboard admin dan daftar course.

---

## Batasan

- Upload file disimpan lokal di `server/uploads/`, belum memakai object storage.
- Token JWT disimpan di `localStorage` (cocok untuk demo, bukan produksi).
- Belum ada verifikasi email, reset password, atau payment gateway nyata.

---

## Catatan Pengembangan

- File upload disimpan di `server/uploads/` dan tidak masuk git.
- Folder upload dibuat otomatis saat server dijalankan.
- Schema bersifat idempotent (`CREATE TABLE IF NOT EXISTS`), aman dijalankan ulang.
- `server/node_modules` sengaja tidak lagi dilacak git; jalankan `npm install`.
- Styling memakai token di `src/styles/theme.css` (warna, radius, shadow, font Sora/Manrope). Komponen baru memakai class ber-prefix (`catalog-`, `teach-`, `sc-`, `sa-`, `ic-`, `isub-`) agar tidak bentrok dengan CSS lama.
- Design token utama: brand `#2563eb`, brand-deep `#0b1b3f`, accent amber, background `#f5f7fb`.
- Dark mode memakai atribut `data-theme="dark"` di `<html>`. Token warna di-override di `:root[data-theme='dark']` pada `src/styles/theme.css`; komponen sebaiknya memakai token (`--surface`, `--ink`, `--line`, `--danger-surface`, dst.) agar otomatis ikut tema.
