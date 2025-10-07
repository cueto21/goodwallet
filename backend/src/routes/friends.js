const express = require('express');
const pool = require('../db');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// List friends (accepted and pending)
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(`
      SELECT u.id, u.email, u.display_name, f.status, f.created_at,
             CASE WHEN f.user_id = ? THEN 'sent' ELSE 'received' END as direction
      FROM friends f
      JOIN users u ON (f.user_id = u.id OR f.friend_id = u.id) AND u.id != ?
      WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status IN ('accepted', 'pending')
    `, [userId, userId, userId, userId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// Send friend request
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { friend_email } = req.body;
    if (!friend_email) return res.status(400).json({error: 'friend_email required'});

    // Find friend by email
    const [friends] = await pool.query('SELECT id FROM users WHERE email = ?', [friend_email]);
    if (friends.length === 0) return res.status(404).json({error: 'User not found'});

    const friendId = friends[0].id;
    if (friendId === userId) return res.status(400).json({error: 'Cannot add yourself'});

    // Check if already friends or pending
    const [existing] = await pool.query('SELECT id FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)', [userId, friendId, friendId, userId]);
    if (existing.length > 0) return res.status(400).json({error: 'Friend request already exists'});

    // Insert friend request
    await pool.query('INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)', [userId, friendId, 'pending']);
    res.status(201).json({message: 'Friend request sent'});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// Accept friend request
router.put('/:id/accept', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = req.params.id;

    // Check if request exists and is pending
    const [rows] = await pool.query('SELECT id FROM friends WHERE user_id = ? AND friend_id = ? AND status = ?', [friendId, userId, 'pending']);
    if (rows.length === 0) return res.status(404).json({error: 'Friend request not found'});

    // Update to accepted
    await pool.query('UPDATE friends SET status = ? WHERE user_id = ? AND friend_id = ?', ['accepted', friendId, userId]);
    res.json({message: 'Friend request accepted'});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// Remove friend
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = req.params.id;

    await pool.query('DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)', [userId, friendId, friendId, userId]);
    res.json({message: 'Friend removed'});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

module.exports = router;