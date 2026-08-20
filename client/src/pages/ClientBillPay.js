import React, { useState, useEffect } from 'react';
import { clientPortalAPI } from '../services/api';
import toast from 'react-hot-toast';
import './ClientPages.css';

const ClientBillPay = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accountInfo, setAccountInfo] = useState({ account_number: '', routing_number: '' });
  const [form, setForm] = useState({
    biller_name: '',
    amount: '',
    account_number: '',
    routing_number: '',
    account_reference: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Common billers
  const quickBillerOptions = [
    'Electric Company',
    'Water Utility',
    'Gas Company',
    'Internet Provider',
    'Phone Company',
    'Insurance',
    'Credit Card',
    'Mortgage',
    'Rent',
    'Other'
  ];

  useEffect(() => { 
    loadPayments(); 
    loadAccountInfo(); 
  }, []);

  const loadPayments = async () => {
    try {
      const response = await clientPortalAPI.getBillPayments();
      setPayments(response.data);
    } catch (error) {
      console.error('Failed to load bill payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAccountInfo = async () => {
    try {
      const response = await clientPortalAPI.getAccount();
      setAccountInfo({
        account_number: response.data.account_number || '',
        routing_number: response.data.routing_number || ''
      });
      // Pre-fill form with account info
      setForm(prev => ({
        ...prev,
        account_number: response.data.account_number || '',
        routing_number: response.data.routing_number || ''
      }));
    } catch (error) {
      console.error('Failed to load account info:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.biller_name || !form.amount || !form.payment_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      await clientPortalAPI.submitBillPayment(form);
      toast.success('Bill payment submitted successfully');
      setShowForm(false);
      setForm({
        biller_name: '',
        amount: '',
        account_number: accountInfo.account_number,
        routing_number: accountInfo.routing_number,
        account_reference: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      loadPayments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit bill payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickBiller = (biller) => {
    setForm({ ...form, biller_name: biller });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'processing': return '#f59e0b';
      case 'pending': return '#3b82f6';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="client-page">
      <div className="client-page-header">
        <div>
          <h1>Bill Pay</h1>
          <p className="client-page-subtitle">Submit and manage bill payments</p>
        </div>
        <button className="client-btn client-btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Payment'}
        </button>
      </div>

      {/* Payment Form */}
      {showForm && (
        <div className="client-card" style={{ marginBottom: '20px' }}>
          <div className="client-card-header">
            <h3>Submit Bill Payment</h3>
          </div>
          <form onSubmit={handleSubmit} className="client-password-form">
            <div className="client-form-field">
              <label>Biller / Payee *</label>
              <input
                type="text"
                value={form.biller_name}
                onChange={(e) => setForm({ ...form, biller_name: e.target.value })}
                placeholder="Enter biller name"
                required
              />
            </div>
            
            {/* Quick Biller Selection */}
            <div className="client-form-field">
              <label>Quick Select</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                {quickBillerOptions.map((biller) => (
                  <button
                    key={biller}
                    type="button"
                    onClick={() => handleQuickBiller(biller)}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      background: form.biller_name === biller ? '#3b82f6' : '#f8fafc',
                      color: form.biller_name === biller ? '#fff' : '#475569',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                  >
                    {biller}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="client-form-field">
                <label>Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="client-form-field">
                <label>Payment Date *</label>
                <input
                  type="date"
                  value={form.payment_date}
                  onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="client-form-field">
                <label>Account Number</label>
                <input
                  type="text"
                  value={form.account_number}
                  onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                  placeholder="Your account number"
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
              <div className="client-form-field">
                <label>Routing Number</label>
                <input
                  type="text"
                  value={form.routing_number}
                  onChange={(e) => setForm({ ...form, routing_number: e.target.value })}
                  placeholder="Your routing number"
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
            </div>

            <div className="client-form-field">
              <label>Account / Reference Number</label>
              <input
                type="text"
                value={form.account_reference}
                onChange={(e) => setForm({ ...form, account_reference: e.target.value })}
                placeholder="Account number or reference"
              />
            </div>

            <div className="client-form-field">
              <label>Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes"
                rows={3}
              />
            </div>

            <div className="client-form-actions">
              <button type="submit" className="client-btn client-btn-primary" disabled={submitting} style={{ minWidth: '160px' }}>
                {submitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'routeSpin 0.7s linear infinite' }}></span>
                    Submitting...
                  </span>
                ) : 'Submit Payment'}
              </button>
              <button type="button" className="client-btn client-btn-ghost" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payment History */}
      <div className="client-card">
        <div className="client-card-header">
          <h3>Payment History</h3>
        </div>
        {loading ? (
          <div className="client-page-loading"><div className="client-loading-spinner"></div></div>
        ) : payments.length === 0 ? (
          <div className="client-card-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            <h3>No bill payments yet</h3>
            <p>Submit your first bill payment to get started</p>
          </div>
        ) : (
          <div className="client-table-wrapper">
            <table className="client-table">
              <thead>
                <tr>
                  <th>Biller</th>
                  <th>Amount</th>
                  <th>Payment Date</th>
                  <th>Reference</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="client-table-bold">{payment.biller_name}</td>
                    <td className="client-amount-debit">-{formatCurrency(payment.amount)}</td>
                    <td>{formatDate(payment.payment_date)}</td>
                    <td className="client-table-mono">{payment.account_reference || '—'}</td>
                    <td>
                      <span 
                        className="client-status-badge"
                        style={{ 
                          background: `${getStatusColor(payment.status)}15`,
                          color: getStatusColor(payment.status),
                          border: `1px solid ${getStatusColor(payment.status)}30`
                        }}
                      >
                        {payment.status?.charAt(0).toUpperCase() + payment.status?.slice(1)}
                      </span>
                    </td>
                    <td>{formatDateTime(payment.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientBillPay;
