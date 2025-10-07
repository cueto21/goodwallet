const express = require('express');
const pool = require('../db');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// Helper: convert ISO or date-like values to MySQL DATETIME(3) string in UTC
function toSqlDatetimeUTC(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  const pad = (n, size = 2) => String(n).padStart(size, '0');
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());
  const ms = String(d.getUTCMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
}

// List recent transactions (for authenticated user if auth middleware applied elsewhere)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM transactions ORDER BY date DESC LIMIT 200');
    const mapped = rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      accountId: r.account_id,
      type: r.type,
      amount: parseFloat(r.amount),
      currency: r.currency ?? r.currency_code ?? null,
      description: r.description,
      categoryId: r.category_id,
      relatedAccountId: r.related_account_id,
      TransferenciaGroupId: r.Transferencia_group_id,
      referenceId: r.reference_id,
      metadata: r.metadata,
      date: r.date,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const userId = req.user.id;
    const accountId = body.accountId ?? body.account_id;
    const type = body.type ?? 'expense';
    const amount = body.amount ?? 0;
    const currency = body.currency ?? body.currency_code ?? null;
  const description = body.description ?? null;
  // accept date/time if client provided it (ISO string or datetime)
  const rawDateVal = body.date ?? null;
  const dateVal = rawDateVal ? toSqlDatetimeUTC(rawDateVal) : null;
    // Normalize category: accept either a numeric category_id or a category name string
    const rawCategory = body.categoryId ?? body.category_id ?? body.category ?? null;
    let categoryId = null;
    let categoryName = null;
    if (rawCategory !== null && rawCategory !== undefined) {
      // treat purely-numeric strings or numbers as IDs, otherwise treat as category name
      if (typeof rawCategory === 'number' || (/^\d+$/.test(String(rawCategory)).valueOf())) {
        categoryId = Number(rawCategory);
      } else {
        categoryName = String(rawCategory);
      }
    }
    const relatedAccountId = body.relatedAccountId ?? body.related_account_id ?? null;
    const TransferenciaGroupId = body.TransferenciaGroupId ?? body.Transferencia_group_id ?? null;
    const referenceId = body.referenceId ?? body.reference_id ?? null;
    // Build dynamic insert to include date when provided
  const cols = ['user_id','account_id','type','amount','currency_code','currency','description','category_id','category','related_account_id','Transferencia_group_id','reference_id','metadata'];
  const vals = [userId, accountId, type, amount, body.currency_code ?? currency, body.currency ?? currency, description, categoryId, categoryName, relatedAccountId, TransferenciaGroupId, referenceId, JSON.stringify(body.metadata ?? {})];
    if (dateVal) {
      cols.splice(2, 0, 'date'); // insert date as third column position for readability
      vals.splice(2, 0, dateVal);
    }
    const placeholders = cols.map(() => '?').join(', ');
    const sql = `INSERT INTO transactions (${cols.join(', ')}) VALUES (${placeholders})`;
    const [result] = await pool.query(sql, vals);
    const [rows] = await pool.query('SELECT * FROM transactions WHERE id = ?', [result.insertId]);
    const r = rows[0];

    // Handle shared transactions
    const sharedWith = body.shared_with;
    if (sharedWith && Array.isArray(sharedWith)) {
      for (const share of sharedWith) {
        const { friend_id, split_type, split_value } = share;
        let amountOwed = 0;
        if (split_type === 'percentage') {
          amountOwed = (amount * split_value) / 100;
        } else if (split_type === 'fixed') {
          amountOwed = split_value;
        }
        await pool.query('INSERT INTO shared_transactions (transaction_id, friend_user_id, amount_owed, split_type, split_value) VALUES (?, ?, ?, ?, ?)', [r.id, friend_id, amountOwed, split_type, split_value]);
      }
    }

    res.status(201).json({
      id: r.id,
      userId: r.user_id,
      accountId: r.account_id,
      type: r.type,
      amount: parseFloat(r.amount),
      currency: r.currency ?? r.currency_code ?? null,
      description: r.description,
      categoryId: r.category_id,
      relatedAccountId: r.related_account_id,
      TransferenciaGroupId: r.Transferencia_group_id,
      referenceId: r.reference_id,
      metadata: r.metadata,
      date: r.date,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

router.post('/Transferencia', requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const userId = req.user.id;
    const fromAccountId = body.fromAccountId ?? body.from_account_id;
    const toAccountId = body.toAccountId ?? body.to_account_id;
    const amount = body.amount ?? 0;
    const currency = body.currency ?? body.currency_code ?? null;
    const description = body.description ?? 'Transferencia';

    if (fromAccountId === toAccountId) return res.status(400).json({error: 'from and to accounts must differ'});
    const tg = require('crypto').randomUUID();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('INSERT INTO transactions (user_id, account_id, type, amount, currency_code, currency, description, Transferencia_group_id, related_account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [userId, fromAccountId, 'expense', amount, body.currency_code ?? currency, body.currency ?? currency, description || 'Transferencia', tg, toAccountId]);
      await conn.query('INSERT INTO transactions (user_id, account_id, type, amount, currency_code, currency, description, Transferencia_group_id, related_account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [userId, toAccountId, 'income', amount, body.currency_code ?? currency, body.currency ?? currency, description || 'Transferencia', tg, fromAccountId]);
      await conn.commit();
      res.status(201).json({TransferenciaGroupId: tg});
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const transactionId = req.params.id;

    // Get the transaction to understand its effect
    const [transactionRows] = await pool.query(
      'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
      [transactionId, userId]
    );

    if (transactionRows.length === 0) {
      return res.status(404).json({error: 'Transaction not found'});
    }

    const transaction = transactionRows[0];
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // Handle different transaction types
      if (transaction.type === 'income') {
        // For income: subtract from account balance
        await conn.query(
          'UPDATE accounts SET balance = balance - ?, current_balance = current_balance - ? WHERE id = ? AND user_id = ?',
          [transaction.amount, transaction.amount, transaction.account_id, userId]
        );
      } else if (transaction.type === 'expense') {
        // For expense: add back to account balance
        await conn.query(
          'UPDATE accounts SET balance = balance + ?, current_balance = current_balance + ? WHERE id = ? AND user_id = ?',
          [transaction.amount, transaction.amount, transaction.account_id, userId]
        );
      } else if (transaction.type === 'Transferencia') {
        // For transfers: reverse both sides
        // The current transaction is the "to" side (income), so we need to find the "from" side
        const [transferRows] = await conn.query(
          'SELECT * FROM transactions WHERE Transferencia_group_id = ? AND id != ?',
          [transaction.Transferencia_group_id, transactionId]
        );

        if (transferRows.length > 0) {
          const fromTransaction = transferRows[0];

          // Reverse the "from" account (add back the amount)
          await conn.query(
            'UPDATE accounts SET balance = balance + ?, current_balance = current_balance + ? WHERE id = ? AND user_id = ?',
            [fromTransaction.amount, fromTransaction.amount, fromTransaction.account_id, userId]
          );

          // Reverse the "to" account (subtract the amount)
          await conn.query(
            'UPDATE accounts SET balance = balance - ?, current_balance = current_balance - ? WHERE id = ? AND user_id = ?',
            [transaction.amount, transaction.amount, transaction.account_id, userId]
          );

          // Delete both sides of the transfer
          await conn.query('DELETE FROM transactions WHERE Transferencia_group_id = ?', [transaction.Transferencia_group_id]);
        }
      }

      // Delete shared transactions if any
      if (transaction.type !== 'Transferencia') {
        await conn.query('DELETE FROM shared_transactions WHERE transaction_id = ?', [transactionId]);
      }

      // Delete the transaction (if not already deleted for transfers)
      if (transaction.type !== 'Transferencia') {
        await conn.query('DELETE FROM transactions WHERE id = ? AND user_id = ?', [transactionId, userId]);
      }

      await conn.commit();
      res.json({message: 'Transaction deleted successfully'});

    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

module.exports = router;
