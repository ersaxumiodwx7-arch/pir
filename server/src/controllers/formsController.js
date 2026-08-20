const pool = require('../database/connection');
const { v4: uuidv4 } = require('uuid');

const getAllForms = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.*, COUNT(s.id) as response_count 
      FROM forms f 
      LEFT JOIN submissions s ON f.id = s.form_id 
      GROUP BY f.id 
      ORDER BY f.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get forms error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getFormById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM forms WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get form error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getFormBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await pool.query('SELECT * FROM forms WHERE unique_slug = $1', [slug]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const form = result.rows[0];

    if (!form.is_active) {
      return res.status(403).json({ error: 'Form is not active' });
    }

    // Get form fields
    const fieldsResult = await pool.query(
      'SELECT * FROM form_fields WHERE form_id = $1 ORDER BY order_index',
      [form.id]
    );

    res.json({
      ...form,
      fields: fieldsResult.rows
    });
  } catch (error) {
    console.error('Get form by slug error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createForm = async (req, res) => {
  try {
    const { title, description, logo_url, ending_description, background_color, background_image } = req.body;
    const uniqueSlug = uuidv4().substring(0, 8);

    const result = await pool.query(
      'INSERT INTO forms (title, description, logo_url, unique_slug, ending_description, background_color, background_image) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [title, description, logo_url, uniqueSlug, ending_description, background_color || '#ffffff', background_image]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create form error:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateForm = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, logo_url, is_active, ending_description, background_color, background_image } = req.body;

    const result = await pool.query(
      'UPDATE forms SET title = $1, description = $2, logo_url = $3, is_active = $4, ending_description = $5, background_color = $6, background_image = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *',
      [title, description, logo_url, is_active, ending_description, background_color || '#ffffff', background_image, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update form error:', error);
    res.status(500).json({ error: error.message });
  }
};

const deleteForm = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM forms WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Delete form error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const duplicateForm = async (req, res) => {
  try {
    const { id } = req.params;

    // Get original form
    const originalForm = await pool.query('SELECT * FROM forms WHERE id = $1', [id]);
    if (originalForm.rows.length === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const form = originalForm.rows[0];
    const uniqueSlug = uuidv4().substring(0, 8);

    // Create new form
    const newForm = await pool.query(
      'INSERT INTO forms (title, description, logo_url, unique_slug, ending_description, background_color, background_image) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [form.title + ' (Copy)', form.description, form.logo_url, uniqueSlug, form.ending_description, form.background_color, form.background_image]
    );

    // Copy fields
    const fields = await pool.query('SELECT * FROM form_fields WHERE form_id = $1 ORDER BY order_index', [id]);
    
    for (const field of fields.rows) {
      await pool.query(
        'INSERT INTO form_fields (form_id, type, label, description, placeholder, required, order_index, options) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [newForm.rows[0].id, field.type, field.label, field.description, field.placeholder, field.required, field.order_index, field.options]
      );
    }

    res.status(201).json(newForm.rows[0]);
  } catch (error) {
    console.error('Duplicate form error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllForms,
  getFormById,
  getFormBySlug,
  createForm,
  updateForm,
  deleteForm,
  duplicateForm
};
