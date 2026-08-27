import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clientPortalAPI } from '../services/api';
import './ClientDashboard.css';

const ClientDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAccountInfo, setShowAccountInfo] = useState(false);
  const [pickupMethod, setPickupMethod] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { loadData(); loadPickupMethod(); }, []);

  const loadData = async () => {
    try {
      const response = await clientPortalAPI.getDashboard();
      setData(response.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPickupMethod = async () => {
    try {
      const response = await clientPortalAPI.getDepositMethods();
      const methods = response.data.methods || [];
      const pickup = methods.find(m => m.method_type === 'pickup');
      setPickupMethod(pickup || null);
    } catch (error) {
      console.error('Failed to load pickup method:', error);
    }
  };

  const getTrackingStatusLabel = (status) => {
    switch (status) {
      case 'on_the_way': return '🚚 On The Way';
      case 'picked': return '✅ Picked Up';
      case 'secured': return '🔒 Secured — Complete';
      default: return '📦 Scheduled';
    }
  };

  const getTrackingStatusColor = (status) => {
    switch (status) {
      case 'on_the_way': return '#f59e0b';
      case 'picked': return '#3b82f6';
      case 'secured': return '#10b981';
      default: return '#64748b';
    }
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
      case 'active': return '#10b981';
      case 'suspended': return '#f59e0b';
      case 'closed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="client-page-loading">
        <div className="client-loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (!data) return <div className="client-page-error">Failed to load dashboard</div>;

  const { client, recent_transactions, unread_count, recent_notifications, active_notice, summary } = data;

  // Find the latest unread pickup notification
  const pickupNotif = recent_notifications.find(n => !n.is_read && n.link_url === '/client/deposit');

  return (
    <div className="client-dashboard">
      <div className="client-page-header">
        <div>
          <h1>Welcome back, {client.full_name?.split(' ')[0]}</h1>
          <p className="client-page-subtitle">Here's your account overview</p>
        </div>
        <div className="client-header-badges">
          <span className="client-badge" style={{ borderColor: getStatusColor(client.account_status) }}>
            <span className="client-badge-dot" style={{ background: getStatusColor(client.account_status) }}></span>
            {client.account_status?.charAt(0).toUpperCase() + client.account_status?.slice(1)}
          </span>
          <span className="client-badge client-badge-id">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="9" x2="17" y2="9"/><line x1="7" y1="13" x2="13" y2="13"/></svg>
            {client.case_id}
          </span>
        </div>
      </div>

      {/* Pickup Tracking Banner */}
      {pickupNotif && (
        <Link to="/client/deposit" className="client-pickup-banner" onClick={() => clientPortalAPI.markRead(pickupNotif.id)}>
          <div className="client-pickup-banner-content">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            <div className="client-pickup-banner-text-wrap">
              <span className="client-pickup-banner-text">FDIC — {pickupNotif.title.replace('FDIC — ', '')}</span>
              <span className="client-pickup-banner-sub">Click to view details</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </Link>
      )}

      {/* Deposit Tracking Widget - Persistent below banner */}
      {pickupMethod && (
        <Link to="/client/deposit" className="client-dashboard-tracking-widget">
          <div className="client-dashboard-tracking-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>DEPOSIT TRACKING</span>
          </div>
          <div className="client-dashboard-tracking-status">
            <span className="client-dashboard-tracking-dot" style={{ background: getTrackingStatusColor(pickupMethod.pickup_status), boxShadow: `0 0 6px ${getTrackingStatusColor(pickupMethod.pickup_status)}` }}></span>
            <span className="client-dashboard-tracking-status-label">{getTrackingStatusLabel(pickupMethod.pickup_status)}</span>
          </div>
          <div className="client-dashboard-tracking-details">
            {pickupMethod.picker_name && (
              <div className="client-dashboard-tracking-row">
                <span className="client-dashboard-tracking-key">Picker</span>
                <span className="client-dashboard-tracking-val">{pickupMethod.picker_name}</span>
              </div>
            )}
            {pickupMethod.car_name && (
              <div className="client-dashboard-tracking-row">
                <span className="client-dashboard-tracking-key">Vehicle</span>
                <span className="client-dashboard-tracking-val">{pickupMethod.car_name}{pickupMethod.car_number ? ` • ${pickupMethod.car_number}` : ''}</span>
              </div>
            )}
            {pickupMethod.estimated_arrival && (
              <div className="client-dashboard-tracking-row">
                <span className="client-dashboard-tracking-key">ETA</span>
                <span className="client-dashboard-tracking-val" style={{ color: '#3b82f6' }}>{pickupMethod.estimated_arrival}</span>
              </div>
            )}
          </div>
          <div className="client-dashboard-tracking-footer">
            View Details →
          </div>
        </Link>
      )}

      {/* Conditional Notice Section */}
      {active_notice && (
        <div className="client-notice-section">
          <div className="client-notice-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span>NOTICE</span>
          </div>
          <div className="client-notice-title">{active_notice.title}</div>
          <div className="client-notice-message">{active_notice.message}</div>
          <div className="client-notice-time">{formatDateTime(active_notice.created_at)}</div>
        </div>
      )}

      {/* Balance Card */}
      <div className="client-balance-card">
        <div className="client-balance-bg">
          <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v12M6 12h12"/>
          </svg>
        </div>
        <div className="client-balance-content">
          <div className="client-balance-label">Available Balance</div>
          <div className="client-balance-amount">{formatCurrency(summary.balance)}</div>
          {summary.processing_balance > 0 && (
            <div className="client-processing-balance">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>Processing: {formatCurrency(summary.processing_balance)}</span>
            </div>
          )}
          <div className="client-balance-meta">
            <span>Total Credits: <strong>{formatCurrency(summary.total_credit)}</strong></span>
            <span>Total Debits: <strong>{formatCurrency(summary.total_debit)}</strong></span>
          </div>
        </div>
      </div>

      {/* Account Info Toggle */}
      <div style={{ marginBottom: '20px' }}>
        {!showAccountInfo ? (
          <button 
            onClick={() => setShowAccountInfo(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: '#3b82f6',
              transition: 'all 0.2s'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            Click to view account number and routing number
          </button>
        ) : (
          <div className="client-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Account Information</h3>
              <button 
                onClick={() => setShowAccountInfo(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                Hide
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Account Number</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', fontFamily: 'monospace', letterSpacing: '1px' }}>
                  {client.account_number || 'Not set'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Routing Number</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', fontFamily: 'monospace', letterSpacing: '1px' }}>
                  {client.routing_number || 'Not set'}
                </div>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '12px', marginBottom: 0 }}>
              Contact your administrator if this information is incorrect.
            </p>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="client-stats-row">
        <div className="client-stat-card">
          <div className="client-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
          <div className="client-stat-value">{formatCurrency(summary.total_credit)}</div>
          <div className="client-stat-label">Total Credits</div>
        </div>
        <div className="client-stat-card">
          <div className="client-stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
          </div>
          <div className="client-stat-value">{formatCurrency(summary.total_debit)}</div>
          <div className="client-stat-label">Total Debits</div>
        </div>
        <div className="client-stat-card">
          <div className="client-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <div className="client-stat-value">{unread_count}</div>
          <div className="client-stat-label">Unread Messages</div>
        </div>
        <Link to="/client/bill-pay" className="client-stat-card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
          <div className="client-stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          </div>
          <div className="client-stat-value" style={{ fontSize: '16px' }}>Pay Bills</div>
          <div className="client-stat-label">Quick Action</div>
        </Link>
      </div>

      <div className="client-content-grid">
        {/* Recent Transactions */}
        <div className="client-card">
          <div className="client-card-header">
            <h3>Recent Transactions</h3>
            <Link to="/client/transactions" className="client-card-link">View All →</Link>
          </div>
          {recent_transactions.length === 0 ? (
            <div className="client-card-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="client-transaction-list">
              {recent_transactions.map((txn) => (
                <div key={txn.id} className="client-transaction-item">
                  <div className="client-transaction-icon">
                    {txn.credit_amount > 0 ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                    )}
                  </div>
                  <div className="client-transaction-info">
                    <div className="client-transaction-desc">{txn.description}</div>
                    <div className="client-transaction-date">{formatDate(txn.created_at)}</div>
                  </div>
                  <div className={`client-transaction-amount ${txn.credit_amount > 0 ? 'credit' : 'debit'}`}>
                    {txn.credit_amount > 0 ? '+' : '-'}{formatCurrency(txn.credit_amount || txn.debit_amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Notifications */}
        <div className="client-card">
          <div className="client-card-header">
            <h3>Notifications</h3>
            <Link to="/client/notifications" className="client-card-link">View All →</Link>
          </div>
          {recent_notifications.length === 0 ? (
            <div className="client-card-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <p>No notifications</p>
            </div>
          ) : (
            <div className="client-notification-list">
              {recent_notifications.map((notif) => (
                <div key={notif.id} className={`client-notification-item ${!notif.is_read ? 'unread' : ''}`}>
                  <div className="client-notification-dot-wrapper">
                    {!notif.is_read && <span className="client-notification-dot"></span>}
                  </div>
                  <div className="client-notification-info">
                    <div className="client-notification-title">{notif.title}</div>
                    <div className="client-notification-message">{notif.message}</div>
                    <div className="client-notification-time">{formatDateTime(notif.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FDIC Information Section */}
      <div className="client-fdic-info-section">
        <div className="client-fdic-header">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <div>
            <h2>FDIC Insurance Protection</h2>
            <p>Your deposits are protected by the full faith and credit of the United States government</p>
          </div>
        </div>

        <div className="client-fdic-cards">
          <div className="client-fdic-card">
            <div className="client-fdic-card-icon" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', color: '#2563eb' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h4>$250,000 Coverage</h4>
            <p>Each depositor is insured up to $250,000 per insured bank. This includes principal and accrued interest.</p>
          </div>
          <div className="client-fdic-card">
            <div className="client-fdic-card-icon" style={{ background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', color: '#16a34a' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <h4>24/7 Monitoring</h4>
            <p>Your account is continuously monitored for suspicious activity with real-time fraud detection systems.</p>
          </div>
          <div className="client-fdic-card">
            <div className="client-fdic-card-icon" style={{ background: 'linear-gradient(135deg, #f3e8ff, #e9d5ff)', color: '#9333ea' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <h4>Secure Encryption</h4>
            <p>Industry-standard 256-bit SSL encryption protects all data transmitted between your device and our servers.</p>
          </div>
          <div className="client-fdic-card">
            <div className="client-fdic-card-icon" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#d97706' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <h4>Official Statements</h4>
            <p>Access monthly statements, tax documents, and official correspondence directly from your dashboard.</p>
          </div>
        </div>
      </div>

      {/* Quick Services Section */}
      <div className="client-services-section">
        <h2>Banking Services</h2>
        <p className="client-services-subtitle">Access your account services quickly</p>
        <div className="client-services-grid">
          <Link to="/client/deposit" className="client-service-card">
            <div className="client-service-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
            <h4>Add Funds</h4>
            <p>Deposit funds via wire transfer, Zelle, or other methods</p>
          </Link>
          <Link to="/client/transactions" className="client-service-card">
            <div className="client-service-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <h4>Transactions</h4>
            <p>View your complete transaction history and statements</p>
          </Link>
          <Link to="/client/bill-pay" className="client-service-card">
            <div className="client-service-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </div>
            <h4>Bill Pay</h4>
            <p>Pay bills securely from your account balance</p>
          </Link>
          <Link to="/client/account" className="client-service-card">
            <div className="client-service-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </div>
            <h4>Account Settings</h4>
            <p>Manage your profile, password, and preferences</p>
          </Link>
        </div>
      </div>

      {/* Regulatory Footer */}
      <div className="client-regulatory-footer">
        <div className="client-regulatory-content">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <div>
            <p><strong>FDIC Insured</strong> — Backed by the full faith and credit of the United States Government</p>
            <p>Federal Deposit Insurance Corporation (FDIC) — Standard insurance amount is $250,000 per depositor, per insured bank, for each account ownership category.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
