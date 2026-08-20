import React, { useState, useEffect } from 'react';
import { adminDepositMethodsAPI } from '../services/api';
import { PlusIcon, EditIcon, TrashIcon } from '../components/Icons';
import AdminSidebar from '../components/AdminSidebar';
import './AdminClients.css';

const AdminDepositMethods = () => {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [formData, setFormData] = useState({
    method_name: '',
    method_type: 'wire_transfer',
    instructions: '',
    recipient_name: '',
    account_details: '',
    payment_address: '',
    additional_notes: '',
    is_active: true
  });

  useEffect(() => {
    loadMethods();
  }, []);

  const loadMethods = async () => {
    try {
      const response = await adminDepositMethodsAPI.getAll();
      setMethods(response.data);
    } catch (error) {
      console.error('Error loading deposit methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMethod) {
        await adminDepositMethodsAPI.update(editingMethod.id, formData);
      } else {
        await adminDepositMethodsAPI.create(formData);
      }
      setShowModal(false);
      setEditingMethod(null);
      resetForm();
      loadMethods();
    } catch (error) {
      console.error('Error saving deposit method:', error);
      alert(error.response?.data?.error || 'Failed to save deposit method');
    }
  };

  const handleEdit = (method) => {
    setEditingMethod(method);
    setFormData({
      method_name: method.method_name,
      method_type: method.method_type,
      instructions: method.instructions || '',
      recipient_name: method.recipient_name || '',
      account_details: method.account_details || '',
      payment_address: method.payment_address || '',
      additional_notes: method.additional_notes || '',
      is_active: method.is_active === 1
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this deposit method?')) return;
    try {
      await adminDepositMethodsAPI.delete(id);
      loadMethods();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete deposit method');
    }
  };

  const handleToggle = async (id) => {
    try {
      await adminDepositMethodsAPI.toggle(id);
      loadMethods();
    } catch (error) {
      console.error('Error toggling deposit method:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      method_name: '',
      method_type: 'wire_transfer',
      instructions: '',
      recipient_name: '',
      account_details: '',
      payment_address: '',
      additional_notes: '',
      is_active: true
    });
  };

  const getMethodTypeLabel = (type) => {
    const labels = {
      wire_transfer: 'Wire Transfer',
      zelle: 'Zelle',
      cashapp: 'Cash App',
      shipment: 'Shipment / Physical',
      check: 'Check',
      other: 'Other'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="admin-page-layout">
        <AdminSidebar />
        <div className="admin-page-body">
          <div className="admin-clients-page">
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Loading deposit methods...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-layout">
      <AdminSidebar />
      <div className="admin-page-body">
        <div className="admin-clients-page">
          <div className="admin-clients-header">
            <div className="admin-clients-title-row">
              <h1>Deposit Methods</h1>
            </div>
            <button className="create-client-btn" onClick={() => { resetForm(); setEditingMethod(null); setShowModal(true); }}>
              <PlusIcon size={18} />
              <span>Add Deposit Method</span>
            </button>
          </div>

          <div className="clients-stats">
            <div className="stat-card">
              <div className="stat-value">{methods.length}</div>
              <div className="stat-label">Total Methods</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{methods.filter(m => m.is_active).length}</div>
              <div className="stat-label">Active Methods</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{methods.filter(m => !m.is_active).length}</div>
              <div className="stat-label">Inactive Methods</div>
            </div>
          </div>

          <div className="clients-table-container">
            <table className="clients-table">
              <thead>
                <tr>
                  <th>Method Name</th>
                  <th>Type</th>
                  <th>Recipient</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {methods.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-state">
                      No deposit methods configured. Add your first payment method.
                    </td>
                  </tr>
                ) : (
                  methods.map(method => (
                    <tr key={method.id}>
                      <td className="client-name-cell">
                        <strong>{method.method_name}</strong>
                      </td>
                      <td>
                        <span className="method-type-badge">{getMethodTypeLabel(method.method_type)}</span>
                      </td>
                      <td>{method.recipient_name || '-'}</td>
                      <td>
                        <button
                          className={`status-toggle-btn ${method.is_active ? 'active' : 'inactive'}`}
                          onClick={() => handleToggle(method.id)}
                        >
                          {method.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td>{new Date(method.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="action-btn edit-btn" onClick={() => handleEdit(method)}>
                            <EditIcon size={14} />
                          </button>
                          <button className="action-btn delete-btn" onClick={() => handleDelete(method.id)}>
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Modal */}
          {showModal && (
            <div className="modal-overlay" onClick={() => setShowModal(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{editingMethod ? 'Edit Deposit Method' : 'Add Deposit Method'}</h2>
                  <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="modal-body">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Method Name *</label>
                        <input
                          type="text"
                          value={formData.method_name}
                          onChange={(e) => setFormData({ ...formData, method_name: e.target.value })}
                          placeholder="e.g., Wire Transfer - Chase"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Method Type *</label>
                        <select
                          value={formData.method_type}
                          onChange={(e) => setFormData({ ...formData, method_type: e.target.value })}
                          required
                        >
                          <option value="wire_transfer">Wire Transfer</option>
                          <option value="zelle">Zelle</option>
                          <option value="cashapp">Cash App</option>
                          <option value="shipment">Shipment / Physical</option>
                          <option value="check">Check</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Recipient Name</label>
                        <input
                          type="text"
                          value={formData.recipient_name}
                          onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                          placeholder="Name of recipient"
                        />
                      </div>
                      <div className="form-group">
                        <label>Active</label>
                        <div className="checkbox-group">
                          <input
                            type="checkbox"
                            id="is_active"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                          />
                          <label htmlFor="is_active">Enable this payment method</label>
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Account Details</label>
                      <textarea
                        value={formData.account_details}
                        onChange={(e) => setFormData({ ...formData, account_details: e.target.value })}
                        placeholder="Account number, routing number, email, phone, etc."
                        rows="3"
                      />
                    </div>

                    <div className="form-group">
                      <label>Payment Address (optional)</label>
                      <input
                        type="text"
                        value={formData.payment_address}
                        onChange={(e) => setFormData({ ...formData, payment_address: e.target.value })}
                        placeholder="Email, phone, or physical address for payments"
                      />
                    </div>

                    <div className="form-group">
                      <label>Additional Notes (optional)</label>
                      <textarea
                        value={formData.additional_notes}
                        onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                        placeholder="Any additional notes for this payment method"
                        rows="2"
                      />
                    </div>

                    <div className="form-group">
                      <label>Instructions for Client</label>
                      <textarea
                        value={formData.instructions}
                        onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                        placeholder="Payment instructions that the client will see..."
                        rows="4"
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                    <button type="submit" className="submit-btn">
                      {editingMethod ? 'Update Method' : 'Create Method'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDepositMethods;
