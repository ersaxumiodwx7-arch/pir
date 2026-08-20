import React, { useState, useEffect } from 'react';
import { adminAgentsAPI } from '../services/api';
import toast from 'react-hot-toast';
import AdminSidebar from '../components/AdminSidebar';
import './AdminClients.css';

const AdminAgents = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [form, setForm] = useState({
    full_name: '',
    designation: '',
    department: '',
    phone: '',
    email: '',
    agent_id: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadAgents(); }, [search, statusFilter]);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const response = await adminAgentsAPI.getAll(params);
      setAgents(response.data);
    } catch (error) {
      toast.error('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.designation) {
      toast.error('Full name and designation are required');
      return;
    }
    setSubmitting(true);
    try {
      if (editingAgent) {
        await adminAgentsAPI.update(editingAgent.id, form);
        toast.success('Agent updated successfully');
      } else {
        await adminAgentsAPI.create(form);
        toast.success('Agent created successfully');
      }
      setShowCreateModal(false);
      setEditingAgent(null);
      resetForm();
      loadAgents();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save agent');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (agent) => {
    setEditingAgent(agent);
    setForm({
      full_name: agent.full_name,
      designation: agent.designation,
      department: agent.department || '',
      phone: agent.phone || '',
      email: agent.email || '',
      agent_id: agent.agent_id
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this agent?')) return;
    try {
      await adminAgentsAPI.delete(id);
      toast.success('Agent deleted');
      loadAgents();
    } catch (error) {
      toast.error('Failed to delete agent');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await adminAgentsAPI.update(id, { is_active: !currentStatus });
      toast.success('Agent status updated');
      loadAgents();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setForm({
      full_name: '',
      designation: '',
      department: '',
      phone: '',
      email: '',
      agent_id: ''
    });
  };

  const handleOpenCreate = () => {
    setEditingAgent(null);
    resetForm();
    setShowCreateModal(true);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div className="admin-page-layout">
      <AdminSidebar />
      <div className="admin-page-body">
        <div className="admin-clients">
      <div className="admin-page-header">
        <div>
          <h1>Agent Management</h1>
          <p className="admin-page-subtitle">Create and manage agents for client verification</p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={handleOpenCreate}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Agent
        </button>
      </div>

      {/* Search & Filters */}
      <div className="admin-card admin-filters">
        <div className="admin-filter-row">
          <div className="admin-search-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              placeholder="Search by Agent ID, name, or designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="admin-filter-select">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Agents Table */}
      <div className="admin-card">
        {loading ? (
          <div className="admin-page-loading"><div className="admin-loading-spinner"></div></div>
        ) : agents.length === 0 ? (
          <div className="admin-card-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <h3>No agents found</h3>
            <p>Create your first agent to enable client verification</p>
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Agent ID</th>
                  <th>Name</th>
                  <th>Designation</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id}>
                    <td className="admin-table-mono">{agent.agent_id}</td>
                    <td className="admin-table-bold">{agent.full_name}</td>
                    <td>{agent.designation}</td>
                    <td>{agent.department || '—'}</td>
                    <td>
                      <span className={`admin-status-badge status-${agent.is_active ? 'active' : 'closed'}`}>
                        {agent.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{formatDate(agent.created_at)}</td>
                    <td>
                      <div className="admin-actions">
                        <button className="admin-action-btn" onClick={() => handleEdit(agent)} title="Edit">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button 
                          className={`admin-action-btn ${agent.is_active ? 'warning' : 'success'}`} 
                          onClick={() => handleToggleStatus(agent.id, agent.is_active)}
                          title={agent.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {agent.is_active ? (
                              <><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>
                            ) : (
                              <polygon points="5 3 19 12 5 21 5 3"/>
                            )}
                          </svg>
                        </button>
                        <button className="admin-action-btn danger" onClick={() => handleDelete(agent.id)} title="Delete">
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

      {/* Create/Edit Agent Modal */}
      {showCreateModal && (
        <div className="admin-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{editingAgent ? 'Edit Agent' : 'Create New Agent'}</h2>
              <button className="admin-modal-close" onClick={() => setShowCreateModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="admin-modal-form">
              <div className="admin-form-grid">
                <div className="admin-form-field">
                  <label>Full Name *</label>
                  <input type="text" value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} required placeholder="John Smith" />
                </div>
                <div className="admin-form-field">
                  <label>Agent ID</label>
                  <input type="text" value={form.agent_id} onChange={(e) => setForm({...form, agent_id: e.target.value.toUpperCase()})} placeholder="Auto-generated if empty" disabled={editingAgent} />
                  {editingAgent && <small style={{ color: '#64748b', fontSize: '12px' }}>Agent ID cannot be changed</small>}
                </div>
                <div className="admin-form-field">
                  <label>Designation *</label>
                  <input type="text" value={form.designation} onChange={(e) => setForm({...form, designation: e.target.value})} required placeholder="Senior Financial Advisor" />
                </div>
                <div className="admin-form-field">
                  <label>Department</label>
                  <input type="text" value={form.department} onChange={(e) => setForm({...form, department: e.target.value})} placeholder="Investment Banking" />
                </div>
                <div className="admin-form-field">
                  <label>Phone</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} placeholder="(555) 123-4567" />
                </div>
                <div className="admin-form-field">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="agent@bank.com" />
                </div>
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : (editingAgent ? 'Update Agent' : 'Create Agent')}
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

export default AdminAgents;
