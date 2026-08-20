import { nanoid } from 'nanoid';

export function generateSlug() {
  return nanoid(21);
}

export function parseFieldOptions(options) {
  if (Array.isArray(options)) return options;
  if (typeof options === 'string') {
    try {
      return JSON.parse(options);
    } catch {
      return [];
    }
  }
  return [];
}

export function serializeField(field) {
  return {
    ...field,
    required: Boolean(field.required),
    options: parseFieldOptions(field.options),
  };
}

export function serializeForm(form) {
  return {
    ...form,
    is_active: Boolean(form.is_active),
    allow_resubmit: Boolean(form.allow_resubmit),
  };
}

export const FIELD_TYPES = [
  'short_text',
  'long_text',
  'multiple_choice',
  'checkboxes',
  'dropdown',
  'date',
  'number',
  'email',
  'phone',
  'file',
  'rating',
];

export function validateSubmission(fields, answers) {
  const errors = [];

  for (const field of fields) {
    const answer = answers.find((a) => a.field_id === field.id);
    const value = answer?.value ?? '';
    const options = parseFieldOptions(field.options);

    if (field.required) {
      if (field.type === 'checkboxes') {
        const arr = Array.isArray(value) ? value : (value ? JSON.parse(value) : []);
        if (!arr.length) {
          errors.push({ field_id: field.id, message: `${field.label} is required` });
          continue;
        }
      } else if (!value || (typeof value === 'string' && !value.trim())) {
        errors.push({ field_id: field.id, message: `${field.label} is required` });
        continue;
      }
    }

    if (!value || (typeof value === 'string' && !value.trim())) continue;

    switch (field.type) {
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push({ field_id: field.id, message: 'Invalid email address' });
        }
        break;
      case 'phone':
        if (!/^[\d\s\-+().]{7,}$/.test(value)) {
          errors.push({ field_id: field.id, message: 'Invalid phone number' });
        }
        break;
      case 'number':
        if (isNaN(Number(value))) {
          errors.push({ field_id: field.id, message: 'Must be a valid number' });
        }
        break;
      case 'date':
        if (isNaN(Date.parse(value))) {
          errors.push({ field_id: field.id, message: 'Invalid date' });
        }
        break;
      case 'multiple_choice':
      case 'dropdown':
        if (options.length && !options.includes(value)) {
          errors.push({ field_id: field.id, message: 'Invalid selection' });
        }
        break;
      case 'checkboxes': {
        const arr = Array.isArray(value) ? value : JSON.parse(value);
        if (arr.some((v) => !options.includes(v))) {
          errors.push({ field_id: field.id, message: 'Invalid selection' });
        }
        break;
      }
      case 'rating':
        if (!options.includes(String(value))) {
          errors.push({ field_id: field.id, message: 'Invalid rating' });
        }
        break;
    }
  }

  return errors;
}
