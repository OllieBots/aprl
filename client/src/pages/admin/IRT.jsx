import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import api from '../../lib/api';
import { relativeTime } from '../../lib/utils';

const STATUS_OPTIONS = [
  { value: 'open',         label: 'Open',         color: '#60a5fa' },
  { value: 'under_review', label: 'Under Review',  color: 'var(--gold)' },
  { value: 'resolved',     label: 'Resolved',      color: 'var(--green)' },
  { value: 'dismissed',    label: 'Dismissed',     color: 'var(--text3)' },
];

const FILTER_TABS = [
  { id: 'all',          label: 'All' },
  { id: 'open',         label: 'Open' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'resolved',     label: 'Resolved' },
  { id: 'dismissed',    label: 'Dismissed' },
];

function statusStyle(status) {
  const opt = STATUS_OPTIONS.find(s => s.value === status);
  return opt ? opt.color : 'var(--text3)';
}

export default function IRT() {
  const [incidents, setIncidents] = useState([]);
  const [counts, setCounts] = useState({});
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [list, c] = await Promise.all([
        api.get('/irt'),
        api.get('/irt/counts'),
      ]);
      setIncidents(list);
      setCounts(c);
    } finally {
      setLoading(false);
    }
  }

  const filtered = filter === 'all' ? incidents : incidents.filter(i => i.status === filter);

  return (
    <div>
      <PageHeader
        title="IRT Intake"
        subtitle="Incident Review Tribunal — driver-submitted incident reports"
      />

      {/* Status filter tabs with counts */}
      <div className="px-8 pt-5">
        <div className="flex gap-1 p-1 rounded-md w-fit" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          {FILTER_TABS.map(tab => {
            const count = tab.id === 'all'
              ? incidents.length
              : (counts[tab.id] ?? 0);
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className="px-4 py-1.5 rounded text-sm font-semibold transition-all flex items-center gap-2"
                style={{
                  background: filter === tab.id ? 'var(--bg4)' : 'transparent',
                  color: filter === tab.id ? 'var(--text)' : 'var(--text2)',
                }}
              >
                {tab.label}
                {count > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 10,
                    background: tab.id === 'open' && filter !== 'open' ? 'rgba(96,165,250,0.2)' : 'var(--bg3)',
                    color: tab.id === 'open' && filter !== 'open' ? '#60a5fa' : 'var(--text3)',
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-8 pt-4 pb-8">
        {loading ? (
          <div style={{ color: 'var(--text3)', fontSize: 14, padding: '40px 0' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>
              No incident reports {filter !== 'all' ? `with status "${filter.replace('_', ' ')}"` : ''}
            </div>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(incident => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                onClick={() => setSelected(incident)}
              />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <IncidentDetailModal
          incident={selected}
          onClose={() => setSelected(null)}
          onSaved={(updated) => {
            setIncidents(prev => prev.map(i => i.id === updated.id ? updated : i));
            setCounts(prev => {
              const next = { ...prev };
              if (selected.status !== updated.status) {
                next[selected.status] = Math.max(0, (next[selected.status] ?? 0) - 1);
                next[updated.status] = (next[updated.status] ?? 0) + 1;
              }
              return next;
            });
            setSelected(updated);
          }}
        />
      )}
    </div>
  );
}

function IncidentCard({ incident, onClick }) {
  const drivers = parseDrivers(incident.involved_drivers);

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '16px 20px', cursor: 'pointer', transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Left: ID + status */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 56 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)' }}>#{incident.id}</span>
          <StatusPill status={incident.status} />
        </div>

        {/* Middle: main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
              {incident.track_name
                ? `Round ${incident.round_number} — ${incident.track_name}`
                : 'No race specified'}
            </span>
            {incident.session_type && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: 'var(--bg3)', color: 'var(--text3)', border: '1px solid var(--border2)' }}>
                {incident.session_type}
              </span>
            )}
            {incident.lap_number && (
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>Lap {incident.lap_number}</span>
            )}
          </div>

          <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 600 }}>
            {incident.explanation}
          </p>

          <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>
              By <strong style={{ color: 'var(--text2)' }}>{incident.reporter_name}</strong>
            </span>
            {drivers.length > 0 && (
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                Drivers: <strong style={{ color: 'var(--text2)' }}>{drivers.join(', ')}</strong>
              </span>
            )}
            {incident.clip_url && (
              <span style={{ fontSize: 12, color: '#60a5fa' }}>🎬 Clip attached</span>
            )}
          </div>
        </div>

        {/* Right: timestamp */}
        <span style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {relativeTime(incident.created_at)}
        </span>
      </div>
    </button>
  );
}

function IncidentDetailModal({ incident, onClose, onSaved }) {
  const [status, setStatus] = useState(incident.status);
  const [adminNotes, setAdminNotes] = useState(incident.admin_notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const drivers = parseDrivers(incident.involved_drivers);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await api.put(`/irt/${incident.id}`, { status, admin_notes: adminNotes });
      onSaved({ ...incident, status, admin_notes: adminNotes });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const isDirty = status !== incident.status || adminNotes !== (incident.admin_notes || '');

  return (
    <Modal title={`Incident #${incident.id}`} onClose={onClose} width={620}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Meta row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: 'Reported By', value: incident.reporter_name },
            { label: 'Race', value: incident.track_name ? `R${incident.round_number} — ${incident.track_name}` : '—' },
            { label: 'Session / Lap', value: [incident.session_type, incident.lap_number ? `Lap ${incident.lap_number}` : null].filter(Boolean).join(' · ') || '—' },
          ].map(item => (
            <div key={item.label} style={{ background: 'var(--bg3)', borderRadius: 6, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: 3 }}>{item.label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Drivers involved */}
        {drivers.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: 6 }}>Drivers Involved</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {drivers.map((d, i) => (
                <span key={i} style={{ fontSize: 13, fontWeight: 600, padding: '4px 10px', borderRadius: 5, background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border2)' }}>
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Explanation */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: 6 }}>Explanation</div>
          <div style={{ background: 'var(--bg3)', borderRadius: 6, padding: '12px 14px', fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, whiteSpace: 'pre-wrap', border: '1px solid var(--border)' }}>
            {incident.explanation}
          </div>
        </div>

        {/* Clip */}
        {incident.clip_url && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: 6 }}>Clip</div>
            <a
              href={incident.clip_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 13, color: '#60a5fa', wordBreak: 'break-all' }}
            >
              {incident.clip_url}
            </a>
          </div>
        )}

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--border)' }} />

        {/* Admin controls */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: 8 }}>Status</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                style={{
                  padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${status === opt.value ? opt.color : 'var(--border2)'}`,
                  background: status === opt.value ? `${opt.color}20` : 'var(--bg3)',
                  color: status === opt.value ? opt.color : 'var(--text2)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: 6 }}>Admin Notes</div>
          <textarea
            value={adminNotes}
            onChange={e => setAdminNotes(e.target.value)}
            placeholder="Decision, penalty, or notes for the record..."
            rows={4}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 6, fontSize: 13,
              background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)',
              resize: 'vertical', lineHeight: 1.5, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(232,48,42,0.1)', color: 'var(--accent)', border: '1px solid rgba(232,48,42,0.25)', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
            Submitted {relativeTime(incident.created_at)}
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Button onClick={handleSave} disabled={saving || !isDirty}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function StatusPill({ status }) {
  const color = statusStyle(status);
  const label = STATUS_OPTIONS.find(s => s.value === status)?.label ?? status;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 4,
      background: `${color}18`, color, border: `1px solid ${color}40`,
      textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

function parseDrivers(val) {
  if (!val) return [];
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val;
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}
