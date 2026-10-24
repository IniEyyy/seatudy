-- Session rotation, audit trail, assignment feedback, and forum replies.

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by_hash TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS refresh_tokens_user_idx
  ON refresh_tokens (user_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS audit_logs_created_idx
  ON audit_logs (created_at DESC);

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS feedback TEXT,
  ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS graded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS submissions_student_assignment_uidx
  ON submissions (student_id, assignment_id);

CREATE INDEX IF NOT EXISTS submissions_student_idx
  ON submissions (student_id, assignment_id);

CREATE INDEX IF NOT EXISTS reviews_user_idx
  ON reviews (user_id);

CREATE INDEX IF NOT EXISTS notifications_user_read_idx
  ON notifications (user_id, is_read);

CREATE INDEX IF NOT EXISTS forum_course_created_idx
  ON forum (course_id, created_at DESC);

CREATE INDEX IF NOT EXISTS enrollments_student_idx
  ON enrollments (student_id);

CREATE INDEX IF NOT EXISTS purchases_user_idx
  ON purchases (user_id);

ALTER TABLE forum
  ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES forum(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- This column is new: treat all existing messages as never edited.
UPDATE forum SET updated_at = created_at WHERE updated_at > created_at;

CREATE INDEX IF NOT EXISTS forum_parent_idx
  ON forum (parent_id);

CREATE OR REPLACE FUNCTION recalc_course_student_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_course INTEGER;
BEGIN
  target_course := COALESCE(NEW.course_id, OLD.course_id);
  UPDATE courses
  SET student_count = (
    SELECT COUNT(*) FROM enrollments WHERE course_id = target_course
  )
  WHERE id = target_course;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS enrollments_recalc_student_count ON enrollments;
CREATE TRIGGER enrollments_recalc_student_count
AFTER INSERT OR DELETE ON enrollments
FOR EACH ROW EXECUTE FUNCTION recalc_course_student_count();

CREATE OR REPLACE FUNCTION recalc_course_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_course INTEGER;
BEGIN
  target_course := COALESCE(NEW.course_id, OLD.course_id);
  UPDATE courses
  SET rating_avg = COALESCE((
    SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE course_id = target_course
  ), 0)
  WHERE id = target_course;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS reviews_recalc_rating ON reviews;
CREATE TRIGGER reviews_recalc_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION recalc_course_rating();

DELETE FROM users u
WHERE u.email = 'admin@seatudy.com'
  AND u.role = 'student'
  AND NOT EXISTS (SELECT 1 FROM courses c WHERE c.instructor_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM enrollments e WHERE e.student_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM purchases p WHERE p.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM submissions s WHERE s.student_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM forum f WHERE f.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = u.id);
