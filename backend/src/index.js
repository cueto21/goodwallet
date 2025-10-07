const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const db = require('./db');
const usersRoutes = require('./routes/users');
const accountsRoutes = require('./routes/accounts');
const transactionsRoutes = require('./routes/transactions');
const loansRoutes = require('./routes/loans');
const categoriesRoutes = require('./routes/categories');
const authRoutes = require('./routes/auth');
const backupRoutes = require('./routes/backup');
const friendsRoutes = require('./routes/friends');
const sharedTransactionsRoutes = require('./routes/shared-transactions');

dotenv.config();
const app = express();

// Middlewares
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cookieParser());

// CORS configuration: allow trusted origins including mobile apps
const allowedOrigins = [
  'https://goodwallet.jorgemauricio.site',
  'https://backwallet.jorgemauricio.site',
  'http://localhost:4200', // para desarrollo local
  'http://localhost:3000', // para desarrollo local
  'capacitor://localhost', // Capacitor iOS apps
  'http://localhost', // Capacitor development
  'ionic://localhost', // Ionic/Capacitor apps
  'https://localhost:8080', // Capacitor Android specific port
  'https://localhost:8100', // Capacitor Android alternative port
  null // Allow requests with no origin (common for mobile apps)
];

app.use(cors({
  origin: function (origin, callback) {
    console.log('[CORS] Request from origin:', origin);
    console.log('[CORS] User-Agent:', arguments[2]?.req?.headers?.['user-agent']?.substring(0, 100));

    // Allow requests with no origin (common for mobile apps and some requests)
    if (!origin) {
      console.log('[CORS] ✅ No origin (allowed for mobile apps)');
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      console.log('[CORS] ✅ Origin allowed:', origin);
      return callback(null, true);
    }

    // For mobile app development, allow localhost variations
    if (origin === 'http://localhost' || origin === 'https://localhost' ||
        origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:') ||
        origin === 'capacitor://localhost' || origin === 'ionic://localhost') {
      console.log('[CORS] ✅ Localhost/mobile origin allowed:', origin);
      return callback(null, true);
    }

    // Block unknown origins
    console.log('[CORS] ❌ Origin blocked:', origin);
    console.log('[CORS] 💡 To allow this origin, add to allowedOrigins:');
    console.log(`      '${origin}',`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'} - User-Agent: ${req.headers['user-agent']?.substring(0, 50) || 'unknown'}`);
  req.db = db;
  next();
});

// Healthcheck
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/users', usersRoutes);
app.use('/auth', authRoutes);
app.use('/accounts', accountsRoutes);
app.use('/transactions', transactionsRoutes);
app.use('/loans', loansRoutes);
app.use('/categories', categoriesRoutes);
app.use('/backup', backupRoutes);
app.use('/friends', friendsRoutes);
app.use('/shared-transactions', sharedTransactionsRoutes);

// Example of secure cookie middleware
app.use((req, res, next) => {
  res.cookie('token', 'exampleToken', {
    httpOnly: true,
    secure: true, // se enviar� solo por HTTPS (lo maneja Nginx)
    sameSite: 'strict'
  });
  next();
});

const port = process.env.PORT || 3000;

// Start server (HTTP only, SSL handled by Nginx/Certbot)
app.listen(port, () => {
  console.log(`Backend running on http://127.0.0.1:${port}`);
});

// Log secret to confirm env vars load
console.log('JWT_SECRET:', process.env.JWT_SECRET);
