const pool = require('../db');

const SORT_FIELDS = new Set(['username', 'email', 'role', 'balance', 'created_at']);
const COURSE_SORT_FIELDS = new Set(['title', 'price', 'student_count', 'rating_avg', 'created_at']);
const COURSE_LEVELS = new Set(['Beginner', 'Intermediate', 'Advanced']);

function parseCoursePayload(body = {}) {
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();
  const category = String(body.category || '').trim();
  const syllabus = String(body.syllabus || '').trim();
  const level = String(body.level || '').trim();
  const price = Number(body.price);
  const instructorId = Number.parseInt(body.instructor_id, 10);

  if (!title || !description || !category || !level) {
    return { error: 'Title, description, category, and level are required' };
  }
  if (title.length > 200) {
    return { error: 'Title must be 200 characters or fewer' };
  }
  if (category.length > 80) {
    return { error: 'Category must be 80 characters or fewer' };
  }
  if (!COURSE_LEVELS.has(level)) {
    return { error: 'Choose a valid course level' };
  }
  if (!Number.isFinite(price) || price < 0) {
    return { error: 'Price must be zero or more' };
  }
  if (!Number.isInteger(instructorId) || instructorId < 1) {
    return { error: 'Choose an instructor' };
  }

  return {
    value: { title, description, category, syllabus, level, price, instructorId },
  };
}

exports.getAllUsers = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const search = String(req.query.search || '').trim();
    const role = String(req.query.role || '').trim();
    const exclude = String(req.query.exclude || '').trim();
    const sort = SORT_FIELDS.has(req.query.sort) ? req.query.sort : 'username';
    const order = req.query.order === 'desc' ? 'DESC' : 'ASC';

    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(username ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }
    if (['student', 'instructor', 'admin'].includes(role)) {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }
    if (['student', 'instructor', 'admin'].includes(exclude)) {
      params.push(exclude);
      conditions.push(`role <> $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM users ${where}`, params);
    const total = countResult.rows[0].total;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;

    const users = await pool.query(
      `SELECT id, username, email, role, balance, created_at
       FROM users
       ${where}
       ORDER BY ${sort} ${order}, id ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const counts = await pool.query(
      `SELECT role, COUNT(*)::int AS count FROM users GROUP BY role`
    );

    res.json({
      users: users.rows,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
        counts: Object.fromEntries(counts.rows.map((row) => [row.role, row.count])),
      },
    });
  } catch (err) {
    console.error('Get all users error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['student', 'instructor'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  if (Number(id) === req.user.id) {
    return res.status(400).json({ message: 'You cannot change your own role' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const before = await client.query('SELECT id, username, role FROM users WHERE id = $1 FOR UPDATE', [id]);
    if (before.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'User not found' });
    }
    if (before.rows[0].role === 'admin') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Admin accounts cannot be changed here' });
    }

    if (before.rows[0].role === 'instructor' && role === 'student') {
      const owned = await client.query(
        'SELECT COUNT(*)::int AS count FROM courses WHERE instructor_id = $1',
        [id]
      );
      if (owned.rows[0].count > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          message: 'This instructor still owns courses. Reassign or delete them first.',
        });
      }
    }

    await client.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
    await client.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
       VALUES ($1, 'user.role_changed', 'user', $2, $3)`,
      [
        req.user.id,
        String(id),
        JSON.stringify({
          username: before.rows[0].username,
          from: before.rows[0].role,
          to: role,
        }),
      ]
    );
    await client.query('COMMIT');

    res.json({ message: `User role updated to ${role}` });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Update user role error:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

exports.getAuditLogs = async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));

  try {
    const result = await pool.query(
      `SELECT l.id, l.action, l.entity_type, l.entity_id, l.metadata, l.created_at,
              u.username AS actor_name
       FROM audit_logs l
       LEFT JOIN users u ON u.id = l.actor_id
       ORDER BY l.created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get audit logs error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getManagedCourses = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const search = String(req.query.search || '').trim();
    const level = String(req.query.level || '').trim();
    const instructorId = Number.parseInt(req.query.instructor, 10);
    const sort = COURSE_SORT_FIELDS.has(req.query.sort) ? req.query.sort : 'created_at';
    const order = req.query.order === 'asc' ? 'ASC' : 'DESC';

    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(c.title ILIKE $${params.length} OR c.description ILIKE $${params.length} OR c.category ILIKE $${params.length} OR u.username ILIKE $${params.length})`
      );
    }
    if (COURSE_LEVELS.has(level)) {
      params.push(level);
      conditions.push(`c.level = $${params.length}`);
    }
    if (Number.isInteger(instructorId) && instructorId > 0) {
      params.push(instructorId);
      conditions.push(`c.instructor_id = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const totalResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM courses c
       JOIN users u ON u.id = c.instructor_id
       ${where}`,
      params
    );
    const total = totalResult.rows[0].total;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;

    const courses = await pool.query(
      `SELECT c.id, c.instructor_id, c.title, c.description, c.syllabus, c.category,
              c.price, c.level, c.rating_avg, c.student_count, c.created_at, c.updated_at,
              u.username AS instructor_name, u.email AS instructor_email,
              (SELECT COUNT(*)::int FROM materials m WHERE m.course_id = c.id) AS material_count,
              (SELECT COUNT(*)::int FROM assignments a WHERE a.course_id = c.id) AS assignment_count
       FROM courses c
       JOIN users u ON u.id = c.instructor_id
       ${where}
       ORDER BY c.${sort} ${order}, c.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const summary = await pool.query(
      `SELECT COUNT(*)::int AS courses,
              COUNT(DISTINCT instructor_id)::int AS instructors,
              COALESCE(SUM(student_count), 0)::int AS learners
       FROM courses`
    );

    res.json({
      courses: courses.rows,
      pagination: { page: safePage, limit, total, totalPages },
      summary: summary.rows[0],
    });
  } catch (err) {
    console.error('Get managed courses error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getInstructorOptions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email
       FROM users
       WHERE role = 'instructor'
       ORDER BY username ASC, id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get instructor options error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createManagedCourse = async (req, res) => {
  const parsed = parseCoursePayload(req.body);
  if (parsed.error) {
    return res.status(400).json({ message: parsed.error });
  }
  const course = parsed.value;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const instructor = await client.query(
      "SELECT id, username FROM users WHERE id = $1 AND role = 'instructor'",
      [course.instructorId]
    );
    if (instructor.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Choose an active instructor' });
    }

    const result = await client.query(
      `INSERT INTO courses (instructor_id, title, description, category, price, level, syllabus)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        course.instructorId,
        course.title,
        course.description,
        course.category,
        course.price,
        course.level,
        course.syllabus,
      ]
    );

    await client.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
       VALUES ($1, 'course.created', 'course', $2, $3)`,
      [
        req.user.id,
        String(result.rows[0].id),
        JSON.stringify({ title: course.title, instructor: instructor.rows[0].username }),
      ]
    );
    await client.query('COMMIT');

    res.status(201).json({ message: 'Course created', course: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Create managed course error:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

exports.updateManagedCourse = async (req, res) => {
  const courseId = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(courseId) || courseId < 1) {
    return res.status(400).json({ message: 'Invalid course id' });
  }

  const parsed = parseCoursePayload(req.body);
  if (parsed.error) {
    return res.status(400).json({ message: parsed.error });
  }
  const course = parsed.value;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id, title FROM courses WHERE id = $1 FOR UPDATE', [
      courseId,
    ]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Course not found' });
    }

    const instructor = await client.query(
      "SELECT id, username FROM users WHERE id = $1 AND role = 'instructor'",
      [course.instructorId]
    );
    if (instructor.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Choose an active instructor' });
    }

    const result = await client.query(
      `UPDATE courses
       SET instructor_id = $1,
           title = $2,
           description = $3,
           category = $4,
           price = $5,
           level = $6,
           syllabus = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        course.instructorId,
        course.title,
        course.description,
        course.category,
        course.price,
        course.level,
        course.syllabus,
        courseId,
      ]
    );

    await client.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
       VALUES ($1, 'course.updated', 'course', $2, $3)`,
      [
        req.user.id,
        String(courseId),
        JSON.stringify({
          title: course.title,
          previousTitle: existing.rows[0].title,
          instructor: instructor.rows[0].username,
        }),
      ]
    );
    await client.query('COMMIT');

    res.json({ message: 'Course updated', course: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Update managed course error:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

exports.deleteManagedCourse = async (req, res) => {
  const courseId = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(courseId) || courseId < 1) {
    return res.status(400).json({ message: 'Invalid course id' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id, title FROM courses WHERE id = $1 FOR UPDATE', [
      courseId,
    ]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Course not found' });
    }

    await client.query('DELETE FROM courses WHERE id = $1', [courseId]);
    await client.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
       VALUES ($1, 'course.deleted', 'course', $2, $3)`,
      [req.user.id, String(courseId), JSON.stringify({ title: existing.rows[0].title })]
    );
    await client.query('COMMIT');

    res.json({ message: 'Course deleted' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Delete managed course error:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};
