import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import PosBadge from '../components/PosBadge';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';

const TABS = ['Standings', 'Schedule', 'Results', 'Incidents'];

export default function LeaguePage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('Standings');
  const [league, setLeague] = useState(null);
  const [standings, setStandings] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [results, setResults] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [incidentModal, setIncidentModal] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState('');

  useEffect(() => {
    loadLeague();
  }, [slug]);

  useEffect(() => {
    if (tab === 'Standings' && standings.length === 0) loadStandings();
    if (tab === 'Schedule' && schedule.length === 0) loadSchedule();
    if (tab === 'Results' && results.length === 0) loadResults();
    if (tab === 'Incidents') loadIncidents();
  }, [tab]);

  async function loadLeague() {
    try {
      const [l, s] = await Promise.all([
        api.get(`/public/leagues/${slug}`),
        api.get(`/public/leagues/${slug}/standings`),
      ]);
      setLeague(l);
      setStandings(s);
      if (user) {
        try {
          const dashboard = await api.get('/user/dashboard');
          const m = dashboard.memberships?.find(m => m.slug === slug);
          setMembership(m || null);
        } catch {}
      }
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  async function loadStandings() {
    const s = await api.get(`/public/leagues/${slug}/standings`);
    setStandings(s);
  }
  async function loadSchedule() {
    const s = await api.get(`/public/leagues/${slug}/schedule`);
    setSchedule(s);
  }
  async function loadResults() {
    const r = await api.get(`/public/leagues/${slug}/results`);
    setResults(r);
  }
  async function loadIncidents() {
    if (!user) return;
    try {
      const i = await api.get(`/public/leagues/${slug}/incidents`);
      setIncidents(i);
    } catch {}
  }

  async function handleJoin() {
    if (!user) return navigate('/login');
    setJoining(true);
    try {
      await api.post(`/user/leagues/${slug}/join`);
      setJoinMsg('Request sent! Waiting for admin approval.');
      setMembership({ status: 'pending' });
    } catch (err) {
      setJoinMsg(err.message);
    } finally {
      setJoining(false);
    }
  }

  const isMember = membership?.status === 'active';
  const isPending = membership?.status === 'pending';

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text3)', fontSize: 14 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Nav */}
      <header style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, borderRadius: 7, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 16 }}>A</div>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>APRL</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <Link to="/dashboard" style={{ fontSize: 13, color: 'var(--text2)', textDecoration: 'none', fontWeight: 600 }}>My Dashboard</Link>
          ) : (
            <>
              <Link to="/login" style={{ fontSize: 13, color: 'var(--text2)', textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
              <Link to="/signup" style={{ fontSize: 13, color: '#fff', textDecoration: 'none', fontWeight: 700, padding: '7px 14px', borderRadius: 6, background: 'var(--accent)' }}>Sign Up</Link>
            </>
          )}
        </div>
      </header>

      {/* League header */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '28px 32px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 24 }}>
                {league?.name?.[0]}
              </div>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px' }}>{league?.name}</h1>
                <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0 }}>{league?.season?.series || 'Racing League'} · {league?.season?.name || 'Active Season'}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', gap: 20 }}>
                {[
                  { label: 'Drivers', value: league?.member_count ?? '—' },
                  { label: 'Races Complete', value: league?.completed_races ?? 0 },
                ].map(stat => (
                  <div key={stat.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{stat.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
              {!isMember && !isPending && (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  style={{ padding: '9px 18px', borderRadius: 7, background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', opacity: joining ? 0.7 : 1 }}
                >
                  {joining ? 'Requesting...' : 'Request to Join'}
                </button>
              )}
              {isPending && <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 600 }}>Request pending</span>}
              {isMember && <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 700 }}>✓ Member</span>}
            </div>
          </div>
          {joinMsg && <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text2)' }}>{joinMsg}</p>}
          {league?.description && <p style={{ marginTop: 12, fontSize: 14, color: 'var(--text2)', maxWidth: 600 }}>{league.description}</p>}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', padding: '0 32px', gap: 2 }}>
          {TABS.filter(t => t !== 'Incidents' || isMember || user?.ownedLeague?.slug === slug).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '13px 18px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                color: tab === t ? 'var(--text)' : 'var(--text3)',
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {t}
            </button>
          ))}
          {isMember && tab === 'Incidents' && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
              <button
                onClick={() => setIncidentModal(true)}
                style={{ padding: '7px 14px', borderRadius: 6, background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}
              >
                + Submit Report
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 32px' }}>
        {tab === 'Standings' && <StandingsTab standings={standings} />}
        {tab === 'Schedule' && <ScheduleTab schedule={schedule} />}
        {tab === 'Results' && <ResultsTab results={results} />}
        {tab === 'Incidents' && <IncidentsTab incidents={incidents} user={user} />}
      </div>

      {incidentModal && (
        <IncidentModal
          slug={slug}
          schedule={schedule}
          onClose={() => setIncidentModal(false)}
          onSubmit={() => { setIncidentModal(false); loadIncidents(); }}
        />
      )}
    </div>
  );
}

function StandingsTab({ standings }) {
  if (!standings.length) return <Empty>No standings yet.</Empty>;
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Pos', 'Driver', 'Car', 'Wins', 'Podiums', 'Avg Inc', 'Points', 'Gap'].map(h => (
              <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {standings.map(s => (
            <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '10px 16px' }}><PosBadge pos={s.position} /></td>
              <td style={{ padding: '10px 16px', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{s.driver_name}</td>
              <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text2)' }}>{s.car_model || '—'}</td>
              <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: s.wins > 0 ? 'var(--gold)' : 'var(--text2)' }}>{s.wins ?? 0}</td>
              <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text2)' }}>{s.podiums ?? 0}</td>
              <td style={{ padding: '10px 16px', fontSize: 13, color: (s.avg_incidents ?? 0) > 4 ? 'var(--accent)' : 'var(--text2)' }}>{s.avg_incidents != null ? s.avg_incidents.toFixed(1) : '—'}</td>
              <td style={{ padding: '10px 16px', fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>{s.total_points}</td>
              <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text3)' }}>{s.gap > 0 ? `−${s.gap}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScheduleTab({ schedule }) {
  if (!schedule.length) return <Empty>No races scheduled yet.</Empty>;
  const now = Math.floor(Date.now() / 1000);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {schedule.map(race => {
        const isPast = race.scheduled_at < now;
        return (
          <div key={race.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 20px', opacity: isPast ? 0.6 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 16, minWidth: 36 }}>R{race.round_number}</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{race.track_name}</span>
                {race.track_config && <span style={{ fontSize: 13, color: 'var(--text3)', marginLeft: 6 }}>— {race.track_config}</span>}
                {race.session_name && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{race.session_name}</div>}
              </div>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>{race.laps ? `${race.laps} laps` : '—'}</span>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>{new Date(race.scheduled_at * 1000).toUTCString()}</span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                background: race.status === 'completed' ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)',
                color: race.status === 'completed' ? 'var(--green)' : '#60a5fa',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {race.status}
              </span>
            </div>
            {(race.weather_temp != null || race.weather_sky != null || race.time_of_day != null) && (
              <div style={{ display: 'flex', gap: 18, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                {race.weather_sky != null && (
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                    {['☀️','🌤️','⛅','🌥️','☁️'][race.weather_sky]} {['Clear','Mostly Clear','Partly Cloudy','Mostly Cloudy','Overcast'][race.weather_sky]}
                  </span>
                )}
                {race.weather_temp != null && (
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                    🌡️ {Math.round(race.weather_temp)}{race.weather_temp_units === 1 ? '°C' : '°F'}
                    {race.weather_humidity != null && ` · ${race.weather_humidity}% humidity`}
                  </span>
                )}
                {race.weather_wind_speed != null && race.weather_wind_speed > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                    💨 {Math.round(race.weather_wind_speed)}{race.weather_wind_units === 1 ? ' kph' : ' mph'}
                  </span>
                )}
                {race.time_of_day != null && (
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                    {['🌅','☀️','🌄','🌇','🌙','🌄'][race.time_of_day]} {['Morning','Noon','Afternoon','Dusk','Midnight','Dawn'][race.time_of_day]} (sim time)
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ResultsTab({ results }) {
  const [expanded, setExpanded] = useState({});
  if (!results.length) return <Empty>No results yet.</Empty>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {results.map(race => {
        const isOpen = expanded[race.id];
        const winner = race.results?.[0];
        return (
          <div key={race.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <button
              onClick={() => setExpanded(e => ({ ...e, [race.id]: !e[race.id] }))}
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left' }}
            >
              <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 16, minWidth: 36 }}>R{race.round_number}</span>
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', flex: 1 }}>{race.track_name}</span>
              {winner && <span style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 600 }}>Winner: {winner.driver_name}</span>}
              <span style={{ fontSize: 13, color: 'var(--text3)' }}>{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
              <div style={{ borderTop: '1px solid var(--border)', overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Pos', 'Driver', 'Car', 'Incidents', 'Points'].map(h => (
                        <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {race.results.map(r => (
                      <tr key={r.driver_name} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 16px' }}><PosBadge pos={r.finish_position} /></td>
                        <td style={{ padding: '8px 16px', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{r.driver_name}</td>
                        <td style={{ padding: '8px 16px', fontSize: 13, color: 'var(--text2)' }}>{r.car_model || '—'}</td>
                        <td style={{ padding: '8px 16px', fontSize: 13, color: (r.incidents ?? 0) > 4 ? 'var(--accent)' : 'var(--text2)' }}>{r.incidents ?? 0}</td>
                        <td style={{ padding: '8px 16px', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{(r.points_awarded || 0) + (r.points_adjustment || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function IncidentsTab({ incidents, user }) {
  if (!user) return <Empty>Sign in to view incident reports.</Empty>;
  if (!incidents.length) return <Empty>No incident reports yet.</Empty>;

  const statusColor = { open: '#60a5fa', under_review: 'var(--gold)', closed: 'var(--green)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {incidents.map(inc => (
        <div key={inc.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                {inc.session_type ? `${inc.session_type.charAt(0).toUpperCase() + inc.session_type.slice(1)} — ` : ''}
                {inc.round_number ? `Round ${inc.round_number}` : 'General Incident'}
                {inc.lap_number ? ` · Lap ${inc.lap_number}` : ''}
              </span>
              <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--text3)' }}>Reported by {inc.reporter_name}</span>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
              background: `${statusColor[inc.status] || 'var(--text3)'}20`,
              color: statusColor[inc.status] || 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
            }}>
              {inc.status?.replace('_', ' ')}
            </span>
          </div>
          {inc.involved_drivers && (() => {
            try {
              const drivers = JSON.parse(inc.involved_drivers);
              if (drivers.length) return <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 6px' }}><strong>Drivers involved:</strong> {drivers.join(', ')}</p>;
            } catch {}
          })()}
          <p style={{ fontSize: 14, color: 'var(--text)', margin: '0 0 6px', lineHeight: 1.5 }}>{inc.explanation}</p>
          {inc.clip_url && (
            <a href={inc.clip_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>View clip →</a>
          )}
          {inc.admin_notes && (
            <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 6, background: 'var(--bg3)', fontSize: 13, color: 'var(--text2)', borderLeft: '3px solid var(--accent)' }}>
              <strong style={{ color: 'var(--text)' }}>Admin:</strong> {inc.admin_notes}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function IncidentModal({ slug, schedule, onClose, onSubmit }) {
  const [form, setForm] = useState({ race_id: '', involved_drivers: '', session_type: 'feature', lap_number: '', explanation: '', clip_url: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post(`/public/leagues/${slug}/incidents`, {
        ...form,
        race_id: form.race_id || null,
        lap_number: form.lap_number ? parseInt(form.lap_number) : null,
        involved_drivers: form.involved_drivers.split(',').map(s => s.trim()).filter(Boolean),
      });
      onSubmit();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const completedRaces = schedule.filter(r => r.status === 'completed');

  return (
    <Modal title="Submit Incident Report" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {completedRaces.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Race</label>
            <select
              value={form.race_id}
              onChange={e => setForm(f => ({ ...f, race_id: e.target.value }))}
              style={{ padding: '9px 12px', borderRadius: 6, background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', fontSize: 14 }}
            >
              <option value="">— Select race (optional)</option>
              {completedRaces.map(r => (
                <option key={r.id} value={r.id}>Round {r.round_number} — {r.track_name}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Session Type</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['heat', 'feature'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setForm(f => ({ ...f, session_type: t }))}
                style={{
                  padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                  background: form.session_type === t ? 'var(--accent)' : 'var(--bg3)',
                  color: form.session_type === t ? '#fff' : 'var(--text2)',
                  borderColor: form.session_type === t ? 'var(--accent)' : 'var(--border2)',
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <Input label="Lap Number" type="number" min="1" placeholder="e.g. 12" value={form.lap_number} onChange={e => setForm(f => ({ ...f, lap_number: e.target.value }))} />
        <Input label="Drivers Involved (comma separated)" placeholder="e.g. Alex Mercer, Jordan Walsh" value={form.involved_drivers} onChange={e => setForm(f => ({ ...f, involved_drivers: e.target.value }))} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Explanation <span style={{ color: 'var(--accent)' }}>*</span></label>
          <textarea
            value={form.explanation}
            onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
            required
            rows={4}
            placeholder="Describe what happened..."
            style={{ padding: '10px 12px', borderRadius: 6, background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        <Input label="Clip URL (optional)" type="url" placeholder="https://streamable.com/..." value={form.clip_url} onChange={e => setForm(f => ({ ...f, clip_url: e.target.value }))} />

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(232,48,42,0.1)', color: 'var(--accent)', border: '1px solid rgba(232,48,42,0.25)', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Submitting...' : 'Submit Report'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function Empty({ children }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text3)', fontSize: 14 }}>{children}</div>
  );
}
