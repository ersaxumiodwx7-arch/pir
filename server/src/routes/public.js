import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../db/index.js';
import { serializeForm, serializeField, validateSubmission, parseFieldOptions } from '../utils/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `submission-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

router.get('/:slug', (req, res) => {
  const form = db.prepare('SELECT * FROM forms WHERE unique_slug = ?').get(req.params.slug);
  if (!form) return res.status(404).json({ error: 'Form not found' });

  const fields = db.prepare(
    'SELECT id, type, label, description, placeholder, required, field_order, options FROM form_fields WHERE form_id = ? ORDER BY field_order ASC'
  ).all(form.id);

  res.json({
    ...serializeForm(form),
    fields: fields.map((f) => ({
      ...serializeField(f),
      field_order: f.field_order,
    })),
  });
});

router.get('/:slug/check-submission', (req, res) => {
  const fingerprint = req.query.fingerprint;
  if (!fingerprint) return res.json({ submitted: false });

  const form = db.prepare('SELECT id, allow_resubmit FROM forms WHERE unique_slug = ?').get(req.params.slug);
  if (!form) return res.status(404).json({ error: 'Form not found' });

  const existing = db.prepare(
    'SELECT id FROM submissions WHERE form_id = ? AND client_fingerprint = ?'
  ).get(form.id, fingerprint);

  res.json({ submitted: Boolean(existing) && !form.allow_resubmit });
});

router.post('/:slug/submit', upload.any(), (req, res) => {
  const form = db.prepare('SELECT * FROM forms WHERE unique_slug = ?').get(req.params.slug);
  if (!form) return res.status(404).json({ error: 'Form not found' });
  if (!form.is_active) return res.status(403).json({ error: 'This form is no longer accepting responses' });

  const fingerprint = req.body.fingerprint || null;

  if (fingerprint && !form.allow_resubmit) {
    const existing = db.prepare(
      'SELECT id FROM submissions WHERE form_id = ? AND client_fingerprint = ?'
    ).get(form.id, fingerprint);
    if (existing) {
      return res.status(409).json({ error: 'You have already submitted this form' });
    }
  }

  const fields = db.prepare(
    'SELECT * FROM form_fields WHERE form_id = ? ORDER BY field_order ASC'
  ).all(form.id);

  let answers;
  try {
    answers = JSON.parse(req.body.answers || '[]');
  } catch {
    return res.status(400).json({ error: 'Invalid answers format' });
  }

  const fileMap = {};
  for (const file of req.files || []) {
    fileMap[file.fieldname] = `/uploads/${file.filename}`;
  }

  const processedAnswers = answers.map((a) => {
    if (fileMap[`field_${a.field_id}`]) {
      return { ...a, value: fileMap[`field_${a.field_id}`] };
    }
    if (Array.isArray(a.value)) {
      return { ...a, value: JSON.stringify(a.value) };
    }
    return a;
  });

  const errors = validateSubmission(fields, processedAnswers);
  if (errors.length) {
    for (const file of req.files || []) {
      const fp = path.join(uploadsDir, file.filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    return res.status(400).json({ error: 'Validation failed', errors });
  }

  const submit = db.transaction(() => {
    const subResult = db.prepare(
      'INSERT INTO submissions (form_id, client_fingerprint) VALUES (?, ?)'
    ).run(form.id, fingerprint);

    const submissionId = subResult.lastInsertRowid;
    const insertAnswer = db.prepare(
      'INSERT INTO submission_answers (submission_id, field_id, value) VALUES (?, ?, ?)'
    );

    for (const answer of processedAnswers) {
      const value = answer.value != null ? String(answer.value) : '';
      insertAnswer.run(submissionId, answer.field_id, value);
    }

    return submissionId;
  });

  const submissionId = submit();
  res.status(201).json({ success: true, submission_id: submissionId });
});

export default router;
