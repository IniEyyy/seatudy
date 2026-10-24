const pool = require('../db');

async function getCourseAccess(user, courseId) {
  const course = await pool.query('SELECT instructor_id FROM courses WHERE id = $1', [courseId]);
  if (course.rows.length === 0) return { allowed: false, notFound: true };

  if (user.role === 'admin') return { allowed: true, moderator: true };

  if (user.role === 'instructor' && course.rows[0].instructor_id === user.id) {
    return { allowed: true, moderator: true };
  }

  if (user.role === 'student') {
    const enrolled = await pool.query(
      'SELECT 1 FROM enrollments WHERE student_id = $1 AND course_id = $2',
      [user.id, courseId]
    );
    return { allowed: enrolled.rows.length > 0, moderator: false };
  }

  return { allowed: false };
}

exports.getForumMessages = async (req, res) => {
  const { courseId } = req.params;
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));

  try {
    const access = await getCourseAccess(req.user, courseId);
    if (!access.allowed) {
      return res.status(access.notFound ? 404 : 403).json({
        message: access.notFound ? 'Course not found' : 'You do not have access to this discussion',
      });
    }

    const totalResult = await pool.query(
      'SELECT COUNT(*)::int AS total FROM forum WHERE course_id = $1 AND parent_id IS NULL',
      [courseId]
    );
    const total = totalResult.rows[0].total;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;

    const topLevel = await pool.query(
      `SELECT f.id, f.course_id, f.user_id, f.parent_id, f.message, f.created_at, f.updated_at,
              u.username, u.role
       FROM forum f
       JOIN users u ON f.user_id = u.id
       WHERE f.course_id = $1 AND f.parent_id IS NULL
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3`,
      [courseId, limit, offset]
    );

    const ids = topLevel.rows.map((row) => row.id);
    const replies = ids.length
      ? await pool.query(
          `SELECT f.id, f.course_id, f.user_id, f.parent_id, f.message, f.created_at, f.updated_at,
                  u.username, u.role
           FROM forum f
           JOIN users u ON f.user_id = u.id
           WHERE f.parent_id = ANY($1::int[])
           ORDER BY f.created_at ASC`,
          [ids]
        )
      : { rows: [] };

    const repliesByParent = {};
    for (const reply of replies.rows) {
      repliesByParent[reply.parent_id] ||= [];
      repliesByParent[reply.parent_id].push(reply);
    }

    res.json({
      messages: topLevel.rows.map((row) => ({
        ...row,
        replies: repliesByParent[row.id] || [],
      })),
      pagination: { page: safePage, limit, total, totalPages },
      moderator: access.moderator,
    });
  } catch (err) {
    console.error('Fetch forum error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.postForumMessage = async (req, res) => {
  const { courseId } = req.params;
  const { message, parentId } = req.body;
  const userId = req.user.id;

  if (!message?.trim()) return res.status(400).json({ message: 'Message is required' });
  if (message.trim().length > 4000) {
    return res.status(400).json({ message: 'Message is too long (max 4000 characters)' });
  }

  try {
    const access = await getCourseAccess(req.user, courseId);
    if (!access.allowed) {
      return res.status(access.notFound ? 404 : 403).json({
        message: access.notFound ? 'Course not found' : 'You do not have access to this discussion',
      });
    }

    if (parentId) {
      const parent = await pool.query(
        'SELECT 1 FROM forum WHERE id = $1 AND course_id = $2 AND parent_id IS NULL',
        [parentId, courseId]
      );
      if (parent.rows.length === 0) {
        return res.status(400).json({ message: 'The message you are replying to was not found' });
      }
    }

    const result = await pool.query(
      `INSERT INTO forum (course_id, user_id, parent_id, message, created_at, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [courseId, userId, parentId || null, message.trim()]
    );
    res.status(201).json({ message: 'Message posted', forumMessage: result.rows[0] });
  } catch (err) {
    console.error('Post forum error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.editForumMessage = async (req, res) => {
  const { courseId, messageId } = req.params;
  const { message } = req.body;

  if (!message?.trim()) return res.status(400).json({ message: 'Message is required' });
  if (message.trim().length > 4000) {
    return res.status(400).json({ message: 'Message is too long (max 4000 characters)' });
  }

  try {
    const access = await getCourseAccess(req.user, courseId);
    if (!access.allowed) {
      return res.status(access.notFound ? 404 : 403).json({
        message: access.notFound ? 'Course not found' : 'You do not have access to this discussion',
      });
    }

    const result = await pool.query(
      `UPDATE forum
       SET message = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND course_id = $3 AND user_id = $4
       RETURNING *`,
      [message.trim(), messageId, courseId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Message not found or you cannot edit it' });
    }

    res.json({ message: 'Message updated', forumMessage: result.rows[0] });
  } catch (err) {
    console.error('Edit forum error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteForumMessage = async (req, res) => {
  const { courseId, messageId } = req.params;

  try {
    const access = await getCourseAccess(req.user, courseId);
    if (!access.allowed) {
      return res.status(access.notFound ? 404 : 403).json({
        message: access.notFound ? 'Course not found' : 'You do not have access to this discussion',
      });
    }

    const result = await pool.query(
      `DELETE FROM forum
       WHERE id = $1 AND course_id = $2 AND (user_id = $3 OR $4 = true)
       RETURNING id`,
      [messageId, courseId, req.user.id, access.moderator]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Message not found or you cannot delete it' });
    }

    res.json({ message: 'Message deleted' });
  } catch (err) {
    console.error('Delete forum error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
