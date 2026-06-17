import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { defaultTenant, seedParties, seedTransactions, seedAuditLogs, seedUsers } from './src/seedData.ts';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// In-Memory Fallback State (if database connection is unavailable)
let useFallback = false;
let fallbackData = {
  settings: defaultTenant,
  parties: seedParties,
  transactions: seedTransactions,
  auditLogs: seedAuditLogs,
  users: seedUsers,
};

// PostgreSQL connection config
const connectionString = process.env.DATABASE_URL;
let pool: pg.Pool | null = null;

const dbInfo = {
  connected: false,
  host: 'N/A',
  database: 'In-Memory Fallback',
  user: 'N/A',
  port: 'N/A'
};

if (connectionString) {
  console.log('PostgreSQL connection string found. Connecting...');
  pool = new pg.Pool({
    connectionString,
    ssl: connectionString.includes('render.com') || connectionString.includes('supabase')
      ? { rejectUnauthorized: false }
      : false,
  });
  try {
    const urlObj = new URL(connectionString);
    dbInfo.host = urlObj.hostname;
    dbInfo.database = urlObj.pathname.substring(1);
    dbInfo.user = urlObj.username;
    dbInfo.port = urlObj.port || '5432';
  } catch (e) {
    // ignore parsing issues
  }
} else {
  console.log('No DATABASE_URL environment variable detected. Defaulting to in-memory fallback database.');
  useFallback = true;
}

// Check database connection and run migrations
async function initDb() {
  if (useFallback || !pool) return;

  try {
    const client = await pool.connect();
    console.log('Successfully connected to PostgreSQL database!');
    client.release();
    dbInfo.connected = true;

    // Create Tables
    await pool.query(`
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

      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR,
        username VARCHAR,
        timestamp VARCHAR,
        action VARCHAR,
        details TEXT,
        ip_address VARCHAR
      );

      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY,
        username VARCHAR UNIQUE,
        password VARCHAR,
        role VARCHAR,
        name VARCHAR
      );
    `);

    console.log('PostgreSQL database tables verified/created successfully.');

    // Seed data if empty
    const settingsCheck = await pool.query('SELECT COUNT(*) FROM tenant_settings');
    if (parseInt(settingsCheck.rows[0].count) === 0) {
      console.log('Seeding default tenant settings...');
      await pool.query(
        `INSERT INTO tenant_settings (id, name, base_currency, fiscal_year_start_month, transaction_numbering, approval_threshold, custom_fields, branches, lock_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          defaultTenant.id,
          defaultTenant.name,
          defaultTenant.baseCurrency,
          defaultTenant.fiscalYearStartMonth,
          JSON.stringify(defaultTenant.transactionNumbering),
          defaultTenant.approvalThreshold,
          JSON.stringify(defaultTenant.customFields),
          JSON.stringify(defaultTenant.branches),
          defaultTenant.lockDate || null,
        ]
      );
    }

    const partiesCheck = await pool.query('SELECT COUNT(*) FROM parties');
    if (parseInt(partiesCheck.rows[0].count) === 0) {
      console.log('Seeding default parties...');
      for (const party of seedParties) {
        await pool.query(
          `INSERT INTO parties (id, name, code, type, status, base_currency, tax_id, credit_limit, payment_terms_days, contacts, projects, documents, audit_notes, custom_fields, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            party.id,
            party.name,
            party.code,
            party.type,
            party.status,
            party.baseCurrency,
            party.taxId,
            party.creditLimit,
            party.paymentTermsDays,
            JSON.stringify(party.contacts),
            JSON.stringify(party.projects),
            JSON.stringify(party.documents),
            JSON.stringify(party.auditNotes),
            JSON.stringify(party.customFields),
            party.createdAt,
          ]
        );
      }
    }

    const txsCheck = await pool.query('SELECT COUNT(*) FROM transactions');
    if (parseInt(txsCheck.rows[0].count) === 0) {
      console.log('Seeding default transactions...');
      for (const tx of seedTransactions) {
        await pool.query(
          `INSERT INTO transactions (id, party_id, branch_id, transaction_type, reference_number, transaction_date, due_date, currency_code, amount_in_txn_currency, exchange_rate, amount_in_base_currency, status, project_id, milestone_id, tds_amount, tds_rate, is_disputed, reconciled_at, created_at, created_by, approved_by, approved_at, comments, reversal_of, custom_fields)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`,
          [
            tx.id,
            tx.partyId,
            tx.branchId,
            tx.transactionType,
            tx.referenceNumber,
            tx.transactionDate,
            tx.dueDate,
            tx.currencyCode,
            tx.amountInTxnCurrency,
            tx.exchangeRate,
            tx.amountInBaseCurrency,
            tx.status,
            tx.projectId || null,
            tx.milestoneId || null,
            tx.tdsAmount,
            tx.tdsRate,
            tx.isDisputed,
            tx.reconciledAt || null,
            tx.createdAt,
            tx.createdBy,
            tx.approvedBy || null,
            tx.approvedAt || null,
            tx.comments || null,
            tx.reversalOf || null,
            JSON.stringify(tx.customFields),
          ]
        );
      }
    }

    const logsCheck = await pool.query('SELECT COUNT(*) FROM audit_logs');
    if (parseInt(logsCheck.rows[0].count) === 0) {
      console.log('Seeding default audit logs...');
      for (const log of seedAuditLogs) {
        await pool.query(
          `INSERT INTO audit_logs (id, user_id, username, timestamp, action, details, ip_address)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [log.id, log.userId, log.username, log.timestamp, log.action, log.details, log.ipAddress]
        );
      }
    }

    const usersCheck = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(usersCheck.rows[0].count) === 0) {
      console.log('Seeding default users...');
      for (const u of seedUsers) {
        await pool.query(
          `INSERT INTO users (id, username, password, role, name)
           VALUES ($1, $2, $3, $4, $5)`,
          [u.id, u.username, u.password, u.role, u.name]
        );
      }
    }
    console.log('PostgreSQL database initialization completed successfully!');
  } catch (err) {
    console.error('Failed to initialize PostgreSQL database. Falling back to in-memory database mode.');
    console.error(err);
    useFallback = true;
    dbInfo.connected = false;
  }
}

// Initialize database
initDb();

// --- API ENDPOINTS ---

// GET /api/sync
app.get('/api/sync', async (req, res) => {
  if (useFallback || !pool) {
    return res.json({
      settings: fallbackData.settings,
      parties: fallbackData.parties,
      transactions: fallbackData.transactions,
      auditLogs: fallbackData.auditLogs,
      users: fallbackData.users,
      dbInfo: {
        connected: false,
        host: 'N/A',
        database: 'In-Memory Fallback',
        user: 'N/A',
        port: 'N/A'
      }
    });
  }

  try {
    const settingsRes = await pool.query('SELECT * FROM tenant_settings LIMIT 1');
    const partiesRes = await pool.query('SELECT * FROM parties');
    const txRes = await pool.query('SELECT * FROM transactions');
    const logsRes = await pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC');
    const usersRes = await pool.query('SELECT * FROM users');

    // map fields back to frontend structure
    const settings = settingsRes.rows[0] ? {
      id: settingsRes.rows[0].id,
      name: settingsRes.rows[0].name,
      baseCurrency: settingsRes.rows[0].base_currency,
      fiscalYearStartMonth: settingsRes.rows[0].fiscal_year_start_month,
      transactionNumbering: settingsRes.rows[0].transaction_numbering,
      approvalThreshold: parseFloat(settingsRes.rows[0].approval_threshold),
      customFields: settingsRes.rows[0].custom_fields,
      branches: settingsRes.rows[0].branches,
      lockDate: settingsRes.rows[0].lock_date || undefined,
    } : defaultTenant;

    const parties = partiesRes.rows.map(row => ({
      id: row.id,
      name: row.name,
      code: row.code,
      type: row.type,
      status: row.status,
      baseCurrency: row.base_currency,
      taxId: row.tax_id,
      creditLimit: parseFloat(row.credit_limit),
      paymentTermsDays: row.payment_terms_days,
      contacts: row.contacts,
      projects: row.projects,
      documents: row.documents,
      auditNotes: row.audit_notes,
      customFields: row.custom_fields,
      createdAt: row.created_at,
    }));

    const transactions = txRes.rows.map(row => ({
      id: row.id,
      partyId: row.party_id,
      branchId: row.branch_id,
      transactionType: row.transaction_type,
      referenceNumber: row.reference_number,
      transactionDate: row.transaction_date,
      dueDate: row.due_date,
      currencyCode: row.currency_code,
      amountInTxnCurrency: parseFloat(row.amount_in_txn_currency),
      exchangeRate: parseFloat(row.exchange_rate),
      amountInBaseCurrency: parseFloat(row.amount_in_base_currency),
      status: row.status,
      projectId: row.project_id || undefined,
      milestoneId: row.milestone_id || undefined,
      tdsAmount: parseFloat(row.tds_amount),
      tdsRate: parseFloat(row.tds_rate),
      isDisputed: row.is_disputed,
      reconciledAt: row.reconciled_at || undefined,
      createdAt: row.created_at,
      createdBy: row.created_by,
      approvedBy: row.approved_by || undefined,
      approvedAt: row.approved_at || undefined,
      comments: row.comments || undefined,
      reversalOf: row.reversal_of || undefined,
      customFields: row.custom_fields,
    }));

    const auditLogs = logsRes.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      username: row.username,
      timestamp: row.timestamp,
      action: row.action,
      details: row.details,
      ipAddress: row.ip_address,
    }));

    const users = usersRes.rows.map(row => ({
      id: row.id,
      username: row.username,
      password: row.password,
      role: row.role,
      name: row.name,
    }));

    res.json({ settings, parties, transactions, auditLogs, users, dbInfo });
  } catch (err: any) {
    console.error('Error fetching sync data:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings
app.post('/api/settings', async (req, res) => {
  const settings = req.body;
  if (useFallback || !pool) {
    fallbackData.settings = settings;
    return res.json({ success: true });
  }

  try {
    await pool.query(
      `INSERT INTO tenant_settings (id, name, base_currency, fiscal_year_start_month, transaction_numbering, approval_threshold, custom_fields, branches, lock_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         name = $2,
         base_currency = $3,
         fiscal_year_start_month = $4,
         transaction_numbering = $5,
         approval_threshold = $6,
         custom_fields = $7,
         branches = $8,
         lock_date = $9`,
      [
        settings.id || 'tenant-1',
        settings.name,
        settings.baseCurrency,
        settings.fiscalYearStartMonth,
        JSON.stringify(settings.transactionNumbering),
        settings.approvalThreshold,
        JSON.stringify(settings.customFields),
        JSON.stringify(settings.branches),
        settings.lockDate || null,
      ]
    );
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error saving settings:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/parties
app.post('/api/parties', async (req, res) => {
  const party = req.body;
  if (useFallback || !pool) {
    const idx = fallbackData.parties.findIndex(p => p.id === party.id);
    if (idx !== -1) {
      fallbackData.parties[idx] = party;
    } else {
      fallbackData.parties.push(party);
    }
    return res.json({ success: true });
  }

  try {
    await pool.query(
      `INSERT INTO parties (id, name, code, type, status, base_currency, tax_id, credit_limit, payment_terms_days, contacts, projects, documents, audit_notes, custom_fields, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO UPDATE SET
         name = $2,
         code = $3,
         type = $4,
         status = $5,
         base_currency = $6,
         tax_id = $7,
         credit_limit = $8,
         payment_terms_days = $9,
         contacts = $10,
         projects = $11,
         documents = $12,
         audit_notes = $13,
         custom_fields = $14`,
      [
        party.id,
        party.name,
        party.code,
        party.type,
        party.status,
        party.baseCurrency,
        party.taxId,
        party.creditLimit,
        party.paymentTermsDays,
        JSON.stringify(party.contacts),
        JSON.stringify(party.projects),
        JSON.stringify(party.documents),
        JSON.stringify(party.auditNotes),
        JSON.stringify(party.customFields),
        party.createdAt,
      ]
    );
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error saving party:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transactions
app.post('/api/transactions', async (req, res) => {
  const tx = req.body;
  if (useFallback || !pool) {
    const idx = fallbackData.transactions.findIndex(t => t.id === tx.id);
    if (idx !== -1) {
      fallbackData.transactions[idx] = tx;
    } else {
      fallbackData.transactions.push(tx);
    }
    return res.json({ success: true });
  }

  try {
    await pool.query(
      `INSERT INTO transactions (id, party_id, branch_id, transaction_type, reference_number, transaction_date, due_date, currency_code, amount_in_txn_currency, exchange_rate, amount_in_base_currency, status, project_id, milestone_id, tds_amount, tds_rate, is_disputed, reconciled_at, created_at, created_by, approved_by, approved_at, comments, reversal_of, custom_fields)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
       ON CONFLICT (id) DO UPDATE SET
         status = $12,
         reconciled_at = $18,
         approved_by = $21,
         approved_at = $22,
         comments = $23,
         is_disputed = $17`,
      [
        tx.id,
        tx.partyId,
        tx.branchId,
        tx.transactionType,
        tx.referenceNumber,
        tx.transactionDate,
        tx.dueDate,
        tx.currencyCode,
        tx.amountInTxnCurrency,
        tx.exchangeRate,
        tx.amountInBaseCurrency,
        tx.status,
        tx.projectId || null,
        tx.milestoneId || null,
        tx.tdsAmount,
        tx.tdsRate,
        tx.isDisputed,
        tx.reconciledAt || null,
        tx.createdAt,
        tx.createdBy,
        tx.approvedBy || null,
        tx.approvedAt || null,
        tx.comments || null,
        tx.reversalOf || null,
        JSON.stringify(tx.customFields),
      ]
    );
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error saving transaction:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/audit-logs
app.post('/api/audit-logs', async (req, res) => {
  const log = req.body;
  if (useFallback || !pool) {
    fallbackData.auditLogs.unshift(log);
    return res.json({ success: true });
  }

  try {
    await pool.query(
      `INSERT INTO audit_logs (id, user_id, username, timestamp, action, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [log.id, log.userId, log.username, log.timestamp, log.action, log.details, log.ipAddress]
    );
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error saving audit log:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reset
app.post('/api/reset', async (req, res) => {
  if (useFallback || !pool) {
    fallbackData = {
      settings: defaultTenant,
      parties: seedParties,
      transactions: seedTransactions,
      auditLogs: seedAuditLogs,
      users: seedUsers,
    };
    return res.json({ success: true });
  }

  try {
    await pool.query('DELETE FROM audit_logs');
    await pool.query('DELETE FROM transactions');
    await pool.query('DELETE FROM parties');
    await pool.query('DELETE FROM tenant_settings');
    
    // Seed
    await pool.query(
      `INSERT INTO tenant_settings (id, name, base_currency, fiscal_year_start_month, transaction_numbering, approval_threshold, custom_fields, branches, lock_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        defaultTenant.id,
        defaultTenant.name,
        defaultTenant.baseCurrency,
        defaultTenant.fiscalYearStartMonth,
        JSON.stringify(defaultTenant.transactionNumbering),
        defaultTenant.approvalThreshold,
        JSON.stringify(defaultTenant.customFields),
        JSON.stringify(defaultTenant.branches),
        defaultTenant.lockDate || null,
      ]
    );

    for (const party of seedParties) {
      await pool.query(
        `INSERT INTO parties (id, name, code, type, status, base_currency, tax_id, credit_limit, payment_terms_days, contacts, projects, documents, audit_notes, custom_fields, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          party.id,
          party.name,
          party.code,
          party.type,
          party.status,
          party.baseCurrency,
          party.taxId,
          party.creditLimit,
          party.paymentTermsDays,
          JSON.stringify(party.contacts),
          JSON.stringify(party.projects),
          JSON.stringify(party.documents),
          JSON.stringify(party.auditNotes),
          JSON.stringify(party.customFields),
          party.createdAt,
        ]
      );
    }

    for (const tx of seedTransactions) {
      await pool.query(
        `INSERT INTO transactions (id, party_id, branch_id, transaction_type, reference_number, transaction_date, due_date, currency_code, amount_in_txn_currency, exchange_rate, amount_in_base_currency, status, project_id, milestone_id, tds_amount, tds_rate, is_disputed, reconciled_at, created_at, created_by, approved_by, approved_at, comments, reversal_of, custom_fields)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`,
        [
          tx.id,
          tx.partyId,
          tx.branchId,
          tx.transactionType,
          tx.referenceNumber,
          tx.transactionDate,
          tx.dueDate,
          tx.currencyCode,
          tx.amountInTxnCurrency,
          tx.exchangeRate,
          tx.amountInBaseCurrency,
          tx.status,
          tx.projectId || null,
          tx.milestoneId || null,
          tx.tdsAmount,
          tx.tdsRate,
          tx.isDisputed,
          tx.reconciledAt || null,
          tx.createdAt,
          tx.createdBy,
          tx.approvedBy || null,
          tx.approvedAt || null,
          tx.comments || null,
          tx.reversalOf || null,
          JSON.stringify(tx.customFields),
        ]
      );
    }

    for (const log of seedAuditLogs) {
      await pool.query(
        `INSERT INTO audit_logs (id, user_id, username, timestamp, action, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [log.id, log.userId, log.username, log.timestamp, log.action, log.details, log.ipAddress]
      );
    }

    await pool.query('DELETE FROM users');
    for (const u of seedUsers) {
      await pool.query(
        `INSERT INTO users (id, username, password, role, name)
         VALUES ($1, $2, $3, $4, $5)`,
        [u.id, u.username, u.password, u.role, u.name]
      );
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error resetting database:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users
app.get('/api/users', async (req, res) => {
  if (useFallback || !pool) {
    return res.json(fallbackData.users);
  }
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows.map(r => ({
      id: r.id,
      username: r.username,
      password: r.password,
      role: r.role,
      name: r.name,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users
app.post('/api/users', async (req, res) => {
  const user = req.body;
  if (useFallback || !pool) {
    const idx = fallbackData.users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      fallbackData.users[idx] = user;
    } else {
      fallbackData.users.push(user);
    }
    return res.json({ success: true });
  }
  try {
    await pool.query(
      `INSERT INTO users (id, username, password, role, name)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         username = $2,
         password = $3,
         role = $4,
         name = $5`,
      [user.id, user.username, user.password, user.role, user.name]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id
app.delete('/api/users/:id', async (req, res) => {
  const id = req.params.id;
  if (useFallback || !pool) {
    fallbackData.users = fallbackData.users.filter(u => u.id !== id);
    return res.json({ success: true });
  }
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (useFallback || !pool) {
    const user = fallbackData.users.find(u => u.username === username && u.password === password);
    if (user) {
      return res.json({ success: true, user });
    } else {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
    if (result.rows[0]) {
      const u = result.rows[0];
      res.json({
        success: true,
        user: {
          id: u.id,
          username: u.username,
          role: u.role,
          name: u.name,
        }
      });
    } else {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (err: any) {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

// Serve frontend static assets in production
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start listening
app.listen(PORT, () => {
  console.log(`Backend Server is running on port ${PORT}`);
});
