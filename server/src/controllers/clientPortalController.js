const pool = require('../database/connection');

// Get dashboard overview
const getDashboard = async (req, res) => {
  try {
    const clientId = req.client.clientId;

    const clientResult = await pool.query(
      `SELECT id, case_id, full_name, email, phone, account_status, display_balance as balance, account_type, account_number, routing_number, created_at, last_login_at FROM clients WHERE id = $1`,
      [clientId]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const client = clientResult.rows[0];

    // Recent transactions
    const transactions = await pool.query(
      'SELECT * FROM client_transactions WHERE client_id = $1 ORDER BY created_at DESC LIMIT 5',
      [clientId]
    );

    // Unread notifications count
    const unreadCount = await pool.query(
      'SELECT COUNT(*) as count FROM client_notifications WHERE client_id = $1 AND is_read = 0',
      [clientId]
    );

    // Recent notifications
    const notifications = await pool.query(
      'SELECT * FROM client_notifications WHERE client_id = $1 ORDER BY created_at DESC LIMIT 5',
      [clientId]
    );

    // Active notice (for dashboard conditional display)
    let activeNotice = null;
    try {
      const noticeResult = await pool.query(
        `SELECT * FROM client_notifications WHERE client_id = $1 AND active = 1 AND notification_type = 'notice' ORDER BY created_at DESC LIMIT 1`,
        [clientId]
      );
      if (noticeResult.rows.length > 0) {
        activeNotice = noticeResult.rows[0];
      }
    } catch (e) {
      // Column may not exist yet - ignore
    }

    // Account summary - include all statuses
    const totalCredit = await pool.query(
      'SELECT COALESCE(SUM(credit_amount), 0) as total FROM client_transactions WHERE client_id = $1',
      [clientId]
    );

    const totalDebit = await pool.query(
      'SELECT COALESCE(SUM(debit_amount), 0) as total FROM client_transactions WHERE client_id = $1',
      [clientId]
    );

    // Calculate processing balance (pending and processing deposits)
    let processingBalance = 0;
    try {
      const processingResult = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM deposit_requests 
         WHERE client_id = $1 AND status IN ('pending', 'processing')`,
        [clientId]
      );
      processingBalance = parseFloat(processingResult.rows[0].total) || 0;
    } catch (e) {
      // Table may not exist yet
    }

    res.json({
      client,
      recent_transactions: transactions.rows,
      unread_count: parseInt(unreadCount.rows[0].count),
      recent_notifications: notifications.rows,
      active_notice: activeNotice,
      summary: {
        total_credit: parseFloat(totalCredit.rows[0].total),
        total_debit: parseFloat(totalDebit.rows[0].total),
        balance: client.balance,
        processing_balance: processingBalance
      }
    });
  } catch (error) {
    console.error('Client dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get account details
const getAccountDetails = async (req, res) => {
  try {
    const clientId = req.client.clientId;
    const result = await pool.query(
      `SELECT id, case_id, full_name, email, phone, account_status, display_balance as balance, account_type, account_number, routing_number, created_at, last_login_at, address, date_of_birth
       FROM clients WHERE id = $1`,
      [clientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get account details error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get transactions (client view - only their own)
const getTransactions = async (req, res) => {
  try {
    const clientId = req.client.clientId;
    const { type, status, from_date, to_date } = req.query;

    let whereClause = 'WHERE client_id = $1';
    const params = [clientId];
    let paramIndex = 2;

    if (type === 'credit') {
      whereClause += ` AND credit_amount > 0`;
    } else if (type === 'debit') {
      whereClause += ` AND debit_amount > 0`;
    }

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (from_date) {
      whereClause += ` AND created_at >= $${paramIndex}`;
      params.push(from_date);
      paramIndex++;
    }

    if (to_date) {
      whereClause += ` AND created_at <= $${paramIndex}`;
      params.push(to_date);
      paramIndex++;
    }

    const result = await pool.query(
      `SELECT * FROM client_transactions ${whereClause} ORDER BY created_at DESC`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get client transactions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get documents (client view)
const getDocuments = async (req, res) => {
  try {
    const clientId = req.client.clientId;
    const result = await pool.query(
      'SELECT * FROM client_documents WHERE client_id = $1 ORDER BY uploaded_at DESC',
      [clientId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get client documents error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get notifications (client view)
const getNotifications = async (req, res) => {
  try {
    const clientId = req.client.clientId;
    const result = await pool.query(
      'SELECT * FROM client_notifications WHERE client_id = $1 ORDER BY created_at DESC',
      [clientId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get client notifications error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Mark notification as read
const markNotificationRead = async (req, res) => {
  try {
    const clientId = req.client.clientId;
    const { id } = req.params;

    await pool.query(
      'UPDATE client_notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = $1 AND client_id = $2',
      [id, clientId]
    );

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Mark all notifications as read
const markAllNotificationsRead = async (req, res) => {
  try {
    const clientId = req.client.clientId;

    await pool.query(
      'UPDATE client_notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE client_id = $1 AND is_read = 0',
      [clientId]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get activity log (client view)
const getActivity = async (req, res) => {
  try {
    const clientId = req.client.clientId;
    const result = await pool.query(
      'SELECT * FROM client_activity_logs WHERE client_id = $1 ORDER BY created_at DESC LIMIT 50',
      [clientId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get client activity error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Bill Payments (client view)
const getBillPayments = async (req, res) => {
  try {
    const clientId = req.client.clientId;
    const result = await pool.query(
      'SELECT * FROM client_bill_payments WHERE client_id = $1 ORDER BY created_at DESC',
      [clientId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get bill payments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const submitBillPayment = async (req, res) => {
  try {
    const clientId = req.client.clientId;
    const { biller_name, amount, account_reference, payment_date, notes } = req.body;

    if (!biller_name || !amount || !payment_date) {
      return res.status(400).json({ error: 'Biller name, amount, and payment date are required' });
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    // Check client balance
    const clientResult = await pool.query('SELECT display_balance FROM clients WHERE id = $1', [clientId]);
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const currentBalance = parseFloat(clientResult.rows[0].display_balance) || 0;
    if (currentBalance < payAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const newBalance = currentBalance - payAmount;

    // Generate transaction ID
    const txnId = 'TXN-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();

    // Create the bill payment record
    const billResult = await pool.query(
      `INSERT INTO client_bill_payments (client_id, biller_name, amount, account_reference, payment_date, status, transaction_id, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, 'processing', $6, $7, $8) RETURNING *`,
      [clientId, biller_name, payAmount, account_reference || null, payment_date, txnId, notes || null, clientId]
    );

    // Create the transaction record (debit)
    await pool.query(
      `INSERT INTO client_transactions (client_id, transaction_id, description, credit_amount, debit_amount, balance_after, status, category, reference, created_by)
       VALUES ($1, $2, $3, 0, $4, $5, 'processing', 'bill_payment', $6, $7)`,
      [clientId, txnId, `Bill Payment - ${biller_name}`, payAmount, newBalance, billResult.rows[0].id, clientId]
    );

    // Update client balance
    await pool.query(
      'UPDATE clients SET display_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newBalance, clientId]
    );

    // Notify client
    await pool.query(
      `INSERT INTO client_notifications (client_id, title, message, notification_type, priority, created_by)
       VALUES ($1, 'Bill Payment Submitted', $2, 'transaction', 'normal', $3)`,
      [clientId, `Bill payment of $${payAmount.toFixed(2)} to ${biller_name} is being processed.`, clientId]
    );

    res.status(201).json(billResult.rows[0]);
  } catch (error) {
    console.error('Submit bill payment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getDashboard, getAccountDetails, getTransactions,
  getDocuments, getNotifications, markNotificationRead, markAllNotificationsRead,
  getActivity, getBillPayments, submitBillPayment
};
