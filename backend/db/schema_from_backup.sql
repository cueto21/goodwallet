-- Schema generated from finanzas-backup-2025-09-05-02-25-57.json
-- Adjusted to snake_case to match import/restore code expectations.
-- Review before running on production. Backup your DB first.

-- Create the database your backend expects so imports land where the server looks for them.
CREATE DATABASE IF NOT EXISTS `webapp_finanzas` DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
USE `webapp_finanzas`;

SET FOREIGN_KEY_CHECKS = 0;

-- Drop existing (safe for dev/testing)
DROP TABLE IF EXISTS user_backups;
DROP TABLE IF EXISTS pending_recurring_transactions;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS loan_payments;
DROP TABLE IF EXISTS loan_installments;
DROP TABLE IF EXISTS loans;
DROP TABLE IF EXISTS recurring_transactions;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS currencies;
DROP TABLE IF EXISTS users;

-- Users
CREATE TABLE users (
  id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) DEFAULT NULL,
  password_hash VARCHAR(255) DEFAULT NULL,
  display_name VARCHAR(255) DEFAULT NULL,
  metadata JSON DEFAULT (JSON_OBJECT()),
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE currencies (
  code CHAR(3) NOT NULL PRIMARY KEY,
  name VARCHAR(128) DEFAULT NULL,
  symbol VARCHAR(16) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Accounts
CREATE TABLE accounts (
  id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  user_id INT DEFAULT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'checking',
  current_balance DECIMAL(18,2) DEFAULT 0,
  initial_balance DECIMAL(18,2) DEFAULT NULL,
  balance DECIMAL(18,2) DEFAULT NULL,
  credit_limit DECIMAL(18,2) DEFAULT NULL,
  currency_code VARCHAR(8) DEFAULT NULL,
  currency VARCHAR(8) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  metadata JSON DEFAULT (JSON_OBJECT()),
  selected_card_style JSON DEFAULT (JSON_OBJECT()),
  card_style JSON DEFAULT (JSON_OBJECT()),
  goals JSON DEFAULT (JSON_OBJECT()),
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_accounts_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_accounts_currency_code FOREIGN KEY (currency_code) REFERENCES currencies(code) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_accounts_user_id ON accounts(user_id);

-- Categories
CREATE TABLE categories (
  id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  user_id INT DEFAULT NULL,
  name VARCHAR(128) NOT NULL,
  icon VARCHAR(64) DEFAULT NULL,
  color VARCHAR(20) DEFAULT NULL,
  type VARCHAR(30) DEFAULT 'expense',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_categories_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Transactions
CREATE TABLE transactions (
  id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  user_id INT DEFAULT NULL,
  account_id INT NOT NULL,
  type VARCHAR(30) DEFAULT 'expense',
  amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  currency_code VARCHAR(8) DEFAULT NULL,
  currency VARCHAR(8) DEFAULT NULL,
    date DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  description TEXT DEFAULT NULL,
  category_id INT DEFAULT NULL,
  category VARCHAR(128) DEFAULT NULL,
  related_account_id INT DEFAULT NULL,
  Transferencia_group_id VARCHAR(128) DEFAULT NULL,
  reference_id VARCHAR(255) DEFAULT NULL,
  metadata JSON DEFAULT (JSON_OBJECT()),
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME DEFAULT NULL,
  CONSTRAINT fk_tx_account_id FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_tx_related_account_id FOREIGN KEY (related_account_id) REFERENCES accounts(id) ON DELETE SET NULL,
  CONSTRAINT fk_tx_category_id FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_tx_account_id ON transactions(account_id);
CREATE INDEX idx_tx_Transferencia_group_id ON transactions(Transferencia_group_id);
CREATE INDEX idx_tx_date ON transactions(date);

-- Recurring transactions
CREATE TABLE recurring_transactions (
  id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  user_id INT DEFAULT NULL,
  account_id INT NOT NULL,
  type VARCHAR(30) DEFAULT 'expense',
  amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  currency_code VARCHAR(8) DEFAULT NULL,
  currency VARCHAR(8) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  category_id INT DEFAULT NULL,
  category VARCHAR(128) DEFAULT NULL,
  frequency VARCHAR(30) DEFAULT 'monthly',
  start_date DATETIME DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  next_date DATETIME DEFAULT NULL,
  last_generated_date DATETIME DEFAULT NULL,
  metadata JSON DEFAULT (JSON_OBJECT()),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_recurring_account_id FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_recurring_category_id FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Loans
CREATE TABLE loans (
  id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  user_id INT DEFAULT NULL,
  account_id INT DEFAULT NULL,
  type ENUM('lent','borrowed','other') DEFAULT NULL,
  name VARCHAR(255) DEFAULT NULL,
  principal DECIMAL(18,2) DEFAULT 0,
  amount DECIMAL(18,2) DEFAULT NULL,
  outstanding_balance DECIMAL(18,2) DEFAULT NULL,
  remaining_balance DECIMAL(18,2) DEFAULT NULL,
  monthly_payment DECIMAL(18,2) DEFAULT NULL,
  interest_rate DECIMAL(8,4) DEFAULT 0,
  start_date DATETIME(3) DEFAULT NULL,
  due_date DATETIME(3) DEFAULT NULL,
  currency_code VARCHAR(8) DEFAULT NULL,
  status VARCHAR(30) DEFAULT 'pending',
  notes TEXT DEFAULT NULL,
  metadata JSON DEFAULT (JSON_OBJECT()),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_loans_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_loans_account_id FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
  CONSTRAINT fk_loans_currency_code FOREIGN KEY (currency_code) REFERENCES currencies(code) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Loan installments
CREATE TABLE loan_installments (
  id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  loan_id INT NOT NULL,
  installment_number INT NOT NULL,
  amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  due_date DATETIME DEFAULT NULL,
  status VARCHAR(30) DEFAULT 'pending',
    paid_date DATETIME(3) DEFAULT NULL,
  paid_amount DECIMAL(18,2) DEFAULT 0,
  partial_amount_paid DECIMAL(18,2) DEFAULT 0,
  principal_component DECIMAL(18,2) DEFAULT 0,
  interest_component DECIMAL(18,2) DEFAULT 0,
  payment_transaction_id VARCHAR(128) DEFAULT NULL,
    created_at DATETIME(3) DEFAULT NULL,
    updated_at DATETIME(3) DEFAULT NULL,
  CONSTRAINT fk_installment_loan_id FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_installments_loan_id ON loan_installments(loan_id);

-- Loan payments
CREATE TABLE loan_payments (
  id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  loan_id INT DEFAULT NULL,
  transaction_id VARCHAR(128) DEFAULT NULL,
  paid_amount DECIMAL(18,2) DEFAULT 0,
  principal_component DECIMAL(18,2) DEFAULT 0,
  interest_component DECIMAL(18,2) DEFAULT 0,
    paid_date DATETIME(3) DEFAULT NULL,
  created_at DATETIME DEFAULT NULL,
  CONSTRAINT fk_loan_payments_loan_id FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pending recurring transactions
CREATE TABLE pending_recurring_transactions (
  id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  recurring_transaction_id INT DEFAULT NULL,
  amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  description TEXT DEFAULT NULL,
  category_id INT DEFAULT NULL,
  account_id INT DEFAULT NULL,
  type VARCHAR(30) DEFAULT 'expense',
  scheduled_date DATETIME DEFAULT NULL,
  status VARCHAR(30) DEFAULT 'pending',
  created_at DATETIME DEFAULT NULL,
  CONSTRAINT fk_pending_recurring_recurring_id FOREIGN KEY (recurring_transaction_id) REFERENCES recurring_transactions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Settings table
CREATE TABLE settings (
  id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  user_id INT DEFAULT NULL,
  payload JSON DEFAULT (JSON_OBJECT()),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_settings_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User backups
CREATE TABLE user_backups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  backup_data JSON NOT NULL,
  backup_type VARCHAR(50) DEFAULT 'pre_import',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_backups_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Refresh tokens (used by auth routes)
CREATE TABLE refresh_tokens (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);

-- Friends
CREATE TABLE friends (
  id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  friend_id INT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_friends_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_friends_friend_id FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_friendship (user_id, friend_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Shared transactions
CREATE TABLE shared_transactions (
  id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  transaction_id INT NOT NULL,
  friend_user_id INT NOT NULL,
  amount_owed DECIMAL(18,2) NOT NULL,
  split_type VARCHAR(20) DEFAULT 'fixed', -- 'fixed' or 'percentage'
  split_value DECIMAL(18,2) NOT NULL, -- amount or percentage
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid'
  paid_at DATETIME DEFAULT NULL,
  paid_transaction_id INT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_shared_tx_transaction_id FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  CONSTRAINT fk_shared_tx_friend_user_id FOREIGN KEY (friend_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_shared_tx_paid_transaction_id FOREIGN KEY (paid_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_shared_tx_transaction_id ON shared_transactions(transaction_id);
CREATE INDEX idx_shared_tx_friend_user_id ON shared_transactions(friend_user_id);

SET FOREIGN_KEY_CHECKS = 1;

-- End of generated schema (snake_case)

-- Ensure categories exist before inserting transactions
INSERT INTO categories (name, type, created_at, updated_at)
SELECT DISTINCT t.category, 'expense', NOW(), NOW()
FROM transactions t
WHERE t.category IS NOT NULL
  AND t.category NOT IN (SELECT name FROM categories);

-- Update transactions to reference the correct category IDs
UPDATE transactions t
JOIN categories c ON t.category = c.name
SET t.category_id = c.id
WHERE t.category IS NOT NULL;
