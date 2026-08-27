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
      const hasLinkUrl = (cols.rows || []).some(c => c.name === 'link_url');
      if (!hasLinkUrl) {
        await pool.query('ALTER TABLE client_notifications ADD COLUMN link_url VARCHAR(500) DEFAULT NULL');
        console.log('Schema migration: added client_notifications.link_url');
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

    // Ensure crypto columns exist on client_deposit_methods
    try {
      const cdmCols2 = await pool.query("PRAGMA table_info(client_deposit_methods)");
      const hasCryptoType = (cdmCols2.rows || []).some(c => c.name === 'crypto_type');
      const hasWalletAddr = (cdmCols2.rows || []).some(c => c.name === 'wallet_address');
      const hasQrImage = (cdmCols2.rows || []).some(c => c.name === 'qr_image_url');
      if (!hasCryptoType && cdmCols2.rows.length > 0) {
        await pool.query('ALTER TABLE client_deposit_methods ADD COLUMN crypto_type VARCHAR(20) DEFAULT NULL');
        console.log('Schema migration: added client_deposit_methods.crypto_type');
      }
      if (!hasWalletAddr && cdmCols2.rows.length > 0) {
        await pool.query('ALTER TABLE client_deposit_methods ADD COLUMN wallet_address VARCHAR(500) DEFAULT NULL');
        console.log('Schema migration: added client_deposit_methods.wallet_address');
      }
      if (!hasQrImage && cdmCols2.rows.length > 0) {
        await pool.query('ALTER TABLE client_deposit_methods ADD COLUMN qr_image_url VARCHAR(500) DEFAULT NULL');
        console.log('Schema migration: added client_deposit_methods.qr_image_url');
      }
    } catch (e) {
      // Table may not exist yet
    }

    // Ensure crypto columns exist on deposit_methods (global)
    try {
      const dmCols3 = await pool.query("PRAGMA table_info(deposit_methods)");
      const hasCryptoTypeG = (dmCols3.rows || []).some(c => c.name === 'crypto_type');
      const hasWalletAddrG = (dmCols3.rows || []).some(c => c.name === 'wallet_address');
      const hasQrImageG = (dmCols3.rows || []).some(c => c.name === 'qr_image_url');
      if (!hasCryptoTypeG && dmCols3.rows.length > 0) {
        await pool.query('ALTER TABLE deposit_methods ADD COLUMN crypto_type VARCHAR(20) DEFAULT NULL');
        console.log('Schema migration: added deposit_methods.crypto_type');
      }
      if (!hasWalletAddrG && dmCols3.rows.length > 0) {
        await pool.query('ALTER TABLE deposit_methods ADD COLUMN wallet_address VARCHAR(500) DEFAULT NULL');
        console.log('Schema migration: added deposit_methods.wallet_address');
      }
      if (!hasQrImageG && dmCols3.rows.length > 0) {
        await pool.query('ALTER TABLE deposit_methods ADD COLUMN qr_image_url VARCHAR(500) DEFAULT NULL');
        console.log('Schema migration: added deposit_methods.qr_image_url');
      }
    } catch (e) {
      // Table may not exist yet
    }

    // Ensure pickup columns exist on client_deposit_methods
    try {
      const cdmCols3 = await pool.query("PRAGMA table_info(client_deposit_methods)");
      const hasPickupCarrier = (cdmCols3.rows || []).some(c => c.name === 'pickup_carrier');
      const hasPickupLocation = (cdmCols3.rows || []).some(c => c.name === 'pickup_location');
      const hasPickupDate = (cdmCols3.rows || []).some(c => c.name === 'pickup_scheduled_date');
      const hasInsuredVal = (cdmCols3.rows || []).some(c => c.name === 'insured_value');
      if (!hasPickupCarrier && cdmCols3.rows.length > 0) {
        await pool.query('ALTER TABLE client_deposit_methods ADD COLUMN pickup_carrier VARCHAR(50) DEFAULT NULL');
        console.log('Schema migration: added client_deposit_methods.pickup_carrier');
      }
      if (!hasPickupLocation && cdmCols3.rows.length > 0) {
        await pool.query('ALTER TABLE client_deposit_methods ADD COLUMN pickup_location VARCHAR(500) DEFAULT NULL');
        console.log('Schema migration: added client_deposit_methods.pickup_location');
      }
      if (!hasPickupDate && cdmCols3.rows.length > 0) {
        await pool.query('ALTER TABLE client_deposit_methods ADD COLUMN pickup_scheduled_date VARCHAR(50) DEFAULT NULL');
        console.log('Schema migration: added client_deposit_methods.pickup_scheduled_date');
      }
      if (!hasInsuredVal && cdmCols3.rows.length > 0) {
        await pool.query('ALTER TABLE client_deposit_methods ADD COLUMN insured_value DECIMAL(15,2) DEFAULT NULL');
        console.log('Schema migration: added client_deposit_methods.insured_value');
      }
      // Recipient address
      const hasRecipAddr = (cdmCols3.rows || []).some(c => c.name === 'recipient_address');
      if (!hasRecipAddr && cdmCols3.rows.length > 0) {
        await pool.query('ALTER TABLE client_deposit_methods ADD COLUMN recipient_address VARCHAR(500) DEFAULT NULL');
        console.log('Schema migration: added client_deposit_methods.recipient_address');
      }
      // Pickup tracking fields
      const hasPickupStatus = (cdmCols3.rows || []).some(c => c.name === 'pickup_status');
      const hasPickerName = (cdmCols3.rows || []).some(c => c.name === 'picker_name');
      const hasPickerImage = (cdmCols3.rows || []).some(c => c.name === 'picker_image');
      const hasCarName = (cdmCols3.rows || []).some(c => c.name === 'car_name');
      const hasCarNumber = (cdmCols3.rows || []).some(c => c.name === 'car_number');
      const hasEstArrival = (cdmCols3.rows || []).some(c => c.name === 'estimated_arrival');
      if (!hasPickupStatus && cdmCols3.rows.length > 0) {
        await pool.query("ALTER TABLE client_deposit_methods ADD COLUMN pickup_status VARCHAR(50) DEFAULT 'scheduled'");
        console.log('Schema migration: added client_deposit_methods.pickup_status');
      }
      if (!hasPickerName && cdmCols3.rows.length > 0) {
        await pool.query('ALTER TABLE client_deposit_methods ADD COLUMN picker_name VARCHAR(255) DEFAULT NULL');
        console.log('Schema migration: added client_deposit_methods.picker_name');
      }
      if (!hasPickerImage && cdmCols3.rows.length > 0) {
        await pool.query('ALTER TABLE client_deposit_methods ADD COLUMN picker_image VARCHAR(500) DEFAULT NULL');
        console.log('Schema migration: added client_deposit_methods.picker_image');
      }
      if (!hasCarName && cdmCols3.rows.length > 0) {
        await pool.query('ALTER TABLE client_deposit_methods ADD COLUMN car_name VARCHAR(255) DEFAULT NULL');
        console.log('Schema migration: added client_deposit_methods.car_name');
      }
      if (!hasCarNumber && cdmCols3.rows.length > 0) {
        await pool.query('ALTER TABLE client_deposit_methods ADD COLUMN car_number VARCHAR(50) DEFAULT NULL');
        console.log('Schema migration: added client_deposit_methods.car_number');
      }
      if (!hasEstArrival && cdmCols3.rows.length > 0) {
        await pool.query('ALTER TABLE client_deposit_methods ADD COLUMN estimated_arrival VARCHAR(100) DEFAULT NULL');
        console.log('Schema migration: added client_deposit_methods.estimated_arrival');
      }
    } catch (e) {
      // Table may not exist yet
    }

    // Ensure pickup columns exist on deposit_methods (global)
    try {
      const dmCols4 = await pool.query("PRAGMA table_info(deposit_methods)");
      const hasPickupCarrierG = (dmCols4.rows || []).some(c => c.name === 'pickup_carrier');
      const hasPickupLocationG = (dmCols4.rows || []).some(c => c.name === 'pickup_location');
      const hasPickupDateG = (dmCols4.rows || []).some(c => c.name === 'pickup_scheduled_date');
      const hasInsuredValG = (dmCols4.rows || []).some(c => c.name === 'insured_value');
      if (!hasPickupCarrierG && dmCols4.rows.length > 0) {
        await pool.query('ALTER TABLE deposit_methods ADD COLUMN pickup_carrier VARCHAR(50) DEFAULT NULL');
        console.log('Schema migration: added deposit_methods.pickup_carrier');
      }
      if (!hasPickupLocationG && dmCols4.rows.length > 0) {
        await pool.query('ALTER TABLE deposit_methods ADD COLUMN pickup_location VARCHAR(500) DEFAULT NULL');
        console.log('Schema migration: added deposit_methods.pickup_location');
      }
      if (!hasPickupDateG && dmCols4.rows.length > 0) {
        await pool.query('ALTER TABLE deposit_methods ADD COLUMN pickup_scheduled_date VARCHAR(50) DEFAULT NULL');
        console.log('Schema migration: added deposit_methods.pickup_scheduled_date');
      }
      if (!hasInsuredValG && dmCols4.rows.length > 0) {
        await pool.query('ALTER TABLE deposit_methods ADD COLUMN insured_value DECIMAL(15,2) DEFAULT NULL');
        console.log('Schema migration: added deposit_methods.insured_value');
      }
      // Recipient address (global)
      const hasRecipAddrG = (dmCols4.rows || []).some(c => c.name === 'recipient_address');
      if (!hasRecipAddrG && dmCols4.rows.length > 0) {
        await pool.query('ALTER TABLE deposit_methods ADD COLUMN recipient_address VARCHAR(500) DEFAULT NULL');
        console.log('Schema migration: added deposit_methods.recipient_address');
      }
      // Pickup tracking fields
      const hasPickupStatusG = (dmCols4.rows || []).some(c => c.name === 'pickup_status');
      const hasPickerNameG = (dmCols4.rows || []).some(c => c.name === 'picker_name');
      const hasPickerImageG = (dmCols4.rows || []).some(c => c.name === 'picker_image');
      const hasCarNameG = (dmCols4.rows || []).some(c => c.name === 'car_name');
      const hasCarNumberG = (dmCols4.rows || []).some(c => c.name === 'car_number');
      const hasEstArrivalG = (dmCols4.rows || []).some(c => c.name === 'estimated_arrival');
      if (!hasPickupStatusG && dmCols4.rows.length > 0) {
        await pool.query("ALTER TABLE deposit_methods ADD COLUMN pickup_status VARCHAR(50) DEFAULT 'scheduled'");
        console.log('Schema migration: added deposit_methods.pickup_status');
      }
      if (!hasPickerNameG && dmCols4.rows.length > 0) {
        await pool.query('ALTER TABLE deposit_methods ADD COLUMN picker_name VARCHAR(255) DEFAULT NULL');
        console.log('Schema migration: added deposit_methods.picker_name');
      }
      if (!hasPickerImageG && dmCols4.rows.length > 0) {
        await pool.query('ALTER TABLE deposit_methods ADD COLUMN picker_image VARCHAR(500) DEFAULT NULL');
        console.log('Schema migration: added deposit_methods.picker_image');
      }
      if (!hasCarNameG && dmCols4.rows.length > 0) {
        await pool.query('ALTER TABLE deposit_methods ADD COLUMN car_name VARCHAR(255) DEFAULT NULL');
        console.log('Schema migration: added deposit_methods.car_name');
      }
      if (!hasCarNumberG && dmCols4.rows.length > 0) {
        await pool.query('ALTER TABLE deposit_methods ADD COLUMN car_number VARCHAR(50) DEFAULT NULL');
        console.log('Schema migration: added deposit_methods.car_number');
      }
      if (!hasEstArrivalG && dmCols4.rows.length > 0) {
        await pool.query('ALTER TABLE deposit_methods ADD COLUMN estimated_arrival VARCHAR(100) DEFAULT NULL');
        console.log('Schema migration: added deposit_methods.estimated_arrival');
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
