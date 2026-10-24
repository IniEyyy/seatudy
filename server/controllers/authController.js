const bcrypt = require('bcrypt');
const pool = require('../db');
const {
  REFRESH_COOKIE,
  cookieOptions,
  signAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} = require('../utils/tokens');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.register = async (req, res) => {
  const username = String(req.body.username || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (username.length < 3 || username.length > 80) {
    return res.status(400).json({ message: 'Username must be between 3 and 80 characters' });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  try {
    const userCheck = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
      [username, email, hashedPassword, 'student']
    );

    res.status(201).json({ message: 'Account created. You can sign in now.', user: newUser.rows[0] });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ message: 'Email or password is incorrect' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Email or password is incorrect' });

    await pool.query(
      'DELETE FROM refresh_tokens WHERE user_id = $1 AND expires_at <= CURRENT_TIMESTAMP',
      [user.id]
    );

    const token = signAccessToken(user);
    await createRefreshToken(user.id, req, res);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: user.balance,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.refresh = async (req, res) => {
  try {
    const user = await rotateRefreshToken(req.cookies?.[REFRESH_COOKIE], req, res);
    if (!user) {
      return res.status(401).json({ message: 'Session expired. Please sign in again.' });
    }

    res.json({ token: signAccessToken(user), user });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.logout = async (req, res) => {
  try {
    await revokeRefreshToken(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, cookieOptions(new Date(0)));
    res.json({ message: 'Signed out' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, role, balance FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
