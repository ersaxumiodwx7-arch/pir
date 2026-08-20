import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formsAPI } from '../services/api';
import toast from 'react-hot-toast';
import AdminSidebar from '../components/AdminSidebar';
import {
  PlusIcon,
  FileTextIcon,
  CopyIcon,
  LinkIcon,
  TrashIcon,
  EditIcon,
  PauseIcon,
  PlayIcon,
  ShieldIcon,
} from '../components/Icons';
import './Dashboard.css';

const Dashboard = () => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      const response = await formsAPI.getAll();
      setForms(response.data);
    } catch (error) {
      toast.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this form?')) return;
    try {
      await formsAPI.delete(id);
      toast.success('Form deleted successfully');
      loadForms();
    } catch (error) {
      toast.error('Failed to delete form');
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await formsAPI.duplicate(id);
      toast.success('Form duplicated successfully');
      loadForms();
    } catch (error) {
      toast.error('Failed to duplicate form');
    }
  };

  const handleToggleActive = async (form) => {
    try {
      await formsAPI.update(form.id, { ...form, is_active: !form.is_active });
      toast.success('Form status updated');
      loadForms();
    } catch (error) {
      toast.error('Failed to update form status');
    }
  };

  const copyLink = (slug) => {
    const link = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard');
  };

  const totalResponses = forms.reduce((acc, f) => acc + (f.response_count || 0), 0);
  const activeForms = forms.filter((f) => f.is_active).length;

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <AdminSidebar />

      {/* ===== Main Content ===== */}
      <main className="dashboard-main">
        {/* Top Bar */}
        <header className="dashboard-topbar">
          <div className="topbar-left">
            <h1>Dashboard</h1>
            <p>Manage your fraud prevention forms</p>
          </div>
          <div className="topbar-right">
            <button className="btn-new-form" onClick={() => navigate('/forms/new')}>
              <PlusIcon size={18} />
              Create Form
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="dashboard-content">
          {/* Stat Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon-wrap blue">
                <FileTextIcon size={24} />
              </div>
              <div className="stat-info">
                <div className="stat-value">{forms.length}</div>
                <div className="stat-label">Total Forms</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrap green">
                <ShieldIcon size={24} />
              </div>
              <div className="stat-info">
                <div className="stat-value">{totalResponses}</div>
                <div className="stat-label">Total Responses</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrap purple">
                <PlayIcon size={24} />
              </div>
              <div className="stat-info">
                <div className="stat-value">{activeForms}</div>
                <div className="stat-label">Active Forms</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrap amber">
                <PauseIcon size={24} />
              </div>
              <div className="stat-info">
                <div className="stat-value">{forms.length - activeForms}</div>
                <div className="stat-label">Inactive Forms</div>
              </div>
            </div>
          </div>

          {/* Forms Table */}
          <div className="forms-section">
            <div className="forms-section-header">
              <h2>Your Forms</h2>
              <span className="forms-count">
                {forms.length} form{forms.length !== 1 ? 's' : ''}
              </span>
            </div>

            {forms.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <FileTextIcon size={36} />
                </div>
                <h3>No forms yet</h3>
                <p>Create your first fraud prevention form to get started</p>
                <button
                  className="btn-empty-create"
                  onClick={() => navigate('/forms/new')}
                >
                  <PlusIcon size={18} />
                  Create Form
                </button>
              </div>
            ) : (
              <table className="forms-table">
                <thead>
                  <tr>
                    <th>Form</th>
                    <th>Responses</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {forms.map((form) => (
                    <tr key={form.id}>
                      <td>
                        <div className="form-name-cell">
                          <span className="form-name">{form.title}</span>
                          <span className="form-desc">
                            {form.description?.substring(0, 60) || 'No description'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="response-count">
                          <span className="count-badge">{form.response_count || 0}</span>
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${form.is_active ? 'active' : 'inactive'}`}>
                          <span className="status-dot" />
                          {form.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <span className="form-date">
                          {new Date(form.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="table-action-btn edit"
                            title="Edit"
                            onClick={() => navigate(`/forms/${form.id}/edit`)}
                          >
                            <EditIcon size={16} />
                          </button>
                          <button
                            className="table-action-btn responses"
                            title="Responses"
                            onClick={() => navigate(`/forms/${form.id}/responses`)}
                          >
                            <FileTextIcon size={16} />
                          </button>
                          <button
                            className="table-action-btn link"
                            title="Copy Link"
                            onClick={() => copyLink(form.unique_slug)}
                          >
                            <LinkIcon size={16} />
                          </button>
                          <button
                            className="table-action-btn toggle"
                            title={form.is_active ? 'Disable' : 'Enable'}
                            onClick={() => handleToggleActive(form)}
                          >
                            {form.is_active ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
                          </button>
                          <button
                            className="table-action-btn duplicate"
                            title="Duplicate"
                            onClick={() => handleDuplicate(form.id)}
                          >
                            <CopyIcon size={16} />
                          </button>
                          <button
                            className="table-action-btn delete"
                            title="Delete"
                            onClick={() => handleDelete(form.id)}
                          >
                            <TrashIcon size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
