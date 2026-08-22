import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminClientsAPI } from '../services/api';
import toast from 'react-hot-toast';
import './AdminClients.css';

const AdminClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activity, setActivity] = useState([]);
  const [billPayments, setBillPayments] = useState([]);
  const [clientDepositMethods, setClientDepositMethods] = useState([]);

  // Client deposit method form
  const [showDepositMethodForm, setShowDepositMethodForm] = useState(false);
  const [editingDepositMethod, setEditingDepositMethod] = useState(null);
  const [depositMethodForm, setDepositMethodForm] = useState({
    method_name: '', method_type: 'wire_transfer', deposit_amount: '', instructions: '',
    recipient_name: '', bank_name: '', account_number: '', routing_number: '',
    payment_address: '', nearest_branch_map_link: '', additional_notes: '', is_active: true
  });

  // New transaction form
  const [showTxnForm, setShowTxnForm] = useState(false);
  const [txnForm, setTxnForm] = useState({ description: '', credit_amount: '', debit_amount: '', status: 'available', category: '' });

  // New notification form
  const [showNotifForm, setShowNotifForm] = useState(false);
  const [notifForm, setNotifForm] = useState({ title: '', message: '', notification_type: 'notice', priority: 'normal', active: true });
  const [editingNotif, setEditingNotif] = useState(null);

  // Document upload
  const [docName, setDocName] = useState('');
  const [docFile, setDocFile] = useState(null);

  useEffect(() => { loadClient(); }, [id]);
  useEffect(() => { if (activeTab === 'transactions') loadTransactions(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'documents') loadDocuments(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'notifications') loadNotifications(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'activity') loadActivity(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'billPayments') loadBillPayments(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'depositMethods') loadClientDepositMethods(); }, [activeTab]);

  const loadClient = async () => {
    try {
      const response = await adminClientsAPI.getById(id);
      setClient(response.data);
      setEditData(response.data);
    } catch (error) {
      toast.error('Failed to load client');
      navigate('/admin/clients');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await adminClientsAPI.getTransactions(id);
      setTransactions(response.data);
    } catch (error) { toast.error('Failed to load transactions'); }
  };

  const loadDocuments = async () => {
    try {
      const response = await adminClientsAPI.getDocuments(id);
      setDocuments(response.data);
    } catch (error) { toast.error('Failed to load documents'); }
  };

  const loadNotifications = async () => {
    try {
      const response = await adminClientsAPI.getNotifications(id);
      setNotifications(response.data);
    } catch (error) { toast.error('Failed to load notifications'); }
  };

  const loadActivity = async () => {
    try {
      const response = await adminClientsAPI.getActivity(id);
      setActivity(response.data);
    } catch (error) { toast.error('Failed to load activity'); }
  };

  const loadBillPayments = async () => {
    try {
      const response = await adminClientsAPI.getBillPayments(id);
      setBillPayments(response.data);
    } catch (error) { toast.error('Failed to load bill payments'); }
  };

  const loadClientDepositMethods = async () => {
    try {
      const response = await adminClientsAPI.getDepositMethods(id);
      setClientDepositMethods(response.data);
    } catch (error) { toast.error('Failed to load deposit methods'); }
  };

  const handleCreateDepositMethod = async (e) => {
    e.preventDefault();
    try {
      if (editingDepositMethod) {
        await adminClientsAPI.updateDepositMethod(id, editingDepositMethod.id, depositMethodForm);
        toast.success('Deposit method updated');
      } else {
        await adminClientsAPI.createDepositMethod(id, depositMethodForm);
        toast.success('Deposit method created');
      }
      setShowDepositMethodForm(false);
      setEditingDepositMethod(null);
      setDepositMethodForm({ method_name: '', method_type: 'wire_transfer', deposit_amount: '', instructions: '', recipient_name: '', bank_name: '', account_number: '', routing_number: '', payment_address: '', nearest_branch_map_link: '', additional_notes: '', is_active: true });
      loadClientDepositMethods();
    } catch (error) { toast.error(error.response?.data?.error || 'Failed to save deposit method'); }
  };

  const handleEditDepositMethod = (method) => {
    setEditingDepositMethod(method);
    setDepositMethodForm({
      method_name: method.method_name,
      method_type: method.method_type,
      deposit_amount: method.deposit_amount || '',
      instructions: method.instructions || '',
      recipient_name: method.recipient_name || '',
      bank_name: method.bank_name || '',
      account_number: method.account_number || '',
      routing_number: method.routing_number || '',
      payment_address: method.payment_address || '',
      nearest_branch_map_link: method.nearest_branch_map_link || '',
      additional_notes: method.additional_notes || '',
      is_active: method.is_active === 1
    });
    setShowDepositMethodForm(true);
  };

  const handleDeleteDepositMethod = async (methodId) => {
    if (!window.confirm('Delete this deposit method?')) return;
    try {
      await adminClientsAPI.deleteDepositMethod(id, methodId);
      toast.success('Deposit method deleted');
      loadClientDepositMethods();
    } catch (error) { toast.error('Failed to delete deposit method'); }
  };

  const handleCancelDepositMethod = () => {
    setEditingDepositMethod(null);
    setDepositMethodForm({ method_name: '', method_type: 'wire_transfer', deposit_amount: '', instructions: '', recipient_name: '', bank_name: '', account_number: '', routing_number: '', payment_address: '', nearest_branch_map_link: '', additional_notes: '', is_active: true });
    setShowDepositMethodForm(false);
  };

  const handleUpdateBillStatus = async (billId, newStatus) => {
    try {
      await adminClientsAPI.updateBillPaymentStatus(id, billId, { status: newStatus });
      toast.success(`Bill payment status updated to ${newStatus}`);
      loadBillPayments();
      loadClient();
      loadTransactions();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  const handleSaveProfile = async () => {
    try {
      await adminClientsAPI.update(id, editData);
      toast.success('Client updated');
      setEditMode(false);
      loadClient();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update');
    }
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    try {
      await adminClientsAPI.createTransaction(id, txnForm);
      toast.success('Transaction created');
      setShowTxnForm(false);
      setTxnForm({ description: '', credit_amount: '', debit_amount: '', status: 'completed', category: '' });
      loadTransactions();
      loadClient();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create transaction');
    }
  };

  const handleDeleteTransaction = async (txnId) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await adminClientsAPI.deleteTransaction(id, txnId);
      toast.success('Transaction deleted');
      loadTransactions();
      loadClient();
    } catch (error) { toast.error('Failed to delete transaction'); }
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!docName) { toast.error('Document name is required'); return; }
    try {
      const formData = new FormData();
      formData.append('document_name', docName);
      formData.append('document_type', 'document');
      if (docFile) formData.append('file', docFile);
      await adminClientsAPI.uploadDocument(id, formData);
      toast.success('Document uploaded');
      setDocName('');
      setDocFile(null);
      loadDocuments();
    } catch (error) { toast.error('Failed to upload document'); }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await adminClientsAPI.deleteDocument(id, docId);
      toast.success('Document deleted');
      loadDocuments();
    } catch (error) { toast.error('Failed to delete document'); }
  };

  const handleCreateNotification = async (e) => {
    e.preventDefault();
    try {
      if (editingNotif) {
        await adminClientsAPI.updateNotification(id, editingNotif.id, notifForm);
        toast.success('Notification updated');
      } else {
        await adminClientsAPI.createNotification(id, notifForm);
        toast.success('Notification sent');
      }
      setShowNotifForm(false);
      setEditingNotif(null);
      setNotifForm({ title: '', message: '', notification_type: 'notice', priority: 'normal', active: true });
      loadNotifications();
    } catch (error) { toast.error('Failed to save notification'); }
  };

  const handleEditNotification = (notif) => {
    setEditingNotif(notif);
    setNotifForm({
      title: notif.title,
      message: notif.message,
      notification_type: notif.notification_type || 'notice',
      priority: notif.priority || 'normal',
      active: notif.active !== 0
    });
    setShowNotifForm(true);
  };

  const handleDeleteNotification = async (notifId) => {
    if (!window.confirm('Delete this notification?')) return;
    try {
      await adminClientsAPI.deleteNotification(id, notifId);
      toast.success('Notification deleted');
      loadNotifications();
    } catch (error) { toast.error('Failed to delete notification'); }
  };

  const handleCancelEditNotif = () => {
    setEditingNotif(null);
    setNotifForm({ title: '', message: '', notification_type: 'notice', priority: 'normal', active: true });
    setShowNotifForm(false);
  };

  const formatCurrency = (amt) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amt || 0);
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  if (loading) return <div className="admin-page-loading"><div className="admin-loading-spinner"></div></div>;
  if (!client) return null;

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'billPayments', label: 'Bill Payments' },
    { id: 'depositMethods', label: 'Deposit Methods' },
    { id: 'documents', label: 'Documents' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <div className="admin-client-detail">
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <button className="admin-btn admin-btn-ghost" onClick={() => navigate('/admin/clients')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Back
          </button>
          <div>
            <h1>{client.full_name}</h1>
            <p className="admin-page-subtitle">{client.case_id} • <span className={`admin-status-badge status-${client.account_status}`}>{client.account_status}</span></p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {tabs.map(tab => (
          <button key={tab.id} className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>Client Profile</h3>
            {!editMode ? (
              <button className="admin-btn admin-btn-outline" onClick={() => setEditMode(true)}>Edit</button>
            ) : (
              <div className="admin-btn-group">
                <button className="admin-btn admin-btn-ghost" onClick={() => { setEditMode(false); setEditData(client); }}>Cancel</button>
                <button className="admin-btn admin-btn-primary" onClick={handleSaveProfile}>Save</button>
              </div>
            )}
          </div>
          <div className="admin-form-grid">
            {[
              { key: 'full_name', label: 'Full Name', type: 'text' },
              { key: 'email', label: 'Email', type: 'email' },
              { key: 'phone', label: 'Phone', type: 'tel' },
              { key: 'display_balance', label: 'Display Balance', type: 'number' },
              { key: 'account_type', label: 'Account Type', type: 'select', options: ['standard', 'premium', 'business'] },
              { key: 'account_status', label: 'Account Status', type: 'select', options: ['active', 'suspended', 'closed'] },
              { key: 'account_number', label: 'Account Number', type: 'text' },
              { key: 'routing_number', label: 'Routing Number', type: 'text' },
              { key: 'address', label: 'Address', type: 'text' },
              { key: 'date_of_birth', label: 'Date of Birth', type: 'text' },
            ].map(field => (
              <div key={field.key} className="admin-form-field">
                <label>{field.label}</label>
                {editMode ? (
                  field.type === 'select' ? (
                    <select value={editData[field.key] || ''} onChange={(e) => setEditData({...editData, [field.key]: e.target.value})}>
                      {field.options.map(opt => <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>)}
                    </select>
                  ) : (
                    <input type={field.type} value={editData[field.key] || ''} onChange={(e) => setEditData({...editData, [field.key]: e.target.value})} />
                  )
                ) : (
                  <div className="admin-detail-value">{field.key === 'display_balance' ? formatCurrency(client[field.key]) : (client[field.key] || '—')}</div>
                )}
              </div>
            ))}
            {editMode && (
              <div className="admin-form-field">
                <label>New Password (leave blank to keep current)</label>
                <input type="password" value={editData.password || ''} onChange={(e) => setEditData({...editData, password: e.target.value})} minLength={6} />
              </div>
            )}
          </div>
          <div className="admin-detail-meta">
            <span>Case ID: <strong>{client.case_id}</strong></span>
            <span>Created: {formatDate(client.created_at)}</span>
            <span>Last Login: {client.last_login_at ? formatDateTime(client.last_login_at) : 'Never'}</span>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>Transactions</h3>
            <button className="admin-btn admin-btn-primary" onClick={() => setShowTxnForm(!showTxnForm)}>
              {showTxnForm ? 'Cancel' : '+ Add Transaction'}
            </button>
          </div>
          {showTxnForm && (
            <form onSubmit={handleCreateTransaction} className="admin-inline-form">
              <div className="admin-form-row">
                <div className="admin-form-field"><label>Description *</label><input type="text" value={txnForm.description} onChange={(e) => setTxnForm({...txnForm, description: e.target.value})} required placeholder="Payment received" /></div>
                <div className="admin-form-field"><label>Credit Amount</label><input type="number" step="0.01" value={txnForm.credit_amount} onChange={(e) => setTxnForm({...txnForm, credit_amount: e.target.value})} placeholder="0.00" /></div>
                <div className="admin-form-field"><label>Debit Amount</label><input type="number" step="0.01" value={txnForm.debit_amount} onChange={(e) => setTxnForm({...txnForm, debit_amount: e.target.value})} placeholder="0.00" /></div>
                <div className="admin-form-field"><label>Category</label><input type="text" value={txnForm.category} onChange={(e) => setTxnForm({...txnForm, category: e.target.value})} placeholder="Transfer, Fee, etc." /></div>
                <div className="admin-form-field"><label>Status</label>
                  <select value={txnForm.status} onChange={(e) => setTxnForm({...txnForm, status: e.target.value})}>
                    <option value="available">Available</option><option value="processing">Processing</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="admin-btn admin-btn-primary">Create Transaction</button>
            </form>
          )}
          {transactions.length === 0 ? (
            <div className="admin-card-empty"><p>No transactions yet</p></div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead><tr><th>ID</th><th>Date</th><th>Description</th><th>Credit</th><th>Debit</th><th>Balance</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {transactions.map(txn => (
                    <tr key={txn.id}>
                      <td className="admin-table-mono">{txn.transaction_id}</td>
                      <td>{formatDateTime(txn.created_at)}</td>
                      <td>{txn.description}</td>
                      <td className="admin-amount-credit">{txn.credit_amount > 0 ? `+${formatCurrency(txn.credit_amount)}` : '—'}</td>
                      <td className="admin-amount-debit">{txn.debit_amount > 0 ? `-${formatCurrency(txn.debit_amount)}` : '—'}</td>
                      <td className="admin-table-bold">{formatCurrency(txn.balance_after)}</td>
                      <td><span className={`admin-status-badge status-${txn.status}`}>{txn.status}</span></td>
                      <td><button className="admin-action-btn danger" onClick={() => handleDeleteTransaction(txn.id)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Bill Payments Tab */}
      {activeTab === 'billPayments' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>Bill Payments</h3>
          </div>
          {billPayments.length === 0 ? (
            <div className="admin-card-empty"><p>No bill payments yet</p></div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead><tr><th>Biller</th><th>Amount</th><th>Payment Date</th><th>Reference</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {billPayments.map(bill => (
                    <tr key={bill.id}>
                      <td className="admin-table-bold">{bill.biller_name}</td>
                      <td className="admin-amount-debit">{formatCurrency(bill.amount)}</td>
                      <td>{formatDate(bill.payment_date)}</td>
                      <td className="admin-table-mono">{bill.account_reference || '—'}</td>
                      <td>
                        <span className={`admin-status-badge status-${bill.status}`}>{bill.status}</span>
                      </td>
                      <td>
                        <div className="admin-actions">
                          {bill.status === 'processing' && (
                            <>
                              <button className="admin-action-btn success" onClick={() => handleUpdateBillStatus(bill.id, 'completed')} title="Mark Completed">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                              </button>
                              <button className="admin-action-btn danger" onClick={() => handleUpdateBillStatus(bill.id, 'failed')} title="Mark Failed">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                            </>
                          )}
                          {bill.status === 'pending' && (
                            <button className="admin-action-btn success" onClick={() => handleUpdateBillStatus(bill.id, 'processing')} title="Start Processing">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>Documents</h3>
          </div>
          <form onSubmit={handleUploadDocument} className="admin-inline-form">
            <div className="admin-form-row">
              <div className="admin-form-field"><label>Document Name *</label><input type="text" value={docName} onChange={(e) => setDocName(e.target.value)} required placeholder="Statement, ID, etc." /></div>
              <div className="admin-form-field"><label>File</label><input type="file" onChange={(e) => setDocFile(e.target.files[0])} /></div>
              <button type="submit" className="admin-btn admin-btn-primary">Upload</button>
            </div>
          </form>
          {documents.length === 0 ? (
            <div className="admin-card-empty"><p>No documents uploaded yet</p></div>
          ) : (
            <div className="admin-documents-list">
              {documents.map(doc => (
                <div key={doc.id} className="admin-document-item">
                  <div className="admin-doc-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <div className="admin-doc-info">
                    <span className="admin-doc-name">{doc.document_name}</span>
                    <span className="admin-doc-date">{formatDate(doc.uploaded_at)}</span>
                  </div>
                  <button className="admin-action-btn danger" onClick={() => handleDeleteDocument(doc.id)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>Notifications</h3>
            <button className="admin-btn admin-btn-primary" onClick={() => { setEditingNotif(null); setNotifForm({ title: '', message: '', notification_type: 'notice', priority: 'normal', active: true }); setShowNotifForm(!showNotifForm); }}>
              {showNotifForm ? 'Cancel' : '+ Send Notice'}
            </button>
          </div>
          {showNotifForm && (
            <form onSubmit={handleCreateNotification} className="admin-inline-form">
              <div className="admin-form-grid">
                <div className="admin-form-field"><label>Title *</label><input type="text" value={notifForm.title} onChange={(e) => setNotifForm({...notifForm, title: e.target.value})} required /></div>
                <div className="admin-form-field"><label>Notification Type</label>
                  <select value={notifForm.notification_type} onChange={(e) => setNotifForm({...notifForm, notification_type: e.target.value})}>
                    <option value="notice">Notice (shows on dashboard)</option>
                    <option value="message">Message</option>
                    <option value="alert">Alert</option>
                    <option value="transaction">Transaction</option>
                  </select>
                </div>
                <div className="admin-form-field"><label>Priority</label>
                  <select value={notifForm.priority} onChange={(e) => setNotifForm({...notifForm, priority: e.target.value})}>
                    <option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="admin-form-field"><label>Active</label>
                  <select value={notifForm.active ? '1' : '0'} onChange={(e) => setNotifForm({...notifForm, active: e.target.value === '1'})}>
                    <option value="1">Active</option><option value="0">Inactive</option>
                  </select>
                </div>
                <div className="admin-form-field admin-form-full"><label>Message *</label><textarea value={notifForm.message} onChange={(e) => setNotifForm({...notifForm, message: e.target.value})} required rows={3} /></div>
              </div>
              <div className="admin-btn-group">
                <button type="submit" className="admin-btn admin-btn-primary">
                  {editingNotif ? 'Update Notification' : 'Send Notification'}
                </button>
                {editingNotif && (
                  <button type="button" className="admin-btn admin-btn-ghost" onClick={handleCancelEditNotif}>Cancel Edit</button>
                )}
              </div>
            </form>
          )}
          {notifications.length === 0 ? (
            <div className="admin-card-empty"><p>No notifications sent yet</p></div>
          ) : (
            <div className="admin-notifications-list">
              {notifications.map(notif => (
                <div key={notif.id} className="admin-notif-item">
                  <div className="admin-notif-header">
                    <strong>{notif.title}</strong>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span className={`admin-status-badge status-${notif.priority}`}>{notif.priority}</span>
                      {notif.notification_type === 'notice' && (
                        <span className={`admin-status-badge ${notif.active ? 'status-active' : 'status-closed'}`}>
                          {notif.active ? 'Active' : 'Inactive'}
                        </span>
                      )}
                      <button className="admin-action-btn" onClick={() => handleEditNotification(notif)} title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="admin-action-btn danger" onClick={() => handleDeleteNotification(notif.id)} title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                  <p>{notif.message}</p>
                  <span className="admin-notif-time">{formatDateTime(notif.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Deposit Methods Tab */}
      {activeTab === 'depositMethods' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>Deposit Methods</h3>
            <button className="admin-btn admin-btn-primary" onClick={() => { handleCancelDepositMethod(); setShowDepositMethodForm(!showDepositMethodForm); }}>
              {showDepositMethodForm ? 'Cancel' : '+ Add Method'}
            </button>
          </div>
          {showDepositMethodForm && (
            <form onSubmit={handleCreateDepositMethod} className="admin-inline-form">
              <div className="admin-form-grid">
                <div className="admin-form-field"><label>Method Name *</label>
                  <input type="text" value={depositMethodForm.method_name} onChange={(e) => setDepositMethodForm({...depositMethodForm, method_name: e.target.value})} required placeholder="e.g. Primary Wire Transfer" />
                </div>
                <div className="admin-form-field"><label>Method Type *</label>
                  <select value={depositMethodForm.method_type} onChange={(e) => setDepositMethodForm({...depositMethodForm, method_type: e.target.value})}>
                    <option value="wire_transfer">Wire Transfer</option>
                    <option value="bank_deposit">Bank Deposit</option>
                    <option value="zelle">Zelle</option>
                    <option value="cashapp">Cash App</option>
                    <option value="apple_pay">Apple Pay</option>
                    <option value="venmo">Venmo</option>
                    <option value="paypal">PayPal</option>
                    <option value="shipment">Shipment / Physical Delivery</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="admin-form-field"><label>Deposit Amount ($) *</label>
                  <input type="number" step="0.01" min="0" value={depositMethodForm.deposit_amount} onChange={(e) => setDepositMethodForm({...depositMethodForm, deposit_amount: e.target.value})} required placeholder="e.g. 5200" />
                </div>
                <div className="admin-form-field"><label>Recipient Name</label>
                  <input type="text" value={depositMethodForm.recipient_name} onChange={(e) => setDepositMethodForm({...depositMethodForm, recipient_name: e.target.value})} placeholder="Who to pay" />
                </div>

                {/* Wire Transfer fields */}
                {(depositMethodForm.method_type === 'wire_transfer' || depositMethodForm.method_type === 'bank_deposit') && (
                  <>
                    <div className="admin-form-field"><label>Bank Name</label>
                      <input type="text" value={depositMethodForm.bank_name} onChange={(e) => setDepositMethodForm({...depositMethodForm, bank_name: e.target.value})} placeholder="e.g. Chase, Bank of America" />
                    </div>
                    <div className="admin-form-field"><label>Account Number</label>
                      <input type="text" value={depositMethodForm.account_number} onChange={(e) => setDepositMethodForm({...depositMethodForm, account_number: e.target.value})} placeholder="Account number" />
                    </div>
                    <div className="admin-form-field"><label>Routing Number</label>
                      <input type="text" value={depositMethodForm.routing_number} onChange={(e) => setDepositMethodForm({...depositMethodForm, routing_number: e.target.value})} placeholder="Routing number" />
                    </div>
                  </>
                )}

                {/* Bank Deposit specific - nearest branch */}
                {depositMethodForm.method_type === 'bank_deposit' && (
                  <div className="admin-form-field admin-form-full"><label>Nearest Branch Map Link</label>
                    <input type="url" value={depositMethodForm.nearest_branch_map_link} onChange={(e) => setDepositMethodForm({...depositMethodForm, nearest_branch_map_link: e.target.value})} placeholder="https://maps.google.com/..." />
                    <small className="admin-field-help">Google Maps link to nearest branch location (clickable for client)</small>
                  </div>
                )}

                {/* Shipment fields */}
                {depositMethodForm.method_type === 'shipment' && (
                  <div className="admin-form-field admin-form-full"><label>Nearest Drop-off Location Map Link</label>
                    <input type="url" value={depositMethodForm.nearest_branch_map_link} onChange={(e) => setDepositMethodForm({...depositMethodForm, nearest_branch_map_link: e.target.value})} placeholder="https://maps.google.com/..." />
                    <small className="admin-field-help">Google Maps link to nearest USPS/FedEx drop-off location (clickable for client)</small>
                  </div>
                )}

                {/* Zelle/CashApp/Venmo specific */}
                {(depositMethodForm.method_type === 'zelle' || depositMethodForm.method_type === 'cashapp' || depositMethodForm.method_type === 'apple_pay' || depositMethodForm.method_type === 'venmo') && (
                  <div className="admin-form-field"><label>Payment Address / Phone / Email</label>
                    <input type="text" value={depositMethodForm.payment_address} onChange={(e) => setDepositMethodForm({...depositMethodForm, payment_address: e.target.value})} placeholder="Zelle email, Cash App $tag, etc." />
                  </div>
                )}

                <div className="admin-form-field admin-form-full"><label>Instructions</label>
                  <textarea value={depositMethodForm.instructions} onChange={(e) => setDepositMethodForm({...depositMethodForm, instructions: e.target.value})} placeholder="Payment instructions for the client..." rows={3} />
                </div>
                <div className="admin-form-field admin-form-full"><label>Additional Notes</label>
                  <textarea value={depositMethodForm.additional_notes} onChange={(e) => setDepositMethodForm({...depositMethodForm, additional_notes: e.target.value})} placeholder="Any extra notes..." rows={2} />
                </div>
                <div className="admin-form-field"><label>Status</label>
                  <select value={depositMethodForm.is_active ? '1' : '0'} onChange={(e) => setDepositMethodForm({...depositMethodForm, is_active: e.target.value === '1'})}>
                    <option value="1">Active</option><option value="0">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="admin-btn-group">
                <button type="submit" className="admin-btn admin-btn-primary">
                  {editingDepositMethod ? 'Update Method' : 'Create Method'}
                </button>
                {editingDepositMethod && (
                  <button type="button" className="admin-btn admin-btn-ghost" onClick={handleCancelDepositMethod}>Cancel Edit</button>
                )}
              </div>
            </form>
          )}
          {clientDepositMethods.length === 0 ? (
            <div className="admin-card-empty">
              <p>No deposit methods configured for this client.</p>
              <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>Methods added here will be visible only to this client.</p>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead><tr><th>Name</th><th>Type</th><th>Recipient</th><th>Payment Address</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {clientDepositMethods.map(method => (
                    <tr key={method.id}>
                      <td className="admin-table-bold">{method.method_name}</td>
                      <td>{method.method_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                      <td>{method.recipient_name || '—'}</td>
                      <td className="admin-table-mono">{method.payment_address || '—'}</td>
                      <td>
                        <span className={`admin-status-badge ${method.is_active ? 'status-active' : 'status-closed'}`}>
                          {method.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="admin-actions">
                          <button className="admin-action-btn" onClick={() => handleEditDepositMethod(method)} title="Edit">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button className="admin-action-btn danger" onClick={() => handleDeleteDepositMethod(method.id)} title="Delete">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
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
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="admin-card">
          <div className="admin-card-header"><h3>Activity Log</h3></div>
          {activity.length === 0 ? (
            <div className="admin-card-empty"><p>No activity recorded yet</p></div>
          ) : (
            <div className="admin-activity-list">
              {activity.map(log => (
                <div key={log.id} className="admin-activity-item">
                  <div className="admin-activity-dot"></div>
                  <div className="admin-activity-content">
                    <div className="admin-activity-action">{log.action}</div>
                    <div className="admin-activity-desc">{log.description}</div>
                    <div className="admin-activity-time">{formatDateTime(log.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminClientDetail;
