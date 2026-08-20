import React, { useState, useEffect } from 'react';
import { adminDepositsAPI } from '../services/api';
import { ShieldIcon, CreditCardIcon, AlertCircleIcon, CheckCircleIcon, XCircleIcon, ClockIcon, EditIcon } from '../components/Icons';
import AdminSidebar from '../components/AdminSidebar';
import './AdminClients.css';

const AdminDeposits = () => {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({ status: '', notes: '' });

  useEffect(() => {
    fetchDeposits();
  }, []);

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      const response = await adminDepositsAPI.getAll();
      setDeposits(response.data.deposits || []);
    } catch (err) {
      console.error('Error fetching deposits:', err);
      setError('Failed to fetch deposits');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (depositId, newStatus) => {
    try {
      await adminDepositsAPI.updateStatus(depositId, { status: newStatus, notes: updateForm.notes });
      setShowUpdateModal(false);
      setSelectedDeposit(null);
      fetchDeposits();
    } catch (err) {
      console.error('Error updating deposit:', err);
      setError('Failed to update deposit');
    }
  };

  const openUpdateModal = (deposit) => {
    setSelectedDeposit(deposit);
    setUpdateForm({ status: deposit.status, notes: deposit.notes || '' });
    setShowUpdateModal(true);
  };

  const filteredDeposits = deposits.filter(deposit => {
    const matchesSearch =
      (deposit.client_name && deposit.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (deposit.case_id && deposit.case_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (deposit.reference_number && deposit.reference_number.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || deposit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'available':
        return <span className="admin-status-badge status-available"><CheckCircleIcon size={12} /> Available</span>;
      case 'processing':
        return <span className="admin-status-badge status-processing"><ClockIcon size={12} /> Processing</span>;
      case 'received':
        return <span className="admin-status-badge status-received"><CheckCircleIcon size={12} /> Received</span>;
      case 'pending':
        return <span className="admin-status-badge status-pending"><ClockIcon size={12} /> Pending</span>;
      case 'rejected':
      case 'cancelled':
        return <span className="admin-status-badge status-failed"><XCircleIcon size={12} /> {status.charAt(0).toUpperCase() + status.slice(1)}</span>;
      default:
        return <span className="admin-status-badge">{status}</span>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="admin-page-layout">
        <AdminSidebar />
        <div className="admin-page-body">
          <div className="admin-clients-container">
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Loading deposits...</p>
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
        <div className="admin-clients-container">
          <div className="admin-clients-header">
            <div className="admin-clients-title">
              <ShieldIcon size={24} />
              <h1>Deposit Requests</h1>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <AlertCircleIcon size={16} />
              {error}
              <button onClick={() => setError('')}>Dismiss</button>
            </div>
          )}

          <div className="admin-clients-controls">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search by client name, Case ID, or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-filter"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="received">Received</option>
              <option value="available">Available</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="admin-clients-table">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeposits.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-state">
                      <CreditCardIcon size={48} />
                      <h3>No deposit requests found</h3>
                      <p>When clients submit deposits, they will appear here.</p>
                    </td>
                  </tr>
                ) : (
                  filteredDeposits.map(deposit => (
                    <tr key={deposit.id}>
                      <td>
                        <div className="client-info">
                          <strong>{deposit.client_name || 'Unknown'}</strong>
                          <span className="case-id">{deposit.case_id}</span>
                        </div>
                      </td>
                      <td><strong>${parseFloat(deposit.amount).toFixed(2)}</strong></td>
                      <td>{deposit.method_name || deposit.method_type}</td>
                      <td>{deposit.reference_number || 'N/A'}</td>
                      <td>{getStatusBadge(deposit.status)}</td>
                      <td>{formatDate(deposit.created_at)}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn action-btn-secondary"
                            onClick={() => openUpdateModal(deposit)}
                            title="Update Status"
                          >
                            <EditIcon size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Update Status Modal */}
          {showUpdateModal && selectedDeposit && (
            <div className="modal-overlay">
              <div className="modal">
                <div className="modal-header">
                  <h2>Update Deposit Status</h2>
                  <button className="close-btn" onClick={() => setShowUpdateModal(false)}>×</button>
                </div>

                <div className="modal-body">
                  <div className="deposit-details">
                    <p><strong>Client:</strong> {selectedDeposit.client_name} ({selectedDeposit.case_id})</p>
                    <p><strong>Amount:</strong> ${parseFloat(selectedDeposit.amount).toFixed(2)}</p>
                    <p><strong>Method:</strong> {selectedDeposit.method_name || selectedDeposit.method_type}</p>
                    <p><strong>Reference:</strong> {selectedDeposit.reference_number || 'N/A'}</p>
                    {selectedDeposit.notes && <p><strong>Notes:</strong> {selectedDeposit.notes}</p>}
                    {selectedDeposit.admin_notes && <p><strong>Admin Notes:</strong> {selectedDeposit.admin_notes}</p>}
                  </div>

                  {selectedDeposit.payment_proof_url && (
                    <div className="deposit-proof-section">
                      <label>Payment Proof</label>
                      <div className="deposit-proof-preview">
                        {selectedDeposit.payment_proof_url.endsWith('.pdf') ? (
                          <a href={selectedDeposit.payment_proof_url} target="_blank" rel="noopener noreferrer" className="proof-link">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            View PDF Proof
                          </a>
                        ) : (
                          <a href={selectedDeposit.payment_proof_url} target="_blank" rel="noopener noreferrer">
                            <img src={selectedDeposit.payment_proof_url} alt="Payment Proof" className="proof-image" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={updateForm.status}
                      onChange={(e) => setUpdateForm({...updateForm, status: e.target.value})}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="received">Received</option>
                      <option value="available">Available</option>
                      <option value="rejected">Rejected</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Notes (optional)</label>
                    <textarea
                      value={updateForm.notes}
                      onChange={(e) => setUpdateForm({...updateForm, notes: e.target.value})}
                      placeholder="Add notes about this deposit..."
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button className="btn-cancel" onClick={() => setShowUpdateModal(false)}>Cancel</button>
                  <button
                    className="btn-primary"
                    onClick={() => handleStatusUpdate(selectedDeposit.id, updateForm.status)}
                  >
                    Update Status
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDeposits;
