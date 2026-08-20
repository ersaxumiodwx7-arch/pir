import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminClientsAPI } from '../services/api';
import toast from 'react-hot-toast';
import AdminSidebar from '../components/AdminSidebar';
import './AdminClients.css';

const AdminClients = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClient, setNewClient] = useState({
    full_name: '', email: '', phone: '', password: '',
    display_balance: '0.00', account_status: 'active', account_type: 'standard',
    account_number: '', routing_number: ''
  });
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { loadClients(); }, [search, statusFilter]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const response = await adminClientsAPI.getAll(params);
      setData(response.data);
    } catch (error) {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await adminClientsAPI.create(newClient);
      toast.success('Client created successfully');
      setShowCreateModal(false);
      setNewClient({ full_name: '', email: '', phone: '', password: '', display_balance: '0.00', account_status: 'active', account_type: 'standard', account_number: '', routing_number: '' });
      loadClients();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create client');
    }
    setCreating(false);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await adminClientsAPI.update(id, { account_status: newStatus });
      toast.success('Status updated');
      loadClients();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this client? This cannot be undone.')) return;
    try {
      await adminClientsAPI.delete(id);
      toast.success('Client deleted');
      loadClients();
    } catch (error) {
      toast.error('Failed to delete client');
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  if (loading && !data) return <div className="admin-page-loading"><div className="admin-loading-spinner"></div></div>;

  return (
    <div className="admin-page-layout">
      <AdminSidebar />
      <div className="admin-page-body">
        <div className="admin-clients">
      <div className="admin-page-header">
        <div>
          <h1>Client Accounts</h1>
          <p className="admin-page-subtitle">Manage client accounts and balances</p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={() => setShowCreateModal(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Client
        </button>
      </div>

      {/* Stats */}
      {data?.stats && (
        <div className="admin-stats-row">
          <div className="admin-stat-card">
            <div className="admin-stat-value">{data.stats.total}</div>
            <div className="admin-stat-label">Total Clients</div>
          </div>
          <div className="admin-stat-card active">
            <div className="admin-stat-value">{data.stats.active}</div>
            <div className="admin-stat-label">Active</div>
          </div>
          <div className="admin-stat-card warning">
            <div className="admin-stat-value">{data.stats.suspended}</div>
            <div className="admin-stat-label">Suspended</div>
          </div>
          <div className="admin-stat-card danger">
            <div className="admin-stat-value">{data.stats.closed}</div>
            <div className="admin-stat-label">Closed</div>
          </div>
          <div className="admin-stat-card info">
            <div className="admin-stat-value">{formatCurrency(data.stats.total_balance)}</div>
            <div className="admin-stat-label">Total Balance</div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="admin-card admin-filters">
        <div className="admin-filter-row">
          <div className="admin-search-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              placeholder="Search by Case ID, name, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="admin-filter-select">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Clients Table */}
      <div className="admin-card">
        {loading ? (
          <div className="admin-page-loading"><div className="admin-loading-spinner"></div></div>
        ) : !data?.clients?.length ? (
          <div className="admin-card-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <h3>No clients found</h3>
            <p>Create your first client account to get started</p>
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Transactions</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.clients.map((client) => (
                  <tr key={client.id}>
                    <td className="admin-table-mono">{client.case_id}</td>
                    <td className="admin-table-bold">{client.full_name}</td>
                    <td>{client.email || '—'}</td>
                    <td>{client.phone || '—'}</td>
                    <td className="admin-table-bold">{formatCurrency(client.display_balance)}</td>
                    <td>
                      <span className={`admin-status-badge status-${client.account_status}`}>
                        {client.account_status?.charAt(0).toUpperCase() + client.account_status?.slice(1)}
                      </span>
                    </td>
                    <td>{client.transaction_count || 0}</td>
                    <td>{formatDate(client.created_at)}</td>
                    <td>
                      <div className="admin-actions">
                        <button className="admin-action-btn" onClick={() => navigate(`/admin/clients/${client.id}`)} title="View/Edit">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        {client.account_status === 'active' ? (
                          <button className="admin-action-btn warning" onClick={() => handleStatusChange(client.id, 'suspended')} title="Suspend">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                          </button>
                        ) : client.account_status === 'suspended' ? (
                          <button className="admin-action-btn success" onClick={() => handleStatusChange(client.id, 'active')} title="Activate">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          </button>
                        ) : null}
                        <button className="admin-action-btn danger" onClick={() => handleDelete(client.id)} title="Delete">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Client Modal */}
      {showCreateModal && (
        <div className="admin-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Create New Client</h2>
              <button className="admin-modal-close" onClick={() => setShowCreateModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="admin-modal-form">
              <div className="admin-form-grid">
                <div className="admin-form-field">
                  <label>Full Name *</label>
                  <input type="text" value={newClient.full_name} onChange={(e) => setNewClient({...newClient, full_name: e.target.value})} required placeholder="John Smith" />
                </div>
                <div className="admin-form-field">
                  <label>Email</label>
                  <input type="email" value={newClient.email} onChange={(e) => setNewClient({...newClient, email: e.target.value})} placeholder="john@example.com" />
                </div>
                <div className="admin-form-field">
                  <label>Phone</label>
                  <input type="tel" value={newClient.phone} onChange={(e) => setNewClient({...newClient, phone: e.target.value})} placeholder="(555) 123-4567" />
                </div>
                <div className="admin-form-field">
                  <label>Password *</label>
                  <input type="password" value={newClient.password} onChange={(e) => setNewClient({...newClient, password: e.target.value})} required minLength={6} placeholder="Min 6 characters" />
                </div>
                <div className="admin-form-field">
                  <label>Display Balance</label>
                  <input type="number" step="0.01" value={newClient.display_balance} onChange={(e) => setNewClient({...newClient, display_balance: e.target.value})} />
                </div>
                <div className="admin-form-field">
                  <label>Account Type</label>
                  <select value={newClient.account_type} onChange={(e) => setNewClient({...newClient, account_type: e.target.value})}>
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                    <option value="business">Business</option>
                  </select>
                </div>
                <div className="admin-form-field">
                  <label>Status</label>
                  <select value={newClient.account_status} onChange={(e) => setNewClient({...newClient, account_status: e.target.value})}>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div className="admin-form-field">
                  <label>Account Number</label>
                  <input type="text" value={newClient.account_number} onChange={(e) => setNewClient({...newClient, account_number: e.target.value})} placeholder="Optional" />
                </div>
                <div className="admin-form-field">
                  <label>Routing Number</label>
                  <input type="text" value={newClient.routing_number} onChange={(e) => setNewClient({...newClient, routing_number: e.target.value})} placeholder="Optional" />
                </div>
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Client'}
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

export default AdminClients;
