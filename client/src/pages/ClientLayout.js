import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useClientAuth } from '../context/ClientAuthContext';
import { clientPortalAPI } from '../services/api';
import { DashboardIcon, UserIcon, DollarIcon, CreditCardIcon, BellIcon, LogOutIcon, MenuIcon, PlusIcon } from '../components/Icons';
import './ClientLayout.css';
import './ClientTransfer.css';

const ClientLayout = () => {
  const { client, logout } = useClientAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pickupTracking, setPickupTracking] = useState(null);

  useEffect(() => {
    loadNotifications();
    loadPickupTracking();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await clientPortalAPI.getNotifications();
      const unread = response.data.filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      // silent
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/client/login');
  };

  const loadPickupTracking = async () => {
    try {
      const response = await clientPortalAPI.getDepositMethods();
      const methods = response.data.methods || [];
      const pickup = methods.find(m => m.method_type === 'pickup');
      if (pickup) {
        setPickupTracking(pickup);
      } else {
        setPickupTracking(null);
      }
    } catch (error) {
      // silent
    }
  };

  const getTrackingStatusLabel = (status) => {
    switch (status) {
      case 'on_the_way': return '🚚 On The Way';
      case 'picked': return '✅ Picked Up';
      case 'secured': return '🔒 Secured';
      default: return '📦 Scheduled';
    }
  };

  const [showTransferModal, setShowTransferModal] = useState(false);

  const navItems = [
    { path: '/client/dashboard', label: 'Dashboard', icon: <DashboardIcon size={20} /> },
    { path: '/client/deposit', label: 'Add Funds', icon: <PlusIcon size={20} /> },
    { action: 'transfer', label: 'Make a Transfer', icon: <DollarIcon size={20} /> },
    { type: 'divider', label: 'Account' },
    { path: '/client/account', label: 'Account Details', icon: <UserIcon size={20} /> },
    { path: '/client/transactions', label: 'Transactions', icon: <DollarIcon size={20} /> },
    { path: '/client/bill-pay', label: 'Bill Pay', icon: <CreditCardIcon size={20} /> },
    { path: '/client/notifications', label: 'Notifications', icon: <BellIcon size={20} />, badge: unreadCount },
  ];

  return (
    <div className="client-layout">
      {/* Mobile header */}
      <div className="client-mobile-header">
        <button className="client-menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <MenuIcon size={24} />
        </button>
        <div className="client-mobile-logo">
          <span>FDIC</span>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="client-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`client-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="client-sidebar-header">
          <div className="client-sidebar-logo">
            <span style={{ color: '#3b82f6' }}>FDIC</span>
          </div>
          <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0', letterSpacing: '0.3px' }}>Federal Deposit Insurance Corp.</p>
        </div>

        <div className="client-sidebar-user">
          <div className="client-sidebar-avatar">
            {client?.full_name?.charAt(0)?.toUpperCase() || 'C'}
          </div>
          <div className="client-sidebar-user-info">
            <div className="client-sidebar-name">{client?.full_name || 'Client'}</div>
            <div className="client-sidebar-caseid">{client?.case_id}</div>
          </div>
        </div>

        <nav className="client-sidebar-nav">
          {navItems.map((item, index) => {
            if (item.type === 'divider') {
              return (
                <div key={`divider-${index}`} className="client-nav-divider">
                  {item.label}
                </div>
              );
            }
            if (item.action === 'transfer') {
              return (
                <button
                  key="transfer-action"
                  className="client-nav-item"
                  onClick={() => { setShowTransferModal(true); setSidebarOpen(false); }}
                >
                  <span className="client-nav-icon">{item.icon}</span>
                  <span className="client-nav-label">{item.label}</span>
                </button>
              );
            }
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `client-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="client-nav-icon">{item.icon}</span>
                <span className="client-nav-label">{item.label}</span>
                {item.badge > 0 && <span className="client-nav-badge">{item.badge}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Deposit Tracking Widget */}
        {pickupTracking && (
          <div className="client-sidebar-tracking">
            <div className="client-sidebar-tracking-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>Deposit Tracking</span>
            </div>
            <div className="client-sidebar-tracking-status">
              <span className={`client-tracking-dot tracking-${pickupTracking.pickup_status || 'scheduled'}`}></span>
              <span className="client-tracking-label">{getTrackingStatusLabel(pickupTracking.pickup_status)}</span>
            </div>
            {pickupTracking.picker_name && (
              <div className="client-sidebar-tracking-info">
                <span className="client-tracking-info-label">Picker</span>
                <span className="client-tracking-info-value">{pickupTracking.picker_name}</span>
              </div>
            )}
            {pickupTracking.car_name && (
              <div className="client-sidebar-tracking-info">
                <span className="client-tracking-info-label">Vehicle</span>
                <span className="client-tracking-info-value">{pickupTracking.car_name}{pickupTracking.car_number ? ` • ${pickupTracking.car_number}` : ''}</span>
              </div>
            )}
            {pickupTracking.estimated_arrival && (
              <div className="client-sidebar-tracking-info">
                <span className="client-tracking-info-label">ETA</span>
                <span className="client-tracking-info-value">{pickupTracking.estimated_arrival}</span>
              </div>
            )}
            <NavLink to="/client/deposit" className="client-sidebar-tracking-link" onClick={() => setSidebarOpen(false)}>
              View Details →
            </NavLink>
          </div>
        )}

        <div className="client-sidebar-footer">
          <button className="client-nav-item client-logout-btn" onClick={handleLogout}>
            <span className="client-nav-icon">
              <LogOutIcon size={20} />
            </span>
            <span className="client-nav-label">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="client-main">
        <Outlet />
      </main>

      {/* Transfer Method Modal */}
      {showTransferModal && (
        <div className="transfer-modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="transfer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="transfer-modal-header">
              <h2>Make a Transfer</h2>
              <p>Choose how you'd like to send money</p>
              <button className="transfer-modal-close" onClick={() => setShowTransferModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="transfer-modal-options">
              <button
                className="transfer-modal-option"
                onClick={() => { navigate('/client/transfer'); setShowTransferModal(false); }}
              >
                <div className="transfer-option-icon zelle">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>
                <div className="transfer-option-info">
                  <h3>Zelle Transfer</h3>
                  <p>Instant transfers to anyone with a U.S. bank account. No fees.</p>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <button
                className="transfer-modal-option"
                onClick={() => { navigate('/client/transfer?tab=ach'); setShowTransferModal(false); }}
              >
                <div className="transfer-option-icon ach">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                </div>
                <div className="transfer-option-info">
                  <h3>ACH Transfer</h3>
                  <p>Direct bank-to-bank transfers. Standard (1-3 days) or next-day available.</p>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientLayout;
