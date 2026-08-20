import React, { useState, useEffect } from 'react';
import { clientPortalAPI } from '../services/api';
import { CreditCardIcon, FileTextIcon, AlertCircleIcon, SettingsIcon, MessageIcon, CheckCircleIcon } from '../components/Icons';
import './ClientPages.css';

const ClientNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = async () => {
    try {
      const response = await clientPortalAPI.getNotifications();
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await clientPortalAPI.markRead(id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await clientPortalAPI.markAllRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const formatDateTime = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getNotifIcon = (type, priority) => {
    if (priority === 'urgent') return <AlertCircleIcon size={18} style={{ color: '#ef4444' }} />;
    if (priority === 'high') return <AlertCircleIcon size={18} style={{ color: '#f97316' }} />;
    switch (type) {
      case 'transaction': return <CreditCardIcon size={18} />;
      case 'document': return <FileTextIcon size={18} />;
      case 'alert': return <AlertCircleIcon size={18} style={{ color: '#f59e0b' }} />;
      case 'system': return <SettingsIcon size={18} />;
      default: return <MessageIcon size={18} />;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="client-page">
      <div className="client-page-header">
        <div>
          <h1>Notifications</h1>
          <p className="client-page-subtitle">
            {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button className="client-btn client-btn-outline" onClick={markAllAsRead}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            Mark All Read
          </button>
        )}
      </div>

      <div className="client-card">
        {loading ? (
          <div className="client-page-loading"><div className="client-loading-spinner"></div></div>
        ) : notifications.length === 0 ? (
          <div className="client-card-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <h3>No notifications</h3>
            <p>You're all caught up</p>
          </div>
        ) : (
          <div className="client-notifications-list">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`client-notif-item ${!notif.is_read ? 'unread' : ''}`}
                onClick={() => !notif.is_read && markAsRead(notif.id)}
              >
                <div className="client-notif-icon">
                  {getNotifIcon(notif.notification_type, notif.priority)}
                </div>
                <div className="client-notif-content">
                  <div className="client-notif-header">
                    <span className="client-notif-title">{notif.title}</span>
                    {!notif.is_read && <span className="client-notif-unread-badge">New</span>}
                  </div>
                  <div className="client-notif-message">{notif.message}</div>
                  <div className="client-notif-time">{formatDateTime(notif.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientNotifications;
