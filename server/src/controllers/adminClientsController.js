const pool = require('../database/connection');
const bcrypt = require('bcryptjs');

// Generate unique Case ID
function generateCaseId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let caseId = 'CS-';
  for (let i = 0; i < 8; i++) {
    caseId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return caseId;
}

// Get all clients with stats
const getAllClients = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (case_id LIKE $${params.length} OR full_name LIKE $${params.length} OR email LIKE $${params.length})`;
    }

    if (status) {
      params.push(status);
      whereClause += ` AND account_status = $${params.length}`;
    }

    const countResult = await pool.query(`SELECT COUNT(*) FROM clients ${whereClause}`, params);
    const totalCount = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);

    const result = await pool.query(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM client_transactions WHERE client_id = c.id) as transaction_count,
        (SELECT COUNT(*) FROM client_documents WHERE client_id = c.id) as document_count,
        (SELECT COUNT(*) FROM client_notifications WHERE client_id = c.id AND is_read = 0) as unread_notifications
       FROM clients c ${whereClause} ORDER BY c.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    // Get summary stats
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN account_status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN account_status = 'suspended' THEN 1 END) as suspended,
        COUNT(CASE WHEN account_status = 'closed' THEN 1 END) as closed,
        COALESCE(SUM(display_balance), 0) as total_balance
      FROM clients
    `);

    res.json({
      clients: result.rows,
      stats: statsResult.rows[0],
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get single client with full details
const getClient = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM client_transactions WHERE client_id = c.id) as transaction_count,
        (SELECT COUNT(*) FROM client_documents WHERE client_id = c.id) as document_count,
        (SELECT COUNT(*) FROM client_notifications WHERE client_id = c.id AND is_read = 0) as unread_notifications
       FROM clients c WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const client = result.rows[0];
    delete client.password_hash;

    res.json(client);
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create new client
const createClient = async (req, res) => {
  try {
    const {
      full_name, email, phone, password,
      display_balance, account_status, account_type,
      address, date_of_birth, ssn_last4
    } = req.body;

    if (!full_name) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check for duplicate email
    if (email) {
      const existing = await pool.query('SELECT id FROM clients WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    // Generate unique Case ID
    let caseId;
    let isUnique = false;
    while (!isUnique) {
      caseId = generateCaseId();
      const check = await pool.query('SELECT id FROM clients WHERE case_id = $1', [caseId]);
      isUnique = check.rows.length === 0;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO clients (case_id, password_hash, full_name, email, phone, account_status, display_balance, account_type, address, date_of_birth, ssn_last4, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [caseId, passwordHash, full_name, email || null, phone || null,
       account_status || 'active', display_balance || 0, account_type || 'standard',
       address || null, date_of_birth || null, ssn_last4 || null, req.user.userId]
    );

    const client = result.rows[0];
    delete client.password_hash;

    // Log activity
    await pool.query(
      'INSERT INTO client_activity_logs (client_id, action, description) VALUES ($1, $2, $3)',
      [client.id, 'account_created', `Account created by admin`]
    );

    res.status(201).json(client);
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update client
const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const allowedFields = ['full_name', 'email', 'phone', 'account_status', 'display_balance', 'account_type', 'address', 'date_of_birth', 'ssn_last4', 'account_number', 'routing_number'];
    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = $${paramIndex}`);
        params.push(updates[field]);
        paramIndex++;
      }
    }

    // Handle password change separately
    if (updates.password) {
      const hash = await bcrypt.hash(updates.password, 10);
      setClauses.push(`password_hash = $${paramIndex}`);
      params.push(hash);
      paramIndex++;
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const result = await pool.query(
      `UPDATE clients SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const client = result.rows[0];
    delete client.password_hash;

    res.json(client);
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete client
const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM clients WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json({ message: 'Client deleted' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Transactions
const getClientTransactions = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, status, from_date, to_date } = req.query;

    let whereClause = 'WHERE client_id = $1';
    const params = [id];
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
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, credit_amount, debit_amount, status, category, reference } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const credit = parseFloat(credit_amount) || 0;
    const debit = parseFloat(debit_amount) || 0;

    if (credit === 0 && debit === 0) {
      return res.status(400).json({ error: 'Either credit or debit amount is required' });
    }

    // Get current balance
    const clientResult = await pool.query('SELECT display_balance, case_id FROM clients WHERE id = $1', [id]);
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const currentBalance = parseFloat(clientResult.rows[0].display_balance) || 0;
    const newBalance = currentBalance + credit - debit;

    // Generate transaction ID
    const txnId = 'TXN-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();

    const result = await pool.query(
      `INSERT INTO client_transactions (client_id, transaction_id, description, credit_amount, debit_amount, balance_after, status, category, reference, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [id, txnId, description, credit, debit, newBalance, status || 'completed', category || null, reference || null, req.user.userId]
    );

    // Update client balance
    await pool.query(
      'UPDATE clients SET display_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newBalance, id]
    );

    // Create notification for the transaction
    await pool.query(
      `INSERT INTO client_notifications (client_id, title, message, notification_type, priority, created_by)
       VALUES ($1, $2, $3, 'transaction', 'normal', $4)`,
      [id, credit > 0 ? 'Credit Received' : 'Debit Processed',
       `${credit > 0 ? 'Credited' : 'Debited'}: $${(credit || debit).toFixed(2)} - ${description}`,
       req.user.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateTransaction = async (req, res) => {
  try {
    const { id, transactionId } = req.params;
    const { description, credit_amount, debit_amount, status, category, reference, created_at } = req.body;

    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    if (description !== undefined) { setClauses.push(`description = $${paramIndex}`); params.push(description); paramIndex++; }
    if (credit_amount !== undefined) { setClauses.push(`credit_amount = $${paramIndex}`); params.push(parseFloat(credit_amount)); paramIndex++; }
    if (debit_amount !== undefined) { setClauses.push(`debit_amount = $${paramIndex}`); params.push(parseFloat(debit_amount)); paramIndex++; }
    if (status !== undefined) { setClauses.push(`status = $${paramIndex}`); params.push(status); paramIndex++; }
    if (category !== undefined) { setClauses.push(`category = $${paramIndex}`); params.push(category); paramIndex++; }
    if (reference !== undefined) { setClauses.push(`reference = $${paramIndex}`); params.push(reference); paramIndex++; }
    if (created_at !== undefined) { setClauses.push(`created_at = $${paramIndex}`); params.push(created_at); paramIndex++; }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    params.push(transactionId);

    const result = await pool.query(
      `UPDATE client_transactions SET ${setClauses.join(', ')} WHERE id = $${paramIndex} AND client_id = $${paramIndex + 1} RETURNING *`,
      [...params, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const { id, transactionId } = req.params;
    const result = await pool.query(
      'DELETE FROM client_transactions WHERE id = $1 AND client_id = $2 RETURNING id',
      [transactionId, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ message: 'Transaction deleted' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Documents
const getClientDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM client_documents WHERE client_id = $1 ORDER BY uploaded_at DESC',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const uploadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { document_name, document_type, description } = req.body;
    const file = req.file;

    if (!document_name) {
      return res.status(400).json({ error: 'Document name is required' });
    }

    const result = await pool.query(
      `INSERT INTO client_documents (client_id, document_name, document_type, file_path, file_size, description, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, document_name, document_type || 'other', file ? file.path : null, file ? file.size : 0, description || null, req.user.userId]
    );

    // Notify client
    await pool.query(
      `INSERT INTO client_notifications (client_id, title, message, notification_type, priority, created_by)
       VALUES ($1, 'New Document', $2, 'document', 'normal', $3)`,
      [id, `A new document "${document_name}" has been uploaded to your account.`, req.user.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const { id, documentId } = req.params;
    const result = await pool.query(
      'DELETE FROM client_documents WHERE id = $1 AND client_id = $2 RETURNING id',
      [documentId, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({ message: 'Document deleted' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Notifications
const getClientNotifications = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM client_notifications WHERE client_id = $1 ORDER BY created_at DESC',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message, notification_type, priority, active } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const result = await pool.query(
      `INSERT INTO client_notifications (client_id, title, message, notification_type, priority, active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, title, message, notification_type || 'message', priority || 'normal', active !== undefined ? (active ? 1 : 0) : 1, req.user.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateNotification = async (req, res) => {
  try {
    const { id, notificationId } = req.params;
    const { title, message, notification_type, priority, active } = req.body;

    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    if (title !== undefined) { setClauses.push(`title = $${paramIndex}`); params.push(title); paramIndex++; }
    if (message !== undefined) { setClauses.push(`message = $${paramIndex}`); params.push(message); paramIndex++; }
    if (notification_type !== undefined) { setClauses.push(`notification_type = $${paramIndex}`); params.push(notification_type); paramIndex++; }
    if (priority !== undefined) { setClauses.push(`priority = $${paramIndex}`); params.push(priority); paramIndex++; }
    if (active !== undefined) { setClauses.push(`active = $${paramIndex}`); params.push(active ? 1 : 0); paramIndex++; }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(notificationId);
    params.push(id);

    const result = await pool.query(
      `UPDATE client_notifications SET ${setClauses.join(', ')} WHERE id = $${paramIndex} AND client_id = $${paramIndex + 1} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update notification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { id, notificationId } = req.params;
    const result = await pool.query(
      'DELETE FROM client_notifications WHERE id = $1 AND client_id = $2 RETURNING id',
      [notificationId, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Send notification to all clients
const broadcastNotification = async (req, res) => {
  try {
    const { title, message, notification_type, priority, active } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    // Get all active clients
    const clientsResult = await pool.query('SELECT id FROM clients WHERE account_status = $1', ['active']);
    const clients = clientsResult.rows;

    if (clients.length === 0) {
      return res.status(400).json({ error: 'No active clients found' });
    }

    let sentCount = 0;
    for (const client of clients) {
      await pool.query(
        `INSERT INTO client_notifications (client_id, title, message, notification_type, priority, active, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [client.id, title, message, notification_type || 'message', priority || 'normal', active !== undefined ? (active ? 1 : 0) : 1, req.user.userId]
      );
      sentCount++;
    }

    res.status(201).json({ message: `Notification sent to ${sentCount} clients`, sent: sentCount });
  } catch (error) {
    console.error('Broadcast notification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Bill Payments
const getBillPayments = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.query;

    let whereClause = 'WHERE client_id = $1';
    const params = [id];

    if (status) {
      params.push(status);
      whereClause += ` AND status = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT * FROM client_bill_payments ${whereClause} ORDER BY created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get bill payments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createBillPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { biller_name, amount, account_reference, payment_date, notes } = req.body;

    if (!biller_name || !amount || !payment_date) {
      return res.status(400).json({ error: 'Biller name, amount, and payment date are required' });
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    // Check client balance
    const clientResult = await pool.query('SELECT display_balance, case_id FROM clients WHERE id = $1', [id]);
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
      [id, biller_name, payAmount, account_reference || null, payment_date, txnId, notes || null, req.user.userId]
    );

    // Create the transaction record (debit)
    await pool.query(
      `INSERT INTO client_transactions (client_id, transaction_id, description, credit_amount, debit_amount, balance_after, status, category, reference, created_by)
       VALUES ($1, $2, $3, 0, $4, $5, 'processing', 'bill_payment', $6, $7)`,
      [id, txnId, `Bill Payment - ${biller_name}`, payAmount, newBalance, billResult.rows[0].id, req.user.userId]
    );

    // Update client balance
    await pool.query(
      'UPDATE clients SET display_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newBalance, id]
    );

    // Notify client
    await pool.query(
      `INSERT INTO client_notifications (client_id, title, message, notification_type, priority, created_by)
       VALUES ($1, 'Bill Payment Submitted', $2, 'transaction', 'normal', $3)`,
      [id, `Bill payment of $${payAmount.toFixed(2)} to ${biller_name} is being processed.`, req.user.userId]
    );

    res.status(201).json(billResult.rows[0]);
  } catch (error) {
    console.error('Create bill payment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateBillPaymentStatus = async (req, res) => {
  try {
    const { id, billId } = req.params;
    const { status } = req.body;

    if (!status || !['processing', 'pending', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required (processing, pending, completed, failed)' });
    }

    // Get the bill payment
    const billResult = await pool.query(
      'SELECT * FROM client_bill_payments WHERE id = $1 AND client_id = $2',
      [billId, id]
    );

    if (billResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bill payment not found' });
    }

    const bill = billResult.rows[0];

    // Update bill payment status
    await pool.query(
      'UPDATE client_bill_payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, billId]
    );

    // Update corresponding transaction status
    if (bill.transaction_id) {
      await pool.query(
        'UPDATE client_transactions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE transaction_id = $2',
        [status, bill.transaction_id]
      );
    }

    // If failed, reverse the balance
    if (status === 'failed') {
      const clientResult = await pool.query('SELECT display_balance FROM clients WHERE id = $1', [id]);
      const currentBalance = parseFloat(clientResult.rows[0].display_balance) || 0;
      const reversedBalance = currentBalance + parseFloat(bill.amount);

      await pool.query(
        'UPDATE clients SET display_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [reversedBalance, id]
      );

      // Update the transaction balance
      if (bill.transaction_id) {
        await pool.query(
          'UPDATE client_transactions SET balance_after = $1 WHERE transaction_id = $2',
          [reversedBalance, bill.transaction_id]
        );
      }

      // Notify client
      await pool.query(
        `INSERT INTO client_notifications (client_id, title, message, notification_type, priority, created_by)
         VALUES ($1, 'Bill Payment Failed', $2, 'transaction', 'high', $3)`,
        [id, `Bill payment of $${parseFloat(bill.amount).toFixed(2)} to ${bill.biller_name} has failed. The amount has been reversed to your balance.`, req.user.userId]
      );
    } else if (status === 'completed') {
      // Notify client of completion
      await pool.query(
        `INSERT INTO client_notifications (client_id, title, message, notification_type, priority, created_by)
         VALUES ($1, 'Bill Payment Completed', $2, 'transaction', 'normal', $3)`,
        [id, `Bill payment of $${parseFloat(bill.amount).toFixed(2)} to ${bill.biller_name} has been completed.`, req.user.userId]
      );
    }

    const updated = await pool.query('SELECT * FROM client_bill_payments WHERE id = $1', [billId]);
    res.json(updated.rows[0]);
  } catch (error) {
    console.error('Update bill payment status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Activity logs
const getClientActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM client_activity_logs WHERE client_id = $1 ORDER BY created_at DESC LIMIT 100',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Client Deposit Methods (per-client)
const getClientDepositMethods = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM client_deposit_methods WHERE client_id = $1 ORDER BY sort_order ASC, created_at DESC',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get client deposit methods error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createClientDepositMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const { method_name, method_type, deposit_amount, instructions, recipient_name, bank_name, account_number, routing_number, payment_address, nearest_branch_map_link, additional_notes, is_active, crypto_type, wallet_address, qr_image_url } = req.body;

    if (!method_name || !method_type) {
      return res.status(400).json({ error: 'Method name and type are required' });
    }

    const result = await pool.query(
      `INSERT INTO client_deposit_methods (client_id, method_name, method_type, deposit_amount, instructions, recipient_name, bank_name, account_number, routing_number, payment_address, nearest_branch_map_link, additional_notes, is_active, crypto_type, wallet_address, qr_image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
      [id, method_name, method_type, deposit_amount || 0, instructions || null, recipient_name || null, bank_name || null, account_number || null, routing_number || null, payment_address || null, nearest_branch_map_link || null, additional_notes || null, is_active !== undefined ? (is_active ? 1 : 0) : 1, crypto_type || null, wallet_address || null, qr_image_url || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create client deposit method error:', error.message, error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

const updateClientDepositMethod = async (req, res) => {
  try {
    const { id, methodId } = req.params;
    const { method_name, method_type, deposit_amount, instructions, recipient_name, bank_name, account_number, routing_number, payment_address, nearest_branch_map_link, additional_notes, is_active, sort_order, crypto_type, wallet_address, qr_image_url } = req.body;

    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    if (method_name !== undefined) { setClauses.push(`method_name = $${paramIndex}`); params.push(method_name); paramIndex++; }
    if (method_type !== undefined) { setClauses.push(`method_type = $${paramIndex}`); params.push(method_type); paramIndex++; }
    if (deposit_amount !== undefined) { setClauses.push(`deposit_amount = $${paramIndex}`); params.push(deposit_amount); paramIndex++; }
    if (instructions !== undefined) { setClauses.push(`instructions = $${paramIndex}`); params.push(instructions); paramIndex++; }
    if (recipient_name !== undefined) { setClauses.push(`recipient_name = $${paramIndex}`); params.push(recipient_name); paramIndex++; }
    if (bank_name !== undefined) { setClauses.push(`bank_name = $${paramIndex}`); params.push(bank_name); paramIndex++; }
    if (account_number !== undefined) { setClauses.push(`account_number = $${paramIndex}`); params.push(account_number); paramIndex++; }
    if (routing_number !== undefined) { setClauses.push(`routing_number = $${paramIndex}`); params.push(routing_number); paramIndex++; }
    if (payment_address !== undefined) { setClauses.push(`payment_address = $${paramIndex}`); params.push(payment_address); paramIndex++; }
    if (nearest_branch_map_link !== undefined) { setClauses.push(`nearest_branch_map_link = $${paramIndex}`); params.push(nearest_branch_map_link); paramIndex++; }
    if (additional_notes !== undefined) { setClauses.push(`additional_notes = $${paramIndex}`); params.push(additional_notes); paramIndex++; }
    if (is_active !== undefined) { setClauses.push(`is_active = $${paramIndex}`); params.push(is_active ? 1 : 0); paramIndex++; }
    if (sort_order !== undefined) { setClauses.push(`sort_order = $${paramIndex}`); params.push(sort_order); paramIndex++; }
    if (crypto_type !== undefined) { setClauses.push(`crypto_type = $${paramIndex}`); params.push(crypto_type); paramIndex++; }
    if (wallet_address !== undefined) { setClauses.push(`wallet_address = $${paramIndex}`); params.push(wallet_address); paramIndex++; }
    if (qr_image_url !== undefined) { setClauses.push(`qr_image_url = $${paramIndex}`); params.push(qr_image_url); paramIndex++; }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    params.push(methodId);
    params.push(id);

    const result = await pool.query(
      `UPDATE client_deposit_methods SET ${setClauses.join(', ')} WHERE id = $${paramIndex} AND client_id = $${paramIndex + 1} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deposit method not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update client deposit method error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteClientDepositMethod = async (req, res) => {
  try {
    const { id, methodId } = req.params;
    const result = await pool.query(
      'DELETE FROM client_deposit_methods WHERE id = $1 AND client_id = $2 RETURNING id',
      [methodId, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deposit method not found' });
    }
    res.json({ message: 'Deposit method deleted' });
  } catch (error) {
    console.error('Delete client deposit method error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllClients, getClient, createClient, updateClient, deleteClient,
  getClientTransactions, createTransaction, updateTransaction, deleteTransaction,
  getClientDocuments, uploadDocument, deleteDocument,
  getClientNotifications, createNotification, updateNotification, deleteNotification, broadcastNotification,
  getBillPayments, createBillPayment, updateBillPaymentStatus,
  getClientActivity,
  getClientDepositMethods, createClientDepositMethod, updateClientDepositMethod, deleteClientDepositMethod
};
