import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formsAPI, fieldsAPI, uploadAPI } from '../services/api';
import toast from 'react-hot-toast';
import { TypeIcon, AlignLeftIcon, ListIcon, CheckSquareIcon, CalendarIcon, HashIcon, MailIcon, PhoneIcon, PaperclipIcon, StarIcon, CreditCardIcon, PlusIcon, TrashIcon, EditIcon, EyeIcon } from '../components/Icons';
import './FormBuilder.css';
import '../index.css';

const FIELD_TYPES = [
  { type: 'text', label: 'Short Text', icon: <TypeIcon size={16} /> },
  { type: 'textarea', label: 'Long Text', icon: <AlignLeftIcon size={16} /> },
  { type: 'radio', label: 'Multiple Choice', icon: <ListIcon size={16} /> },
  { type: 'checkbox', label: 'Checkboxes', icon: <CheckSquareIcon size={16} /> },
  { type: 'dropdown', label: 'Dropdown', icon: <AlignLeftIcon size={16} /> },
  { type: 'date', label: 'Date Picker', icon: <CalendarIcon size={16} /> },
  { type: 'number', label: 'Number', icon: <HashIcon size={16} /> },
  { type: 'email', label: 'Email', icon: <MailIcon size={16} /> },
  { type: 'phone', label: 'Phone', icon: <PhoneIcon size={16} /> },
  { type: 'file', label: 'File Upload', icon: <PaperclipIcon size={16} /> },
  { type: 'rating', label: 'Rating/Scale', icon: <StarIcon size={16} /> },
  { type: 'card', label: 'Card Details', icon: <CreditCardIcon size={16} /> },
];

const SortableField = ({ field, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="sortable-field">
      <div className="field-item">
        <div {...attributes} {...listeners} className="drag-handle">
          ⋮⋮
        </div>
        <div className="field-content">
          <div className="field-type-badge">{FIELD_TYPES.find(f => f.type === field.type)?.icon}</div>
          <div className="field-info">
            <div className="field-label">{field.label}</div>
            <div className="field-type">{FIELD_TYPES.find(f => f.type === field.type)?.label}</div>
          </div>
          <div className="field-actions">
            <button className="btn btn-secondary" onClick={() => onEdit(field)} style={{ padding: '4px 8px', fontSize: '12px' }}>
              Edit
            </button>
            <button className="btn btn-danger" onClick={() => onDelete(field.id)} style={{ padding: '4px 8px', fontSize: '12px' }}>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FieldEditor = ({ field, onSave, onCancel }) => {
  // Always start with every field key defined so the inputs are controlled
  // from the first render (avoids the uncontrolled -> controlled warning).
  const [formData, setFormData] = useState({
    type: 'text',
    label: '',
    description: '',
    placeholder: '',
    required: false,
    options: '',
    ...(field || {}),
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const processedData = {
      ...formData,
      options: (formData.type === 'radio' || formData.type === 'checkbox' || formData.type === 'dropdown') 
        ? formData.options.split('\n').filter(o => o.trim()) 
        : formData.type === 'rating' 
          ? JSON.stringify({ min: 1, max: 10 })
          : null
    };
    onSave(processedData);
  };

  const needsOptions = ['radio', 'checkbox', 'dropdown'].includes(formData.type);

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{field ? 'Edit Field' : 'Add Field'}</h3>
          <button className="btn btn-secondary" onClick={onCancel}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Field Type</label>
            <select name="type" value={formData.type} onChange={handleChange} disabled={!!field}>
              {FIELD_TYPES.map(ft => (
                <option key={ft.type} value={ft.type}>{ft.icon} {ft.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Label/Question *</label>
            <input
              type="text"
              name="label"
              value={formData.label}
              onChange={handleChange}
              required
              placeholder="Enter your question"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Add additional context or help text"
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Placeholder</label>
            <input
              type="text"
              name="placeholder"
              value={formData.placeholder}
              onChange={handleChange}
              placeholder="Placeholder text"
            />
          </div>
          {needsOptions && (
            <div className="form-group">
              <label>Options (one per line)</label>
              <textarea
                name="options"
                value={formData.options}
                onChange={handleChange}
                placeholder="Option 1&#10;Option 2&#10;Option 3"
                rows={4}
                required
              />
            </div>
          )}
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                name="required"
                checked={formData.required}
                onChange={handleChange}
              />
              Required field
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const LivePreview = ({ form, fields }) => {
  const previewStyle = {
    backgroundColor: form.background_color || '#ffffff',
    backgroundImage: form.background_image ? `url(http://localhost:5000${form.background_image})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };

  return (
    <div className="live-preview">
      <div className="preview-header">
        <h3>Live Preview</h3>
      </div>
      <div className="preview-content" style={previewStyle}>
        {form.logo_url && (
          <img src={`http://localhost:5000${form.logo_url}`} alt="Logo" className="preview-logo" />
        )}
        <h2 className="preview-title">{form.title || 'Untitled Form'}</h2>
        {form.description && <p className="preview-description">{form.description}</p>}
        
        <div className="preview-fields">
          {fields.length === 0 ? (
            <p className="preview-empty">No fields added yet</p>
          ) : (
            fields.map((field, index) => (
              <div key={field.id} className="preview-field">
                <label className="preview-label">
                  {field.label}
                  {field.required && <span className="required">*</span>}
                </label>
                {field.description && <p className="preview-field-description">{field.description}</p>}
                
                {field.type === 'text' && (
                  <input
                    type="text"
                    placeholder={field.placeholder}
                    className="preview-input"
                    disabled
                  />
                )}
                {field.type === 'textarea' && (
                  <textarea
                    placeholder={field.placeholder}
                    className="preview-textarea"
                    rows={4}
                    disabled
                  />
                )}
                {field.type === 'radio' && field.options && (
                  <div className="preview-options">
                    {(() => {
                      try {
                        return JSON.parse(field.options).map((option, i) => (
                          <label key={i} className="preview-option">
                            <input type="radio" name={`preview-${field.id}`} disabled />
                            {option}
                          </label>
                        ));
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                )}
                {field.type === 'checkbox' && field.options && (
                  <div className="preview-options">
                    {(() => {
                      try {
                        return JSON.parse(field.options).map((option, i) => (
                          <label key={i} className="preview-option">
                            <input type="checkbox" disabled />
                            {option}
                          </label>
                        ));
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                )}
                {field.type === 'dropdown' && field.options && (
                  <select className="preview-select" disabled>
                    <option value="">Select an option</option>
                    {(() => {
                      try {
                        return JSON.parse(field.options).map((option, i) => (
                          <option key={i}>{option}</option>
                        ));
                      } catch {
                        return null;
                      }
                    })()}
                  </select>
                )}
                {field.type === 'date' && (
                  <input type="date" className="preview-input" disabled />
                )}
                {field.type === 'number' && (
                  <input type="number" placeholder={field.placeholder} className="preview-input" disabled />
                )}
                {field.type === 'email' && (
                  <input type="email" placeholder={field.placeholder} className="preview-input" disabled />
                )}
                {field.type === 'phone' && (
                  <input type="tel" placeholder={field.placeholder} className="preview-input" disabled />
                )}
                {field.type === 'file' && (
                  <input type="file" className="preview-input" disabled />
                )}
                {field.type === 'rating' && (
                  <div className="preview-rating">
                    {[1, 2, 3, 4, 5].map(n => (
                      <span key={n} className="rating-star">⭐</span>
                    ))}
                  </div>
                )}
                {field.type === 'card' && (
                  <div className="preview-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input placeholder="Cardholder Name" className="preview-input" disabled />
                    <input placeholder="Card Number" className="preview-input" disabled />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input placeholder="MM/YY" className="preview-input" style={{ flex: 1 }} disabled />
                      <input placeholder="CVV" className="preview-input" style={{ flex: 1 }} disabled />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        
        {fields.length > 0 && (
          <button className="btn btn-primary preview-submit" disabled>Submit</button>
        )}
      </div>
    </div>
  );
};

const FormBuilderPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    logo_url: '',
    ending_description: '',
    background_color: '#0f172a',
    background_image: '',
  });
  const [fields, setFields] = useState([]);
  const [editingField, setEditingField] = useState(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (id) {
      loadForm();
    }
  }, [id]);

  const loadForm = async () => {
    try {
      const [formRes, fieldsRes] = await Promise.all([
        formsAPI.getById(id),
        fieldsAPI.getByFormId(id),
      ]);
      setForm(formRes.data);
      setFields(fieldsRes.data);
    } catch (error) {
      toast.error('Failed to load form');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = fields.findIndex(f => f.id === active.id);
      const newIndex = fields.findIndex(f => f.id === over.id);
      const newFields = arrayMove(fields, oldIndex, newIndex);
      
      setFields(newFields);

      // Update order in backend
      const reorderedFields = newFields.map((field, index) => ({
        id: field.id,
        order_index: index,
      }));
      
      try {
        await fieldsAPI.reorder(reorderedFields);
      } catch (error) {
        toast.error('Failed to reorder fields');
        loadForm();
      }
    }
  };

  const handleAddField = (type) => {
    setEditingField({ type, order_index: fields.length });
    setShowFieldEditor(true);
  };

  const handleEditField = (field) => {
    let options = '';
    if (field.options) {
      if (typeof field.options === 'string') {
        options = field.options;
      } else if (Array.isArray(field.options)) {
        options = field.options.join('\n');
      } else {
        options = JSON.stringify(field.options);
      }
    }
    setEditingField({
      ...field,
      options
    });
    setShowFieldEditor(true);
  };

  const handleSaveField = async (fieldData) => {
    try {
      if (editingField.id) {
        // Update existing field
        const response = await fieldsAPI.update(editingField.id, fieldData);
        setFields(fields.map(f => f.id === editingField.id ? response.data : f));
        toast.success('Field updated');
      } else {
        // Create new field
        const formId = id || (await saveForm(true))?.id;
        if (!formId) {
          // Form creation was skipped (e.g. missing title) - keep the editor open
          return;
        }
        const response = await fieldsAPI.create({
          ...fieldData,
          form_id: formId,
          order_index: fieldData.order_index,
        });
        setFields([...fields, response.data]);
        toast.success('Field added');
        
        if (!id) {
          navigate(`/forms/${formId}/edit`, { replace: true });
        }
      }
      setShowFieldEditor(false);
      setEditingField(null);
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || 'Failed to save field');
    }
  };

  const handleDeleteField = async (fieldId) => {
    if (!window.confirm('Are you sure you want to delete this field?')) {
      return;
    }

    try {
      await fieldsAPI.delete(fieldId);
      setFields(fields.filter(f => f.id !== fieldId));
      toast.success('Field deleted');
    } catch (error) {
      toast.error('Failed to delete field');
    }
  };

  const saveForm = async (returnId = false) => {
    if (!form.title.trim()) {
      toast.error('Please enter a form title');
      return null;
    }

    setSaving(true);
    try {
      let response;
      if (id) {
        response = await formsAPI.update(id, form);
        setForm(response.data);
        toast.success('Form saved');
      } else {
        response = await formsAPI.create(form);
        setForm(response.data);
        toast.success('Form created');
        if (returnId) return response.data;
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || 'Failed to save form');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const response = await uploadAPI.uploadLogo(file);
      setForm(prev => ({ ...prev, logo_url: response.data.logo_url }));
      toast.success('Logo uploaded');
    } catch (error) {
      toast.error('Failed to upload logo');
    }
  };

  const handleBackgroundUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('background', file);
      const response = await fetch('http://localhost:5000/api/upload/background', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });
      const data = await response.json();
      setForm(prev => ({ ...prev, background_image: data.background_image }));
      toast.success('Background uploaded');
    } catch (error) {
      toast.error('Failed to upload background');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="container">
      <div className="form-builder">
        <div className="builder-main">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">{id ? 'Edit Form' : 'Create Form'}</h2>
              <div>
                <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
                  Back
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => saveForm()}
                  disabled={saving}
                  style={{ marginLeft: '10px' }}
                >
                  {saving ? 'Saving...' : 'Save Form'}
                </button>
              </div>
            </div>

            <div className="form-settings">
              <div className="form-group">
                <label>Form Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Enter form title"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Add a description for your form"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Logo</label>
                <input type="file" onChange={handleLogoUpload} accept="image/*" />
                {form.logo_url && (
                  <img
                    src={`http://localhost:5000${form.logo_url}`}
                    alt="Logo"
                    style={{ marginTop: '10px', maxWidth: '200px' }}
                  />
                )}
              </div>
              <div className="form-group">
                <label>Ending Description (shown after submission)</label>
                <textarea
                  value={form.ending_description}
                  onChange={(e) => setForm({ ...form, ending_description: e.target.value })}
                  placeholder="Thank you message or instructions after form submission"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Background Color</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={form.background_color}
                    onChange={(e) => setForm({ ...form, background_color: e.target.value })}
                    style={{ width: '50px', height: '40px', cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    value={form.background_color}
                    onChange={(e) => setForm({ ...form, background_color: e.target.value })}
                    placeholder="#ffffff"
                    style={{ width: '150px' }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Background Image</label>
                <input type="file" onChange={handleBackgroundUpload} accept="image/*" />
                {form.background_image && (
                  <img
                    src={`http://localhost:5000${form.background_image}`}
                    alt="Background"
                    style={{ marginTop: '10px', maxWidth: '200px', maxHeight: '100px', objectFit: 'cover' }}
                  />
                )}
                {form.background_image && (
                  <button
                    className="btn btn-danger"
                    onClick={() => setForm({ ...form, background_image: '' })}
                    style={{ marginTop: '5px', padding: '5px 10px', fontSize: '12px' }}
                  >
                    Remove Background
                  </button>
                )}
              </div>
            </div>

            <div className="fields-section">
              <h3>Form Fields</h3>
              
              <div className="field-types">
                {FIELD_TYPES.map(ft => (
                  <button
                    key={ft.type}
                    className="field-type-btn"
                    onClick={() => handleAddField(ft.type)}
                  >
                    <span className="field-type-icon">{ft.icon}</span>
                    <span className="field-type-label">{ft.label}</span>
                  </button>
                ))}
              </div>

              {fields.length > 0 ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                    <div className="fields-list">
                      {fields.map(field => (
                        <SortableField
                          key={field.id}
                          field={field}
                          onEdit={handleEditField}
                          onDelete={handleDeleteField}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <p className="empty-fields">No fields added yet. Click a field type above to add one.</p>
              )}
            </div>
          </div>
        </div>

        <div className="builder-sidebar">
          <LivePreview form={form} fields={fields} />
        </div>
      </div>

      {showFieldEditor && (
        <FieldEditor
          field={editingField}
          onSave={handleSaveField}
          onCancel={() => {
            setShowFieldEditor(false);
            setEditingField(null);
          }}
        />
      )}
    </div>
  );
};

export default FormBuilderPage;
