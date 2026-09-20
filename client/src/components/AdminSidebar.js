import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardIcon,
  PlusIcon,
  UsersIcon,
  CreditCardIcon,
  SettingsIcon,
  ShieldIcon,
  LogOutIcon,
} from './Icons';
import { useAuth } from '../context/AuthContext';
import './AdminSidebar.css';

const NAV_SECTIONS = (isSuperAdmin) => [
  {
    label: 'Main',
    items: [
      { path: '/dashboard', icon: DashboardIcon, label: 'Dashboard' },
      { path: '/forms/new', icon: PlusIcon, label: 'New Form' },
    ],
  },
  {
    label: 'Management',
    items: [
      { path: '/admin/clients', icon: UsersIcon, label: 'Client Accounts' },
      { path: '/admin/agents', icon: CreditCardIcon, label: 'Agent Management' },
      { path: '/admin/deposits', icon: CreditCardIcon, label: 'Deposit Requests' },
    ],
  },
  ...(isSuperAdmin ? [
    {
      label: 'Super Admin',
      items: [
        { path: '/superadmin/accounts', icon: SettingsIcon, label: 'Admin Accounts' },
      ],
    },
  ] : []),
  {
    label: 'Security',
    items: [
      { path: '/admin/clients', icon: ShieldIcon, label: 'Fraud Review' },
    ],
  },
];

const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  // Subscription expiry display for normal admins
  let expiryText = 'No subscription';
  let expiryDays = null;
  if (user?.subscription_expires_at) {
    const exp = new Date(user.subscription_expires_at);
    expiryDays = Math.ceil((exp.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    expiryText = expiryDays <= 0
      ? 'Expired'
      : `${exp.toLocaleDateString()} (${expiryDays}d left)`;
  }

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <h2>
          <span className="brand-dot" />
          <span>Pirates Panel</span>
        </h2>
        <p>@bandzxstacks</p>
        {user && (
          <div className="admin-sidebar-account">
            <div className="admin-sidebar-account-row">
              <span className="admin-sidebar-account-label">Signed in</span>
              <span className="admin-sidebar-account-value">{user.username || user.email}</span>
            </div>
            {user.role !== 'super_admin' && (
              <div className="admin-sidebar-account-row">
                <span className="admin-sidebar-account-label">Access expires</span>
                <span className={`admin-sidebar-account-value${expiryDays !== null && expiryDays <= 7 ? ' expiring' : ''}`}>{expiryText}</span>
              </div>
            )}
            {user.role === 'super_admin' && (
              <div className="admin-sidebar-account-row">
                <span className="admin-sidebar-account-label">Role</span>
                <span className="admin-sidebar-account-value super">Super Admin</span>
              </div>
            )}
          </div>
        )}
      </div>

      <nav className="admin-sidebar-nav">
        {NAV_SECTIONS(isSuperAdmin).map((section) => (
          <React.Fragment key={section.label}>
            <div className="admin-sidebar-section-label">{section.label}</div>
            {section.items.map((item) => (
              <button
                key={item.path + item.label}
                className={`admin-sidebar-link${isActive(item.path) && item.label !== 'New Form' ? ' active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <item.icon className="admin-sidebar-link-icon" size={20} />
                <span>{item.label}</span>
              </button>
            ))}
          </React.Fragment>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <button className="admin-sidebar-link logout" onClick={logout}>
          <LogOutIcon className="admin-sidebar-link-icon" size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
