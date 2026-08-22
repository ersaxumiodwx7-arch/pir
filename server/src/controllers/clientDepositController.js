const pool = require('../database/connection');

// Get client's deposit methods (per-client methods set by admin)
const getActiveMethods = async (req, res) => {
  try {
    const clientId = req.client.clientId;
    // First try per-client methods, fall back to global methods
    const clientMethods = await pool.query(
      'SELECT * FROM client_deposit_methods WHERE client_id = $1 AND is_active = 1 ORDER BY sort_order ASC, method_name',
      [clientId]
    );

    if (clientMethods.rows.length > 0) {
      return res.json({ methods: clientMethods.rows });
    }

    // Fall back to global methods
    const result = await pool.query(
      'SELECT * FROM deposit_methods WHERE is_active = 1 ORDER BY method_name'
    );
    res.json({ methods: result.rows });
  } catch (error) {
    console.error('Get active deposit methods error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get single deposit method details (client view)
const getMethodDetails = async (req, res) => {
  try {
    const clientId = req.client.clientId;
    const { id } = req.params;
    
    // Try per-client method first
    let result = await pool.query(
      'SELECT * FROM client_deposit_methods WHERE id = $1 AND client_id = $2 AND is_active = 1',
      [id, clientId]
    );

    if (result.rows.length > 0) {
      return res.json(result.rows[0]);
    }

    // Fall back to global method
    result = await pool.query(
      'SELECT * FROM deposit_methods WHERE id = $1 AND is_active = 1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deposit method not found or inactive' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get deposit method details error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Submit deposit request
const submitDeposit = async (req, res) => {
  try {
    const clientId = req.client.clientId;
    const { deposit_method_id, reference_number, tracking_number, notes } = req.body;
    const paymentProofUrl = req.file ? `/uploads/${req.file.filename}` : null;

    if (!deposit_method_id) {
      return res.status(400).json({ error: 'Deposit method is required' });
    }

    // Try to find the method in client_deposit_methods first, then fall back to global
    let method = null;
    let clientDepositMethodId = null;

    const clientMethodResult = await pool.query(
      'SELECT * FROM client_deposit_methods WHERE id = $1 AND client_id = $2 AND is_active = 1',
      [deposit_method_id, clientId]
    );

    if (clientMethodResult.rows.length > 0) {
      method = clientMethodResult.rows[0];
      clientDepositMethodId = method.id;
    } else {
      const globalResult = await pool.query(
        'SELECT * FROM deposit_methods WHERE id = $1 AND is_active = 1',
        [deposit_method_id]
      );
      if (globalResult.rows.length > 0) {
        method = globalResult.rows[0];
      }
    }

    if (!method) {
      return res.status(404).json({ error: 'Deposit method not found or inactive' });
    }

    // Use the admin-set deposit amount from the method
    const depositAmount = parseFloat(method.deposit_amount || 0);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return res.status(400).json({ error: 'This deposit method has no amount set. Please contact your administrator.' });
    }

    // Create deposit request
    const result = await pool.query(
      `INSERT INTO deposit_requests (client_id, deposit_method_id, client_deposit_method_id, amount, reference_number, tracking_number, notes, payment_proof_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') RETURNING *`,
      [clientId, deposit_method_id, clientDepositMethodId, depositAmount, reference_number || null, tracking_number || null, notes || null, paymentProofUrl]
    );

    const deposit = result.rows[0];

    // Generate transaction ID
    const txnId = 'DEP-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    
    await pool.query(
      'UPDATE deposit_requests SET transaction_id = $1 WHERE id = $2',
      [txnId, deposit.id]
    );

    // Create a pending transaction record (visible in transaction history)
    await pool.query(
      `INSERT INTO client_transactions (client_id, transaction_id, description, credit_amount, debit_amount, balance_after, status, category, reference)
       VALUES ($1, $2, $3, $4, 0, 0, 'pending', 'deposit', $5)`,
      [clientId, txnId, `Deposit via ${method.method_name}`, depositAmount, deposit.id]
    );

    // Notify client
    await pool.query(
      `INSERT INTO client_notifications (client_id, title, message, notification_type, priority)
       VALUES ($1, 'Deposit Request Submitted', $2, 'transaction', 'normal')`,
      [clientId, `Your deposit request of $${depositAmount.toFixed(2)} via ${method.method_name} has been submitted and is pending review.`]
    );

    res.status(201).json({
      id: deposit.id,
      amount: depositAmount,
      method_name: method.method_name,
      method_type: method.method_type,
      status: 'pending',
      transaction_id: txnId,
      payment_proof_url: paymentProofUrl,
      created_at: deposit.created_at
    });
  } catch (error) {
    console.error('Submit deposit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get client's deposit history
const getMyDeposits = async (req, res) => {
  try {
    const clientId = req.client.clientId;

    const result = await pool.query(
      `SELECT dr.*, COALESCE(dm.method_name, cdm.method_name) as method_name, COALESCE(dm.method_type, cdm.method_type) as method_type
       FROM deposit_requests dr
       LEFT JOIN deposit_methods dm ON dr.deposit_method_id = dm.id
       LEFT JOIN client_deposit_methods cdm ON dr.client_deposit_method_id = cdm.id
       WHERE dr.client_id = $1
       ORDER BY dr.created_at DESC`,
      [clientId]
    );

    res.json({ deposits: result.rows });
  } catch (error) {
    console.error('Get my deposits error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get single deposit details
const getMyDepositDetails = async (req, res) => {
  try {
    const clientId = req.client.clientId;
    const { id } = req.params;

    const result = await pool.query(
      `SELECT dr.*, COALESCE(dm.method_name, cdm.method_name) as method_name, COALESCE(dm.method_type, cdm.method_type) as method_type,
             COALESCE(dm.instructions, cdm.instructions) as instructions, COALESCE(dm.recipient_name, cdm.recipient_name) as recipient_name,
             COALESCE(dm.account_details, cdm.account_number) as account_details
       FROM deposit_requests dr
       LEFT JOIN deposit_methods dm ON dr.deposit_method_id = dm.id
       LEFT JOIN client_deposit_methods cdm ON dr.client_deposit_method_id = cdm.id
       WHERE dr.id = $1 AND dr.client_id = $2`,
      [id, clientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get my deposit details error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getActiveMethods, getMethodDetails, submitDeposit, getMyDeposits, getMyDepositDetails
};
