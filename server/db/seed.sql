-- Optional demo data for local development
-- Usage: psql -U postgres -d seatudy -f db/seed.sql
-- Passwords: Admin@123 / Instructor@123 / Student@123

INSERT INTO users (username, email, password, role, balance) VALUES
  ('Admin Seatudy', 'admin@seatudy.local', '$2b$10$en2q62Y33af3WFimK9vAv.r7mH7/qvbMCi3IDZ4IvfNjdJX35apd.', 'admin', 0),
  ('Demo Instructor', 'instructor@seatudy.local', '$2b$10$nK/h8P8.RnJFYRmCd1YlzePwcaejCuRyC2qFIbOC3nsK7Rs8SwOQK', 'instructor', 0),
  ('Demo Student', 'student@seatudy.local', '$2b$10$CxPD2Iepo9oE.IpDipYQgeP9HqvQm1QUHUMjdPgXKT9oIafPMdMT.', 'student', 500)
ON CONFLICT (email) DO NOTHING;

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
