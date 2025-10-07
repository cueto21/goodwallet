const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(requireAuth);

// List accounts for authenticated user (adapt to new schema: userId, balance, currency, creditLimit, goals)
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(
      'SELECT id, user_id, name, type, balance, current_balance, currency, currency_code, credit_limit, goals, selected_card_style, card_style, created_at, updated_at FROM accounts WHERE user_id = ?', 
      [userId]
    );
    const mapped = rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      type: r.type || 'checking',
      balance: parseFloat(r.balance ?? r.current_balance ?? 0),
      currency: r.currency ?? r.currency_code ?? null,
      creditLimit: r.credit_limit != null ? String(r.credit_limit) : null,
      // parse JSON columns safely
      goals: (r.goals && typeof r.goals === 'string') ? JSON.parse(r.goals) : (r.goals || {}),
      selectedCardStyle: (r.selected_card_style && typeof r.selected_card_style === 'string') ? JSON.parse(r.selected_card_style) : (r.selected_card_style || {}),
      cardStyle: (r.card_style && typeof r.card_style === 'string') ? JSON.parse(r.card_style) : (r.card_style || {}),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    // Accept legacy and new body shapes
    const body = req.body || {};
    const name = body.name;
    const currency = body.currency ?? body.currency_code ?? 'USD';
    const balance = body.balance ?? body.current_balance ?? body.initial_balance ?? 0;
    const creditLimit = body.creditLimit ?? body.credit_limit ?? null;
    const goals = body.goals ? JSON.stringify(body.goals) : null;
    const selectedCardStyle = body.selectedCardStyle ? JSON.stringify(body.selectedCardStyle) : null;
    const cardStyle = body.cardStyle ? JSON.stringify(body.cardStyle) : null;

    const [result] = await pool.query(
      'INSERT INTO accounts (user_id, name, type, current_balance, balance, currency_code, currency, credit_limit, goals, selected_card_style, card_style, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
      [userId, name, body.type ?? 'checking', balance, balance, currency, currency, creditLimit, goals, selectedCardStyle, cardStyle, 1]
    );
    const [rows] = await pool.query(
      'SELECT id, user_id, name, balance, current_balance, currency, currency_code, credit_limit, goals, selected_card_style, card_style, created_at, updated_at FROM accounts WHERE id = ?', 
      [result.insertId]
    );
    const r = rows[0];
    res.status(201).json({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      balance: parseFloat(r.balance ?? r.current_balance ?? 0),
      currency: r.currency ?? r.currency_code ?? null,
      creditLimit: r.credit_limit ?? null,
      goals: r.goals ?? null,
      selectedCardStyle: r.selected_card_style ?? null,
      cardStyle: r.card_style ?? null,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = req.params.id;
    const updates = req.body || {};

    // Verificar que la cuenta pertenece al usuario
    const [existing] = await pool.query(
      'SELECT id FROM accounts WHERE id = ? AND user_id = ?', 
      [accountId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({error: 'Account not found'});
    }

    // Construir la consulta de actualización dinámicamente
    const allowedFields = ['name', 'balance', 'currency', 'creditLimit', 'goals', 'notes', 'isActive'];
    const setClause = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields.includes(key)) continue;
      // map to snake_case DB columns
      if (key === 'balance') {
        setClause.push('current_balance = ?', 'balance = ?');
        values.push(value, value);
      } else if (key === 'currency') {
        setClause.push('currency_code = ?', 'currency = ?');
        values.push(value, value);
      } else if (key === 'creditLimit') {
        setClause.push('credit_limit = ?');
        values.push(value);
      } else if (key === 'goals') {
        setClause.push('goals = ?');
        values.push(typeof value === 'string' ? value : JSON.stringify(value));
      } else if (key === 'isActive') {
        setClause.push('is_active = ?');
        values.push(value);
      } else if (key === 'notes') {
        setClause.push('description = ?');
        values.push(value);
      } else {
        setClause.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (setClause.length === 0) {
      return res.status(400).json({error: 'No valid fields to update'});
    }

    values.push(accountId, userId);

    await pool.query(
      `UPDATE accounts SET ${setClause.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );

    const [rows] = await pool.query(
      'SELECT id, user_id, name, balance, current_balance, currency, currency_code, credit_limit, goals, selected_card_style, card_style, created_at, updated_at FROM accounts WHERE id = ? AND user_id = ?', 
      [accountId, userId]
    );
    const r = rows[0];
    res.json({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      balance: parseFloat(r.balance ?? r.current_balance ?? 0),
      currency: r.currency ?? r.currency_code ?? null,
      creditLimit: r.credit_limit ?? null,
      goals: r.goals ?? null,
      selectedCardStyle: r.selected_card_style ?? null,
      cardStyle: r.card_style ?? null,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = req.params.id;

    // Verificar que la cuenta pertenece al usuario
    const [existing2] = await pool.query(
      'SELECT id FROM accounts WHERE id = ? AND user_id = ?', 
      [accountId, userId]
    );

    if (existing2.length === 0) {
      return res.status(404).json({error: 'Account not found'});
    }

    await pool.query('DELETE FROM accounts WHERE id = ? AND user_id = ?', [accountId, userId]);
    res.json({message: 'Account deleted successfully'});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

module.exports = router;
