import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import db from './index.js';
import { runMigrations } from './migrate.js';

runMigrations();

const adminEmail = process.env.ADMIN_EMAIL || 'admin@formflow.local';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

const existingAdmin = db.prepare('SELECT id FROM admins WHERE email = ?').get(adminEmail);
if (!existingAdmin) {
  const hash = bcrypt.hashSync(adminPassword, 10);
  db.prepare('INSERT INTO admins (email, password_hash) VALUES (?, ?)').run(adminEmail, hash);
  console.log(`Created admin user: ${adminEmail}`);
}

const existingForm = db.prepare('SELECT id FROM forms LIMIT 1').get();
if (!existingForm) {
  const slug = nanoid(21);
  const result = db.prepare(`
    INSERT INTO forms (title, description, unique_slug, is_active, allow_resubmit)
    VALUES (?, ?, ?, 1, 0)
  `).run(
    'Customer Feedback Survey',
    'Help us improve by sharing your experience. This form takes about 2 minutes.',
    slug
  );

  const formId = result.lastInsertRowid;

  const fields = [
    { type: 'short_text', label: 'Full Name', placeholder: 'John Doe', required: 1, order: 0, options: [] },
    { type: 'email', label: 'Email Address', placeholder: 'you@example.com', required: 1, order: 1, options: [] },
    { type: 'rating', label: 'Overall Satisfaction', description: 'Rate your experience from 1 (poor) to 5 (excellent)', required: 1, order: 2, options: ['1', '2', '3', '4', '5'] },
    { type: 'multiple_choice', label: 'How did you hear about us?', required: 0, order: 3, options: ['Search Engine', 'Social Media', 'Friend/Colleague', 'Advertisement', 'Other'] },
    { type: 'long_text', label: 'Additional Comments', placeholder: 'Tell us more...', required: 0, order: 4, options: [] },
  ];

  const insertField = db.prepare(`
    INSERT INTO form_fields (form_id, type, label, description, placeholder, required, field_order, options)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const f of fields) {
    insertField.run(
      formId, f.type, f.label, f.description || '', f.placeholder || '',
      f.required, f.order, JSON.stringify(f.options)
    );
  }

  console.log(`Created example form with slug: ${slug}`);
  console.log(`Public link: http://localhost:5173/f/${slug}`);
}

console.log('Seed completed.');
