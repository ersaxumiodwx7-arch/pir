import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { formsAPI, submissionsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { PaperclipIcon, StarIcon, CheckCircleIcon, LockIcon } from '../components/Icons';
import './FormViewer.css';

const FormViewer = () => {
  const { slug } = useParams();
  const [form, setForm] = useState(null);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const formRef = useRef(null);

  useEffect(() => {
    loadForm();
  }, [slug]);

  const loadForm = async () => {
    try {
      const response = await formsAPI.getBySlug(slug);
      setForm(response.data);

      // Initialize form data
      const initialData = {};
      response.data.fields.forEach(field => {
        if (field.type === 'checkbox') initialData[field.id] = [];
        else if (field.type === 'card') initialData[field.id] = { name: '', number: '', expiry: '', cvv: '' };
        else initialData[field.id] = '';
      });
      setFormData(initialData);
    } catch (error) {
      if (error.response?.status === 404) {
        setNotFound(true);
      } else {
        toast.error('Failed to load form');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (input) =>
    input.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ').trim();

  const formatExpiry = (input) => {
    const digits = input.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const validateCard = (field, value) => {
    const card = value && typeof value === 'object' ? value : {};

    if (field.required) {
      const missing = ['name', 'number', 'expiry', 'cvv'].filter(
        (key) => !card[key] || !String(card[key]).trim()
      );
      if (missing.length > 0) {
        return 'Please complete all card details';
      }
    }

    if (card.number && String(card.number).replace(/\D/g, '').length < 13) {
      return 'Please enter a valid card number';
    }

    if (card.expiry) {
      const match = String(card.expiry).match(/^(\d{2})\/(\d{2})$/);
      if (!match) return 'Please use MM/YY format';
      const month = parseInt(match[1], 10);
      const year = 2000 + parseInt(match[2], 10);
      if (month < 1 || month > 12) return 'Please enter a valid expiry date';
      if (new Date(year, month, 0) < new Date()) return 'This card has expired';
    }

    if (card.cvv) {
      const cvvDigits = String(card.cvv).replace(/\D/g, '');
      if (cvvDigits.length < 3 || cvvDigits.length > 4) return 'Please enter a valid CVV';
    }

    return null;
  };

  const validateField = (field, value) => {
    if (field.type === 'card') {
      return validateCard(field, value);
    }

    const isEmpty = Array.isArray(value)
      ? value.length === 0
      : value === undefined || value === null || String(value).trim() === '';

    if (field.required && isEmpty) {
      return 'This field is required';
    }

    if (!isEmpty && field.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(value))) {
        return 'Please enter a valid email address';
      }
    }

    if (!isEmpty && field.type === 'phone') {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(String(value))) {
        return 'Please enter a valid phone number';
      }
    }

    if (!isEmpty && field.type === 'number') {
      if (isNaN(Number(value))) {
        return 'Please enter a valid number';
      }
    }

    return null;
  };

  const handleChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));

    // Clear error for this field
    if (errors[fieldId]) {
      setErrors(prev => ({
        ...prev,
        [fieldId]: null
      }));
    }
  };

  const handleBlur = (field) => {
    const error = validateField(field, formData[field.id]);
    setErrors(prev => ({
      ...prev,
      [field.id]: error || null
    }));
  };

  const handleCheckboxChange = (fieldId, optionValue, checked) => {
    setFormData(prev => {
      const currentValues = Array.isArray(prev[fieldId]) ? prev[fieldId] : [];
      let newValues;

      if (checked) {
        newValues = [...currentValues, optionValue];
      } else {
        newValues = currentValues.filter(v => v !== optionValue);
      }

      return {
        ...prev,
        [fieldId]: newValues
      };
    });

    // Clear error for this field
    if (errors[fieldId]) {
      setErrors(prev => ({
        ...prev,
        [fieldId]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    form.fields.forEach(field => {
      const error = validateField(field, formData[field.id]);
      if (error) {
        newErrors[field.id] = error;
      }
    });

    setErrors(newErrors);
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      toast.error('Please fix the errors before submitting');
      const firstInvalid = form.fields.find(field => newErrors[field.id]);
      if (firstInvalid) {
        setTimeout(() => {
          const el = formRef.current?.querySelector(`[data-field-id="${firstInvalid.id}"]`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el?.querySelector('input, textarea, select, button')?.focus({ preventScroll: true });
        }, 100);
      }
      return;
    }

    setSubmitting(true);

    const answers = form.fields.map(field => {
      const raw = formData[field.id];
      let value;
      if (Array.isArray(raw)) {
        value = JSON.stringify(raw);
      } else if (raw && typeof raw === 'object') {
        value = JSON.stringify(raw);
      } else {
        value = raw || '';
      }
      return { field_id: field.id, value };
    });

    try {
      await submissionsAPI.submit({
        slug,
        answers
      });

      setSubmitted(true);
      toast.success('Form submitted successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  const parseOptions = (options) => {
    if (!options) return null;
    if (Array.isArray(options)) return options;
    try {
      return JSON.parse(options);
    } catch {
      return null;
    }
  };

  // Choice fields must render an array of options — anything else is treated as empty.
  const getChoiceOptions = (field) => {
    const parsed = parseOptions(field.options);
    return Array.isArray(parsed) ? parsed : [];
  };

  const renderField = (field) => {
    const error = errors[field.id];
    const value = formData[field.id] || '';

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onBlur={() => handleBlur(field)}
            placeholder={field.placeholder}
            className={`form-input ${error ? 'error' : ''}`}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onBlur={() => handleBlur(field)}
            placeholder={field.placeholder}
            rows={4}
            className={`form-input form-textarea ${error ? 'error' : ''}`}
          />
        );

      case 'radio': {
        const options = getChoiceOptions(field);
        return (
          <div className="options-group" role="radiogroup" aria-label={field.label}>
            {options.map((option, index) => (
              <label key={index} className="option-label">
                <input
                  type="radio"
                  name={`field-${field.id}`}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  onBlur={() => handleBlur(field)}
                />
                <span className="option-text">{option}</span>
              </label>
            ))}
          </div>
        );
      }

      case 'checkbox': {
        const options = getChoiceOptions(field);
        return (
          <div className="options-group" role="group" aria-label={field.label}>
            {options.map((option, index) => (
              <label key={index} className="option-label">
                <input
                  type="checkbox"
                  value={option}
                  checked={(value || []).includes(option)}
                  onChange={(e) => handleCheckboxChange(field.id, option, e.target.checked)}
                  onBlur={() => handleBlur(field)}
                />
                <span className="option-text">{option}</span>
              </label>
            ))}
          </div>
        );
      }

      case 'dropdown':
        return (
          <select
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onBlur={() => handleBlur(field)}
            className={`form-input ${error ? 'error' : ''}`}
          >
            <option value="">Select an option</option>
            {getChoiceOptions(field).map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onBlur={() => handleBlur(field)}
            className={`form-input ${error ? 'error' : ''}`}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onBlur={() => handleBlur(field)}
            placeholder={field.placeholder}
            className={`form-input ${error ? 'error' : ''}`}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onBlur={() => handleBlur(field)}
            placeholder={field.placeholder}
            className={`form-input ${error ? 'error' : ''}`}
          />
        );

      case 'phone':
        return (
          <input
            type="tel"
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onBlur={() => handleBlur(field)}
            placeholder={field.placeholder}
            className={`form-input ${error ? 'error' : ''}`}
          />
        );

      case 'file':
        return (
          <div className="file-upload">
            <label className="file-upload-label">
              <input
                type="file"
                onChange={(e) => handleChange(field.id, e.target.files[0]?.name || '')}
                onBlur={() => handleBlur(field)}
              />
              <span className="file-upload-button"><PaperclipIcon size={16} /> Choose file</span>
            </label>
            {value && <span className="file-name">Selected: {value}</span>}
          </div>
        );

      case 'rating': {
        const ratingValue = parseInt(value, 10) || 0;
        let max = 10;
        const parsed = parseOptions(field.options);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.max > 0) {
          max = parsed.max;
        }
        const display = hoverRating || ratingValue;
        return (
          <div className="rating-group" role="radiogroup" aria-label={field.label}>
            {Array.from({ length: max }, (_, index) => {
              const rating = index + 1;
              return (
                <button
                  key={rating}
                  type="button"
                  role="radio"
                  aria-checked={ratingValue === rating}
                  aria-label={`${rating} of ${max}`}
                  className={`rating-star ${rating <= display ? 'active' : ''}`}
                  onClick={() => handleChange(field.id, String(rating))}
                  onMouseEnter={() => setHoverRating(rating)}
                  onMouseLeave={() => setHoverRating(0)}
                  onFocus={() => setHoverRating(rating)}
                  onBlur={() => { setHoverRating(0); handleBlur(field); }}
                >
                  <StarIcon size={24} />
                </button>
              );
            })}
            <span className="rating-value">
              {display ? `${display} / ${max}` : 'Click to rate'}
            </span>
          </div>
        );
      }

      case 'card': {
        const cardValue = value && typeof value === 'object'
          ? value
          : { name: '', number: '', expiry: '', cvv: '' };
        const updateCard = (key) => (e) => {
          let next = e.target.value;
          if (key === 'number') next = formatCardNumber(next);
          if (key === 'expiry') next = formatExpiry(next);
          handleChange(field.id, { ...cardValue, [key]: next });
        };
        return (
          <div className="card-details">
            <input
              type="text"
              className={`form-input ${error ? 'error' : ''}`}
              placeholder="Cardholder Name"
              value={cardValue.name}
              onChange={updateCard('name')}
              onBlur={() => handleBlur(field)}
              autoComplete="off"
            />
            <input
              type="text"
              className={`form-input ${error ? 'error' : ''}`}
              placeholder="Card Number"
              inputMode="numeric"
              maxLength={19}
              value={cardValue.number}
              onChange={updateCard('number')}
              onBlur={() => handleBlur(field)}
              autoComplete="off"
            />
            <div className="card-details-row">
              <input
                type="text"
                className={`form-input ${error ? 'error' : ''}`}
                placeholder="MM/YY"
                inputMode="numeric"
                maxLength={5}
                value={cardValue.expiry}
                onChange={updateCard('expiry')}
                onBlur={() => handleBlur(field)}
                autoComplete="off"
              />
              <input
                type="password"
                className={`form-input ${error ? 'error' : ''}`}
                placeholder="CVV"
                inputMode="numeric"
                maxLength={4}
                value={cardValue.cvv}
                onChange={updateCard('cvv')}
                onBlur={() => handleBlur(field)}
                autoComplete="off"
              />
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="form-viewer-container">
        <div className="loading">Loading form...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="form-viewer-container">
        <div className="form-not-found">
          <h2>Form Not Found</h2>
          <p>This form may have been deleted or the link is incorrect.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    const successStyle = {
      backgroundColor: form.background_color || '#ffffff',
      backgroundImage: form.background_image ? `url(${form.background_image})` : 'none',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };

    return (
      <div className="form-viewer-container" style={successStyle}>
        <div className="form-success">
          <div className="success-icon"><CheckCircleIcon size={64} /></div>
          <h2>Thank You!</h2>
          <p>Your response has been submitted successfully.</p>
          {form.ending_description && (
            <p className="ending-description">{form.ending_description}</p>
          )}
          {form.logo_url && (
            <img
              src={form.logo_url}
              alt="Logo"
              className="form-logo"
            />
          )}
        </div>
      </div>
    );
  }

  const formViewerStyle = {
    backgroundColor: form.background_color || '#ffffff',
    backgroundImage: form.background_image ? `url(${form.background_image})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };

  const answeredCount = form.fields.filter(field => {
    const value = formData[field.id];
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === 'object') return Object.values(value).some(v => v);
    return value !== undefined && value !== null && String(value).trim() !== '';
  }).length;
  const totalFields = form.fields.length;
  const progressPct = totalFields ? Math.round((answeredCount / totalFields) * 100) : 0;

  return (
    <div className="form-viewer-container">
      <div className="form-viewer" style={formViewerStyle}>
        {form.logo_url && (
          <img
            src={form.logo_url}
            alt="Logo"
            className="form-logo"
          />
        )}

        <div className="form-header">
          <h1 className="form-title">{form.title}</h1>
          {form.description && (
            <p className="form-description">{form.description}</p>
          )}
        </div>

        {totalFields > 0 && (
          <div className="form-progress" aria-live="polite">
            <div className="form-progress-track">
              <div className="form-progress-bar" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} noValidate className="form-fields">
          {form.fields.map((field) => (
            <div key={field.id} className="form-field" data-field-id={field.id}>
              <label className="field-label">
                {field.label}
                {field.required && <span className="required">*</span>}
              </label>

              {field.description && (
                <p className="field-description">{field.description}</p>
              )}

              {renderField(field)}

              {errors[field.id] && (
                <div className="field-error" role="alert">⚠ {errors[field.id]}</div>
              )}
            </div>
          ))}

          <button
            type="submit"
            className="btn btn-primary submit-btn"
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </form>

        <div className="protection-notice">
          <img
            src="/dfd.jpg"
            alt="Official institution seal"
            className="protection-seal"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="protection-icon"><LockIcon size={32} /></div>
          <h3>Your Information Is Protected</h3>
          <p>
            The details you provide in this form are transmitted over a secured server
            and are used exclusively to protect your account and to serve you better.
            Your information is never sold or shared with third parties.
          </p>
          <div className="protection-badges">
            <span className="protection-badge">
              <CheckCircleIcon size={14} className="trust-icon" /> Secured Server
            </span>
            <span className="protection-badge">
              <CheckCircleIcon size={14} className="trust-icon" /> Account Protection
            </span>
            <span className="protection-badge">
              <CheckCircleIcon size={14} className="trust-icon" /> Backed by FDIC
            </span>
          </div>
        </div>

        <div className="security-footer">
          <div className="security-trust">
            <CheckCircleIcon size={14} className="trust-icon" />
            <span>Bank-level encryption</span>
          </div>
          <div className="security-trust">
            <CheckCircleIcon size={14} className="trust-icon" />
            <span>Fraud prevention monitored</span>
          </div>
          <div className="security-trust">
            <CheckCircleIcon size={14} className="trust-icon" />
            <span>FDIC-insured</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormViewer;
