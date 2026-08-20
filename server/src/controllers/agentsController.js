const pool = require('../database/connection');

// Generate unique Agent ID
function generateAgentId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let agentId = 'AGT-';
  for (let i = 0; i < 8; i++) {
    agentId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return agentId;
}

// Get all agents (admin)
const getAllAgents = async (req, res) => {
  try {
    const { search, status } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (agent_id ILIKE $${params.length} OR full_name ILIKE $${params.length} OR designation ILIKE $${params.length})`;
    }

    if (status === 'active') {
      whereClause += ' AND is_active = 1';
    } else if (status === 'inactive') {
      whereClause += ' AND is_active = 0';
    }

    const result = await pool.query(
      `SELECT * FROM agents ${whereClause} ORDER BY created_at DESC`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get single agent (admin)
const getAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM agents WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create agent (admin)
const createAgent = async (req, res) => {
  try {
    const { full_name, designation, department, phone, email, agent_id } = req.body;

    if (!full_name || !designation) {
      return res.status(400).json({ error: 'Full name and designation are required' });
    }

    // Use provided agent_id or generate one
    let agentId = agent_id || generateAgentId();
    
    // Check for duplicate agent_id
    const existing = await pool.query('SELECT id FROM agents WHERE agent_id = $1', [agentId]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Agent ID already exists' });
    }

    const result = await pool.query(
      `INSERT INTO agents (agent_id, full_name, designation, department, phone, email, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [agentId, full_name, designation, department || null, phone || null, email || null, req.user.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update agent (admin)
const updateAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, designation, department, phone, email, is_active } = req.body;

    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    if (full_name !== undefined) { setClauses.push(`full_name = $${paramIndex}`); params.push(full_name); paramIndex++; }
    if (designation !== undefined) { setClauses.push(`designation = $${paramIndex}`); params.push(designation); paramIndex++; }
    if (department !== undefined) { setClauses.push(`department = $${paramIndex}`); params.push(department); paramIndex++; }
    if (phone !== undefined) { setClauses.push(`phone = $${paramIndex}`); params.push(phone); paramIndex++; }
    if (email !== undefined) { setClauses.push(`email = $${paramIndex}`); params.push(email); paramIndex++; }
    if (is_active !== undefined) { setClauses.push(`is_active = $${paramIndex}`); params.push(is_active ? 1 : 0); paramIndex++; }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const result = await pool.query(
      `UPDATE agents SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete agent (admin)
const deleteAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM agents WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json({ message: 'Agent deleted' });
  } catch (error) {
    console.error('Delete agent error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Verify agent (public - client can use this)
const verifyAgent = async (req, res) => {
  try {
    const { agent_id } = req.params;

    if (!agent_id) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }

    const result = await pool.query(
      'SELECT agent_id, full_name, designation, department, is_active FROM agents WHERE agent_id = $1',
      [agent_id.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.json({
        verified: false,
        message: 'Agent not found. Please check the Agent ID and try again.'
      });
    }

    const agent = result.rows[0];

    if (!agent.is_active) {
      return res.json({
        verified: false,
        message: 'This agent account is currently inactive.'
      });
    }

    res.json({
      verified: true,
      agent: {
        agent_id: agent.agent_id,
        full_name: agent.full_name,
        designation: agent.designation,
        department: agent.department
      }
    });
  } catch (error) {
    console.error('Verify agent error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllAgents, getAgent, createAgent, updateAgent, deleteAgent, verifyAgent
};
