const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Apply auth to all routes
router.use(requireAuth);

// List categories for authenticated user (user's categories + global categories)
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query('SELECT * FROM categories WHERE user_id IS NULL OR user_id = ? ORDER BY name', [userId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create category
router.post('/', async (req, res) => {
  try {
    // By default categories belong to the authenticated user. Optionally an admin
    // can create a global category (user_id = NULL) by sending user_id: null in the body
    // or when ALLOW_GLOBAL_CATEGORY_CREATION=true. We protect this action.
    const requesterId = req.user && req.user.id;
    const { name, type, color, icon, user_id } = req.body;

    let targetUserId = requesterId;

    // If the caller explicitly requests a null user_id (global category), ensure they are allowed
    const allowGlobal = process.env.ALLOW_GLOBAL_CATEGORY_CREATION === 'true' || requesterId === 1;
    if (user_id === null || user_id === 'null') {
      if (!allowGlobal) return res.status(403).json({ error: 'forbidden_global_category' });
      targetUserId = null;
    }

    const [result] = await pool.query('INSERT INTO categories (user_id, name, type, color, icon) VALUES (?, ?, ?, ?, ?)', [targetUserId, name, type || 'expense', color || null, icon || null]);
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [result.insertId || result]);
    res.status(201).json(rows[0] || { id: result.insertId || result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update category
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { name, type, color, icon } = req.body;
    await pool.query('UPDATE categories SET name = ?, type = ?, color = ?, icon = ? WHERE id = ?', [name, type, color, icon, id]);
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete category
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query('DELETE FROM categories WHERE id = ?', [id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
