import React, { useState, useEffect } from 'react';
import { clientPortalAPI } from '../services/api';
import './ClientPages.css';

const ClientTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', status: '', from_date: '', to_date: '' });

  useEffect(() => { loadTransactions(); }, [filters]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;
      const response = await clientPortalAPI.getTransactions(params);
      setTransactions(response.data);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
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

  const clearFilters = () => setFilters({ type: '', status: '', from_date: '', to_date: '' });

  return (
    <div className="client-page">
      <div className="client-page-header">
        <div>
          <h1>Transactions</h1>
          <p className="client-page-subtitle">View your transaction history</p>
        </div>
      </div>

      {/* Filters */}
      <div className="client-card client-filters">
        <div className="client-filter-row">
          <div className="client-filter-group">
            <label>Type</label>
            <select value={filters.type} onChange={(e) => setFilters({...filters, type: e.target.value})}>
              <option value="">All Types</option>
              <option value="credit">Credits</option>
              <option value="debit">Debits</option>
            </select>
          </div>
          <div className="client-filter-group">
            <label>Status</label>
            <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})}>
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="client-filter-group">
            <label>From</label>
            <input type="date" value={filters.from_date} onChange={(e) => setFilters({...filters, from_date: e.target.value})} />
          </div>
          <div className="client-filter-group">
            <label>To</label>
            <input type="date" value={filters.to_date} onChange={(e) => setFilters({...filters, to_date: e.target.value})} />
          </div>
          <button className="client-btn client-btn-ghost client-filter-clear" onClick={clearFilters}>Clear</button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="client-card">
        {loading ? (
          <div className="client-page-loading"><div className="client-loading-spinner"></div></div>
        ) : transactions.length === 0 ? (
          <div className="client-card-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            <h3>No transactions found</h3>
            <p>Transaction history will appear here</p>
          </div>
        ) : (
          <div className="client-table-wrapper">
            <table className="client-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Credit</th>
                  <th>Debit</th>
                  <th>Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.id}>
                    <td className="client-table-mono" data-label="ID">{txn.transaction_id}</td>
                    <td data-label="Date">{formatDateTime(txn.created_at)}</td>
                    <td data-label="Description">
                      <div className="client-txn-desc">{txn.description}</div>
                      {txn.category && <span className="client-txn-category">{txn.category}</span>}
                    </td>
                    <td className="client-amount-credit" data-label="Credit">
                      {txn.credit_amount > 0 ? `+${formatCurrency(txn.credit_amount)}` : '—'}
                    </td>
                    <td className="client-amount-debit" data-label="Debit">
                      {txn.debit_amount > 0 ? `-${formatCurrency(txn.debit_amount)}` : '—'}
                    </td>
                    <td className="client-table-bold" data-label="Balance">{formatCurrency(txn.balance_after)}</td>
                    <td data-label="Status">
                      <span className={`client-status-badge status-${txn.status}`}>
                        {txn.status?.charAt(0).toUpperCase() + txn.status?.slice(1)}
                      </span>
                    </td>
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

export default ClientTransactions;
