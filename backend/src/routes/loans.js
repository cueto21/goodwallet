const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Helper function to format date for MySQL DATETIME
const toSqlDatetime = (val) => {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
};

// Aplicar middleware de autenticación a todas las rutas
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    // Sync loan.status with next installment due date on each load:
    // - Mark loans as 'overdue' when next pending/partial installment date < today
    // - Revert loans marked 'overdue' to 'pending' when next due >= today
    // - Also handle loans without installments using loan.due_date
    try {
      // Loans with installments: set overdue
      await pool.query(`
        UPDATE loans l
        JOIN (
          SELECT loan_id, MIN(DATE(due_date)) AS next_due
          FROM loan_installments
          WHERE status IN ('pending','partial') AND due_date IS NOT NULL
          GROUP BY loan_id
        ) li ON li.loan_id = l.id
        SET l.status = 'overdue'
        WHERE l.status != 'paid' AND li.next_due < CURDATE()
      `);

      // Loans with installments: revert overdue -> pending when next due >= today
      await pool.query(`
        UPDATE loans l
        JOIN (
          SELECT loan_id, MIN(DATE(due_date)) AS next_due
          FROM loan_installments
          WHERE status IN ('pending','partial') AND due_date IS NOT NULL
          GROUP BY loan_id
        ) li ON li.loan_id = l.id
        SET l.status = 'pending'
        WHERE l.status = 'overdue' AND li.next_due >= CURDATE()
      `);

      // Loans without installments: set overdue when due_date < today
      await pool.query(`
        UPDATE loans l
        LEFT JOIN (
          SELECT loan_id FROM loan_installments WHERE status IN ('pending','partial') GROUP BY loan_id
        ) li ON li.loan_id = l.id
        SET l.status = 'overdue'
        WHERE li.loan_id IS NULL AND l.status != 'paid' AND DATE(l.due_date) < CURDATE()
      `);

      // Loans without installments: revert overdue -> pending when due_date >= today
      await pool.query(`
        UPDATE loans l
        LEFT JOIN (
          SELECT loan_id FROM loan_installments WHERE status IN ('pending','partial') GROUP BY loan_id
        ) li ON li.loan_id = l.id
        SET l.status = 'pending'
        WHERE li.loan_id IS NULL AND l.status = 'overdue' AND DATE(l.due_date) >= CURDATE()
      `);
    } catch (syncErr) {
      // Don't fail the whole request if status sync has an error; log and continue
      console.error('Loan status sync error:', syncErr && syncErr.message ? syncErr.message : syncErr);
    }

    const userId = req.user.id;
    const [rows] = await pool.query(
      'SELECT * FROM loans WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    // Attach installments from loan_installments table and normalize fields
    const loans = [];
    for (const loanRow of rows) {
      const [instRows] = await pool.query('SELECT * FROM loan_installments WHERE loan_id = ? ORDER BY installment_number', [loanRow.id]);
      const installments = instRows.map(i => ({
        id: i.id,
        installmentNumber: i.installment_number,
        amount: parseFloat(i.amount),
        dueDate: i.due_date,
        status: (i.partial_amount_paid && parseFloat(i.partial_amount_paid) > 0 && parseFloat(i.partial_amount_paid) < parseFloat(i.amount)) ? 'partial' : i.status,
        paidDate: i.paid_date || null,
        partialAmountPaid: i.partial_amount_paid ? parseFloat(i.partial_amount_paid) : 0
      }));

      loans.push({
        id: loanRow.id,
        userId: loanRow.user_id,
        accountId: loanRow.account_id,
        name: loanRow.name,
  type: loanRow.type,
        principal: loanRow.principal ? parseFloat(loanRow.principal) : 0,
        amount: loanRow.amount ? parseFloat(loanRow.amount) : 0,
        outstandingBalance: loanRow.outstanding_balance ? parseFloat(loanRow.outstanding_balance) : 0,
        remainingBalance: loanRow.remaining_balance ? parseFloat(loanRow.remaining_balance) : 0,
        monthlyPayment: loanRow.monthly_payment ? parseFloat(loanRow.monthly_payment) : 0,
        interestRate: loanRow.interest_rate,
        termMonths: loanRow.term_months,
        // Provide fields expected by frontend
        date: loanRow.start_date,
        dueDate: loanRow.due_date,
        currencyCode: loanRow.currency_code,
        status: loanRow.status,
        notes: loanRow.notes,
        metadata: loanRow.metadata,
        createdAt: loanRow.created_at,
        updatedAt: loanRow.updated_at,
        installments: {
          enabled: Array.isArray(installments) && installments.length > 0,
          installmentsList: installments
        }
      });
    }
    res.json(loans);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, description, date, dueDate, type, personName, installments, installmentsData } = req.body;
    const formattedDate = toSqlDatetime(date);
    const formattedDueDate = toSqlDatetime(dueDate);
    const [result] = await pool.query(
      'INSERT INTO loans (user_id, amount, notes, start_date, due_date, type, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))',
      [userId, amount || 0, description || null, formattedDate, formattedDueDate, type || null, personName || null]
    );
    const loanId = result.insertId;

    // Insert installments if provided (either from installments or installmentsData)
    const installmentsToInsert = installmentsData || installments;
    if (Array.isArray(installmentsToInsert) && installmentsToInsert.length > 0) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        for (const it of installmentsToInsert) {
          const formattedDueDate = toSqlDatetime(it.dueDate);
          const formattedPaidDate = toSqlDatetime(it.paidDate);
          await conn.query(
            'INSERT INTO loan_installments (loan_id, installment_number, amount, due_date, status, paid_date, partial_amount_paid, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))',
            [loanId, it.installmentNumber, it.amount, formattedDueDate, it.status || 'pending', formattedPaidDate, it.partialAmountPaid || 0]
          );
        }
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
    }
    const [rows] = await pool.query('SELECT * FROM loans WHERE id = ?', [loanId]);
    const lr = rows[0];
    res.status(201).json({
      id: lr.id,
      userId: lr.user_id,
      accountId: lr.account_id,
      name: lr.name,
  type: lr.type,
      principal: lr.principal ? parseFloat(lr.principal) : 0,
      amount: lr.amount ? parseFloat(lr.amount) : 0,
      outstandingBalance: lr.outstanding_balance ? parseFloat(lr.outstanding_balance) : 0,
      remainingBalance: lr.remaining_balance ? parseFloat(lr.remaining_balance) : 0,
      monthlyPayment: lr.monthly_payment ? parseFloat(lr.monthly_payment) : 0,
      interestRate: lr.interest_rate,
      termMonths: lr.term_months,
      startDate: lr.start_date,
      currencyCode: lr.currency_code,
      status: lr.status,
      notes: lr.notes,
      metadata: lr.metadata,
      createdAt: lr.created_at,
      updatedAt: lr.updated_at
    });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const loanId = req.params.id;
    const updates = req.body;
    
    // Verificar que el préstamo pertenece al usuario
    const [existing] = await pool.query(
      'SELECT id FROM loans WHERE id = ? AND user_id = ?', 
      [loanId, userId]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({error: 'Loan not found'});
    }
    
  // Construir la consulta de actualización dinámicamente (camelCase schema)
  const allowedFields = ['amount', 'status', 'notes', 'due_date', 'installmentsEnabled', 'installmentsTotal', 'paymentFrequency', 'personName', 'name'];
    const setClause = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      // map common camelCase -> snake_case where appropriate
      let column = key;
      if (key === 'description') column = 'notes';
      if (key === 'dueDate') column = 'due_date';
      if (key === 'personName' || key === 'name') column = 'name';
      if (allowedFields.includes(key) || allowedFields.includes(column)) {
        // Format date fields
        let formattedValue = value;
        if ((column === 'due_date' || column === 'start_date') && value) {
          formattedValue = toSqlDatetime(value);
        }
        setClause.push(`${column} = ?`);
        values.push(formattedValue);
      }
    }
    
    if (setClause.length === 0) {
      return res.status(400).json({error: 'No valid fields to update'});
    }
    
    values.push(loanId, userId);
    
    await pool.query(
      `UPDATE loans SET ${setClause.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );
    
    const [rows] = await pool.query(
      'SELECT * FROM loans WHERE id = ? AND user_id = ?', 
      [loanId, userId]
    );
    const lr = rows[0];
    res.json({
      id: lr.id,
      userId: lr.user_id,
      accountId: lr.account_id,
      name: lr.name,
  type: lr.type,
      principal: lr.principal ? parseFloat(lr.principal) : 0,
      amount: lr.amount ? parseFloat(lr.amount) : 0,
      outstandingBalance: lr.outstanding_balance ? parseFloat(lr.outstanding_balance) : 0,
      remainingBalance: lr.remaining_balance ? parseFloat(lr.remaining_balance) : 0,
      monthlyPayment: lr.monthly_payment ? parseFloat(lr.monthly_payment) : 0,
      interestRate: lr.interest_rate,
      termMonths: lr.term_months,
      startDate: lr.start_date,
      currencyCode: lr.currency_code,
      status: lr.status,
      notes: lr.notes,
      metadata: lr.metadata,
      createdAt: lr.created_at,
      updatedAt: lr.updated_at
    });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const loanId = req.params.id;
    
    // Verificar que el préstamo pertenece al usuario
    const [existing] = await pool.query(
      'SELECT id FROM loans WHERE id = ? AND user_id = ?', 
      [loanId, userId]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({error: 'Loan not found'});
    }
    
  await pool.query('DELETE FROM loans WHERE id = ? AND user_id = ?', [loanId, userId]);
    res.json({message: 'Loan deleted successfully'});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// List installments for a loan
router.get('/:loanId/installments', async (req, res) => {
  try {
    const loanId = req.params.loanId;
    const [rows] = await pool.query('SELECT * FROM loan_installments WHERE loan_id = ? ORDER BY installment_number', [loanId]);
    const normalized = rows.map(i => ({
      id: i.id,
      installmentNumber: i.installment_number,
      amount: parseFloat(i.amount),
      dueDate: i.due_date,
      status: (i.partial_amount_paid && parseFloat(i.partial_amount_paid) > 0 && parseFloat(i.partial_amount_paid) < parseFloat(i.amount)) ? 'partial' : i.status,
      paidDate: i.paid_date || null,
      partialAmountPaid: i.partial_amount_paid ? parseFloat(i.partial_amount_paid) : 0
    }));
    res.json(normalized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create installment(s) for a loan (array)
router.post('/:loanId/installments', async (req, res) => {
  try {
    const loanId = req.params.loanId;
    const installments = req.body.installments; // expecting array of {installmentNumber,dueDate,amount,status,partialAmountPaid}
    if (!Array.isArray(installments)) return res.status(400).json({ error: 'installments must be an array' });
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const it of installments) {
        const formattedDueDate = toSqlDatetime(it.dueDate);
        const formattedPaidDate = toSqlDatetime(it.paidDate);
        await conn.query('INSERT INTO loan_installments (loan_id, installment_number, amount, due_date, status, paid_date, partial_amount_paid, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())', [loanId, it.installmentNumber, it.amount, formattedDueDate, it.status || 'pending', formattedPaidDate, it.partialAmountPaid || 0]);
      }
      await conn.commit();
      const [rows] = await pool.query('SELECT * FROM loan_installments WHERE loan_id = ? ORDER BY installment_number', [loanId]);
      const normalized = rows.map(i => ({
        id: i.id,
        installmentNumber: i.installment_number,
        amount: parseFloat(i.amount),
        dueDate: i.due_date,
        status: (i.partial_amount_paid && parseFloat(i.partial_amount_paid) > 0 && parseFloat(i.partial_amount_paid) < parseFloat(i.amount)) ? 'partial' : i.status,
        paidDate: i.paid_date || null,
        partialAmountPaid: i.partial_amount_paid ? parseFloat(i.partial_amount_paid) : 0
      }));
      res.status(201).json(normalized);
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List payments for a loan
router.get('/:loanId/payments', async (req, res) => {
  try {
    const loanId = req.params.loanId;
    const [rows] = await pool.query('SELECT * FROM loan_payments WHERE loan_id = ? ORDER BY paid_date DESC', [loanId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register a payment for a loan and optionally link to an installment
router.post('/:loanId/payments', async (req, res) => {
  try {
    const loanId = req.params.loanId;
    const userId = req.user.id;

    // Check if loan exists and belongs to user
    const loanIdInt = parseInt(loanId) || loanId;
    const [loanCheck] = await pool.query('SELECT id FROM loans WHERE id = ? AND user_id = ?', [loanIdInt, userId]);
    if (!loanCheck || loanCheck.length === 0) {
      return res.status(404).json({ error: 'Loan not found or not owned by user' });
    }

    // Accept either account_id or accountId from client when asking to create a transaction
    const { transaction_id, account_id, accountId, paid_amount, principal_component, interest_component, installment_number } = req.body;
    const installmentNumberInt = installment_number ? (parseInt(installment_number) || installment_number) : null;
    const accountIdUsed = account_id ?? accountId ?? null;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      let txIdToUse = transaction_id || null;

      // If client provided an accountId and didn't send an existing transaction_id, check if account exists and create a transaction and update the account balance
      if (!txIdToUse && accountIdUsed && paid_amount) {
        // Check if account exists and belongs to user
        const [accountRows] = await conn.query('SELECT id FROM accounts WHERE id = ? AND user_id = ?', [accountIdUsed, userId]);
        if (accountRows.length > 0) {
          // load loan to determine type (income vs expense) and verify ownership
          const [loanRows] = await conn.query('SELECT * FROM loans WHERE id = ? AND user_id = ?', [loanId, userId]);
          if (!loanRows || loanRows.length === 0) {
            throw new Error('Loan not found or not owned by user');
          }
          const loanRow = loanRows[0];
          const txType = loanRow.type === 'lent' ? 'income' : 'expense';

    // Build description: 'Cobro de préstamo - {PersonName} - Cuota {n}' (omit cuota part when not provided)
    const personNameForDesc = loanRow.name || loanRow.person || loanRow.person_name || '';
    let txDescription = `Cobro de préstamo - ${personNameForDesc}`;
    if (installment_number) txDescription += ` - Cuota ${installment_number}`;
          // Accept optional date for transaction (string/ISO) from client; otherwise use server NOW(3)
          const txDateRaw = req.body.date ?? null;
          const pad = (n, size = 2) => String(n).padStart(size, '0');
          const toSqlDatetimeUTC = (val) => {
            if (!val) return null;
            const d = new Date(val);
            if (isNaN(d.getTime())) return null;
            const year = d.getUTCFullYear();
            const month = pad(d.getUTCMonth() + 1);
            const day = pad(d.getUTCDate());
            const hours = pad(d.getUTCHours());
            const minutes = pad(d.getUTCMinutes());
            const seconds = pad(d.getUTCSeconds());
            const ms = String(d.getUTCMilliseconds()).padStart(3, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
          };
          const txDate = txDateRaw ? toSqlDatetimeUTC(txDateRaw) : null;
          if (txDate) {
            const [txRes] = await conn.query(`INSERT INTO transactions (user_id, account_id, type, amount, description, date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`, [userId, accountIdUsed, txType, paid_amount, txDescription, txDate]);
            txIdToUse = txRes.insertId;
          } else {
            const [txRes] = await conn.query(`INSERT INTO transactions (user_id, account_id, type, amount, description, date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(3), NOW(3), NOW(3))`, [userId, accountIdUsed, txType, paid_amount, txDescription]);
            txIdToUse = txRes.insertId;
          }

          // Update account balances (current_balance and balance) by applying the delta in the same transaction
          // Use COALESCE to pick whichever column already holds the real balance (current_balance or balance)
          // so we don't accidentally overwrite a non-null value with 0 + delta when the other column is NULL.
          const delta = txType === 'income' ? Number(paid_amount) : -Number(paid_amount);
          await conn.query(
            'UPDATE accounts SET current_balance = COALESCE(current_balance, balance, 0) + ?, balance = COALESCE(current_balance, balance, 0) + ? WHERE id = ?',
            [delta, delta, accountIdUsed]
          );
        } else {
          console.error('Account not found or not owned by user for payment:', accountIdUsed);
          // Skip transaction creation, but continue with installment update
        }
      }

      const [result] = await conn.query('INSERT INTO loan_payments (loan_id, transaction_id, paid_amount, principal_component, interest_component) VALUES (?, ?, ?, ?, ?)', [loanIdInt, txIdToUse || null, paid_amount, principal_component || 0, interest_component || 0]);
      if (installmentNumberInt) {
        // Update loan_installments using camelCase columns
        // If paid amount equals or exceeds installment amount -> mark paid
        const [instRows] = await conn.query('SELECT * FROM loan_installments WHERE loan_id = ? AND installment_number = ?', [loanIdInt, installmentNumberInt]);
        if (!instRows || instRows.length === 0) {
          throw new Error('Installment not found');
        }
        const inst = instRows[0];
        const existingPartial = inst.partial_amount_paid ? parseFloat(inst.partial_amount_paid) : 0;
        const totalPaid = existingPartial + (paid_amount ? parseFloat(paid_amount) : 0);
        if (totalPaid >= parseFloat(inst.amount)) {
          await conn.query('UPDATE loan_installments SET partial_amount_paid = ?, paid_date = NOW(3), status = ? WHERE loan_id = ? AND installment_number = ?', [inst.amount, 'paid', loanIdInt, installmentNumberInt]);
        } else {
          await conn.query('UPDATE loan_installments SET partial_amount_paid = ?, status = ? WHERE loan_id = ? AND installment_number = ?', [totalPaid, 'partial', loanIdInt, installmentNumberInt]);
        }
      } else {
        // Apply payment to installments in order (for partial payments without specific installment)
        const [instRows] = await conn.query('SELECT * FROM loan_installments WHERE loan_id = ? ORDER BY installment_number', [loanIdInt]);
        let remainingAmount = paid_amount ? parseFloat(paid_amount) : 0;
        for (const installment of instRows) {
          if (installment.status === 'paid') continue;
          const alreadyPaid = installment.partial_amount_paid ? parseFloat(installment.partial_amount_paid) : 0;
          const toPay = parseFloat(installment.amount) - alreadyPaid;
          if (remainingAmount >= toPay) {
            // Pay full installment
            await conn.query('UPDATE loan_installments SET partial_amount_paid = ?, paid_date = NOW(3), status = ? WHERE loan_id = ? AND installment_number = ?', [installment.amount, 'paid', loanIdInt, installment.installment_number]);
            remainingAmount -= toPay;
          } else if (remainingAmount > 0) {
            // Partial payment
            const newPartial = alreadyPaid + remainingAmount;
            await conn.query('UPDATE loan_installments SET partial_amount_paid = ?, status = ? WHERE loan_id = ? AND installment_number = ?', [newPartial, 'partial', loanIdInt, installment.installment_number]);
            remainingAmount = 0;
            break;
          }
        }
      }
      await conn.commit();
      const [rows] = await pool.query('SELECT * FROM loan_payments WHERE loan_id = ? ORDER BY paid_date DESC LIMIT 1', [loanIdInt]);
      res.status(201).json(rows[0]);
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
