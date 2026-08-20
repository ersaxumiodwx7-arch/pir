const pool = require('../database/connection');

// Get all deposit requests
const getAllDeposits = async (req, res) => {
  try {
    const { status, client_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      whereClause += ` AND dr.status = $${params.length}`;
    }

    if (client_id) {
      params.push(client_id);
      whereClause += ` AND dr.client_id = $${params.length}`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM deposit_requests dr ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);

    const result = await pool.query(
      `SELECT dr.*, c.case_id, c.full_name as client_name, c.email as client_email,
              dm.method_name, dm.method_type
       FROM deposit_requests dr
       JOIN clients c ON dr.client_id = c.id
       JOIN deposit_methods dm ON dr.deposit_method_id = dm.id
       ${whereClause}
       ORDER BY dr.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      deposits: result.rows,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Get deposits error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get single deposit request
const getDeposit = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT dr.*, c.case_id, c.full_name as client_name, c.email as client_email,
              dm.method_name, dm.method_type, dm.instructions, dm.recipient_name, dm.account_details
       FROM deposit_requests dr
       JOIN clients c ON dr.client_id = c.id
       JOIN deposit_methods dm ON dr.deposit_method_id = dm.id
       WHERE dr.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deposit request not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get deposit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update deposit status
const updateDepositStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'received', 'available', 'rejected', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    // Get current deposit
    const currentResult = await pool.query(
      'SELECT * FROM deposit_requests WHERE id = $1',
      [id]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deposit request not found' });
    }

    const deposit = currentResult.rows[0];
    const previousStatus = deposit.status;
    const amount = parseFloat(deposit.amount);

    // If status is already the same, no change needed
    if (previousStatus === status) {
      return res.json(deposit);
    }

    // Update deposit status
    await pool.query(
      'UPDATE deposit_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, id]
    );

    // Get current client balance
    const clientResult = await pool.query(
      'SELECT display_balance FROM clients WHERE id = $1',
      [deposit.client_id]
    );
    let currentBalance = parseFloat(clientResult.rows[0].display_balance) || 0;

    // Generate transaction ID if not exists
    let txnId = deposit.transaction_id;
    if (!txnId) {
      txnId = 'DEP-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
      
      // Update deposit with transaction ID
      await pool.query(
        'UPDATE deposit_requests SET transaction_id = $1 WHERE id = $2',
        [txnId, id]
      );
    }

    // Handle balance changes based on status transition
    // Only add to balance when status changes TO 'available'
    // Only remove from balance when status changes FROM 'available'
    
    const wasAvailable = previousStatus === 'available';
    const isNowAvailable = status === 'available';

    if (!wasAvailable && isNowAvailable) {
      // Adding funds: status changed TO available
      const newBalance = currentBalance + amount;
      
      await pool.query(
        'UPDATE clients SET display_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newBalance, deposit.client_id]
      );

      // Create or update transaction record
      const existingTxn = await pool.query(
        'SELECT id FROM client_transactions WHERE transaction_id = $1',
        [txnId]
      );

      if (existingTxn.rows.length > 0) {
        // Update existing transaction
        await pool.query(
          `UPDATE client_transactions SET status = 'completed', balance_after = $1, updated_at = CURRENT_TIMESTAMP WHERE transaction_id = $2`,
          [newBalance, txnId]
        );
      } else {
        // Create new transaction
        await pool.query(
          `INSERT INTO client_transactions (client_id, transaction_id, description, credit_amount, debit_amount, balance_after, status, category, reference)
           VALUES ($1, $2, $3, $4, 0, $5, 'completed', 'deposit', $6)`,
          [deposit.client_id, txnId, `Deposit via ${deposit.method_type || 'transfer'}`, amount, newBalance, deposit.id]
        );
      }

      // Notify client
      await pool.query(
        `INSERT INTO client_notifications (client_id, title, message, notification_type, priority)
         VALUES ($1, 'Deposit Available', $2, 'transaction', 'normal')`,
        [deposit.client_id, `Your deposit of $${amount.toFixed(2)} is now available in your account.`]
      );

    } else if (wasAvailable && !isNowAvailable) {
      // Removing funds: status changed FROM available
      const newBalance = currentBalance - amount;
      
      await pool.query(
        'UPDATE clients SET display_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newBalance, deposit.client_id]
      );

      // Update transaction status
      await pool.query(
        `UPDATE client_transactions SET status = $1, balance_after = $2, updated_at = CURRENT_TIMESTAMP WHERE transaction_id = $3`,
        [status === 'rejected' ? 'failed' : status, newBalance, txnId]
      );

      // Notify client
      if (status === 'rejected' || status === 'cancelled') {
        await pool.query(
          `INSERT INTO client_notifications (client_id, title, message, notification_type, priority)
           VALUES ($1, 'Deposit Rejected', $2, 'transaction', 'high')`,
          [deposit.client_id, `Your deposit of $${amount.toFixed(2)} has been ${status}. Please contact support for more information.`]
        );
      }
    } else {
      // Status change but not involving available balance
      // Just update the transaction status if it exists
      const txnStatus = status === 'rejected' ? 'failed' : (status === 'cancelled' ? 'cancelled' : status);
      
      await pool.query(
        `UPDATE client_transactions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE transaction_id = $2`,
        [txnStatus, txnId]
      );

      // Notify client of status change
      if (status === 'processing' || status === 'received') {
        await pool.query(
          `INSERT INTO client_notifications (client_id, title, message, notification_type, priority)
           VALUES ($1, 'Deposit Update', $2, 'transaction', 'normal')`,
          [deposit.client_id, `Your deposit of $${amount.toFixed(2)} is now ${status}.`]
        );
      }
    }

    // Get updated deposit
    const updatedDeposit = await pool.query('SELECT * FROM deposit_requests WHERE id = $1', [id]);
    res.json(updatedDeposit.rows[0]);
  } catch (error) {
    console.error('Update deposit status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get deposit stats
const getDepositStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
        COUNT(CASE WHEN status = 'received' THEN 1 END) as received,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available,
        COUNT(CASE WHEN status IN ('rejected', 'cancelled') THEN 1 END) as rejected,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN status = 'processing' THEN amount ELSE 0 END), 0) as processing_amount,
        COALESCE(SUM(CASE WHEN status = 'available' THEN amount ELSE 0 END), 0) as available_amount
      FROM deposit_requests
    `);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Get deposit stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllDeposits, getDeposit, updateDepositStatus, getDepositStats
};
