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

const NAV_SECTIONS = [
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
      { path: '/admin/deposit-methods', icon: SettingsIcon, label: 'Deposit Methods' },
      { path: '/admin/deposits', icon: CreditCardIcon, label: 'Deposit Requests' },
    ],
  },
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
  const { logout } = useAuth();

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
      </div>

      <nav className="admin-sidebar-nav">
        {NAV_SECTIONS.map((section) => (
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
