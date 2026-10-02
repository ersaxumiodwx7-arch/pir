import React, { useState, useEffect, useCallback } from 'react';
import { adminVisitsAPI } from '../services/api';
import toast from 'react-hot-toast';
import './AdminClients.css';

const PAGE_SIZE = 50;

const AdminAllVisits = () => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | blocked | allowed
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [ipWorking, setIpWorking] = useState(null);

  const loadVisits = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminVisitsAPI.getAll();
      setVisits(response.data || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load visits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadVisits(); }, [loadVisits]);

  const refreshAfterIpChange = async () => {
    // Reload so every row for the same IP updates its blocked state
    await loadVisits();
  };

  const handleBlock = async (ip) => {
    if (!window.confirm(`Block IP ${ip}? Nobody will be able to log in from this network until it is unblocked.`)) return;
    setIpWorking(ip);
    try {
      await adminVisitsAPI.blockIp(ip);
      toast.success(`IP ${ip} blocked`);
      await refreshAfterIpChange();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to block IP');
    }
    setIpWorking(null);
  };

  const handleUnblock = async (visit) => {
    setIpWorking(visit.ip_address);
    try {
      await adminVisitsAPI.unblockIp(visit.ip_address);
      toast.success('IP unblocked');
      await refreshAfterIpChange();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to unblock IP');
    }
    setIpWorking(null);
  };

  const filtered = visits.filter(v => {
    if (filter === 'blocked' && !v.ip_blocked) return false;
    if (filter === 'allowed' && v.ip_blocked) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      (v.full_name || '').toLowerCase().includes(q) ||
      (v.case_id || '').toLowerCase().includes(q) ||
      (v.username || '').toLowerCase().includes(q) ||
      (v.ip_address || '').toLowerCase().includes(q) ||
      (v.timezone || '').toLowerCase().includes(q) ||
      (v.description || '').toLowerCase().includes(q)
    );
  });

  const blockedCount = visits.filter(v => v.ip_blocked).length;

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const formatDevice = (ua) => {
    if (!ua) return '—';
    if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
    if (/android/i.test(ua)) return 'Android';
    if (/macintosh|mac os/i.test(ua)) return 'Mac';
    if (/windows/i.test(ua)) return 'Windows';
    if (/linux/i.test(ua)) return 'Linux';
    return 'Other';
  };

  if (loading) {
    return <div className="admin-page-loading"><div className="admin-loading-spinner"></div></div>;
  }

  return (
    <div className="admin-deposit-methods">
      <div className="page-header">
        <div>
          <h1>Client Visits</h1>
          <p className="page-subtitle">Every client login across accounts — IP address, timezone and device, with one-tap IP blocking.</p>
        </div>
        <button className="btn btn-primary" onClick={loadVisits}>Refresh</button>
      </div>

      <div className="admin-visits-toolbar">
        <input
          type="text"
          className="admin-visits-search"
          placeholder="Search client, Case ID, IP, timezone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setVisible(PAGE_SIZE); }}
        />
        <div className="admin-visits-filters">
          <button className={`admin-visits-filter ${filter === 'all' ? 'active' : ''}`} onClick={() => { setFilter('all'); setVisible(PAGE_SIZE); }}>
            All ({visits.length})
          </button>
          <button className={`admin-visits-filter ${filter === 'blocked' ? 'active' : ''}`} onClick={() => { setFilter('blocked'); setVisible(PAGE_SIZE); }}>
            Blocked IPs ({blockedCount})
          </button>
          <button className={`admin-visits-filter ${filter === 'allowed' ? 'active' : ''}`} onClick={() => { setFilter('allowed'); setVisible(PAGE_SIZE); }}>
            Allowed ({visits.length - blockedCount})
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="admin-card-empty"><p>No visits match your filters</p></div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Case ID</th>
                <th>IP Address</th>
                <th>Timezone</th>
                <th>Device</th>
                <th>When</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, visible).map(visit => (
                <tr key={visit.id}>
                  <td className="admin-table-bold">{visit.full_name || '—'}</td>
                  <td className="admin-table-mono">{visit.case_id || '—'}</td>
                  <td>
                    <span className={`activity-ip-chip ${visit.ip_blocked ? 'ip-chip-blocked' : ''}`}>
                      {visit.ip_blocked ? '⛔ ' : '🌐 '}{visit.ip_address || '—'}
                    </span>
                  </td>
                  <td>
                    {visit.timezone
                      ? <span className="activity-tz-chip">🕒 {visit.timezone}</span>
                      : <span style={{ color: '#94a3b8' }}>—</span>}
                  </td>
                  <td>{formatDevice(visit.user_agent)}</td>
                  <td title={visit.created_at ? new Date(visit.created_at).toLocaleString() : ''}>
                    {formatDateTime(visit.created_at)}
                  </td>
                  <td>
                    <span className={`admin-status-badge ${visit.ip_blocked ? 'status-closed' : 'status-active'}`}>
                      {visit.ip_blocked ? 'Blocked' : 'Allowed'}
                    </span>
                  </td>
                  <td>
                    {visit.ip_blocked ? (
                      <button
                        className="btn-ip-action btn-ip-unblock"
                        disabled={ipWorking === visit.ip_address}
                        onClick={() => handleUnblock(visit)}
                      >
                        {ipWorking === visit.ip_address ? 'Working...' : 'Unblock IP'}
                      </button>
                    ) : (
                      <button
                        className="btn-ip-action btn-ip-block"
                        disabled={ipWorking === visit.ip_address || !visit.ip_address}
                        onClick={() => handleBlock(visit.ip_address)}
                      >
                        {ipWorking === visit.ip_address ? 'Working...' : 'Block IP'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {visible < filtered.length && (
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button className="btn btn-outline" onClick={() => setVisible(v => v + PAGE_SIZE)}>
            Show more ({filtered.length - visible} remaining)
          </button>
        </div>
      )}

      <p style={{ fontSize: '12px', color: '#64748b', marginTop: '12px' }}>
        Showing {Math.min(visible, filtered.length)} of {filtered.length} visits · Last {formatDate(visits[0]?.created_at)} to {formatDate(visits[visits.length - 1]?.created_at)}
      </p>
    </div>
  );
};

export default AdminAllVisits;
