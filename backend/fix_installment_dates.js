const mysql = require('mysql2/promise');

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

async function fixInstallmentDates() {
  let connection;

  try {
    // Create connection using environment variables
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'webapp_finanzas',
      timezone: '+00:00'
    });

    console.log('Connected to database');

    // Find all installments with ISO date format in due_date
    const [rows] = await connection.execute(
      "SELECT id, due_date, paid_date FROM loan_installments WHERE due_date LIKE '%T%' OR paid_date LIKE '%T%'"
    );

    console.log(`Found ${rows.length} installments with ISO date format`);

    if (rows.length === 0) {
      console.log('No installments need fixing');
      return;
    }

    // Update each installment
    for (const row of rows) {
      const formattedDueDate = toSqlDatetime(row.due_date);
      const formattedPaidDate = toSqlDatetime(row.paid_date);

      await connection.execute(
        'UPDATE loan_installments SET due_date = ?, paid_date = ? WHERE id = ?',
        [formattedDueDate, formattedPaidDate, row.id]
      );

      console.log(`Fixed installment ${row.id}`);
    }

    console.log('All installments fixed successfully');

  } catch (error) {
    console.error('Error fixing installment dates:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the fix
fixInstallmentDates().catch(console.error);