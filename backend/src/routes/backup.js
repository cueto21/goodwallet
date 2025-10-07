const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// Exportar todos los datos del usuario
router.get('/export', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obtener todas las cuentas del usuario
    const [accounts] = await req.db.execute(
      'SELECT * FROM accounts WHERE user_id = ?',
      [userId]
    );
    
    // Obtener todas las transacciones del usuario
    const [transactions] = await req.db.execute(
      'SELECT * FROM transactions WHERE user_id = ?',
      [userId]
    );
    
    // Obtener todos los préstamos del usuario
    const [loans] = await req.db.execute(
      'SELECT * FROM loans WHERE user_id = ?',
      [userId]
    );
    // También obtener cuotas y pagos asociados a esos préstamos
    let installmentsRows = [];
    let paymentsRows = [];
    if (Array.isArray(loans) && loans.length > 0) {
      const loanIds = loans.map(l => l.id);
      const [insts] = await req.db.execute('SELECT * FROM loan_installments WHERE loan_id IN (?)', [loanIds]);
      installmentsRows = insts;
      const [pays] = await req.db.execute('SELECT * FROM loan_payments WHERE loan_id IN (?)', [loanIds]);
      paymentsRows = pays;
    }
    
    // Obtener transacciones recurrentes del usuario
    const [recurringTransactions] = await req.db.execute(
      'SELECT * FROM recurring_transactions WHERE user_id = ?',
      [userId]
    );
    
    // Obtener categorías del usuario
    const [categories] = await req.db.execute(
      'SELECT * FROM categories WHERE user_id = ?',
      [userId]
    );
    
    // Build a quick map of categories by id -> name to include friendly names in transactions
    const categoryNameById = {};
    for (const c of categories) {
      categoryNameById[c.id] = c.name;
    }

    // Crear estructura de exportación
    const exportData = {
      exportInfo: {
        version: '2.0.0',
        exportDate: new Date().toISOString(),
        appName: 'WebApp-Finanzas',
        userId: userId,
        userEmail: req.user.email
      },
      accounts: accounts.map(account => ({
        id: account.id,
        name: account.name || 'Sin nombre',
        type: account.type,
        balance: parseFloat(account.balance ?? account.current_balance ?? 0),
        currency: account.currency ?? account.currency_code ?? null,
        creditLimit: account.credit_limit ?? account.creditLimit ?? null,
        selectedCardStyle: account.selected_card_style ?? account.selectedCardStyle ?? null,
        goals: account.goals ?? account.metadata ?? null,
        cardStyle: account.card_style ?? account.cardStyle ?? null,
        createdAt: account.created_at ?? account.createdAt,
        updatedAt: account.updated_at ?? account.updatedAt
      })),
  transactions: transactions.map(transaction => ({
        id: transaction.id,
        accountId: transaction.account_id ?? transaction.accountId,
        type: transaction.type,
        amount: parseFloat(transaction.amount),
        currency: transaction.currency ?? transaction.currency_code ?? null,
        description: transaction.description ?? transaction.desc ?? null,
  categoryId: transaction.category_id ?? transaction.categoryId ?? transaction.category ?? null,
  categoryName: (transaction.category_id && categoryNameById[transaction.category_id]) ? categoryNameById[transaction.category_id] : (transaction.category ?? null),
        relatedAccountId: transaction.related_account_id ?? transaction.relatedAccountId ?? null,
        TransferenciaGroupId: transaction.Transferencia_group_id ?? transaction.TransferenciaGroupId ?? null,
        date: transaction.date,
        createdAt: transaction.created_at ?? transaction.createdAt,
        updatedAt: transaction.updated_at ?? transaction.updatedAt
      })),
      loans: loans.map(loan => {
        const instsForLoan = (installmentsRows || []).filter(i => i.loan_id === loan.id).map(i => ({
          id: i.id,
          installmentNumber: i.installment_number,
          amount: parseFloat(i.amount),
          dueDate: i.due_date,
          status: i.status,
          paidDate: i.paid_date,
          partialAmountPaid: parseFloat(i.partial_amount_paid || 0),
          principalComponent: parseFloat(i.principal_component || 0),
          interestComponent: parseFloat(i.interest_component || 0),
          paymentTransactionId: i.payment_transaction_id || null,
          createdAt: i.created_at,
          updatedAt: i.updated_at
        }));

        const paysForLoan = (paymentsRows || []).filter(p => p.loan_id === loan.id).map(p => ({
          id: p.id,
          transactionId: p.transaction_id,
          paidAmount: parseFloat(p.paid_amount || 0),
          principalComponent: parseFloat(p.principal_component || 0),
          interestComponent: parseFloat(p.interest_component || 0),
          paidDate: p.paid_date,
          createdAt: p.created_at
        }));

        return {
          id: loan.id,
          userId: loan.user_id ?? null,
          accountId: loan.account_id ?? null,
            name: loan.name ?? loan.description ?? null,
            type: loan.type ?? null,
          principal: parseFloat(loan.principal ?? 0),
          amount: parseFloat(loan.amount ?? loan.principal ?? 0),
          outstandingBalance: parseFloat(loan.outstanding_balance ?? loan.remaining_balance ?? 0),
          remainingBalance: parseFloat(loan.remaining_balance ?? loan.outstanding_balance ?? 0),
          monthlyPayment: parseFloat(loan.monthly_payment ?? 0),
          interestRate: loan.interest_rate != null ? String(loan.interest_rate) : null,
          termMonths: loan.term_months ?? null,
          date: loan.start_date ?? loan.date ?? null,
          currencyCode: loan.currency_code ?? null,
          status: loan.status ?? null,
          notes: loan.notes ?? null,
          metadata: loan.metadata ? JSON.parse(typeof loan.metadata === 'string' ? loan.metadata : JSON.stringify(loan.metadata)) : {},
          createdAt: loan.created_at ?? loan.createdAt,
          updatedAt: loan.updated_at ?? loan.updatedAt,
          installments: {
            enabled: instsForLoan.length > 0,
            installmentsList: instsForLoan
          },
          payments: paysForLoan
        };
      }),
  recurringTransactions: recurringTransactions.map(rt => ({
        id: rt.id,
        accountId: rt.account_id ?? rt.accountId,
        type: rt.type,
        amount: parseFloat(rt.amount),
        description: rt.description ?? null,
  categoryId: rt.category_id ?? rt.categoryId ?? rt.category ?? null,
  categoryName: (rt.category_id && categoryNameById[rt.category_id]) ? categoryNameById[rt.category_id] : (rt.category ?? null),
        frequency: rt.frequency,
        nextDate: rt.next_date ?? rt.nextDate ?? null,
        isActive: rt.is_active ?? rt.isActive ?? rt.active ?? true,
        nextGenerated: rt.last_generated_date ?? rt.lastGeneratedDate ?? null,
        createdAt: rt.created_at ?? rt.createdAt,
        updatedAt: rt.updated_at ?? rt.updatedAt
      })),
      categories: categories.map(category => ({
        id: category.id,
        name: category.name || 'Sin nombre',
        type: category.type,
        color: category.color,
        createdAt: category.created_at ?? category.createdAt,
        updatedAt: category.updated_at ?? category.updatedAt
      })),
      metadata: {
        totalAccounts: accounts.length,
        totalTransactions: transactions.length,
        totalLoans: loans.length,
        totalRecurringTransactions: recurringTransactions.length,
        totalCategories: categories.length
      }
    };
    
  res.json(exportData);
    
  } catch (error) {
    console.error('Error en exportación:', error);
    res.status(500).json({ 
      error: 'Error al exportar los datos',
      details: error.message 
    });
  }
});

// Importar datos del usuario
router.post('/import', requireAuth, async (req, res) => {
  const connection = await req.db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const userId = req.user.id;
    const importData = req.body;
    
    // Validar estructura de datos
    if (!importData || !importData.exportInfo) {
      return res.status(400).json({ 
        error: 'Formato de datos inválido. Falta información de exportación.' 
      });
    }
    
    // Verificar que no sea el mismo usuario importando sus propios datos
    if (importData.exportInfo.userId === userId) {
      return res.status(400).json({ 
        error: 'No puedes importar tus propios datos. Use esta función para Transferenciair datos entre cuentas diferentes.' 
      });
    }
    
    // Crear respaldo de datos actuales antes de importar
    await createBackupBeforeImport(connection, userId);
    
    // Limpiar datos existentes del usuario
    await connection.execute('DELETE FROM transactions WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM loans WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM recurring_transactions WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM accounts WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM categories WHERE user_id = ?', [userId]);
    
    // Mapeo de IDs viejos a nuevos para mantener relaciones
    const accountIdMap = new Map();

    // Helper: obtener columnas existentes para una tabla
    async function getTableColumns(conn, tableName) {
      const [cols] = await conn.execute(
        'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
        [tableName]
      );
      return new Set(cols.map(c => c.COLUMN_NAME));
    }

    // Ensure a currency code exists in currencies table; insert a minimal record if missing
    async function ensureCurrencyExists(conn, code) {
      if (!code) return;
      try {
        const [rows] = await conn.execute('SELECT code FROM currencies WHERE code = ?', [code]);
        if (rows.length === 0) {
          await conn.execute('INSERT INTO currencies (code, name, symbol) VALUES (?, ?, ?)', [code, code, '']);
        }
      } catch (e) {
        // don't fail the whole import for a currency insert error; log and continue
        console.warn('No se pudo asegurar currency', code, e.message);
      }
    }

    const accountsCols = await getTableColumns(connection, 'accounts');
    const txCols = await getTableColumns(connection, 'transactions');
    const recurringCols = await getTableColumns(connection, 'recurring_transactions');
    const loansCols = await getTableColumns(connection, 'loans');
    const categoriesCols = await getTableColumns(connection, 'categories');

    // Importar categorías primero
    if (importData.categories && importData.categories.length > 0) {
      for (const category of importData.categories) {
        if (!category || !category.name) continue; // Skip if undefined or no name
        const cols = ['user_id', 'name', 'type'];
        const vals = [userId, category.name, category.type];
        if (categoriesCols.has('color')) { cols.push('color'); vals.push(category.color || '#007bff'); }
        const placeholders = cols.map(() => '?').join(', ');
        await connection.execute(
          `INSERT INTO categories (${cols.join(', ')}) VALUES (${placeholders})`,
          vals
        );
      }
    }

    // Importar cuentas (dinámico según columnas disponibles)
    if (importData.accounts && importData.accounts.length > 0) {
      for (const account of importData.accounts) {
        if (!account || !account.name) continue; // Skip if undefined or no name
        const cols = ['user_id', 'name', 'type'];
        const vals = [userId, account.name, account.type];

        if (accountsCols.has('current_balance')) {
          cols.push('current_balance');
          vals.push(account.current_balance ?? account.balance ?? 0);
        } else if (accountsCols.has('initial_balance')) {
          cols.push('initial_balance');
          vals.push(account.current_balance ?? account.balance ?? 0);
        }

        if (accountsCols.has('currency_code')) {
          const acctCurrency = account.currency_code ?? account.currency ?? 'USD';
          await ensureCurrencyExists(connection, acctCurrency);
          cols.push('currency_code');
          vals.push(acctCurrency);
        } else if (accountsCols.has('currency')) {
          const acctCurrency = account.currency_code ?? account.currency ?? 'USD';
          // legacy column - still ensure currency exists to satisfy FK if applicable
          await ensureCurrencyExists(connection, acctCurrency);
          cols.push('currency');
          vals.push(acctCurrency);
        }

  if (accountsCols.has('description')) { cols.push('description'); vals.push(account.description || ''); }
  if (accountsCols.has('credit_limit')) { cols.push('credit_limit'); vals.push(account.creditLimit ?? account.credit_limit ?? null); }
  // Persist dedicated goals column if present, otherwise fallback to metadata
  if (accountsCols.has('goals')) { cols.push('goals'); vals.push(JSON.stringify(account.goals ?? {})); }
  if (accountsCols.has('metadata')) { cols.push('metadata'); vals.push(JSON.stringify(account.metadata ?? (account.goals ? { goals: account.goals } : {}))); }
  // Persist card style JSON if DB has the columns
  if (accountsCols.has('selected_card_style')) { cols.push('selected_card_style'); vals.push(JSON.stringify(account.selectedCardStyle ?? account.selected_card_style ?? {})); }
  if (accountsCols.has('card_style')) { cols.push('card_style'); vals.push(JSON.stringify(account.cardStyle ?? account.card_style ?? {})); }

        const placeholders = cols.map(() => '?').join(', ');
        const [result] = await connection.execute(`INSERT INTO accounts (${cols.join(', ')}) VALUES (${placeholders})`, vals);
        accountIdMap.set(account.id, result.insertId);
      }
    }

    // Importar transacciones (dinámico) - aceptar camelCase y snake_case
    if (importData.transactions && importData.transactions.length > 0) {
      for (const transaction of importData.transactions) {
        const origAccountId = transaction.account_id ?? transaction.accountId ?? transaction.account;
        const newAccountId = accountIdMap.get(origAccountId);
        if (!newAccountId) continue;

        // Prefer categoryName from export, then fallback to category (string) or category_id.
        const preferredCatName = transaction.categoryName ?? transaction.category ?? null;
        if (preferredCatName) {
          const catName = String(preferredCatName).trim();
          // try to find category for this user with the same name
          const [categoryResult] = await connection.execute(
            'SELECT id FROM categories WHERE user_id = ? AND name = ? LIMIT 1',
            [userId, catName]
          );
          let categoryId = categoryResult.length > 0 ? categoryResult[0].id : null;
          if (!categoryId) {
            // Determine type from transaction.type if available
            const inferredType = (transaction.type === 'income') ? 'income' : 'expense';
            const [insertCategoryResult] = await connection.execute(
              'INSERT INTO categories (user_id, name, type, created_at, updated_at) VALUES (?, ?, ?, NOW(3), NOW(3))',
              [userId, catName, inferredType]
            );
            categoryId = insertCategoryResult.insertId;
          }
          transaction.category_id = categoryId;
        }

        const cols = ['user_id', 'account_id', 'type', 'amount'];
        const vals = [userId, newAccountId, transaction.type, transaction.amount];

        if (txCols.has('currency_code')) {
          const txCurrency = transaction.currency_code ?? transaction.currency ?? null;
          if (txCurrency) await ensureCurrencyExists(connection, txCurrency);
          cols.push('currency_code');
          vals.push(txCurrency);
        } else if (txCols.has('currency')) {
          const txCurrency = transaction.currency ?? transaction.currency_code ?? null;
          if (txCurrency) await ensureCurrencyExists(connection, txCurrency);
          cols.push('currency');
          vals.push(txCurrency);
        }
        if (txCols.has('description')) { cols.push('description'); vals.push(transaction.description ?? transaction.desc ?? ''); }

        // Resolve category value (accept numeric ID or string slug/name). If string, create or lookup category and get numeric id.
        const rawCategoryVal = transaction.category_id ?? transaction.categoryId ?? transaction.category ?? null;
        let categoryVal = null;
        if (rawCategoryVal != null) {
          // If rawCategoryVal looks like a numeric id, verify it exists for this user's categories.
          if (typeof rawCategoryVal === 'number' || /^\d+$/.test(String(rawCategoryVal))) {
            const candidateId = Number(rawCategoryVal);
            const [found] = await connection.execute('SELECT id FROM categories WHERE id = ? LIMIT 1', [candidateId]);
            if (found.length > 0) {
              categoryVal = candidateId;
            } else {
              // Candidate numeric id not found. Don't pass an invalid FK; leave null.
              categoryVal = null;
            }
          } else {
            // treat as category name/slug -> find or create attached to user
            const catName = String(rawCategoryVal || '').trim();
            if (catName) {
              const [existingCat] = await connection.execute('SELECT id FROM categories WHERE user_id = ? AND name = ? LIMIT 1', [userId, catName]);
              if (existingCat.length > 0) {
                categoryVal = existingCat[0].id;
              } else {
                const [insertCat] = await connection.execute('INSERT INTO categories (user_id, name, type, created_at, updated_at) VALUES (?, ?, ?, NOW(3), NOW(3))', [userId, catName, 'expense']);
                categoryVal = insertCat.insertId;
              }
            }
          }
        }

        if (txCols.has('category_id')) { cols.push('category_id'); vals.push(categoryVal ?? null); }
        else if (txCols.has('category')) { cols.push('category'); vals.push(rawCategoryVal ?? 'Sin categoría'); }

        // Normalize date to MySQL DATETIME format and push into vals
        const rawDate = transaction.date ?? transaction.createdAt ?? null;
        let dateVal = null;
        if (rawDate) {
          if (rawDate instanceof Date) {
            dateVal = rawDate.toISOString().slice(0, 19).replace('T', ' ');
          } else if (typeof rawDate === 'string') {
            const parsed = new Date(rawDate);
            if (!isNaN(parsed.getTime())) {
              dateVal = parsed.toISOString().slice(0, 19).replace('T', ' ');
            } else {
              // fallback: keep as-is (may be YYYY-MM-DD)
              dateVal = rawDate;
            }
          } else {
            dateVal = new Date().toISOString().slice(0, 19).replace('T', ' ');
          }
        } else {
          dateVal = new Date().toISOString().slice(0, 19).replace('T', ' ');
        }
        if (txCols.has('date')) { cols.push('date'); vals.push(dateVal); }

        const relatedRaw = transaction.related_account_id ?? transaction.relatedAccountId ?? transaction.related_account ?? null;
        // Resolve related account by mapping original backup id to newly inserted account id,
        // or verify numeric id exists in accounts. Prevent inserting oversized string ids.
        let relatedAccountIdVal = null;
        if (relatedRaw != null) {
          // First try mapping from original backup id -> new numeric id
          if (accountIdMap.has(relatedRaw)) {
            relatedAccountIdVal = accountIdMap.get(relatedRaw);
          } else if (typeof relatedRaw === 'number' || /^\d+$/.test(String(relatedRaw))) {
            const candidate = Number(relatedRaw);
            const [foundAcc] = await connection.execute('SELECT id FROM accounts WHERE id = ? LIMIT 1', [candidate]);
            if (foundAcc.length > 0) relatedAccountIdVal = candidate;
          }
        }
        if (txCols.has('related_account_id') && relatedAccountIdVal) { cols.push('related_account_id'); vals.push(relatedAccountIdVal); }

        const TransferenciaVal = transaction.Transferencia_group_id ?? transaction.TransferenciaGroupId ?? transaction.Transferencia_group ?? null;
        if (txCols.has('Transferencia_group_id') && TransferenciaVal) { cols.push('Transferencia_group_id'); vals.push(TransferenciaVal); }

        const refVal = transaction.reference_id ?? transaction.referenceId ?? null;
        if (txCols.has('reference_id') && refVal) { cols.push('reference_id'); vals.push(refVal); }

        if (txCols.has('metadata') && (transaction.metadata || transaction.meta)) { cols.push('metadata'); vals.push(JSON.stringify(transaction.metadata ?? transaction.meta)); }

        const placeholders = cols.map(() => '?').join(', ');
        await connection.execute(`INSERT INTO transactions (${cols.join(', ')}) VALUES (${placeholders})`, vals);
      }
    }

    // Importar préstamos (dinámico) - aceptar camelCase, objeto installments.installmentsList,
    // generar cuotas si installments.enabled=true, y también importar loan.payments
    if (importData.loans && importData.loans.length > 0) {
      // helper: add days or months to a Date
      function addInterval(date, freq, n) {
        const d = new Date(date);
        if (freq === 'daily') {
          d.setDate(d.getDate() + n);
          return d;
        }
        // monthly (default): preserve day-of-month where possible
        const day = d.getDate();
        d.setMonth(d.getMonth() + n);
        // If month rolled over (e.g., from Jan 31 to Mar 3), attempt to set to last day
        if (d.getDate() < day) {
          // set to last day of previous month
          d.setDate(0);
        }
        return d;
      }

      for (const loan of importData.loans) {
        if (!loan) continue; // Skip if undefined
  const cols = ['user_id', 'name'];
  // Prefer explicit loan.name, then personName (from backup), then description
  const vals = [userId, loan.name ?? loan.personName ?? loan.description ?? null];

        // support principal or amount
        if (loansCols.has('principal')) { cols.push('principal'); vals.push(loan.principal ?? loan.amount ?? 0); }
        if (loansCols.has('amount')) { cols.push('amount'); vals.push(loan.amount ?? loan.principal ?? 0); }

        if (loansCols.has('currency_code')) {
          const loanCurrency = loan.currency_code ?? loan.currency ?? null;
          if (loanCurrency) await ensureCurrencyExists(connection, loanCurrency);
          cols.push('currency_code');
          vals.push(loanCurrency);
        }
        if (loansCols.has('interest_rate')) { cols.push('interest_rate'); vals.push(loan.interest_rate ?? 0); }
        if (loansCols.has('term_months')) { cols.push('term_months'); vals.push(loan.term_months ?? null); }
        if (loansCols.has('start_date')) { cols.push('start_date'); vals.push(loan.start_date ?? null); }
        // Map remaining/outstanding
        if (loansCols.has('outstanding_balance')) { cols.push('outstanding_balance'); vals.push(loan.remaining_balance ?? loan.outstanding_balance ?? 0); }
        else if (loansCols.has('remaining_balance')) { cols.push('remaining_balance'); vals.push(loan.remaining_balance ?? loan.outstanding_balance ?? 0); }
        if (loansCols.has('monthly_payment')) { cols.push('monthly_payment'); vals.push(loan.monthly_payment ?? null); }
  if (loansCols.has('status')) { cols.push('status'); vals.push(loan.status ?? 'active'); }
  if (loansCols.has('type')) { cols.push('type'); vals.push(loan.type ?? null); }
        // Merge personName into metadata when possible and persist description into notes
        if (loansCols.has('metadata')) {
          const metaObj = loan.metadata ? (typeof loan.metadata === 'object' ? loan.metadata : JSON.parse(String(loan.metadata))) : {};
          if (loan.personName) metaObj.personName = loan.personName;
          vals.push(JSON.stringify(metaObj));
          cols.push('metadata');
        }
        if (loansCols.has('notes')) {
          cols.push('notes');
          vals.push(loan.notes ?? loan.description ?? null);
        }

        const placeholders = cols.map(() => '?').join(', ');
        const [loanResult] = await connection.execute(`INSERT INTO loans (${cols.join(', ')}) VALUES (${placeholders})`, vals);
        const insertedLoanId = loanResult.insertId;

        // Determine installments array from several shapes:
        //  - loan.installments is an array
        //  - loan.installments.installmentsList is an array
        //  - loan.installments.enabled === true -> generate installments using firstInstallmentDate/paymentFrequency/totalInstallments/installmentAmount
        let installmentsArray = [];
        if (Array.isArray(loan.installments)) {
          installmentsArray = loan.installments;
        } else if (loan.installments && Array.isArray(loan.installments.installmentsList)) {
          installmentsArray = loan.installments.installmentsList;
        } else if (loan.installments && loan.installments.enabled) {
          // generate
          try {
            const total = Number(loan.installments.totalInstallments ?? loan.installments.total_installments ?? 0) || 0;
            const freq = (loan.installments.paymentFrequency ?? loan.installments.payment_frequency ?? 'monthly');
            const first = loan.installments.firstInstallmentDate ?? loan.installments.first_installment_date ?? loan.installments.firstInstallment ?? loan.installments.first_installment ?? loan.start_date ?? loan.date ?? null;
            const instAmt = loan.installments.installmentAmount ?? loan.installments.installment_amount ?? loan.installmentAmount ?? loan.installment_amount ?? null;
            if (total > 0 && first) {
              const firstDate = new Date(first);
              for (let i = 0; i < total; i++) {
                const due = addInterval(firstDate, freq === 'daily' ? 'daily' : 'monthly', i);
                const dueStr = due.toISOString().slice(0, 19).replace('T', ' ');
                installmentsArray.push({
                  id: (loan.id ? `${loan.id}-${i+1}` : null),
                  installmentNumber: i + 1,
                  amount: instAmt != null ? Number(instAmt) : null,
                  dueDate: dueStr,
                  status: 'pending'
                });
              }
            }
          } catch (e) {
            // ignore generation errors and continue without installments
            console.warn('Error generating installments for loan import', e.message);
          }
        }

        // Insert installments if any
        if (Array.isArray(installmentsArray) && installmentsArray.length > 0) {
          for (const it of installmentsArray) {
            const instNum = it.installmentNumber ?? it.installment_number ?? null;
            const instAmount = it.amount ?? it.value ?? 0;
            const instDue = it.dueDate ?? it.due_date ?? null;
            const instStatus = it.status ?? 'pending';
            const instPaidDate = it.paidDate ?? it.paid_date ?? null;
            const instPartial = it.partialAmountPaid ?? it.partial_amount_paid ?? 0;
            const instPrincipal = it.principal_component ?? it.principalComponent ?? 0;
            const instInterest = it.interest_component ?? it.interestComponent ?? 0;

            // If an id is provided and it's numeric, insert it explicitly; otherwise let DB assign auto-increment id
            const cols = [];
            const vals = [];
            if (it.id != null && /^\d+$/.test(String(it.id))) {
              cols.push('id');
              vals.push(Number(it.id));
            }
            cols.push('loan_id', 'installment_number', 'amount', 'due_date', 'status', 'paid_date', 'partial_amount_paid', 'principal_component', 'interest_component');
            vals.push(insertedLoanId, instNum, instAmount, instDue, instStatus, instPaidDate, instPartial, instPrincipal, instInterest);

            const placeholders = cols.map(() => '?').join(', ');
            // normalize datetime values for due_date and paid_date to MySQL DATETIME
            const dueValRaw = instDue;
            let dueVal = null;
            if (dueValRaw) {
              const parsedDue = new Date(dueValRaw);
              if (!isNaN(parsedDue.getTime())) dueVal = parsedDue.toISOString().slice(0, 19).replace('T', ' ');
              else dueVal = dueValRaw;
            }
            const paidValRaw = instPaidDate;
            let paidVal = null;
            if (paidValRaw) {
              const parsedPaid = new Date(paidValRaw);
              if (!isNaN(parsedPaid.getTime())) paidVal = parsedPaid.toISOString().slice(0, 19).replace('T', ' ');
              else paidVal = paidValRaw;
            }

            // replace due_date and paid_date positions in vals array before executing
            // cols order: possible 'id', then loan_id, installment_number, amount, due_date, status, paid_date, ...
            // find index of due_date and paid_date in cols
            const dueIndex = cols.indexOf('due_date');
            const paidIndex = cols.indexOf('paid_date');
            if (dueIndex >= 0) vals[dueIndex] = dueVal;
            if (paidIndex >= 0) vals[paidIndex] = paidVal;

            await connection.execute(
              `INSERT INTO loan_installments (${cols.join(', ')}, created_at, updated_at) VALUES (${placeholders}, NOW(3), NOW(3))`,
              vals
            );
          }
        }

        // Insert loan payments if present in backup
        if (Array.isArray(loan.payments) && loan.payments.length > 0) {
          for (const p of loan.payments) {
            const paidAmount = p.paidAmount ?? p.paid_amount ?? 0;
            const paidDate = p.paidDate ?? p.paid_date ?? null;
            const txnId = p.transactionId ?? p.transaction_id ?? null;
            const principalComp = p.principalComponent ?? p.principal_component ?? 0;
            const interestComp = p.interestComponent ?? p.interest_component ?? 0;
            await connection.execute(
              'INSERT INTO loan_payments (loan_id, transaction_id, paid_amount, principal_component, interest_component, paid_date, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW(3))',
              [insertedLoanId, txnId, paidAmount, principalComp, interestComp, paidDate]
            );
          }
        }
      }
    }

    // Importar transacciones recurrentes (dinámico)
    if (importData.recurringTransactions && importData.recurringTransactions.length > 0) {
      for (const rt of importData.recurringTransactions) {
        const newAccountId = accountIdMap.get(rt.account_id);
        if (!newAccountId) continue;

        const cols = ['user_id', 'account_id', 'type', 'amount', 'frequency'];
        const vals = [userId, newAccountId, rt.type, rt.amount, rt.frequency || 'monthly'];

        if (recurringCols.has('currency_code')) {
          const rtCurrency = rt.currency_code ?? rt.currency ?? null;
          if (rtCurrency) await ensureCurrencyExists(connection, rtCurrency);
          cols.push('currency_code');
          vals.push(rtCurrency);
        }
        if (recurringCols.has('description')) { cols.push('description'); vals.push(rt.description || ''); }
        // For recurring transactions prefer categoryName if present
        const preferredRecurringCat = rt.categoryName ?? rt.category ?? rt.category_id ?? null;
        let recurringCatIdToUse = null;
        if (preferredRecurringCat != null) {
          if (typeof preferredRecurringCat === 'number' || /^\d+$/.test(String(preferredRecurringCat))) {
            const cand = Number(preferredRecurringCat);
            const [found] = await connection.execute('SELECT id FROM categories WHERE id = ? LIMIT 1', [cand]);
            if (found.length > 0) recurringCatIdToUse = cand;
          } else {
            const catName = String(preferredRecurringCat).trim();
            const [foundByName] = await connection.execute('SELECT id FROM categories WHERE user_id = ? AND name = ? LIMIT 1', [userId, catName]);
            if (foundByName.length > 0) recurringCatIdToUse = foundByName[0].id;
            else {
              const inferredType = (rt.type === 'income') ? 'income' : 'expense';
              const [ins] = await connection.execute('INSERT INTO categories (user_id, name, type, created_at, updated_at) VALUES (?, ?, ?, NOW(3), NOW(3))', [userId, catName, inferredType]);
              recurringCatIdToUse = ins.insertId;
            }
          }
        }
        if (recurringCols.has('category_id')) { cols.push('category_id'); vals.push(recurringCatIdToUse ?? null); }
        else if (recurringCols.has('category')) { cols.push('category'); vals.push(preferredRecurringCat ?? 'Sin categoría'); }
        if (recurringCols.has('next_date')) { cols.push('next_date'); vals.push(rt.next_date || new Date().toISOString().split('T')[0]); }
        // map active/is_active
        if (recurringCols.has('active')) { cols.push('active'); vals.push(rt.active ?? rt.is_active ?? 1); }
        else if (recurringCols.has('is_active')) { cols.push('is_active'); vals.push(rt.is_active ?? rt.active ?? 1); }
        if (recurringCols.has('metadata') && rt.metadata) { cols.push('metadata'); vals.push(JSON.stringify(rt.metadata)); }

        const placeholders = cols.map(() => '?').join(', ');
        await connection.execute(`INSERT INTO recurring_transactions (${cols.join(', ')}) VALUES (${placeholders})`, vals);
      }
    }
    
    await connection.commit();
    
    res.json({ 
      message: 'Datos importados exitosamente',
      imported: {
        accounts: importData.accounts?.length || 0,
        transactions: importData.transactions?.length || 0,
        loans: importData.loans?.length || 0,
        recurringTransactions: importData.recurringTransactions?.length || 0,
        categories: importData.categories?.length || 0
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error en importación:', error);
    res.status(500).json({ 
      error: 'Error al importar los datos',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// Función auxiliar para crear respaldo antes de importar
async function createBackupBeforeImport(connection, userId) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Crear tabla de respaldo si no existe
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_backups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        backup_data JSON NOT NULL,
        backup_type VARCHAR(50) DEFAULT 'pre_import',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Obtener datos actuales del usuario
    const [accounts] = await connection.execute('SELECT * FROM accounts WHERE user_id = ?', [userId]);
    const [transactions] = await connection.execute('SELECT * FROM transactions WHERE user_id = ?', [userId]);
    const [loans] = await connection.execute('SELECT * FROM loans WHERE user_id = ?', [userId]);
    const [recurringTransactions] = await connection.execute('SELECT * FROM recurring_transactions WHERE user_id = ?', [userId]);
    const [categories] = await connection.execute('SELECT * FROM categories WHERE user_id = ?', [userId]);
    
    const backupData = {
      accounts,
      transactions,
      loans,
      recurringTransactions,
      categories,
      timestamp,
      reason: 'Respaldo automático antes de importación'
    };
    
    // Guardar respaldo
    await connection.execute(
      'INSERT INTO user_backups (user_id, backup_data, backup_type) VALUES (?, ?, ?)',
      [userId, JSON.stringify(backupData), 'pre_import']
    );
    
    console.log(`Respaldo creado para usuario ${userId} antes de importación`);
    
  } catch (error) {
    console.error('Error creando respaldo:', error);
    // No fallar la importación por error de respaldo
  }
}

// Obtener historial de respaldos del usuario
router.get('/backups', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [backups] = await req.db.execute(
      'SELECT id, backup_type, created_at FROM user_backups WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [userId]
    );
    
    res.json(backups);
    
  } catch (error) {
    console.error('Error obteniendo respaldos:', error);
    res.status(500).json({ 
      error: 'Error al obtener historial de respaldos',
      details: error.message 
    });
  }
});

// Restaurar desde un respaldo específico
router.post('/restore/:backupId', requireAuth, async (req, res) => {
  const connection = await req.db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const userId = req.user.id;
    const backupId = req.params.backupId;
    
    // Obtener el respaldo
    const [backups] = await connection.execute(
      'SELECT backup_data FROM user_backups WHERE id = ? AND user_id = ?',
      [backupId, userId]
    );
    
    if (backups.length === 0) {
      return res.status(404).json({ error: 'Respaldo no encontrado' });
    }
    
    const backupData = JSON.parse(backups[0].backup_data);
    
    // Crear respaldo de estado actual antes de restaurar
    await createBackupBeforeImport(connection, userId);
    
    // Limpiar datos actuales
    await connection.execute('DELETE FROM transactions WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM loans WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM recurring_transactions WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM accounts WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM categories WHERE user_id = ?', [userId]);
    
    // Restaurar datos desde el respaldo
    const accountIdMap = new Map();
    const categoryIdMap = new Map();
    // detect loans columns so we can optionally restore `type` without changing other columns
    const [loanColsRows] = await connection.execute(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
      ['loans']
    );
    const loansColsSet = new Set(loanColsRows.map(c => c.COLUMN_NAME));
    
    // Restaurar categorías
    if (backupData.categories) {
      for (const category of backupData.categories) {
        if (!category || !category.name) continue; // Skip if undefined or no name
        const [res] = await connection.execute(
          'INSERT INTO categories (user_id, name, type, color, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(3), NOW(3))',
          [userId, category.name, category.type ?? 'expense', category.color]
        );
        // keep mapping from original backup id (string) -> new numeric id
        if (category.id) categoryIdMap.set(String(category.id), res.insertId);
      }
    }
    
    // Restaurar cuentas
    if (backupData.accounts) {
      for (const account of backupData.accounts) {
        const [result] = await connection.execute(
          'INSERT INTO accounts (user_id, name, type, current_balance, currency_code, description) VALUES (?, ?, ?, ?, ?, ?)',
          [userId, account.name, account.type, account.current_balance ?? account.balance ?? 0, account.currency_code ?? account.currency ?? 'USD', account.description]
        );
        accountIdMap.set(account.id, result.insertId);
      }
    }
    
    // Restaurar transacciones
    if (backupData.transactions) {
      for (const transaction of backupData.transactions) {
        const newAccountId = accountIdMap.get(transaction.account_id ?? transaction.accountId ?? transaction.account);
        if (!newAccountId) continue;

        // resolve category: prefer categoryName exported by backups, then fallback to category/categoryId
        const rawCatName = transaction.categoryName ?? transaction.category ?? null;
        let resolvedCategoryId = null;
        if (rawCatName != null && String(rawCatName).trim() !== '') {
          const trimmed = String(rawCatName).trim();
          // If this matches a category id from the original backup mapping
          if (categoryIdMap.has(String(trimmed))) {
            resolvedCategoryId = categoryIdMap.get(String(trimmed));
          } else {
            // Try find by name for this user
            const [foundByName] = await connection.execute('SELECT id FROM categories WHERE user_id = ? AND name = ? LIMIT 1', [userId, trimmed]);
            if (foundByName.length > 0) resolvedCategoryId = foundByName[0].id;
            else {
              // create category with inferred type
              const type = (transaction.type === 'income') ? 'income' : 'expense';
              const [ins] = await connection.execute('INSERT INTO categories (user_id, name, type, created_at, updated_at) VALUES (?, ?, ?, NOW(3), NOW(3))', [userId, trimmed, type]);
              resolvedCategoryId = ins.insertId;
            }
          }
        } else {
          // fallback: try previous behavior (numeric id or category field)
          const rawCat = transaction.categoryId ?? transaction.categoryId ?? transaction.category ?? transaction.categoryId ?? null;
          if (rawCat != null && rawCat !== '') {
            if (categoryIdMap.has(String(rawCat))) resolvedCategoryId = categoryIdMap.get(String(rawCat));
            else if (/^\d+$/.test(String(rawCat))) {
              const [foundById] = await connection.execute('SELECT id FROM categories WHERE id = ? LIMIT 1', [Number(rawCat)]);
              if (foundById.length > 0) resolvedCategoryId = foundById[0].id;
            } else {
              const [foundByName2] = await connection.execute('SELECT id FROM categories WHERE user_id = ? AND name = ? LIMIT 1', [userId, String(rawCat)]);
              if (foundByName2.length > 0) resolvedCategoryId = foundByName2[0].id;
              else {
                const type = (transaction.type === 'income') ? 'income' : 'expense';
                const [ins2] = await connection.execute('INSERT INTO categories (user_id, name, type, created_at, updated_at) VALUES (?, ?, ?, NOW(3), NOW(3))', [userId, String(rawCat), type]);
                resolvedCategoryId = ins2.insertId;
              }
            }
          }
        }

        // normalize date to MySQL DATETIME
        const rawDate = transaction.date ?? transaction.createdAt ?? null;
        let dateVal = null;
        if (rawDate) {
          const parsed = new Date(rawDate);
          if (!isNaN(parsed.getTime())) dateVal = parsed.toISOString().slice(0, 19).replace('T', ' ');
          else dateVal = rawDate;
        } else {
          dateVal = new Date().toISOString().slice(0, 19).replace('T', ' ');
        }

        await connection.execute(
          'INSERT INTO transactions (user_id, account_id, type, amount, description, category_id, date) VALUES (?, ?, ?, ?, ?, ?, ?) ',
          [userId, newAccountId, transaction.type ?? 'expense', transaction.amount ?? 0, transaction.description ?? null, resolvedCategoryId, dateVal]
        );
      }
    }
    
    // Restaurar préstamos
    if (backupData.loans) {
      for (const loan of backupData.loans) {
        // Prepare metadata merging personName if present
        const restoreMeta = loan.metadata ? (typeof loan.metadata === 'object' ? loan.metadata : JSON.parse(String(loan.metadata))) : {};
        if (loan.personName) restoreMeta.personName = loan.personName;
  const restoreNotes = loan.notes ?? loan.description ?? null;

  // Build restore insert with optional type column
  const restoreCols = ['user_id', 'name', 'principal', 'interest_rate', 'term_months', 'start_date', 'monthly_payment', 'remaining_balance', 'status', 'metadata', 'notes'];
  const restoreVals = [userId, loan.name ?? loan.personName ?? loan.description ?? null, loan.principal, loan.interest_rate, loan.term_months, loan.start_date, loan.monthly_payment, loan.remaining_balance, loan.status, JSON.stringify(restoreMeta || {}), restoreNotes];
  if (loansColsSet.has('type')) {
    restoreCols.splice(restoreCols.indexOf('status') + 1, 0, 'type');
    // insert type value just after status in restoreVals (status is at index 8)
    restoreVals.splice(9, 0, loan.type ?? null);
  }
  const placeholders = restoreCols.map(() => '?').join(', ');
  const [loanResult] = await connection.execute(`INSERT INTO loans (${restoreCols.join(', ')}) VALUES (${placeholders})`, restoreVals);
  const newLoanId = loanResult.insertId;

        // Insert installments if present
        if (loan.installments && Array.isArray(loan.installments.installmentsList) && loan.installments.installmentsList.length > 0) {
          for (const it of loan.installments.installmentsList) {
            const instNum = it.installmentNumber ?? it.installment_number ?? null;
            const instAmount = it.amount ?? it.value ?? 0;
            const instDue = it.dueDate ?? it.due_date ?? null;
            const instStatus = it.status ?? 'pending';
            const instPaidDate = it.paidDate ?? it.paid_date ?? null;
            const instPartial = it.partialAmountPaid ?? it.partial_amount_paid ?? 0;
            const instPrincipal = it.principalComponent ?? it.principal_component ?? 0;
            const instInterest = it.interestComponent ?? it.interest_component ?? 0;

            await connection.execute(
              'INSERT INTO loan_installments (loan_id, installment_number, amount, due_date, status, paid_date, partial_amount_paid, principal_component, interest_component, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))',
              [newLoanId, instNum, instAmount, instDue, instStatus, instPaidDate, instPartial, instPrincipal, instInterest]
            );
          }
        }

        // Insert payments if present
        if (Array.isArray(loan.payments) && loan.payments.length > 0) {
          for (const p of loan.payments) {
            const paidAmount = p.paidAmount ?? p.paid_amount ?? 0;
            const paidDate = p.paidDate ?? p.paid_date ?? null;
            const txnId = p.transactionId ?? p.transaction_id ?? null;
            const principalComp = p.principalComponent ?? p.principal_component ?? 0;
            const interestComp = p.interestComponent ?? p.interest_component ?? 0;

            await connection.execute(
              'INSERT INTO loan_payments (loan_id, transaction_id, paid_amount, principal_component, interest_component, paid_date, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW(3))',
              [newLoanId, txnId, paidAmount, principalComp, interestComp, paidDate]
            );
          }
        }
      }
    }
    
    // Restaurar transacciones recurrentes
    if (backupData.recurringTransactions) {
      for (const rt of backupData.recurringTransactions) {
        const newAccountId = accountIdMap.get(rt.account_id ?? rt.accountId ?? rt.account);
        if (!newAccountId) continue;

        // resolve recurring category: prefer exported categoryName, then fallback to category/categoryId
        const preferredName = rt.categoryName ?? rt.category ?? rt.categoryId ?? null;
        let resolvedCategoryId = null;
        if (preferredName != null && String(preferredName).trim() !== '') {
          if (typeof preferredName === 'number' || /^\d+$/.test(String(preferredName))) {
            const cand = Number(preferredName);
            const [foundById] = await connection.execute('SELECT id FROM categories WHERE id = ? LIMIT 1', [cand]);
            if (foundById.length > 0) resolvedCategoryId = cand;
          } else {
            const nameTrim = String(preferredName).trim();
            if (categoryIdMap.has(String(nameTrim))) resolvedCategoryId = categoryIdMap.get(String(nameTrim));
            else {
              const [foundByName] = await connection.execute('SELECT id FROM categories WHERE user_id = ? AND name = ? LIMIT 1', [userId, nameTrim]);
              if (foundByName.length > 0) resolvedCategoryId = foundByName[0].id;
              else {
                const type = rt.type === 'income' ? 'income' : 'expense';
                const [ins] = await connection.execute('INSERT INTO categories (user_id, name, type, created_at, updated_at) VALUES (?, ?, ?, NOW(3), NOW(3))', [userId, nameTrim, type]);
                resolvedCategoryId = ins.insertId;
              }
            }
          }
        }

        // normalize dates
        const nextDateVal = rt.nextDate ?? rt.next_date ?? null;
        let nextDate = null;
        if (nextDateVal) {
          const p = new Date(nextDateVal);
          if (!isNaN(p.getTime())) nextDate = p.toISOString().slice(0, 19).replace('T', ' ');
          else nextDate = nextDateVal;
        }

        await connection.execute(
          'INSERT INTO recurring_transactions (user_id, account_id, type, amount, description, category_id, frequency, next_date, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [userId, newAccountId, rt.type ?? 'expense', rt.amount ?? 0, rt.description ?? null, resolvedCategoryId, rt.frequency ?? 'monthly', nextDate, rt.isActive ?? rt.is_active ?? 1]
        );
      }
    }
    
    await connection.commit();
    
    res.json({ 
      message: 'Datos restaurados exitosamente',
      backupId: backupId
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error en restauración:', error);
    res.status(500).json({ 
      error: 'Error al restaurar los datos',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
