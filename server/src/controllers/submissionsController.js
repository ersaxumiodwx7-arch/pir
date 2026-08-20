const pool = require('../database/connection');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');

const submitForm = async (req, res) => {
  let client;
  let db;
  try {
    // The SQLite wrapper's connect() resolves to undefined (it exposes a single
    // shared connection), while on PostgreSQL connect() returns a dedicated
    // client. Use whichever one can actually run queries so the transaction
    // runs on a single connection in both cases.
    client = await pool.connect();
    db = client && typeof client.query === 'function' ? client : pool;

    const { slug, answers } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'Invalid submission data' });
    }

    await db.query('BEGIN');

    // Get form
    const formResult = await db.query('SELECT * FROM forms WHERE unique_slug = $1', [slug]);
    if (formResult.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: 'Form not found' });
    }

    const form = formResult.rows[0];

    if (!form.is_active) {
      await db.query('ROLLBACK');
      return res.status(403).json({ error: 'Form is not active' });
    }

    // Create submission
    const submissionResult = await db.query(
      'INSERT INTO submissions (form_id) VALUES ($1) RETURNING *',
      [form.id]
    );

    const submissionId = submissionResult.rows[0].id;

    // Create answers
    for (const answer of answers) {
      await db.query(
        'INSERT INTO submission_answers (submission_id, field_id, value) VALUES ($1, $2, $3)',
        [submissionId, answer.field_id, answer.value]
      );
    }

    await db.query('COMMIT');

    res.status(201).json({ 
      message: 'Form submitted successfully',
      submission_id: submissionId
    });
  } catch (error) {
    try { await db?.query('ROLLBACK'); } catch (rollbackError) { /* ignore */ }
    console.error('Submit form error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (client && typeof client.release === 'function') {
      client.release();
    }
  }
};

const getSubmissionsByFormId = async (req, res) => {
  try {
    const { formId } = req.params;
    const result = await pool.query(
      'SELECT * FROM submissions WHERE form_id = $1 ORDER BY submitted_at DESC',
      [formId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getSubmissionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get submission
    const submissionResult = await pool.query('SELECT * FROM submissions WHERE id = $1', [id]);
    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Get answers with field details
    const answersResult = await pool.query(`
      SELECT sa.*, ff.label, ff.type, ff.options
      FROM submission_answers sa
      JOIN form_fields ff ON sa.field_id = ff.id
      WHERE sa.submission_id = $1
      ORDER BY ff.order_index
    `, [id]);

    res.json({
      ...submissionResult.rows[0],
      answers: answersResult.rows
    });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const exportSubmissionsToCSV = async (req, res) => {
  try {
    const { formId } = req.params;

    // Get form
    const formResult = await pool.query('SELECT * FROM forms WHERE id = $1', [formId]);
    if (formResult.rows.length === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const form = formResult.rows[0];

    // Get fields
    const fieldsResult = await pool.query(
      'SELECT * FROM form_fields WHERE form_id = $1 ORDER BY order_index',
      [formId]
    );
    const fields = fieldsResult.rows;

    // Get submissions with answers
    const submissionsResult = await pool.query(`
      SELECT s.id, s.submitted_at, sa.field_id, sa.value
      FROM submissions s
      LEFT JOIN submission_answers sa ON s.id = sa.submission_id
      WHERE s.form_id = $1
      ORDER BY s.submitted_at DESC
    `, [formId]);

    // Organize data
    const submissions = {};
    submissionsResult.rows.forEach(row => {
      if (!submissions[row.id]) {
        submissions[row.id] = {
          id: row.id,
          submitted_at: row.submitted_at,
          answers: {}
        };
      }
      if (row.field_id) {
        submissions[row.id].answers[row.field_id] = row.value;
      }
    });

    // Create CSV
    const filename = `form_${formId}_submissions_${Date.now()}.csv`;
    const filepath = path.join(__dirname, '../../uploads', filename);

    const csvWriter = createCsvWriter({
      path: filepath,
      header: [
        { id: 'id', title: 'Submission ID' },
        { id: 'submitted_at', title: 'Submitted At' },
        ...fields.map(field => ({
          id: `field_${field.id}`,
          title: field.label
        }))
      ]
    });

    const records = Object.values(submissions).map(submission => {
      const record = {
        id: submission.id,
        submitted_at: submission.submitted_at
      };
      fields.forEach(field => {
        record[`field_${field.id}`] = submission.answers[field.id] || '';
      });
      return record;
    });

    await csvWriter.writeRecords(records);

    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      // Delete file after download
      fs.unlink(filepath, (unlinkErr) => {
        if (unlinkErr) console.error('Delete file error:', unlinkErr);
      });
    });
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  submitForm,
  getSubmissionsByFormId,
  getSubmissionById,
  exportSubmissionsToCSV
};
