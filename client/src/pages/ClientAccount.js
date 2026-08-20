import React, { useState, useEffect } from 'react';
import { clientPortalAPI } from '../services/api';
import './ClientPages.css';

const ClientAccount = () => {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm_password: '' });

  useEffect(() => { loadAccount(); }, []);

  const loadAccount = async () => {
    try {
      const response = await clientPortalAPI.getAccount();
      setAccount(response.data);
    } catch (error) {
      console.error('Failed to load account:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm_password) {
      alert('Passwords do not match');
      return;
    }
    try {
      await clientPortalAPI.changePassword({
        current_password: passwords.current_password,
        new_password: passwords.new_password
      });
      alert('Password changed successfully');
      setShowChangePassword(false);
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to change password');
    }
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (loading) return <div className="client-page-loading"><div className="client-loading-spinner"></div></div>;
  if (!account) return <div className="client-page-error">Failed to load account details</div>;

  return (
    <div className="client-page">
      <div className="client-page-header">
        <div>
          <h1>Account Details</h1>
          <p className="client-page-subtitle">Your account information</p>
        </div>
      </div>

      <div className="client-account-grid">
        {/* Profile Card */}
        <div className="client-card client-profile-card">
          <div className="client-profile-avatar">
            {account.full_name?.charAt(0)?.toUpperCase()}
          </div>
          <h2 className="client-profile-name">{account.full_name}</h2>
          <span className={`client-status-badge status-${account.account_status}`}>
            {account.account_status?.charAt(0).toUpperCase() + account.account_status?.slice(1)}
          </span>
        </div>

        {/* Account Information */}
        <div className="client-card">
          <div className="client-card-header">
            <h3>Account Information</h3>
          </div>
          <div className="client-detail-list">
            <div className="client-detail-row">
              <span className="client-detail-label">Case ID</span>
              <span className="client-detail-value client-detail-mono">{account.case_id}</span>
            </div>
            <div className="client-detail-row">
              <span className="client-detail-label">Account Type</span>
              <span className="client-detail-value">{account.account_type?.charAt(0).toUpperCase() + account.account_type?.slice(1)}</span>
            </div>
            <div className="client-detail-row">
              <span className="client-detail-label">Account Status</span>
              <span className="client-detail-value">
                <span className={`client-status-dot status-${account.account_status}`}></span>
                {account.account_status?.charAt(0).toUpperCase() + account.account_status?.slice(1)}
              </span>
            </div>
            <div className="client-detail-row">
              <span className="client-detail-label">Available Balance</span>
              <span className="client-detail-value client-detail-balance">
                ${parseFloat(account.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="client-detail-row">
              <span className="client-detail-label">Member Since</span>
              <span className="client-detail-value">{formatDate(account.created_at)}</span>
            </div>
            <div className="client-detail-row">
              <span className="client-detail-label">Last Login</span>
              <span className="client-detail-value">{account.last_login_at ? formatDate(account.last_login_at) : '—'}</span>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="client-card">
          <div className="client-card-header">
            <h3>Personal Information</h3>
          </div>
          <div className="client-detail-list">
            <div className="client-detail-row">
              <span className="client-detail-label">Full Name</span>
              <span className="client-detail-value">{account.full_name}</span>
            </div>
            <div className="client-detail-row">
              <span className="client-detail-label">Email</span>
              <span className="client-detail-value">{account.email || '—'}</span>
            </div>
            <div className="client-detail-row">
              <span className="client-detail-label">Phone</span>
              <span className="client-detail-value">{account.phone || '—'}</span>
            </div>
            <div className="client-detail-row">
              <span className="client-detail-label">Address</span>
              <span className="client-detail-value">{account.address || '—'}</span>
            </div>
            <div className="client-detail-row">
              <span className="client-detail-label">Date of Birth</span>
              <span className="client-detail-value">{account.date_of_birth || '—'}</span>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="client-card">
          <div className="client-card-header">
            <h3>Security</h3>
          </div>
          {!showChangePassword ? (
            <div className="client-security-section">
              <p className="client-security-text">Keep your account secure by regularly updating your password.</p>
              <button className="client-btn client-btn-outline" onClick={() => setShowChangePassword(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Change Password
              </button>
            </div>
          ) : (
            <form onSubmit={handlePasswordChange} className="client-password-form">
              <div className="client-form-field">
                <label>Current Password</label>
                <input type="password" value={passwords.current_password} onChange={(e) => setPasswords({...passwords, current_password: e.target.value})} required />
              </div>
              <div className="client-form-field">
                <label>New Password</label>
                <input type="password" value={passwords.new_password} onChange={(e) => setPasswords({...passwords, new_password: e.target.value})} required minLength={6} />
              </div>
              <div className="client-form-field">
                <label>Confirm New Password</label>
                <input type="password" value={passwords.confirm_password} onChange={(e) => setPasswords({...passwords, confirm_password: e.target.value})} required minLength={6} />
              </div>
              <div className="client-form-actions">
                <button type="submit" className="client-btn client-btn-primary">Save Password</button>
                <button type="button" className="client-btn client-btn-ghost" onClick={() => setShowChangePassword(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientAccount;
