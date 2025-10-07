const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'webapp_finanzas',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Log the DB being used so it's obvious on startup which database the backend will connect to.
// Avoid printing the password.
const usedDb = process.env.DB_NAME || 'webapp_finanzas';
console.log(`DB pool configured -> host=${process.env.DB_HOST || '127.0.0.1'} port=${process.env.DB_PORT || 3306} database=${usedDb} user=${process.env.DB_USER || 'root'}`);

module.exports = pool;
