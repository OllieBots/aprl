import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import IRTDetailModal from '../components/IRTDetailModal';
import { IncidentCard } from './admin/IRT';
import { irt } from '../lib/api';

const FILTER_TABS = [
  { id: 'all',          label: 'All' },
  { id: 'open',         label: 'Open' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'resolved',     label: 'Resolved' },
  { id: 'dismissed',    label: 'Dismissed' },
];

export default function IRTReview() {
  const { user, logout } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [counts, setCounts] = useState({});
  const [filter, setFilter] = useState('open');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [list, c] = await Promise.all([irt.list(), irt.counts()]);
      setIncidents(list);
      setCounts(c);
    } catch (err) {
      if (err.message?.includes('IRT access') || err.message?.includes('No IRT')) {
        setAccessDenied(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function openIncident(incident) {
    const detail = await irt.get(incident.id);
    setSelected(detail);
  }

  if (!user) return <Navigate to="/login" replace />;

  const filtered = filter === 'all' ? incidents : incidents.filter(i => i.status === filter);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/dashboard" style={{ textDecoration: 'none', fontSize: 13, color: 'var(--text3)' }}>← Dashboard</Link>
          <span style={{ color: 'var(--border2)' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 13 }}>
              IRT
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Incident Review Tribunal</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>{user?.name}</span>
          <button onClick={logout} style={{ fontSize: 13, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
        {accessDenied ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>No IRT Access</div>
            <p style={{ fontSize: 14, color: 'var(--text3)' }}>You haven't been granted IRT reviewer access by a league admin.</p>
            <Link to="/dashboard" style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>← Back to Dashboard</Link>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px' }}>IRT Review Queue</h1>
              <p style={{ fontSize: 14, color: 'var(--text3)', margin: 0 }}>
                Review incident reports, cast your vote, and participate in discussions.
              </p>
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 4, padding: '4px', borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border)', width: 'fit-content', marginBottom: 20 }}>
              {FILTER_TABS.map(ft => {
                const count = ft.id === 'all' ? incidents.length : (counts[ft.id] ?? 0);
                return (
                  <button
                    key={ft.id}
                    onClick={() => setFilter(ft.id)}
                    style={{
                      padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                      background: filter === ft.id ? 'var(--bg4)' : 'transparent',
                      color: filter === ft.id ? 'var(--text)' : 'var(--text2)',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {ft.label}
                    {count > 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 10,
                        background: ft.id === 'open' && filter !== 'open' ? 'rgba(96,165,250,0.2)' : 'var(--bg3)',
                        color: ft.id === 'open' && filter !== 'open' ? '#60a5fa' : 'var(--text3)',
                      }}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {loading ? (
              <div style={{ color: 'var(--text3)', fontSize: 14 }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '40px 24px', textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>
                No incident reports{filter !== 'all' ? ` with status "${filter.replace('_', ' ')}"` : ''}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filtered.map(incident => (
                  <IncidentCard key={incident.id} incident={incident} onClick={() => openIncident(incident)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {selected && (
        <IRTDetailModal
          incident={selected}
          onClose={() => setSelected(null)}
          onSaved={(updated) => {
            setSelected(updated);
          }}
        />
      )}
    </div>
  );
}
