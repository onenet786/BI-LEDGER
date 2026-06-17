-- Database Creation Script for PostgreSQL
-- Run this script on your remote host to manually initialize the database tables.
-- Note: The Express backend server is configured to automatically create these tables on startup,
-- but you can use this script for manual deployments or migrations.

-- 1. Tenant Settings Table
CREATE TABLE IF NOT EXISTS tenant_settings (
  id VARCHAR PRIMARY KEY,
  name VARCHAR,
  base_currency VARCHAR,
  fiscal_year_start_month INTEGER,
  transaction_numbering JSONB,
  approval_threshold NUMERIC,
  custom_fields JSONB,
  branches JSONB,
  lock_date VARCHAR
);

-- 2. Parties Table
CREATE TABLE IF NOT EXISTS parties (
  id VARCHAR PRIMARY KEY,
  name VARCHAR,
  code VARCHAR UNIQUE,
  type VARCHAR,
  status VARCHAR,
  base_currency VARCHAR,
  tax_id VARCHAR,
  credit_limit NUMERIC,
  payment_terms_days INTEGER,
  contacts JSONB,
  projects JSONB,
  documents JSONB,
  audit_notes JSONB,
  custom_fields JSONB,
  created_at VARCHAR
);

-- 3. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR PRIMARY KEY,
  party_id VARCHAR REFERENCES parties(id) ON DELETE CASCADE,
  branch_id VARCHAR,
  transaction_type VARCHAR,
  reference_number VARCHAR,
  transaction_date VARCHAR,
  due_date VARCHAR,
  currency_code VARCHAR,
  amount_in_txn_currency NUMERIC,
  exchange_rate NUMERIC,
  amount_in_base_currency NUMERIC,
  status VARCHAR,
  project_id VARCHAR,
  milestone_id VARCHAR,
  tds_amount NUMERIC,
  tds_rate NUMERIC,
  is_disputed BOOLEAN,
  reconciled_at VARCHAR,
  created_at VARCHAR,
  created_by VARCHAR,
  approved_by VARCHAR,
  approved_at VARCHAR,
  comments TEXT,
  reversal_of VARCHAR,
  custom_fields JSONB
);

-- 4. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR,
  username VARCHAR,
  timestamp VARCHAR,
  action VARCHAR,
  details TEXT,
  ip_address VARCHAR
);
