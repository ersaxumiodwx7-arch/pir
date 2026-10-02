import React, { useState, useEffect, useCallback } from 'react';
import { superAdminAPI, adminVisitsAPI } from '../services/api';
import toast from 'react-hot-toast';
import './AdminClients.css';

const PAGE_SIZE = 50;

const AdminSiteVisits = () => {
  const [visits, setVisits] = useState([]);
  const [stats, setStats] = useState({ total: 0, bots: 0, humans: 0 });
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | bot | human | blocked
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [ipWorking, setIpWorking] = useState(null);

  const loadVisits = useCallback(async () => {
    try {
      setLoading(true);
      setForbidden(false);
      const response = await superAdminAPI.getSiteVisits();
      setVisits(response.data?.visits || []);
      setStats(response.data?.stats || { total: 0, bots: 0, humans: 0 });
    } catch (error) {
      if (error.response?.status === 403) {
        setForbidden(true);
      } else {
        toast.error(error.response?.data?.error || 'Failed to load site visits');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadVisits(); }, [loadVisits]);

  const handleBlock = async (ip) => {
    if (!window.confirm(`Block IP ${ip}? They will not be able to load ANY page of this site until it is unblocked.`)) return;
    setIpWorking(ip);
    try {
      await adminVisitsAPI.blockIp(ip);
      toast.success(`IP ${ip} is now blocked from the entire site`);
      await loadVisits();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to block IP');
    }
    setIpWorking(null);
  };

  const handleUnblock = async (ip) => {
    setIpWorking(ip);
    try {
      await adminVisitsAPI.unblockIp(ip);
      toast.success('IP unblocked — the site is reachable again from that network');
      await loadVisits();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to unblock IP');
    }
    setIpWorking(null);
  };

  const filtered = visits.filter(v => {
    if (filter === 'bot' && !v.is_bot) return false;
    if (filter === 'human' && v.is_bot) return false;
    if (filter === 'blocked' && !v.ip_blocked) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      (v.ip_address || '').toLowerCase().includes(q) ||
      (v.path || '').toLowerCase().includes(q) ||
      (v.user_agent || '').toLowerCase().includes(q)
    );
  });

  const blockedCount = visits.filter(v => v.ip_blocked).length;
  const botCount = visits.filter(v => v.is_bot).length;

  const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

  const statusClass = (code) => {
    if (!code) return '';
    if (code < 300) return 'admin-sv-status ok';
    if (code < 400) return 'admin-sv-status redirect';
    if (code < 500) return 'admin-sv-status warn';
    return 'admin-sv-status error';
  };

  if (loading) {
    return <div className="admin-page-loading"><div className="admin-loading-spinner"></div></div>;
  }

  if (forbidden) {
    return (
      <div className="admin-deposit-methods">
        <div className="admin-card-empty">
          <p>Super admin access required — this page is not available to normal admins.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-deposit-methods">
      <div className="page-header">
        <div>
          <h1>Site Visits</h1>
          <p className="page-subtitle">Every page and API call hitting the site — bots and real visitors — super admin only.</p>
        </div>
        <button className="btn btn-primary" onClick={loadVisits}>Refresh</button>
      </div>

      <div className="admin-visits-toolbar">
        <input
          type="text"
          className="admin-visits-search"
          placeholder="Search IP, page path, user agent..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setVisible(PAGE_SIZE); }}
        />
        <div className="admin-visits-filters">
          <button className={`admin-visits-filter ${filter === 'all' ? 'active' : ''}`} onClick={() => { setFilter('all'); setVisible(PAGE_SIZE); }}>
            All ({stats.total.toLocaleString()})
          </button>
          <button className={`admin-visits-filter ${filter === 'bot' ? 'active' : ''}`} onClick={() => { setFilter('bot'); setVisible(PAGE_SIZE); }}>
            &#129302; Bots ({stats.bots.toLocaleString()})
          </button>
          <button className={`admin-visits-filter ${filter === 'human' ? 'active' : ''}`} onClick={() => { setFilter('human'); setVisible(PAGE_SIZE); }}>
            &#128100; Humans ({stats.humans.toLocaleString()})
          </button>
          <button className={`admin-visits-filter ${filter === 'blocked' ? 'active' : ''}`} onClick={() => { setFilter('blocked'); setVisible(PAGE_SIZE); }}>
            &#9940; Blocked IPs ({blockedCount})
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="admin-card-empty"><p>No site visits match your filters</p></div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>IP Address</th>
                <th>Type</th>
                <th>Requested</th>
                <th>Status</th>
                <th>User Agent</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, visible).map(visit => (
                <tr key={visit.id}>
                  <td title={visit.created_at ? new Date(visit.created_at).toLocaleString() : ''}>
                    {formatDateTime(visit.created_at)}
                  </td>
                  <td>
                    <span className={`activity-ip-chip ${visit.ip_blocked ? 'ip-chip-blocked' : ''}`}>
                      {visit.ip_blocked ? '⛔ ' : '🌐 '}{visit.ip_address || '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-sv-type-badge ${visit.is_bot ? 'bot' : 'human'}`}>
                      {visit.is_bot ? '\u{1F916} Bot' : '\u{1F464} Normal'}
                    </span>
                  </td>
                  <td>
                    <span className="admin-sv-path">{visit.method} {visit.path}</span>
                  </td>
                  <td>
                    <span className={statusClass(visit.status_code)}>{visit.status_code || '—'}</span>
                  </td>
                  <td>
                    <span className="admin-sv-ua" title={visit.user_agent || ''}>{visit.user_agent || '—'}</span>
                  </td>
                  <td>
                    {visit.ip_blocked ? (
                      <button
                        className="btn-ip-action btn-ip-unblock"
                        disabled={ipWorking === visit.ip_address}
                        onClick={() => handleUnblock(visit.ip_address)}
                      >
                        {ipWorking === visit.ip_address ? 'Working...' : 'Unblock'}
                      </button>
                    ) : (
                      <button
                        className="btn-ip-action btn-ip-block"
                        disabled={ipWorking === visit.ip_address || !visit.ip_address}
                        onClick={() => handleBlock(visit.ip_address)}
                      >
                        {ipWorking === visit.ip_address ? 'Working...' : 'Block site-wide'}
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
        Showing {Math.min(visible, filtered.length)} of {filtered.length} logged visits ({botCount} bots in view) · Blocking an IP stops it from loading any page of the site, not just logging in.
      </p>
    </div>
  );
};

export default AdminSiteVisits;
