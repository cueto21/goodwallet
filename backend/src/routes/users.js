const express = require('express');
const pool = require('../db');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, email, display_name, created_at FROM users LIMIT 100');
    res.json(rows);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// get current user
router.get('/me', requireAuth, async (req, res) => {
  if (!req.user) return res.status(404).json({ error: 'not_found' });
  res.json(req.user);
});

// create user (admin-ish or for migrations)
router.post('/', async (req, res) => {
  try {
    const { email, display_name, password_hash } = req.body;
    const [result] = await pool.query('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)', [email, password_hash || null, display_name || null]);
    const id = result.insertId || result;
    const [rows] = await pool.query('SELECT id, email, display_name FROM users WHERE id = ?', [id]);
    res.status(201).json(rows[0] || { id });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

module.exports = router;
