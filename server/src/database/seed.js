const pool = require('./connection');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function seed() {
  try {
    console.log('Starting seed...');

    // Create admin user
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
    const adminResult = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING *',
      [process.env.ADMIN_EMAIL || 'admin@example.com', hashedPassword]
    );
    console.log('Admin user created:', adminResult.rows[0]);

    // Create example form
    const uniqueSlug = uuidv4().substring(0, 8);
    const formResult = await pool.query(
      `INSERT INTO forms (title, description, unique_slug, is_active) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      ['Customer Feedback Survey', 'Please share your experience with our service', uniqueSlug, true]
    );
    const formId = formResult.rows[0].id;
    console.log('Example form created:', formResult.rows[0]);

    // Create form fields
    const fields = [
      {
        type: 'text',
        label: 'What is your name?',
        description: 'Please enter your full name',
        placeholder: 'John Doe',
        required: true,
        order_index: 0,
        options: null
      },
      {
        type: 'email',
        label: 'What is your email address?',
        description: 'We will send you a confirmation email',
        placeholder: 'john@example.com',
        required: true,
        order_index: 1,
        options: null
      },
      {
        type: 'radio',
        label: 'How would you rate our service?',
        description: 'Select one option',
        placeholder: null,
        required: true,
        order_index: 2,
        options: JSON.stringify(['Excellent', 'Good', 'Average', 'Poor'])
      },
      {
        type: 'textarea',
        label: 'Please share any additional feedback',
        description: 'Your feedback helps us improve',
        placeholder: 'Type your feedback here...',
        required: false,
        order_index: 3,
        options: null
      },
      {
        type: 'rating',
        label: 'How likely are you to recommend us?',
        description: 'On a scale of 1-10',
        placeholder: null,
        required: true,
        order_index: 4,
        options: JSON.stringify({ min: 1, max: 10 })
      }
    ];

    for (const field of fields) {
      await pool.query(
        `INSERT INTO form_fields (form_id, type, label, description, placeholder, required, order_index, options) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [formId, field.type, field.label, field.description, field.placeholder, field.required, field.order_index, field.options]
      );
    }
    console.log('Form fields created');

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
