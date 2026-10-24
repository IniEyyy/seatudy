const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const REFRESH_COOKIE = 'seatudy_refresh';
const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 7);
const ACCESS_TTL = process.env.JWT_EXPIRES_IN || '15m';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const signAccessToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TTL,
  });

const cookieOptions = (expiresAt) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/auth',
  expires: expiresAt,
});

async function createRefreshToken(userId, req, res) {
  const token = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, tokenHash, expiresAt, req.get('user-agent') || null, req.ip || null]
  );

  res.cookie(REFRESH_COOKIE, token, cookieOptions(expiresAt));
  return token;
}

async function rotateRefreshToken(rawToken, req, res) {
  if (!rawToken) return null;

  const tokenHash = hashToken(rawToken);
  const newToken = crypto.randomBytes(48).toString('hex');
  const newHash = hashToken(newToken);
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);

  const rotated = await pool.query(
    `UPDATE refresh_tokens
     SET revoked_at = CURRENT_TIMESTAMP, replaced_by_hash = $2
     WHERE token_hash = $1
       AND revoked_at IS NULL
       AND expires_at > CURRENT_TIMESTAMP
     RETURNING user_id`,
    [tokenHash, newHash]
  );

  if (rotated.rows.length === 0) {
    res.clearCookie(REFRESH_COOKIE, cookieOptions(new Date(0)));
    return null;
  }

  const user = await pool.query(
    'SELECT id, username, email, role, balance FROM users WHERE id = $1',
    [rotated.rows[0].user_id]
  );
  if (user.rows.length === 0) return null;

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      user.rows[0].id,
      newHash,
      expiresAt,
      req.get('user-agent') || null,
      req.ip || null,
    ]
  );

  res.cookie(REFRESH_COOKIE, newToken, cookieOptions(expiresAt));
  return user.rows[0];
}

async function revokeRefreshToken(rawToken) {
  if (!rawToken) return;
  await pool.query(
    `UPDATE refresh_tokens
     SET revoked_at = CURRENT_TIMESTAMP
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [hashToken(rawToken)]
  );
}

module.exports = {
  REFRESH_COOKIE,
  ACCESS_TTL,
  cookieOptions,
  signAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
};
