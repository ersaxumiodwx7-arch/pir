const pool = require('../database/connection');

// The client sends choice-field options as a JS array (and rating configs as
// an object). The SQLite driver cannot bind arrays/objects as query
// parameters, so serialize non-string values to JSON text - which is also
// what the rest of the app expects when it reads field.options.
const normalizeOptions = (options) => {
  if (options === null || options === undefined || typeof options === 'string') {
    return options;
  }
  return JSON.stringify(options);
};

const getFieldsByFormId = async (req, res) => {
  try {
    const { formId } = req.params;
    const result = await pool.query(
      'SELECT * FROM form_fields WHERE form_id = $1 ORDER BY order_index',
      [formId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get fields error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createField = async (req, res) => {
  try {
    const { form_id, type, label, description, placeholder, required, order_index, options } = req.body;

    const result = await pool.query(
      'INSERT INTO form_fields (form_id, type, label, description, placeholder, required, order_index, options) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [form_id, type, label, description, placeholder, required, order_index, normalizeOptions(options)]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create field error:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateField = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, label, description, placeholder, required, order_index, options } = req.body;

    const result = await pool.query(
      'UPDATE form_fields SET type = $1, label = $2, description = $3, placeholder = $4, required = $5, order_index = $6, options = $7 WHERE id = $8 RETURNING *',
      [type, label, description, placeholder, required, order_index, normalizeOptions(options), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Field not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update field error:', error);
    res.status(500).json({ error: error.message });
  }
};

const deleteField = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM form_fields WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Field not found' });
    }

    res.json({ message: 'Field deleted successfully' });
  } catch (error) {
    console.error('Delete field error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const reorderFields = async (req, res) => {
  try {
    const { fields } = req.body; // Array of {id, order_index}

    for (const field of fields) {
      await pool.query(
        'UPDATE form_fields SET order_index = $1 WHERE id = $2',
        [field.order_index, field.id]
      );
    }

    res.json({ message: 'Fields reordered successfully' });
  } catch (error) {
    console.error('Reorder fields error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getFieldsByFormId,
  createField,
  updateField,
  deleteField,
  reorderFields
};
