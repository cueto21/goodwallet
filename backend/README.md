Minimal Node.js backend for WebApp-Finanzas

1) Setup
   - Copy `.env.example` to `.env` and fill DB credentials.
   - From `backend` run:
     npm install
     npm run start

2) Endpoints
   - GET /health
   - GET /users, POST /users
   - GET /accounts, POST /accounts
   - GET /transactions, POST /transactions, POST /transactions/Transferencia
   - GET /loans, POST /loans

This is a minimal starting point. Add validation, auth and tests before production.
