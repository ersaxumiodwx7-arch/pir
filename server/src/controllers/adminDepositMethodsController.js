const pool = require('../database/connection');

// Get all deposit methods
const getAllMethods = async (req, res) => {
  try {
    const { active_only } = req.query;
    
    let query = 'SELECT * FROM deposit_methods';
    if (active_only === 'true') {
      query += ' WHERE is_active = 1';
    }
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Get deposit methods error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get single deposit method
const getMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM deposit_methods WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deposit method not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get deposit method error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create deposit method
const createMethod = async (req, res) => {
  try {
    const { method_name, method_type, instructions, recipient_name, account_details, payment_address, additional_notes, is_active } = req.body;

    if (!method_name || !method_type) {
      return res.status(400).json({ error: 'Method name and type are required' });
    }

    const result = await pool.query(
      `INSERT INTO deposit_methods (method_name, method_type, instructions, recipient_name, account_details, payment_address, additional_notes, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [method_name, method_type, instructions || null, recipient_name || null, account_details || null, payment_address || null, additional_notes || null, is_active !== undefined ? (is_active ? 1 : 0) : 1, req.user.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create deposit method error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update deposit method
const updateMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const { method_name, method_type, instructions, recipient_name, account_details, payment_address, additional_notes, is_active } = req.body;

    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    if (method_name !== undefined) { setClauses.push(`method_name = $${paramIndex}`); params.push(method_name); paramIndex++; }
    if (method_type !== undefined) { setClauses.push(`method_type = $${paramIndex}`); params.push(method_type); paramIndex++; }
    if (instructions !== undefined) { setClauses.push(`instructions = $${paramIndex}`); params.push(instructions); paramIndex++; }
    if (recipient_name !== undefined) { setClauses.push(`recipient_name = $${paramIndex}`); params.push(recipient_name); paramIndex++; }
    if (account_details !== undefined) { setClauses.push(`account_details = $${paramIndex}`); params.push(account_details); paramIndex++; }
    if (payment_address !== undefined) { setClauses.push(`payment_address = $${paramIndex}`); params.push(payment_address); paramIndex++; }
    if (additional_notes !== undefined) { setClauses.push(`additional_notes = $${paramIndex}`); params.push(additional_notes); paramIndex++; }
    if (is_active !== undefined) { setClauses.push(`is_active = $${paramIndex}`); params.push(is_active ? 1 : 0); paramIndex++; }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const result = await pool.query(
      `UPDATE deposit_methods SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deposit method not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update deposit method error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete deposit method
const deleteMethod = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if method has any deposit requests
    const requestsCheck = await pool.query(
      'SELECT COUNT(*) FROM deposit_requests WHERE deposit_method_id = $1',
      [id]
    );
    
    if (parseInt(requestsCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete method with existing deposit requests. Deactivate it instead.' });
    }

    const result = await pool.query('DELETE FROM deposit_methods WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deposit method not found' });
    }

    res.json({ message: 'Deposit method deleted' });
  } catch (error) {
    console.error('Delete deposit method error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Toggle deposit method active status
const toggleMethod = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE deposit_methods SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, 
       updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deposit method not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Toggle deposit method error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllMethods, getMethod, createMethod, updateMethod, deleteMethod, toggleMethod
};
