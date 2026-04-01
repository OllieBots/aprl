import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import Card from '../../components/Card';
import IRTDetailModal from '../../components/IRTDetailModal';
import { irt } from '../../lib/api';
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

export function StatusPill({ status }) {
  const opt = STATUS_OPTIONS.find(s => s.value === status);
  const color = opt?.color ?? 'var(--text3)';
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 4,
      background: `${color}18`, color, border: `1px solid ${color}40`,
      textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
    }}>
      {opt?.label ?? status}
    </span>
  );
}

function parseDrivers(val) {
  if (!val) return [];
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val;
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch { return []; }
}

export function IncidentCard({ incident, onClick }) {
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 56 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)' }}>#{incident.id}</span>
          <StatusPill status={incident.status} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
              {incident.track_name ? `Round ${incident.round_number} — ${incident.track_name}` : 'No race specified'}
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
          <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 580 }}>
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
            {incident.clip_url && <span style={{ fontSize: 12, color: '#60a5fa' }}>🎬 Clip</span>}
          </div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {relativeTime(incident.created_at)}
        </span>
      </div>
    </button>
  );
}

export default function IRT() {
  const [tab, setTab] = useState('reports');
  const [incidents, setIncidents] = useState([]);
  const [counts, setCounts] = useState({});
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [list, c] = await Promise.all([irt.list(), irt.counts()]);
      setIncidents(list);
      setCounts(c);
    } finally {
      setLoading(false);
    }
  }

  async function openIncident(incident) {
    const detail = await irt.get(incident.id);
    setSelected(detail);
  }

  const filtered = filter === 'all' ? incidents : incidents.filter(i => i.status === filter);

  return (
    <div>
      <PageHeader title="IRT Intake" subtitle="Incident Review Tribunal — driver-submitted incident reports" />

      {/* Top-level tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginTop: 4, paddingLeft: 32 }}>
        {[{ id: 'reports', label: 'Reports' }, { id: 'reviewers', label: 'Reviewers' }].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 20px', fontSize: 14, fontWeight: 600, background: 'none', border: 'none',
              cursor: 'pointer', color: tab === t.id ? 'var(--text)' : 'var(--text3)',
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'reports' && (
        <>
          {/* Status filter tabs */}
          <div className="px-8 pt-5">
            <div className="flex gap-1 p-1 rounded-md w-fit" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
              {FILTER_TABS.map(ft => {
                const count = ft.id === 'all' ? incidents.length : (counts[ft.id] ?? 0);
                return (
                  <button
                    key={ft.id}
                    onClick={() => setFilter(ft.id)}
                    className="px-4 py-1.5 rounded text-sm font-semibold transition-all flex items-center gap-2"
                    style={{
                      background: filter === ft.id ? 'var(--bg4)' : 'transparent',
                      color: filter === ft.id ? 'var(--text)' : 'var(--text2)',
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
          </div>

          <div className="px-8 pt-4 pb-8">
            {loading ? (
              <div style={{ color: 'var(--text3)', fontSize: 14, padding: '40px 0' }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <Card>
                <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>
                  No incident reports{filter !== 'all' ? ` with status "${filter.replace('_', ' ')}"` : ''}
                </div>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filtered.map(incident => (
                  <IncidentCard key={incident.id} incident={incident} onClick={() => openIncident(incident)} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'reviewers' && <ReviewersPanel />}

      {selected && (
        <IRTDetailModal
          incident={selected}
          onClose={() => setSelected(null)}
          onSaved={(updated) => {
            setIncidents(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i));
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

function ReviewersPanel() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);

  useEffect(() => { loadMembers(); }, []);

  async function loadMembers() {
    try {
      const data = await irt.reviewers();
      setMembers(data);
    } finally {
      setLoading(false);
    }
  }

  async function toggleReviewer(membershipId, current) {
    setToggling(membershipId);
    try {
      await irt.setReviewer(membershipId, !current);
      setMembers(prev => prev.map(m =>
        m.membership_id === membershipId ? { ...m, irt_reviewer: !current } : m
      ));
    } finally {
      setToggling(null);
    }
  }

  const reviewers = members.filter(m => m.irt_reviewer);
  const others = members.filter(m => !m.irt_reviewer);

  return (
    <div className="px-8 pt-6 pb-8 space-y-6">
      <div style={{ maxWidth: 680 }}>
        <div style={{ padding: '14px 16px', borderRadius: 7, background: 'var(--bg3)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 20 }}>
          IRT Reviewers can view all incident reports, cast votes, and participate in discussions. Only you (the admin) can change the final status or add admin notes.
          <br /><br />
          Reviewers access their queue from their <strong style={{ color: 'var(--text)' }}>Driver Dashboard</strong> under "IRT Review".
        </div>

        {loading ? (
          <div style={{ color: 'var(--text3)', fontSize: 14 }}>Loading members...</div>
        ) : members.length === 0 ? (
          <div style={{ color: 'var(--text3)', fontSize: 14 }}>No active league members yet.</div>
        ) : (
          <Card>
            {/* Active reviewers */}
            {reviewers.length > 0 && (
              <>
                <div style={{ padding: '10px 20px 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)' }}>
                  Current Reviewers
                </div>
                {reviewers.map(m => (
                  <MemberRow key={m.membership_id} member={m} isReviewer={true}
                    onToggle={() => toggleReviewer(m.membership_id, true)}
                    disabled={toggling === m.membership_id} />
                ))}
                {others.length > 0 && <div style={{ borderTop: '1px solid var(--border)' }} />}
              </>
            )}

            {/* Other members */}
            {others.length > 0 && (
              <>
                <div style={{ padding: '10px 20px 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)' }}>
                  League Members
                </div>
                {others.map(m => (
                  <MemberRow key={m.membership_id} member={m} isReviewer={false}
                    onToggle={() => toggleReviewer(m.membership_id, false)}
                    disabled={toggling === m.membership_id} />
                ))}
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

function MemberRow({ member, isReviewer, onToggle, disabled }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 20px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 34, height: 34, borderRadius: 7, background: isReviewer ? 'rgba(232,48,42,0.12)' : 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: isReviewer ? 'var(--accent)' : 'var(--text3)', flexShrink: 0 }}>
        {member.name?.[0]?.toUpperCase() ?? '?'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{member.name}</div>
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>iRacing #{member.iracing_cust_id || '—'}</div>
      </div>
      {isReviewer && (
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: 'rgba(232,48,42,0.1)', color: 'var(--accent)', border: '1px solid rgba(232,48,42,0.2)', marginRight: 4 }}>
          Reviewer
        </span>
      )}
      <button
        onClick={onToggle}
        disabled={disabled}
        style={{
          padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
          border: isReviewer ? '1px solid rgba(232,48,42,0.3)' : '1px solid var(--border2)',
          background: isReviewer ? 'rgba(232,48,42,0.08)' : 'var(--bg3)',
          color: isReviewer ? 'var(--accent)' : 'var(--text2)',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {disabled ? '...' : isReviewer ? 'Revoke Access' : 'Grant Access'}
      </button>
    </div>
  );
}
