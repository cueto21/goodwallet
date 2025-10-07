const express = require('express');
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'wallet21';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 30);

function signAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function signRefreshToken() {
  // refresh token is a random uuid-like string; we'll store in DB hashed
  return require('crypto').randomBytes(48).toString('hex');
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, display_name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ error: 'user_exists' });
    const password_hash = await bcrypt.hash(password, 10);
  await pool.query('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)', [email, password_hash, display_name || null]);
  // insertId is 0 when DB uses UUID() triggers; fetch actual id by querying the row
  const [rowsAfterInsert] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  const userId = (rowsAfterInsert && rowsAfterInsert[0] && rowsAfterInsert[0].id) || null;
    const access = signAccessToken({ sub: userId });
    const refresh = signRefreshToken();
    const refresh_hashed = await bcrypt.hash(refresh, 10);
    const expires_at = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 3600 * 1000);
  await pool.query('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (UUID(), ?, ?, ?)', [userId, refresh_hashed, expires_at]);
    // Diagnostic log: token issued (do not log the token or secret)
    console.log('[AUTH] register issued token for userId=', userId, ' JWT_SECRET set=', !!process.env.JWT_SECRET);
    res.cookie('refresh_token', refresh, { httpOnly: true, secure: true, sameSite: 'Strict' });
    res.json({ access_token: access, user: { id: userId, email, display_name } });
  } catch (err) {
  console.error('Auth register error:', err && err.message, err && err.sqlMessage, err && err.sql);
  res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const [rows] = await pool.query('SELECT id, password_hash, display_name FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'invalid_credentials' });
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash || '');
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });
    const access = signAccessToken({ sub: user.id });
    const refresh = signRefreshToken();
    const refresh_hashed = await bcrypt.hash(refresh, 10);
    const expires_at = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 3600 * 1000);
  await pool.query('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (UUID(), ?, ?, ?)', [user.id, refresh_hashed, expires_at]);
  // Diagnostic log: token issued on login
  console.log('[AUTH] login issued token for userId=', user.id, ' JWT_SECRET set=', !!process.env.JWT_SECRET);
  res.cookie('refresh_token', refresh, { httpOnly: true, secure: true, sameSite: 'Strict' });
  res.json({ access_token: access, user: { id: user.id, email, display_name: user.display_name } });
  } catch (err) {
  console.error('Auth login error:', err && err.message, err && err.sqlMessage, err && err.sql);
  res.status(500).json({ error: err.message });
  }
});

// Refresh
router.post('/refresh', async (req, res) => {
  try {
    const rt = req.cookies && req.cookies.refresh_token;
    if (!rt) return res.status(401).json({ error: 'no_refresh' });
    const [rows] = await pool.query('SELECT id, user_id, token_hash, expires_at FROM refresh_tokens WHERE expires_at > NOW()');
    // find matching hashed
    let match = null;
    for (const r of rows) {
      const ok = await bcrypt.compare(rt, r.token_hash);
      if (ok) { match = r; break; }
    }
    if (!match) return res.status(401).json({ error: 'invalid_refresh' });
    // issue new access
    const access = signAccessToken({ sub: match.user_id });
    res.json({ access_token: access });
  } catch (err) {
  console.error('Auth refresh error:', err && err.message, err && err.sqlMessage, err && err.sql);
  res.status(500).json({ error: err.message });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const rt = req.cookies && req.cookies.refresh_token;
    if (rt) {
      // delete matching token
      const [rows] = await pool.query('SELECT id, token_hash FROM refresh_tokens');
      for (const r of rows) {
        const ok = await bcrypt.compare(rt, r.token_hash);
        if (ok) {
          await pool.query('DELETE FROM refresh_tokens WHERE id = ?', [r.id]);
          break;
        }
      }
    }
    res.clearCookie('refresh_token');
    res.json({ ok: true });
  } catch (err) {
  console.error('Auth logout error:', err && err.message, err && err.sqlMessage, err && err.sql);
  res.status(500).json({ error: err.message });
  }
});

module.exports = router;
