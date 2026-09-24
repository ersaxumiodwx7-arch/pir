import React, { useState, useEffect, useCallback } from 'react';
import { superAdminAPI } from '../services/api';
import './AdminClients.css';

const AdminAccounts = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [formData, setFormData] = useState({
    username: '', email: '', password: '',
    subscription_days: '', subscription_expires_at: ''
  });
  const [actionMsg, setActionMsg] = useState('');
  const [formError, setFormError] = useState('');

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const response = await superAdminAPI.list();
      setAdmins(response.data.admins || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load admin accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const resetForm = () => {
    setFormData({ username: '', email: '', password: '', subscription_days: '', subscription_expires_at: '' });
    setEditingAdmin(null);
    setFormError('');
    setShowModal(false);
  };

  const openEdit = (admin) => {
    setEditingAdmin(admin);
    setFormData({
      username: admin.username,
      email: admin.email || '',
      password: '',
      subscription_days: '',
      subscription_expires_at: admin.subscription_expires_at ? admin.subscription_expires_at.slice(0, 10) : ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setActionMsg('');
    setFormError('');
    try {
      const payload = {
        username: formData.username.trim(),
        email: formData.email.trim() || null,
        password: formData.password || undefined
      };
      // Prefer explicit date; otherwise use days from now
      if (formData.subscription_expires_at) {
        payload.subscription_expires_at = new Date(formData.subscription_expires_at + 'T23:59:59Z').toISOString();
      } else if (formData.subscription_days) {
        payload.subscription_days = formData.subscription_days;
      } else if (!editingAdmin) {
        payload.subscription_expires_at = null;
      }

      if (editingAdmin) {
        if (!payload.password) delete payload.password;
        await superAdminAPI.update(editingAdmin.id, payload);
        setActionMsg(`Updated "${formData.username}"`);
      } else {
        await superAdminAPI.create(payload);
        setActionMsg(`Admin "${formData.username}" created`);
      }
      resetForm();
      fetchAdmins();
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err) {
      // Show the server's exact reason INSIDE the modal - a page-level alert
      // would be hidden behind the overlay
      setFormError(err.response?.data?.error || 'Failed to save admin');
    }
  };

  const handleDelete = async (admin) => {
    if (!window.confirm(`Delete admin "${admin.username}"? Their ${admin.client_count} client(s) will be kept but unassigned.`)) return;
    try {
      await superAdminAPI.delete(admin.id);
      setActionMsg(`Admin "${admin.username}" deleted`);
      fetchAdmins();
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete admin');
      setTimeout(() => setError(''), 4000);
    }
  };

  const handleToggleActive = async (admin) => {
    try {
      await superAdminAPI.update(admin.id, { is_active: admin.is_active ? false : true });
      fetchAdmins();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update admin');
      setTimeout(() => setError(''), 4000);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const daysLeft = (admin) => {
    if (admin.role === 'super_admin') return null;
    if (!admin.subscription_expires_at) return -1;
    const diff = new Date(admin.subscription_expires_at).getTime() - Date.now();
    return Math.ceil(diff / (24 * 60 * 60 * 1000));
  };

  if (loading) {
    return <div className="loading">Loading admin accounts...</div>;
  }

  return (
    <div className="admin-deposit-methods">
      <div className="page-header">
        <div>
          <h1>Admin Accounts</h1>
          <p className="page-subtitle">Super admin only — create admin accounts, set subscription timeframes, and control access.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setFormData({ username: '', email: '', password: '', subscription_days: '', subscription_expires_at: '' }); setEditingAdmin(null); setShowModal(true); }}>
          + New Admin Account
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {actionMsg && <div className="alert alert-success">{actionMsg}</div>}

      <div className="methods-grid">
        {admins.map((admin) => {
          const left = daysLeft(admin);
          const expired = admin.role !== 'super_admin' && left !== null && left <= 0;
          const noSub = admin.role !== 'super_admin' && left === -1;
          return (
            <div key={admin.id} className={`method-card${admin.is_active ? '' : ' method-inactive'}`}>
              <div className="method-header">
                <div className="method-icon" style={{ background: admin.role === 'super_admin' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                  {admin.role === 'super_admin' ? '★' : '👤'}
                </div>
                <div className="method-title">
                  <h3>{admin.username}</h3>
                  <span className="method-type-badge" style={{ background: admin.role === 'super_admin' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)', color: admin.role === 'super_admin' ? '#f59e0b' : '#3b82f6' }}>
                    {admin.role === 'super_admin' ? 'SUPER ADMIN' : 'ADMIN'}
                  </span>
                </div>
              </div>

              <div className="method-details">
                <div className="method-detail-row">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{admin.email || '—'}</span>
                </div>
                <div className="method-detail-row">
                  <span className="detail-label">Clients</span>
                  <span className="detail-value">{admin.client_count}</span>
                </div>
                {admin.role !== 'super_admin' && (
                  <div className="method-detail-row">
                    <span className="detail-label">Subscription</span>
                    <span className="detail-value" style={{ color: expired ? '#ef4444' : noSub ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
                      {noSub ? 'Not set' : expired ? `Expired ${formatDate(admin.subscription_expires_at)}` : `Until ${formatDate(admin.subscription_expires_at)} (${left}d left)`}
                    </span>
                  </div>
                )}
                <div className="method-detail-row">
                  <span className="detail-label">Status</span>
                  <span className="detail-value" style={{ color: admin.is_active ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                    {admin.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>

              {admin.role !== 'super_admin' && (
                <div className="method-actions">
                  <button className="btn btn-sm btn-secondary" onClick={() => openEdit(admin)}>Edit / Renew</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => handleToggleActive(admin)}>
                    {admin.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(admin)}>Delete</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {admins.length === 0 && (
        <div className="empty-state">
          <p>No admin accounts yet. Create one with the button above.</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingAdmin ? `Edit Admin: ${editingAdmin.username}` : 'Create Admin Account'}</h2>
              <button className="modal-close" onClick={resetForm}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="method-form">
              <div className="form-group">
                <label>Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="e.g. admin_john"
                  required
                  disabled={!!editingAdmin}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@example.com"
                />
              </div>
              <div className="form-group">
                <label>{editingAdmin ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingAdmin ? 'Leave blank to keep' : 'Min 6 characters'}
                  required={!editingAdmin}
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label>Subscription Expires On</label>
                <input
                  type="date"
                  value={formData.subscription_expires_at}
                  onChange={(e) => setFormData({ ...formData, subscription_expires_at: e.target.value, subscription_days: '' })}
                />
              </div>
              <div className="form-group">
                <label>Or Days From Now</label>
                <input
                  type="number"
                  min="1"
                  value={formData.subscription_days}
                  onChange={(e) => setFormData({ ...formData, subscription_days: e.target.value, subscription_expires_at: '' })}
                  placeholder="e.g. 30 for one month"
                />
              </div>
              <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 12px' }}>
                Leave both blank to remove the subscription (admin will be locked out until a date is set).
              </p>
              {formError && (
                <div className="alert alert-error" role="alert" style={{ marginBottom: '12px' }}>
                  {formError}
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingAdmin ? 'Save Changes' : 'Create Admin'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAccounts;
