const pool = require('../db');

const SORT_FIELDS = new Set(['username', 'email', 'role', 'balance', 'created_at']);

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
