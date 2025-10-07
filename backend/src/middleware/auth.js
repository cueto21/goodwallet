const jwt = require('jsonwebtoken');
const pool = require('../db');
// Use same default as auth routes so dev tokens remain verifiable when JWT_SECRET isn't set.
const JWT_SECRET = process.env.JWT_SECRET || 'wallet21';

async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'no_token' });
  const token = auth.split(' ')[1];
  try {
  const payload = jwt.verify(token, JWT_SECRET);
    // attach user id
    req.userId = payload.sub;
    // Optionally fetch user row
    const [rows] = await pool.query('SELECT id, email, display_name FROM users WHERE id = ?', [req.userId]);
    req.user = rows[0] || null;
    next();
  } catch (err) {
  // Diagnostic log for invalid token
  console.error('[AUTH] token verification failed:', err && err.name, err && err.message);
  return res.status(401).json({ error: 'invalid_token' });
  }
}

module.exports = { requireAuth };
