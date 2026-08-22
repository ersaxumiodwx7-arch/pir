// Migration script for client portal tables
// Runs on server startup, safe to call multiple times (CREATE IF NOT EXISTS)

const fs = require('fs');
const path = require('path');
const pool = require('./connection');

async function migrateClientSchema() {
  try {
    const schemaPath = path.join(__dirname, 'schema-clients.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split by semicolons and run each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => {
        // Strip leading comment lines
        const lines = s.split('\n');
        const nonCommentStart = lines.findIndex(l => !l.trim().startsWith('--'));
        return nonCommentStart >= 0 ? lines.slice(nonCommentStart).join('\n').trim() : '';
      })
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      try {
        await pool.query(stmt);
      } catch (err) {
        // Ignore "table already exists" errors - everything else is logged
        if (!err.message.includes('already exists') && !err.message.includes('duplicate column')) {
          console.error('Migration warning:', err.message);
        }
      }
    }

        // Ensure 'active' column exists on client_notifications (added for notice feature)
    try {
      const cols = await pool.query("PRAGMA table_info(client_notifications)");
      const hasActive = (cols.rows || []).some(c => c.name === 'active');
      if (!hasActive) {
        await pool.query('ALTER TABLE client_notifications ADD COLUMN active INTEGER DEFAULT 1');
        console.log('Schema migration: added client_notifications.active');
      }
    } catch (e) {
      // Table may not exist yet - that's fine, CREATE TABLE will handle it
    }

    // Ensure payment_address and additional_notes columns exist on deposit_methods
    try {
      const dmCols = await pool.query("PRAGMA table_info(deposit_methods)");
      const hasPaymentAddr = (dmCols.rows || []).some(c => c.name === 'payment_address');
      const hasAddNotes = (dmCols.rows || []).some(c => c.name === 'additional_notes');
      if (!hasPaymentAddr) {
        await pool.query('ALTER TABLE deposit_methods ADD COLUMN payment_address VARCHAR(500)');
        console.log('Schema migration: added deposit_methods.payment_address');
      }
      if (!hasAddNotes) {
        await pool.query('ALTER TABLE deposit_methods ADD COLUMN additional_notes TEXT');
        console.log('Schema migration: added deposit_methods.additional_notes');
      }
    } catch (e) {
      // Table may not exist yet - that's fine, CREATE TABLE will handle it
    }

    // Ensure account_number and routing_number columns exist on clients
    try {
      const clientCols = await pool.query("PRAGMA table_info(clients)");
      const hasAccountNum = (clientCols.rows || []).some(c => c.name === 'account_number');
      const hasRoutingNum = (clientCols.rows || []).some(c => c.name === 'routing_number');
      if (!hasAccountNum) {
        await pool.query('ALTER TABLE clients ADD COLUMN account_number VARCHAR(50)');
        console.log('Schema migration: added clients.account_number');
      }
      if (!hasRoutingNum) {
        await pool.query('ALTER TABLE clients ADD COLUMN routing_number VARCHAR(50)');
        console.log('Schema migration: added clients.routing_number');
      }
    } catch (e) {
      // Table may not exist yet - that's fine, CREATE TABLE will handle it
    }

    // Ensure client_deposit_methods table columns exist
    try {
      const cdmCols = await pool.query("PRAGMA table_info(client_deposit_methods)");
      const hasPaymentAddr2 = (cdmCols.rows || []).some(c => c.name === 'payment_address');
      const hasAddNotes2 = (cdmCols.rows || []).some(c => c.name === 'additional_notes');
      const hasBankName = (cdmCols.rows || []).some(c => c.name === 'bank_name');
      const hasAccountNum2 = (cdmCols.rows || []).some(c => c.name === 'account_number');
      const hasRoutingNum2 = (cdmCols.rows || []).some(c => c.name === 'routing_number');
      const hasMapLink = (cdmCols.rows || []).some(c => c.name === 'nearest_branch_map_link');
      const hasDepositAmt = (cdmCols.rows || []).some(c => c.name === 'deposit_amount');
      if (!hasPaymentAddr2 && cdmCols.rows.length > 0) {
        await pool.query('ALTER TABLE client_deposit_methods ADD COLUMN payment_address VARCHAR(500)');
        console.log('Schema migration: added client_deposit_methods.payment_address');
      }
      if (!hasAddNotes2 && cdmCols.rows.length > 0) {
        await pool.query('ALTER TABLE client_deposit_methods ADD COLUMN additional_notes TEXT');
        console.log('Schema migration: added client_deposit_methods.additional_notes');
      }
      if (!hasBankName && cdmCols.rows.length > 0) {
        await pool.query('ALTER TABLE client_deposit_methods ADD COLUMN bank_name VARCHAR(255)');
        console.log('Schema migration: added client_deposit_methods.bank_name');
      }
      if (!hasAccountNum2 && cdmCols.rows.length > 0) {
        await pool.query('ALTER TABLE client_deposit_methods ADD COLUMN account_number VARCHAR(100)');
        console.log('Schema migration: added client_deposit_methods.account_number');
      }
      if (!hasRoutingNum2 && cdmCols.rows.length > 0) {
        await pool.query('ALTER TABLE client_deposit_methods ADD COLUMN routing_number VARCHAR(100)');
        console.log('Schema migration: added client_deposit_methods.routing_number');
      }
      if (!hasMapLink && cdmCols.rows.length > 0) {
        await pool.query('ALTER TABLE client_deposit_methods ADD COLUMN nearest_branch_map_link VARCHAR(1000)');
        console.log('Schema migration: added client_deposit_methods.nearest_branch_map_link');
      }
      if (!hasDepositAmt && cdmCols.rows.length > 0) {
        await pool.query('ALTER TABLE client_deposit_methods ADD COLUMN deposit_amount DECIMAL(15,2) DEFAULT 0');
        console.log('Schema migration: added client_deposit_methods.deposit_amount');
      }
    } catch (e) {
      // Table may not exist yet - that's fine
    }

    // Ensure payment_proof_url column exists on deposit_requests
    try {
      const drCols = await pool.query("PRAGMA table_info(deposit_requests)");
      const hasProof = (drCols.rows || []).some(c => c.name === 'payment_proof_url');
      const hasAdminNotes = (drCols.rows || []).some(c => c.name === 'admin_notes');
      if (!hasProof && drCols.rows.length > 0) {
        await pool.query('ALTER TABLE deposit_requests ADD COLUMN payment_proof_url VARCHAR(500)');
        console.log('Schema migration: added deposit_requests.payment_proof_url');
      }
      if (!hasAdminNotes && drCols.rows.length > 0) {
        await pool.query('ALTER TABLE deposit_requests ADD COLUMN admin_notes TEXT');
        console.log('Schema migration: added deposit_requests.admin_notes');
      }
    } catch (e) {
      // Table may not exist yet - that's fine
    }

    // Ensure deposit_amount column exists on deposit_methods
    try {
      const dmCols2 = await pool.query("PRAGMA table_info(deposit_methods)");
      const hasDepositAmount = (dmCols2.rows || []).some(c => c.name === 'deposit_amount');
      if (!hasDepositAmount && dmCols2.rows.length > 0) {
        await pool.query('ALTER TABLE deposit_methods ADD COLUMN deposit_amount DECIMAL(15,2) DEFAULT 0');
        console.log('Schema migration: added deposit_methods.deposit_amount');
      }
    } catch (e) {
      // Table may not exist yet
    }

    console.log('Client portal schema migration completed');
  } catch (error) {
    console.error('Client schema migration failed:', error.message);
  }
}

module.exports = { migrateClientSchema };
