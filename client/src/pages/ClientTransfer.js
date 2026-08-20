import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { clientPortalAPI } from '../services/api';
import { AlertCircleIcon, CheckCircleIcon, DollarIcon, CreditCardIcon } from '../components/Icons';
import './ClientPages.css';
import './ClientTransfer.css';

const ClientTransfer = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'ach' ? 'ach' : 'zelle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [clientData, setClientData] = useState(null);

  const [zelleForm, setZelleForm] = useState({
    recipient_name: '',
    recipient_email: '',
    recipient_phone: '',
    amount: '',
    memo: ''
  });

  const [achForm, setAchForm] = useState({
    recipient_name: '',
    bank_name: '',
    account_number: '',
    routing_number: '',
    account_type: 'checking',
    amount: '',
    memo: '',
    transfer_type: 'standard'
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await clientPortalAPI.getProfile();
      setClientData(response.data);
    } catch (err) {
      // silent
    }
  };

  const handleZelleSubmit = async (e) => {
    e.preventDefault();
    if (!zelleForm.recipient_name || !zelleForm.amount) {
      setError('Please fill in all required fields');
      return;
    }
    if (parseFloat(zelleForm.amount) <= 0) {
      setError('Amount must be greater than $0');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await clientPortalAPI.submitTransfer({
        transfer_type: 'zelle',
        recipient_name: zelleForm.recipient_name,
        recipient_email: zelleForm.recipient_email,
        recipient_phone: zelleForm.recipient_phone,
        amount: parseFloat(zelleForm.amount),
        memo: zelleForm.memo
      });
      setSuccess(`Zelle transfer of $${parseFloat(zelleForm.amount).toFixed(2)} to ${zelleForm.recipient_name} submitted successfully!`);
      setZelleForm({ recipient_name: '', recipient_email: '', recipient_phone: '', amount: '', memo: '' });
      setTimeout(() => setSuccess(''), 6000);
    } catch (err) {
      console.error('Transfer error:', err);
      setError(err.response?.data?.error || 'Failed to submit transfer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleACHSubmit = async (e) => {
    e.preventDefault();
    if (!achForm.recipient_name || !achForm.account_number || !achForm.routing_number || !achForm.amount) {
      setError('Please fill in all required fields');
      return;
    }
    if (parseFloat(achForm.amount) <= 0) {
      setError('Amount must be greater than $0');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await clientPortalAPI.submitTransfer({
        transfer_type: 'ach',
        recipient_name: achForm.recipient_name,
        bank_name: achForm.bank_name,
        account_number: achForm.account_number,
        routing_number: achForm.routing_number,
        account_type: achForm.account_type,
        amount: parseFloat(achForm.amount),
        memo: achForm.memo,
        transfer_speed: achForm.transfer_type
      });
      setSuccess(`ACH transfer of $${parseFloat(achForm.amount).toFixed(2)} to ${achForm.recipient_name} submitted! Processing may take 1-3 business days.`);
      setAchForm({ recipient_name: '', bank_name: '', account_number: '', routing_number: '', account_type: 'checking', amount: '', memo: '', transfer_type: 'standard' });
      setTimeout(() => setSuccess(''), 6000);
    } catch (err) {
      console.error('Transfer error:', err);
      setError(err.response?.data?.error || 'Failed to submit transfer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="client-pages-container">
      <div className="client-pages-header">
        <DollarIcon size={24} />
        <h1>Make a Transfer</h1>
      </div>

      <p className="client-transfer-subtitle">Send money securely via Zelle or ACH bank transfer</p>

      {error && (
        <div className="error-message">
          <AlertCircleIcon size={16} />
          {error}
          <button onClick={() => setError('')}>Dismiss</button>
        </div>
      )}

      {success && (
        <div className="success-message">
          <CheckCircleIcon size={20} />
          <h2>Transfer Submitted</h2>
          <p>{success}</p>
        </div>
      )}

      {/* Transfer Tabs */}
      <div className="transfer-tabs">
        <button
          className={`transfer-tab ${activeTab === 'zelle' ? 'active' : ''}`}
          onClick={() => { setActiveTab('zelle'); setError(''); }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          Zelle Transfer
        </button>
        <button
          className={`transfer-tab ${activeTab === 'ach' ? 'active' : ''}`}
          onClick={() => { setActiveTab('ach'); setError(''); }}
        >
          <CreditCardIcon size={20} />
          ACH Transfer
        </button>
      </div>

      {/* Zelle Transfer Form */}
      {activeTab === 'zelle' && (
        <div className="transfer-form-card">
          <div className="transfer-form-header">
            <div className="transfer-form-icon zelle">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div>
              <h3>Send via Zelle</h3>
              <p>Instant transfers to anyone with a U.S. bank account</p>
            </div>
          </div>

          <form onSubmit={handleZelleSubmit} className="transfer-form">
            <div className="form-row-2col">
              <div className="form-group">
                <label>Recipient Name *</label>
                <input
                  type="text"
                  value={zelleForm.recipient_name}
                  onChange={(e) => setZelleForm({...zelleForm, recipient_name: e.target.value})}
                  placeholder="John Smith"
                  required
                />
              </div>
              <div className="form-group">
                <label>Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={zelleForm.amount}
                  onChange={(e) => setZelleForm({...zelleForm, amount: e.target.value})}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label>Recipient Email</label>
                <input
                  type="email"
                  value={zelleForm.recipient_email}
                  onChange={(e) => setZelleForm({...zelleForm, recipient_email: e.target.value})}
                  placeholder="recipient@email.com"
                />
              </div>
              <div className="form-group">
                <label>Recipient Phone</label>
                <input
                  type="tel"
                  value={zelleForm.recipient_phone}
                  onChange={(e) => setZelleForm({...zelleForm, recipient_phone: e.target.value})}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Memo (optional)</label>
              <input
                type="text"
                value={zelleForm.memo}
                onChange={(e) => setZelleForm({...zelleForm, memo: e.target.value})}
                placeholder="What's this for?"
              />
            </div>

            <div className="transfer-summary">
              <div className="summary-row">
                <span>Transfer Amount</span>
                <span className="summary-amount">${zelleForm.amount ? parseFloat(zelleForm.amount).toFixed(2) : '0.00'}</span>
              </div>
              <div className="summary-row">
                <span>Fee</span>
                <span className="summary-free">Free</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>${zelleForm.amount ? parseFloat(zelleForm.amount).toFixed(2) : '0.00'}</span>
              </div>
            </div>

            <button type="submit" className="transfer-submit-btn zelle" disabled={loading}>
              {loading ? (
                <span className="btn-spinner"></span>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  Send Zelle Transfer
                </>
              )}
            </button>

            <p className="transfer-note">Zelle transfers are typically instant. Recipient will receive a notification via email or phone.</p>
          </form>
        </div>
      )}

      {/* ACH Transfer Form */}
      {activeTab === 'ach' && (
        <div className="transfer-form-card">
          <div className="transfer-form-header">
            <div className="transfer-form-icon ach">
              <CreditCardIcon size={24} />
            </div>
            <div>
              <h3>ACH Bank Transfer</h3>
              <p>Direct bank-to-bank transfers via the ACH network</p>
            </div>
          </div>

          <form onSubmit={handleACHSubmit} className="transfer-form">
            <div className="form-row-2col">
              <div className="form-group">
                <label>Recipient Name *</label>
                <input
                  type="text"
                  value={achForm.recipient_name}
                  onChange={(e) => setAchForm({...achForm, recipient_name: e.target.value})}
                  placeholder="John Smith"
                  required
                />
              </div>
              <div className="form-group">
                <label>Bank Name</label>
                <input
                  type="text"
                  value={achForm.bank_name}
                  onChange={(e) => setAchForm({...achForm, bank_name: e.target.value})}
                  placeholder="Chase, Wells Fargo, etc."
                />
              </div>
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label>Account Number *</label>
                <input
                  type="text"
                  value={achForm.account_number}
                  onChange={(e) => setAchForm({...achForm, account_number: e.target.value})}
                  placeholder="Account number"
                  required
                />
              </div>
              <div className="form-group">
                <label>Routing Number *</label>
                <input
                  type="text"
                  value={achForm.routing_number}
                  onChange={(e) => setAchForm({...achForm, routing_number: e.target.value})}
                  placeholder="9-digit routing number"
                  required
                />
              </div>
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label>Account Type</label>
                <select
                  value={achForm.account_type}
                  onChange={(e) => setAchForm({...achForm, account_type: e.target.value})}
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                </select>
              </div>
              <div className="form-group">
                <label>Transfer Speed</label>
                <select
                  value={achForm.transfer_type}
                  onChange={(e) => setAchForm({...achForm, transfer_type: e.target.value})}
                >
                  <option value="standard">Standard (1-3 business days)</option>
                  <option value="next_day">Next Day ($25 fee)</option>
                </select>
              </div>
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label>Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={achForm.amount}
                  onChange={(e) => setAchForm({...achForm, amount: e.target.value})}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="form-group">
                <label>Memo (optional)</label>
                <input
                  type="text"
                  value={achForm.memo}
                  onChange={(e) => setAchForm({...achForm, memo: e.target.value})}
                  placeholder="What's this for?"
                />
              </div>
            </div>

            <div className="transfer-summary">
              <div className="summary-row">
                <span>Transfer Amount</span>
                <span className="summary-amount">${achForm.amount ? parseFloat(achForm.amount).toFixed(2) : '0.00'}</span>
              </div>
              <div className="summary-row">
                <span>Fee</span>
                <span className={achForm.transfer_type === 'next_day' ? 'summary-fee' : 'summary-free'}>
                  {achForm.transfer_type === 'next_day' ? '$25.00' : 'Free'}
                </span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>${achForm.amount ? (parseFloat(achForm.amount) + (achForm.transfer_type === 'next_day' ? 25 : 0)).toFixed(2) : '0.00'}</span>
              </div>
            </div>

            <button type="submit" className="transfer-submit-btn ach" disabled={loading}>
              {loading ? (
                <span className="btn-spinner"></span>
              ) : (
                <>
                  <CreditCardIcon size={18} />
                  Submit ACH Transfer
                </>
              )}
            </button>

            <p className="transfer-note">
              Standard ACH transfers process in 1-3 business days. Next-day transfers incur a $25 fee and must be submitted before 2:00 PM ET.
            </p>
          </form>
        </div>
      )}

      {/* Transfer History Placeholder */}
      <div className="transfer-history-section">
        <h2>Recent Transfers</h2>
        <div className="client-card" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <DollarIcon size={32} style={{ color: '#d1d5db', marginBottom: '12px' }} />
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Transfer history will appear here</p>
        </div>
      </div>
    </div>
  );
};

export default ClientTransfer;
