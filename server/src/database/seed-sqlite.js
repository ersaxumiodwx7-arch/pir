const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const dbPath = process.env.DATABASE_URL.startsWith('sqlite') 
  ? process.env.DATABASE_URL.replace('sqlite:', '')
  : './formflow.db';

const db = new sqlite3.Database(dbPath);

async function seed() {
  try {
    console.log('Starting seed...');

    // Create admin user
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
    
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT OR IGNORE INTO users (email, password_hash) VALUES (?, ?)',
        [process.env.ADMIN_EMAIL || 'admin@example.com', hashedPassword],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });
    console.log('Admin user created');

    // Create example form
    const uniqueSlug = uuidv4().substring(0, 8);
    
    const formResult = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO forms (title, description, unique_slug, is_active) VALUES (?, ?, ?, ?)',
        ['Customer Feedback Survey', 'Please share your experience with our service', uniqueSlug, 1],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });
    
    const formId = formResult.lastID;
    console.log('Example form created with ID:', formId);

    // Create form fields
    const fields = [
      {
        type: 'text',
        label: 'What is your name?',
        description: 'Please enter your full name',
        placeholder: 'John Doe',
        required: 1,
        order_index: 0,
        options: null
      },
      {
        type: 'email',
        label: 'What is your email address?',
        description: 'We will send you a confirmation email',
        placeholder: 'john@example.com',
        required: 1,
        order_index: 1,
        options: null
      },
      {
        type: 'radio',
        label: 'How would you rate our service?',
        description: 'Select one option',
        placeholder: null,
        required: 1,
        order_index: 2,
        options: JSON.stringify(['Excellent', 'Good', 'Average', 'Poor'])
      },
      {
        type: 'textarea',
        label: 'Please share any additional feedback',
        description: 'Your feedback helps us improve',
        placeholder: 'Type your feedback here...',
        required: 0,
        order_index: 3,
        options: null
      },
      {
        type: 'rating',
        label: 'How likely are you to recommend us?',
        description: 'On a scale of 1-10',
        placeholder: null,
        required: 1,
        order_index: 4,
        options: JSON.stringify({ min: 1, max: 10 })
      }
    ];

    for (const field of fields) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO form_fields (form_id, type, label, description, placeholder, required, order_index, options) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [formId, field.type, field.label, field.description, field.placeholder, field.required, field.order_index, field.options],
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });
    }
    console.log('Form fields created');

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

seed();
