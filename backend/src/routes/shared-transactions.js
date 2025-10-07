const express = require('express');
const pool = require('../db');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// List shared transactions for the user
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    // As friend (owed money)
    const [owed] = await pool.query(`
      SELECT st.id, st.transaction_id, st.amount_owed, st.split_type, st.split_value, st.status, st.paid_at,
             t.description, t.amount as total_amount, t.date, u.display_name as creator_name, u.email as creator_email
      FROM shared_transactions st
      JOIN transactions t ON st.transaction_id = t.id
      JOIN users u ON t.user_id = u.id
      WHERE st.friend_user_id = ? AND st.status = 'pending'
    `, [userId]);

    // As creator (money owed to me)
    const [owing] = await pool.query(`
      SELECT st.id, st.transaction_id, st.amount_owed, st.split_type, st.split_value, st.status, st.paid_at, st.approved,
             t.description, t.amount as total_amount, t.date, u.display_name as friend_name, u.email as friend_email
      FROM shared_transactions st
      JOIN transactions t ON st.transaction_id = t.id
      LEFT JOIN users u ON st.friend_user_id = u.id
      WHERE t.user_id = ? AND ((st.status = 'pending') OR (st.status = 'paid' AND st.approved = 0))
    `, [userId]);

    res.json({ owed, owing });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// Pay a shared transaction
router.put('/:id/pay', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const sharedId = req.params.id;
    const { account_id } = req.body; // account to deduct from

    if (!account_id) return res.status(400).json({error: 'account_id required'});

    // Get shared transaction
    const [shared] = await pool.query('SELECT * FROM shared_transactions WHERE id = ? AND friend_user_id = ? AND status = ?', [sharedId, userId, 'pending']);
    if (shared.length === 0) return res.status(404).json({error: 'Shared transaction not found'});

    const sharedTx = shared[0];

    // Get original transaction
    const [origTx] = await pool.query('SELECT * FROM transactions WHERE id = ?', [sharedTx.transaction_id]);
    if (origTx.length === 0) return res.status(404).json({error: 'Original transaction not found'});

    const orig = origTx[0];

    // Create expense transaction for the friend
    const expenseDescription = `Pago compartido: ${orig.description}`;
    const [result] = await pool.query(`
      INSERT INTO transactions (user_id, account_id, type, amount, currency_code, currency, date, description, category_id, category, reference_id)
      VALUES (?, ?, 'expense', ?, ?, ?, NOW(), ?, ?, ?, ?)
    `, [userId, account_id, sharedTx.amount_owed, orig.currency_code, orig.currency, expenseDescription, orig.category_id, orig.category, sharedTx.id]);

    const paidTxId = result.insertId;

    // Update account balance for friend (subtract)
    await pool.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [sharedTx.amount_owed, account_id]);

    // Update shared transaction (mark as paid but not approved yet)
    await pool.query('UPDATE shared_transactions SET status = ?, paid_at = NOW(), paid_transaction_id = ?, approved = 0 WHERE id = ?', ['paid', paidTxId, sharedId]);

    res.json({message: 'Payment processed'});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// Approve a shared transaction payment
router.put('/:id/approve', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const sharedId = req.params.id;

    // Get shared transaction
    const [shared] = await pool.query('SELECT * FROM shared_transactions WHERE id = ? AND transaction_id IN (SELECT id FROM transactions WHERE user_id = ?) AND approved = 0', [sharedId, userId]);
    if (shared.length === 0) return res.status(404).json({error: 'Shared transaction not found or already approved'});

    const sharedTx = shared[0];

    // Get original transaction
    const [origTx] = await pool.query('SELECT * FROM transactions WHERE id = ?', [sharedTx.transaction_id]);
    if (origTx.length === 0) return res.status(404).json({error: 'Original transaction not found'});

    const orig = origTx[0];

    // Create income transaction for the original user
    const incomeDescription = `Pago aprobado: ${orig.description}`;
    await pool.query(`
      INSERT INTO transactions (user_id, account_id, type, amount, currency_code, currency, date, description, category_id, category, reference_id)
      VALUES (?, ?, 'income', ?, ?, ?, NOW(), ?, ?, ?, ?)
    `, [orig.user_id, orig.account_id, sharedTx.amount_owed, orig.currency_code, orig.currency, incomeDescription, orig.category_id, orig.category, sharedTx.paid_transaction_id]);

    // Update account balance for creator (add)
    await pool.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [sharedTx.amount_owed, orig.account_id]);

    // Update shared transaction
    await pool.query('UPDATE shared_transactions SET approved = 1 WHERE id = ?', [sharedId]);

    res.json({message: 'Payment approved'});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

module.exports = router;