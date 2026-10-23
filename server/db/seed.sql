-- Optional demo data for local development
-- Usage: psql -U postgres -d seatudy -f db/seed.sql
-- Password semua akun utama:
--   Admin@123 / Instructor@123 / Student@123
-- Akun instructor tambahan memakai Instructor@123.
-- Akun student tambahan memakai Student@123.
-- Seed ini idempotent: aman dijalankan berulang kali.

-- ============================================================
-- 1. Users
-- ============================================================

INSERT INTO users (username, email, password, role, balance) VALUES
  ('Admin Seatudy', 'admin@seatudy.local', '$2b$10$en2q62Y33af3WFimK9vAv.r7mH7/qvbMCi3IDZ4IvfNjdJX35apd.', 'admin', 0),
  ('Demo Instructor', 'instructor@seatudy.local', '$2b$10$nK/h8P8.RnJFYRmCd1YlzePwcaejCuRyC2qFIbOC3nsK7Rs8SwOQK', 'instructor', 0),
  ('Demo Student', 'student@seatudy.local', '$2b$10$CxPD2Iepo9oE.IpDipYQgeP9HqvQm1QUHUMjdPgXKT9oIafPMdMT.', 'student', 500)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (username, email, password, role, balance) VALUES
  ('Rina Prameswari', 'rina@seatudy.local', '$2b$10$nK/h8P8.RnJFYRmCd1YlzePwcaejCuRyC2qFIbOC3nsK7Rs8SwOQK', 'instructor', 0),
  ('Bagas Nugroho', 'bagas@seatudy.local', '$2b$10$nK/h8P8.RnJFYRmCd1YlzePwcaejCuRyC2qFIbOC3nsK7Rs8SwOQK', 'instructor', 0),
  ('Maya Kusuma', 'maya@seatudy.local', '$2b$10$nK/h8P8.RnJFYRmCd1YlzePwcaejCuRyC2qFIbOC3nsK7Rs8SwOQK', 'instructor', 0),
  ('Alya Putri', 'alya@seatudy.local', '$2b$10$CxPD2Iepo9oE.IpDipYQgeP9HqvQm1QUHUMjdPgXKT9oIafPMdMT.', 'student', 750),
  ('Bima Saputra', 'bima@seatudy.local', '$2b$10$CxPD2Iepo9oE.IpDipYQgeP9HqvQm1QUHUMjdPgXKT9oIafPMdMT.', 'student', 640),
  ('Citra Lestari', 'citra@seatudy.local', '$2b$10$CxPD2Iepo9oE.IpDipYQgeP9HqvQm1QUHUMjdPgXKT9oIafPMdMT.', 'student', 520),
  ('Dimas Pratama', 'dimas@seatudy.local', '$2b$10$CxPD2Iepo9oE.IpDipYQgeP9HqvQm1QUHUMjdPgXKT9oIafPMdMT.', 'student', 430),
  ('Eka Wulandari', 'eka@seatudy.local', '$2b$10$CxPD2Iepo9oE.IpDipYQgeP9HqvQm1QUHUMjdPgXKT9oIafPMdMT.', 'student', 300),
  ('Fajar Ramadhan', 'fajar@seatudy.local', '$2b$10$CxPD2Iepo9oE.IpDipYQgeP9HqvQm1QUHUMjdPgXKT9oIafPMdMT.', 'student', 900),
  ('Gita Maharani', 'gita@seatudy.local', '$2b$10$CxPD2Iepo9oE.IpDipYQgeP9HqvQm1QUHUMjdPgXKT9oIafPMdMT.', 'student', 610),
  ('Hendra Wijaya', 'hendra@seatudy.local', '$2b$10$CxPD2Iepo9oE.IpDipYQgeP9HqvQm1QUHUMjdPgXKT9oIafPMdMT.', 'student', 480),
  ('Intan Permata', 'intan@seatudy.local', '$2b$10$CxPD2Iepo9oE.IpDipYQgeP9HqvQm1QUHUMjdPgXKT9oIafPMdMT.', 'student', 700),
  ('Joko Susilo', 'joko@seatudy.local', '$2b$10$CxPD2Iepo9oE.IpDipYQgeP9HqvQm1QUHUMjdPgXKT9oIafPMdMT.', 'student', 250),
  ('Kirana Dewi', 'kirana@seatudy.local', '$2b$10$CxPD2Iepo9oE.IpDipYQgeP9HqvQm1QUHUMjdPgXKT9oIafPMdMT.', 'student', 560),
  ('Lukman Hakim', 'lukman@seatudy.local', '$2b$10$CxPD2Iepo9oE.IpDipYQgeP9HqvQm1QUHUMjdPgXKT9oIafPMdMT.', 'student', 150)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 2. Courses
-- ============================================================

INSERT INTO courses (instructor_id, title, description, category, price, level, syllabus)
SELECT
  u.id,
  'Belajar React dari Nol',
  'Course pengantar React: component, props, state, hooks, dan routing.',
  'Programming',
  100,
  'Beginner',
  '1. Dasar component dan JSX
2. Props dan state
3. useEffect dan data fetching
4. React Router
5. Studi kasus: dashboard sederhana'
FROM users u
WHERE u.email = 'instructor@seatudy.local'
  AND NOT EXISTS (
    SELECT 1 FROM courses c
    WHERE c.title = 'Belajar React dari Nol'
      AND c.instructor_id = u.id
  );

INSERT INTO courses (instructor_id, title, description, category, price, level, syllabus)
SELECT u.id, v.title, v.description, v.category, v.price, v.level, v.syllabus
FROM (VALUES
  ('rina@seatudy.local',
   'Database PostgreSQL dari Dasar',
   'Mengenal relational database, SQL, join, indexing, dan transaksi dengan PostgreSQL.',
   'Database', 90, 'Beginner',
   '1. Tabel, baris, dan kolom
2. SELECT, WHERE, dan ORDER BY
3. Join dan agregasi
4. Index dan query plan
5. Transaksi dan constraint'),
  ('rina@seatudy.local',
   'Public Speaking untuk Presentasi Teknis',
   'Latihan menyusun dan menyampaikan presentasi teknis yang jelas untuk tim dan klien.',
   'Soft Skills', 0, 'Beginner',
   '1. Menentukan pesan utama
2. Struktur slide yang mudah diikuti
3. Menjelaskan hal teknis tanpa jargon
4. Latihan vokal dan pacing
5. Menangani pertanyaan sulit'),
  ('bagas@seatudy.local',
   'TypeScript untuk Aplikasi Nyata',
   'Menambahkan type safety ke aplikasi React dan Node.js dengan TypeScript.',
   'Programming', 120, 'Intermediate',
   '1. Tipe dasar dan union
2. Interface dan type alias
3. Generic dan utility types
4. TypeScript di React
5. TypeScript di Node.js'),
  ('bagas@seatudy.local',
   'Dasar Data Science dengan Python',
   'Eksplorasi data, visualisasi, dan model machine learning dasar memakai Python.',
   'Data', 140, 'Intermediate',
   '1. NumPy dan pandas
2. Membersihkan data
3. Visualisasi data
4. Model klasifikasi dasar
5. Evaluasi model'),
  ('maya@seatudy.local',
   'Desain UI untuk Developer',
   'Prinsip visual hierarchy, spacing, tipografi, dan design system untuk developer.',
   'Design', 80, 'Beginner',
   '1. Hierarchy dan kontras
2. Spacing dan grid
3. Tipografi untuk antarmuka
4. Komponen dan token
5. Audit tampilan aplikasi'),
  ('maya@seatudy.local',
   'Manajemen Produk Digital',
   'Menulis PRD, menyusun roadmap, dan memprioritaskan fitur bersama tim.',
   'Business', 60, 'Beginner',
   '1. Masalah pengguna dan peluang
2. Menulis PRD yang ringkas
3. Prioritas dan trade-off
4. Roadmap kuartal
5. Mengukur hasil'),
  ('instructor@seatudy.local',
   'Backend API dengan Node.js',
   'Membangun REST API yang rapi dengan Express, validasi, dan autentikasi.',
   'Programming', 150, 'Intermediate',
   '1. Struktur project Express
2. Routing dan controller
3. Validasi input
4. Autentikasi JWT
5. Error handling dan testing'),
  ('instructor@seatudy.local',
   'Keamanan Aplikasi Web',
   'Mengenali celah OWASP, hardening, dan praktik aman di production.',
   'Security', 180, 'Advanced',
   '1. OWASP Top 10
2. Autentikasi dan sesi
3. Validasi dan sanitasi
4. Header dan rate limiting
5. Checklist hardening')
) AS v(instructor_email, title, description, category, price, level, syllabus)
JOIN users u ON u.email = v.instructor_email
WHERE NOT EXISTS (
  SELECT 1 FROM courses c
  WHERE c.title = v.title AND c.instructor_id = u.id
);

-- ============================================================
-- 3. Materials
-- ============================================================

INSERT INTO materials (course_id, title, content, link)
SELECT c.id, v.title, v.content, v.link
FROM (VALUES
  ('Belajar React dari Nol', 'Panduan React + Vite', 'Ringkasan setup project, component, dan hooks.', '/uploads/materials/1751034962941-152340767.pdf'),
  ('Belajar React dari Nol', 'Struktur Folder Contoh', 'Contoh pembagian folder untuk project React skala kecil.', '/uploads/materials/1792699090121-875743030.txt'),
  ('Database PostgreSQL dari Dasar', 'Cheatsheet SQL', 'Perintah SELECT, JOIN, GROUP BY, dan transaksi.', '/uploads/materials/1751034962948-664300255.pdf'),
  ('Database PostgreSQL dari Dasar', 'Diagram Relasi', 'Contoh relasi satu-ke-banyak dan banyak-ke-banyak.', '/uploads/materials/1751028833967-875240147.png'),
  ('Public Speaking untuk Presentasi Teknis', 'Panduan Slide Presentasi', 'Kerangka slide untuk presentasi teknis 10 menit.', '/uploads/materials/1751034962941-152340767.pdf'),
  ('Public Speaking untuk Presentasi Teknis', 'Latihan Vokal', 'Latihan pemanasan dan pengaturan tempo bicara.', '/uploads/materials/1792699090121-875743030.txt'),
  ('TypeScript untuk Aplikasi Nyata', 'Slide TypeScript Dasar', 'Tipe, union, interface, dan generic.', '/uploads/materials/1751034962948-664300255.pdf'),
  ('TypeScript untuk Aplikasi Nyata', 'Contoh Tipe dan Interface', 'Potongan kode untuk latihan refactor.', '/uploads/materials/1792699090121-875743030.txt'),
  ('Dasar Data Science dengan Python', 'Notebook Eksplorasi', 'Langkah awal membaca dan merangkum dataset.', '/uploads/materials/1792699090121-875743030.txt'),
  ('Dasar Data Science dengan Python', 'Slide Python untuk Data', 'NumPy, pandas, dan visualisasi dasar.', '/uploads/materials/1751034962941-152340767.pdf'),
  ('Desain UI untuk Developer', 'Wireframe Kit', 'Contoh wireframe untuk latihan audit tampilan.', '/uploads/materials/1751086760222-295340105.png'),
  ('Desain UI untuk Developer', 'Checklist Visual', 'Daftar periksa hierarchy, spacing, dan tipografi.', '/uploads/materials/1751034962941-152340767.pdf'),
  ('Manajemen Produk Digital', 'Template PRD', 'Kerangka PRD satu halaman.', '/uploads/materials/1751034962948-664300255.pdf'),
  ('Manajemen Produk Digital', 'Contoh Roadmap', 'Contoh roadmap kuartal untuk tim kecil.', '/uploads/materials/1751086760222-295340105.png'),
  ('Backend API dengan Node.js', 'Slide Express API', 'Routing, controller, dan middleware.', '/uploads/materials/1751034962941-152340767.pdf'),
  ('Backend API dengan Node.js', 'Contoh Struktur Project', 'Pemisahan routes, controllers, dan services.', '/uploads/materials/1792699090121-875743030.txt'),
  ('Keamanan Aplikasi Web', 'OWASP Checklist', 'Daftar celah umum dan cara memeriksanya.', '/uploads/materials/1751034962948-664300255.pdf'),
  ('Keamanan Aplikasi Web', 'Threat Model Sederhana', 'Contoh threat model untuk aplikasi kecil.', '/uploads/materials/1751086760222-295340105.png')
) AS v(course_title, title, content, link)
JOIN courses c ON c.title = v.course_title
WHERE NOT EXISTS (
  SELECT 1 FROM materials m
  WHERE m.course_id = c.id AND m.title = v.title AND m.link = v.link
);

-- ============================================================
-- 4. Assignments
-- ============================================================

INSERT INTO assignments (course_id, title, description, due_date)
SELECT c.id, v.title, v.description, NOW() + (v.due_offset || ' days')::interval
FROM (VALUES
  ('TypeScript untuk Aplikasi Nyata', 'Refactor ke TypeScript', 'Refactor satu komponen React menjadi TypeScript dan jelaskan tipe yang dipakai.', -5),
  ('TypeScript untuk Aplikasi Nyata', 'Tipe Generik untuk API', 'Buat helper fetch dengan generic dan tipe response yang aman.', 9),
  ('Desain UI untuk Developer', 'Audit UI Aplikasi', 'Pilih satu halaman aplikasi dan tulis temuan hierarchy, spacing, serta tipografi.', -4),
  ('Desain UI untuk Developer', 'Buat Design System Mini', 'Susun token warna, spacing, dan dua komponen dasar.', 8),
  ('Backend API dengan Node.js', 'REST API dengan Express', 'Buat endpoint CRUD sederhana dengan validasi input.', -6),
  ('Backend API dengan Node.js', 'Middleware Autentikasi', 'Tambahkan middleware JWT dan jelaskan alur validasinya.', 10),
  ('Database PostgreSQL dari Dasar', 'Normalisasi Skema', 'Normalisasi skema pesanan sampai bentuk ketiga dan jelaskan alasannya.', -3),
  ('Database PostgreSQL dari Dasar', 'Query Laporan Penjualan', 'Tulis query laporan penjualan per kategori dengan join dan agregasi.', 7),
  ('Manajemen Produk Digital', 'PRD Fitur Baru', 'Tulis PRD ringkas untuk satu fitur yang ingin ditambahkan.', -5),
  ('Manajemen Produk Digital', 'Roadmap Kuartal', 'Susun roadmap satu kuartal dengan prioritas dan alasan.', 12),
  ('Dasar Data Science dengan Python', 'Eksplorasi Dataset', 'Eksplorasi dataset publik dan tulis tiga temuan utama.', -4),
  ('Dasar Data Science dengan Python', 'Model Klasifikasi Sederhana', 'Latih model klasifikasi dasar dan laporkan akurasinya.', 9),
  ('Public Speaking untuk Presentasi Teknis', 'Rekam Presentasi 3 Menit', 'Rekam presentasi tiga menit tentang satu topik teknis.', -2),
  ('Public Speaking untuk Presentasi Teknis', 'Susun Slide Teknis', 'Buat lima slide untuk menjelaskan arsitektur aplikasi.', 6),
  ('Keamanan Aplikasi Web', 'Celah OWASP', 'Analisis satu celah OWASP dan usulkan mitigasinya.', -6),
  ('Keamanan Aplikasi Web', 'Checklist Hardening', 'Susun checklist hardening untuk aplikasi Express.', 11)
) AS v(course_title, title, description, due_offset)
JOIN courses c ON c.title = v.course_title
WHERE NOT EXISTS (
  SELECT 1 FROM assignments a
  WHERE a.course_id = c.id AND a.title = v.title
);

-- ============================================================
-- 5. Purchases (course berbayar)
-- ============================================================

INSERT INTO purchases (user_id, course_id)
SELECT u.id, c.id
FROM (VALUES
  ('student@seatudy.local', 'TypeScript untuk Aplikasi Nyata'),
  ('student@seatudy.local', 'Desain UI untuk Developer'),
  ('student@seatudy.local', 'Database PostgreSQL dari Dasar'),
  ('alya@seatudy.local', 'Belajar React dari Nol'),
  ('alya@seatudy.local', 'TypeScript untuk Aplikasi Nyata'),
  ('alya@seatudy.local', 'Desain UI untuk Developer'),
  ('bima@seatudy.local', 'Backend API dengan Node.js'),
  ('bima@seatudy.local', 'Database PostgreSQL dari Dasar'),
  ('citra@seatudy.local', 'Dasar Data Science dengan Python'),
  ('citra@seatudy.local', 'Manajemen Produk Digital'),
  ('dimas@seatudy.local', 'Belajar React dari Nol'),
  ('dimas@seatudy.local', 'TypeScript untuk Aplikasi Nyata'),
  ('dimas@seatudy.local', 'Backend API dengan Node.js'),
  ('eka@seatudy.local', 'Desain UI untuk Developer'),
  ('fajar@seatudy.local', 'Database PostgreSQL dari Dasar'),
  ('fajar@seatudy.local', 'Keamanan Aplikasi Web'),
  ('gita@seatudy.local', 'Belajar React dari Nol'),
  ('gita@seatudy.local', 'TypeScript untuk Aplikasi Nyata'),
  ('gita@seatudy.local', 'Dasar Data Science dengan Python'),
  ('hendra@seatudy.local', 'Desain UI untuk Developer'),
  ('intan@seatudy.local', 'Desain UI untuk Developer'),
  ('intan@seatudy.local', 'Manajemen Produk Digital'),
  ('joko@seatudy.local', 'Keamanan Aplikasi Web'),
  ('kirana@seatudy.local', 'Backend API dengan Node.js'),
  ('kirana@seatudy.local', 'Keamanan Aplikasi Web')
) AS v(email, course_title)
JOIN users u ON u.email = v.email
JOIN courses c ON c.title = v.course_title
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. Enrollments
-- ============================================================

INSERT INTO enrollments (student_id, course_id)
SELECT u.id, c.id
FROM (VALUES
  ('student@seatudy.local', 'Belajar React dari Nol'),
  ('student@seatudy.local', 'TypeScript untuk Aplikasi Nyata'),
  ('student@seatudy.local', 'Desain UI untuk Developer'),
  ('student@seatudy.local', 'Public Speaking untuk Presentasi Teknis'),
  ('alya@seatudy.local', 'Belajar React dari Nol'),
  ('alya@seatudy.local', 'TypeScript untuk Aplikasi Nyata'),
  ('alya@seatudy.local', 'Desain UI untuk Developer'),
  ('bima@seatudy.local', 'Backend API dengan Node.js'),
  ('bima@seatudy.local', 'Database PostgreSQL dari Dasar'),
  ('citra@seatudy.local', 'Dasar Data Science dengan Python'),
  ('citra@seatudy.local', 'Manajemen Produk Digital'),
  ('dimas@seatudy.local', 'Belajar React dari Nol'),
  ('dimas@seatudy.local', 'TypeScript untuk Aplikasi Nyata'),
  ('dimas@seatudy.local', 'Backend API dengan Node.js'),
  ('eka@seatudy.local', 'Desain UI untuk Developer'),
  ('eka@seatudy.local', 'Public Speaking untuk Presentasi Teknis'),
  ('fajar@seatudy.local', 'Database PostgreSQL dari Dasar'),
  ('fajar@seatudy.local', 'Keamanan Aplikasi Web'),
  ('gita@seatudy.local', 'Belajar React dari Nol'),
  ('gita@seatudy.local', 'TypeScript untuk Aplikasi Nyata'),
  ('gita@seatudy.local', 'Dasar Data Science dengan Python'),
  ('gita@seatudy.local', 'Public Speaking untuk Presentasi Teknis'),
  ('intan@seatudy.local', 'Desain UI untuk Developer'),
  ('intan@seatudy.local', 'Manajemen Produk Digital'),
  ('kirana@seatudy.local', 'Backend API dengan Node.js'),
  ('kirana@seatudy.local', 'Keamanan Aplikasi Web')
) AS v(email, course_title)
JOIN users u ON u.email = v.email
JOIN courses c ON c.title = v.course_title
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. Submissions
-- ============================================================

INSERT INTO submissions (student_id, assignment_id, content, score, created_at)
SELECT u.id, a.id, v.content, v.score, NOW() - (v.days_ago || ' days')::interval
FROM (VALUES
  ('alya@seatudy.local', 'Belajar React dari Nol', 'Tugas 1', 'Komponen kartu sudah dipecah dan state dipindahkan ke parent.', 88, 1),
  ('dimas@seatudy.local', 'Belajar React dari Nol', 'Tugas 1', 'Saya membuat komponen terpisah untuk header dan daftar item.', 76, 1),
  ('gita@seatudy.local', 'Belajar React dari Nol', 'Tugas 1', 'Masih belajar, mohon masukan untuk struktur props.', NULL, 1),
  ('alya@seatudy.local', 'Belajar React dari Nol', 'Tugas File', 'Lampiran berisi screenshot hasil akhir dan catatan refactor.', 92, 2),
  ('dimas@seatudy.local', 'Belajar React dari Nol', 'Tugas File', 'File latihan sudah diunggah, beberapa bagian masih perlu dirapikan.', 70, 2),
  ('alya@seatudy.local', 'TypeScript untuk Aplikasi Nyata', 'Refactor ke TypeScript', 'Saya menambahkan props interface dan union untuk status.', 90, 7),
  ('dimas@seatudy.local', 'TypeScript untuk Aplikasi Nyata', 'Refactor ke TypeScript', 'Refactor selesai, tipe event handler masih any di satu tempat.', 84, 6),
  ('gita@seatudy.local', 'TypeScript untuk Aplikasi Nyata', 'Refactor ke TypeScript', 'Versi TypeScript sudah jalan, mohon cek tipe response API.', 78, 1),
  ('alya@seatudy.local', 'Desain UI untuk Developer', 'Audit UI Aplikasi', 'Temuan utama: spacing tidak konsisten dan kontras teks abu terlalu rendah.', 88, 6),
  ('eka@seatudy.local', 'Desain UI untuk Developer', 'Audit UI Aplikasi', 'Saya membuat sebelum-sesudah untuk halaman checkout.', 92, 4),
  ('intan@seatudy.local', 'Desain UI untuk Developer', 'Audit UI Aplikasi', 'Audit fokus pada tipografi dan hierarchy tombol utama.', 80, 1),
  ('bima@seatudy.local', 'Backend API dengan Node.js', 'REST API dengan Express', 'CRUD produk selesai dengan validasi harga dan stok.', 86, 8),
  ('dimas@seatudy.local', 'Backend API dengan Node.js', 'REST API dengan Express', 'Endpoint sudah memakai controller terpisah dan error handler.', 90, 7),
  ('kirana@seatudy.local', 'Backend API dengan Node.js', 'REST API dengan Express', 'API berjalan, validasi masih manual di route.', 74, 2),
  ('bima@seatudy.local', 'Database PostgreSQL dari Dasar', 'Normalisasi Skema', 'Skema pesanan dipecah menjadi orders, order_items, dan products.', 95, 5),
  ('fajar@seatudy.local', 'Database PostgreSQL dari Dasar', 'Normalisasi Skema', 'Saya menjelaskan langkah 1NF sampai 3NF beserta contoh tabel.', 82, 4),
  ('kirana@seatudy.local', 'Database PostgreSQL dari Dasar', 'Normalisasi Skema', 'Masih bingung memisahkan data pelanggan, mohon koreksi.', NULL, 1),
  ('citra@seatudy.local', 'Manajemen Produk Digital', 'PRD Fitur Baru', 'PRD untuk fitur reminder belajar, lengkap dengan metrik keberhasilan.', 87, 7),
  ('intan@seatudy.local', 'Manajemen Produk Digital', 'PRD Fitur Baru', 'Saya menulis PRD untuk fitur wishlist dan alur penggunanya.', 91, 6),
  ('citra@seatudy.local', 'Dasar Data Science dengan Python', 'Eksplorasi Dataset', 'Dataset dibersihkan, tiga temuan utama ditulis di notebook.', 89, 6),
  ('gita@seatudy.local', 'Dasar Data Science dengan Python', 'Eksplorasi Dataset', 'Visualisasi sudah dibuat, bagian handling outlier belum selesai.', 83, 1),
  ('eka@seatudy.local', 'Public Speaking untuk Presentasi Teknis', 'Rekam Presentasi 3 Menit', 'Rekaman presentasi tentang API rate limiting.', 94, 4),
  ('gita@seatudy.local', 'Public Speaking untuk Presentasi Teknis', 'Rekam Presentasi 3 Menit', 'Latihan ketiga, tempo sudah lebih stabil.', 90, 3),
  ('fajar@seatudy.local', 'Keamanan Aplikasi Web', 'Celah OWASP', 'Analisis celah broken access control dan usulan middleware role.', 85, 8),
  ('kirana@seatudy.local', 'Keamanan Aplikasi Web', 'Celah OWASP', 'Saya membahas XSS dan sanitasi input pada form komentar.', 79, 2)
) AS v(email, course_title, assignment_title, content, score, days_ago)
JOIN users u ON u.email = v.email
JOIN courses c ON c.title = v.course_title
JOIN assignments a ON a.course_id = c.id AND a.title = v.assignment_title
WHERE NOT EXISTS (
  SELECT 1 FROM submissions s
  WHERE s.student_id = u.id AND s.assignment_id = a.id
);

-- ============================================================
-- 8. Reviews
-- ============================================================

INSERT INTO reviews (course_id, user_id, rating, comment, created_at)
SELECT c.id, u.id, v.rating, v.comment, NOW() - (v.days_ago || ' days')::interval
FROM (VALUES
  ('alya@seatudy.local', 'Belajar React dari Nol', 5, 'Penjelasan hooks-nya jelas dan latihannya langsung bisa dipakai.', 2),
  ('dimas@seatudy.local', 'Belajar React dari Nol', 4, 'Materi padat, bagian routing bisa lebih banyak contoh.', 4),
  ('gita@seatudy.local', 'Belajar React dari Nol', 5, 'Cocok untuk yang baru mulai dan ingin memahami alur data.', 6),
  ('alya@seatudy.local', 'TypeScript untuk Aplikasi Nyata', 5, 'Refactor bertahap membuat TypeScript terasa masuk akal.', 3),
  ('dimas@seatudy.local', 'TypeScript untuk Aplikasi Nyata', 4, 'Contoh generic-nya membantu, perlu latihan tambahan.', 5),
  ('gita@seatudy.local', 'TypeScript untuk Aplikasi Nyata', 5, 'Sekarang lebih percaya diri menulis tipe di project React.', 8),
  ('alya@seatudy.local', 'Desain UI untuk Developer', 5, 'Checklist auditnya langsung saya pakai di project kantor.', 4),
  ('eka@seatudy.local', 'Desain UI untuk Developer', 4, 'Bagus untuk dasar, contoh design system bisa lebih dalam.', 6),
  ('intan@seatudy.local', 'Desain UI untuk Developer', 5, 'Penjelasan spacing dan hierarchy sangat praktis.', 9),
  ('bima@seatudy.local', 'Backend API dengan Node.js', 4, 'Struktur project-nya rapi, saya jadi paham pemisahan controller.', 5),
  ('dimas@seatudy.local', 'Backend API dengan Node.js', 5, 'Bagian error handling dan validasi paling membantu.', 7),
  ('kirana@seatudy.local', 'Backend API dengan Node.js', 4, 'Materi JWT cukup jelas, butuh contoh refresh token.', 10),
  ('bima@seatudy.local', 'Database PostgreSQL dari Dasar', 5, 'Penjelasan index dan query plan membuka banyak hal baru.', 3),
  ('fajar@seatudy.local', 'Database PostgreSQL dari Dasar', 4, 'Latihan normalisasi menantang dan berguna.', 7),
  ('citra@seatudy.local', 'Manajemen Produk Digital', 4, 'Template PRD-nya sederhana dan mudah dipakai.', 4),
  ('intan@seatudy.local', 'Manajemen Produk Digital', 4, 'Bagian prioritas fitur membantu saat diskusi dengan tim.', 8),
  ('citra@seatudy.local', 'Dasar Data Science dengan Python', 5, 'Alur eksplorasi data dijelaskan langkah demi langkah.', 2),
  ('gita@seatudy.local', 'Dasar Data Science dengan Python', 4, 'Visualisasinya jelas, semoga ada studi kasus tambahan.', 6),
  ('eka@seatudy.local', 'Public Speaking untuk Presentasi Teknis', 5, 'Latihan vokal dan pacing langsung terasa efeknya.', 3),
  ('gita@seatudy.local', 'Public Speaking untuk Presentasi Teknis', 5, 'Sangat membantu untuk presentasi tugas besar.', 5),
  ('fajar@seatudy.local', 'Keamanan Aplikasi Web', 4, 'Checklist hardening-nya ringkas dan bisa langsung dicoba.', 4),
  ('kirana@seatudy.local', 'Keamanan Aplikasi Web', 5, 'Penjelasan OWASP-nya jelas dan tidak menakutkan.', 7)
) AS v(email, course_title, rating, comment, days_ago)
JOIN users u ON u.email = v.email
JOIN courses c ON c.title = v.course_title
ON CONFLICT (course_id, user_id) DO NOTHING;

-- ============================================================
-- 9. Forum
-- ============================================================

INSERT INTO forum (course_id, user_id, message, created_at)
SELECT c.id, u.id, v.message, NOW() - (v.days_ago || ' days')::interval
FROM (VALUES
  ('instructor@seatudy.local', 'Belajar React dari Nol', 'Selamat datang. Silakan tanya di sini kalau ada bagian yang belum jelas.', 12),
  ('alya@seatudy.local', 'Belajar React dari Nol', 'Untuk state yang dipakai banyak komponen, sebaiknya lift state atau pakai context?', 8),
  ('instructor@seatudy.local', 'Belajar React dari Nol', 'Mulai dari lift state dulu. Context dipakai kalau sudah benar-benar lintas halaman.', 7),
  ('dimas@seatudy.local', 'TypeScript untuk Aplikasi Nyata', 'Apakah semua props wajib punya interface sendiri?', 6),
  ('bagas@seatudy.local', 'TypeScript untuk Aplikasi Nyata', 'Tidak wajib. Untuk komponen kecil, inline type sudah cukup.', 5),
  ('bima@seatudy.local', 'Backend API dengan Node.js', 'Error handler sebaiknya ditaruh sebelum atau sesudah routes?', 5),
  ('instructor@seatudy.local', 'Backend API dengan Node.js', 'Setelah routes, supaya semua error dari route tertangkap.', 4),
  ('eka@seatudy.local', 'Desain UI untuk Developer', 'Untuk audit, lebih baik mulai dari halaman yang paling ramai atau paling sederhana?', 4),
  ('maya@seatudy.local', 'Desain UI untuk Developer', 'Mulai dari halaman yang paling sering dipakai supaya dampaknya terasa.', 4),
  ('citra@seatudy.local', 'Dasar Data Science dengan Python', 'Kalau data banyak yang kosong, drop atau imputasi dulu?', 3),
  ('bagas@seatudy.local', 'Dasar Data Science dengan Python', 'Lihat proporsi missing value. Kalau kecil, imputasi; kalau besar, pertimbangkan drop kolom.', 3),
  ('fajar@seatudy.local', 'Database PostgreSQL dari Dasar', 'Kapan sebaiknya memakai index di kolom yang sering di-update?', 2),
  ('rina@seatudy.local', 'Database PostgreSQL dari Dasar', 'Tetap lihat pola query. Index mempercepat baca, tapi menambah biaya tulis.', 2),
  ('kirana@seatudy.local', 'Keamanan Aplikasi Web', 'Apakah rate limit cukup di level aplikasi saja?', 1),
  ('intan@seatudy.local', 'Manajemen Produk Digital', 'PRD untuk fitur internal apakah perlu bagian metrik?', 1),
  ('maya@seatudy.local', 'Manajemen Produk Digital', 'Perlu, minimal metrik efisiensi atau waktu yang dihemat.', 1)
) AS v(email, course_title, message, days_ago)
JOIN users u ON u.email = v.email
JOIN courses c ON c.title = v.course_title
WHERE NOT EXISTS (
  SELECT 1 FROM forum f
  WHERE f.course_id = c.id AND f.user_id = u.id AND f.message = v.message
);

-- ============================================================
-- 10. Notifications
-- ============================================================

INSERT INTO notifications (user_id, type, message, is_read, created_at)
SELECT u.id, v.type, v.message, v.is_read, NOW() - (v.days_ago || ' days')::interval
FROM (VALUES
  ('instructor@seatudy.local', 'purchase', 'Alya Putri has purchased your course "Belajar React dari Nol"', TRUE, 10),
  ('instructor@seatudy.local', 'submission', 'Bima Saputra submitted "REST API dengan Express"', FALSE, 8),
  ('instructor@seatudy.local', 'submission', 'Kirana Dewi submitted "Celah OWASP"', FALSE, 2),
  ('instructor@seatudy.local', 'grade', 'You still have ungraded submissions in "Normalisasi Skema"', FALSE, 1),
  ('rina@seatudy.local', 'submission', 'Fajar Ramadhan submitted "Normalisasi Skema"', FALSE, 4),
  ('rina@seatudy.local', 'purchase', 'Bima Saputra has purchased your course "Database PostgreSQL dari Dasar"', TRUE, 9),
  ('bagas@seatudy.local', 'submission', 'Gita Maharani submitted "Eksplorasi Dataset"', FALSE, 1),
  ('bagas@seatudy.local', 'purchase', 'Citra Lestari has purchased your course "Dasar Data Science dengan Python"', TRUE, 7),
  ('maya@seatudy.local', 'submission', 'Intan Permata submitted "PRD Fitur Baru"', FALSE, 6),
  ('maya@seatudy.local', 'purchase', 'Eka Wulandari has purchased your course "Desain UI untuk Developer"', TRUE, 11),
  ('student@seatudy.local', 'grade', 'Your submission for "Tugas 1" was graded 90', TRUE, 3),
  ('student@seatudy.local', 'assignment', 'New assignment in "TypeScript untuk Aplikasi Nyata" is due in 9 days', FALSE, 1),
  ('alya@seatudy.local', 'grade', 'Your submission for "Audit UI Aplikasi" was graded 88', FALSE, 4),
  ('dimas@seatudy.local', 'grade', 'Your submission for "REST API dengan Express" was graded 90', TRUE, 6),
  ('gita@seatudy.local', 'grade', 'Your submission for "Rekam Presentasi 3 Menit" was graded 90', FALSE, 2),
  ('fajar@seatudy.local', 'grade', 'Your submission for "Celah OWASP" was graded 85', FALSE, 7),
  ('hendra@seatudy.local', 'purchase', 'You purchased "Desain UI untuk Developer". Enrol to unlock the materials.', FALSE, 5),
  ('joko@seatudy.local', 'purchase', 'You purchased "Keamanan Aplikasi Web". Enrol to unlock the materials.', FALSE, 3)
) AS v(email, type, message, is_read, days_ago)
JOIN users u ON u.email = v.email
WHERE NOT EXISTS (
  SELECT 1 FROM notifications n
  WHERE n.user_id = u.id AND n.message = v.message
);

-- ============================================================
-- 11. Sync aggregate counters
-- ============================================================

UPDATE courses c
SET student_count = (
  SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id
);

UPDATE courses c
SET rating_avg = COALESCE((
  SELECT ROUND(AVG(r.rating)::numeric, 2) FROM reviews r WHERE r.course_id = c.id
), 0);
