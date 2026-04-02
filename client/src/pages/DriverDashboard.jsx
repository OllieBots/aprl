import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { userApi } from '../lib/api';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Button from '../components/Button';
import NotificationBell from '../components/NotificationBell';

export default function DriverDashboard() {
  const { user, ownedLeague, setOwnedLeague, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [acceptingInvite, setAcceptingInvite] = useState(null); // { id, league_name }

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    try {
      const d = await api.get('/user/dashboard');
      setData(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeclineInvite(inviteId) {
    await userApi.declineInvite(inviteId);
    loadDashboard();
  }

  const activeLeagues = data?.memberships?.filter(m => m.status === 'active') || [];
  const pendingLeagues = data?.memberships?.filter(m => m.status === 'pending') || [];
  const isIRTReviewer = activeLeagues.some(m => m.irt_reviewer);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top nav */}
      <header style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, borderRadius: 7, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 16 }}>A</div>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>APRL</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {isIRTReviewer && !ownedLeague && (
            <Link
              to="/irt-review"
              style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none', padding: '7px 14px', borderRadius: 6, background: 'rgba(232,48,42,0.1)', border: '1px solid rgba(232,48,42,0.3)' }}
            >
              IRT Review
            </Link>
          )}
          {ownedLeague && (
            <Link
              to="/admin"
              style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none', padding: '7px 14px', borderRadius: 6, background: 'rgba(232,48,42,0.1)', border: '1px solid rgba(232,48,42,0.3)' }}
            >
              Admin Panel
            </Link>
          )}
          <NotificationBell />
          <div style={{ fontSize: 13, color: 'var(--text2)', padding: '0 4px' }}>{user?.name}</div>
          <button
            onClick={logout}
            style={{ fontSize: 13, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Sign out
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {/* Welcome + stats */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px' }}>
            Welcome back, {user?.name?.split(' ')[0]}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text3)', margin: 0 }}>
            iRacing ID #{user?.iracing_cust_id}
            {user?.iracing_verified
              ? <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>✓ Verified</span>
              : <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--gold)', fontWeight: 600 }}>Pending verification</span>
            }
          </p>
        </div>

        {/* Career stats */}
        {data?.stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 32 }}>
            {[
              { label: 'Starts', value: data.stats.starts ?? 0 },
              { label: 'Wins', value: data.stats.wins ?? 0, highlight: data.stats.wins > 0 },
              { label: 'Podiums', value: data.stats.podiums ?? 0 },
              { label: 'Total Points', value: data.stats.total_points ?? 0 },
              { label: 'Avg Incidents', value: data.stats.avg_incidents != null ? data.stats.avg_incidents.toFixed(1) : '—' },
            ].map(stat => (
              <div key={stat.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{stat.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: stat.highlight ? 'var(--gold)' : 'var(--text)' }}>{stat.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Pending invites */}
        {data?.invites?.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Pending Invites</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.invites.map(invite => (
                <div key={invite.id} style={{ background: 'var(--bg2)', border: '1px solid rgba(240,179,35,0.3)', borderRadius: 8, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{invite.league_name}</span>
                    <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--gold)', fontWeight: 600, padding: '2px 8px', background: 'rgba(240,179,35,0.1)', borderRadius: 4 }}>Invited</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setAcceptingInvite(invite)}
                      style={{ padding: '6px 14px', borderRadius: 6, background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}
                    >Accept</button>
                    <button
                      onClick={() => handleDeclineInvite(invite.id)}
                      style={{ padding: '6px 14px', borderRadius: 6, background: 'var(--bg3)', color: 'var(--text2)', fontWeight: 600, fontSize: 13, border: '1px solid var(--border2)', cursor: 'pointer' }}
                    >Decline</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* My Leagues */}
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>My Leagues</h2>
          </div>

          {loading ? (
            <div style={{ color: 'var(--text3)', fontSize: 14, padding: '20px 0' }}>Loading...</div>
          ) : activeLeagues.length === 0 ? (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '28px 24px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text3)', fontSize: 14, margin: '0 0 16px' }}>You haven't joined any leagues yet.</p>
              <Link to="/" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Browse open leagues →</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {activeLeagues.map(m => (
                <Link
                  key={m.league_id}
                  to={`/league/${m.slug}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '18px 20px', transition: 'border-color 0.15s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 7, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 16, flexShrink: 0 }}>
                        {m.league_name[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{m.league_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text3)' }}>{m.season_name || 'No active season'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {m.role === 'owner' && (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: 'rgba(232,48,42,0.12)', color: 'var(--accent)', border: '1px solid rgba(232,48,42,0.2)' }}>Owner</span>
                      )}
                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>{m.series || 'Racing League'}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {pendingLeagues.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {pendingLeagues.map(m => (
                <div key={m.league_id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, color: 'var(--text2)' }}>{m.league_name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>Awaiting approval</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming races */}
        {data?.upcomingRaces?.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Upcoming Races</h2>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {data.upcomingRaces.map((race, i) => (
                <div key={race.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 18px', borderBottom: i < data.upcomingRaces.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 15, minWidth: 32 }}>R{race.round_number}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{race.track_name}</span>
                    {race.track_config && <span style={{ fontSize: 13, color: 'var(--text3)', marginLeft: 6 }}>— {race.track_config}</span>}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{new Date(race.scheduled_at * 1000).toLocaleDateString()}</span>
                  <Link to={`/league/${race.league_slug}`} style={{ fontSize: 12, color: 'var(--text3)', textDecoration: 'none' }}>{race.league_name}</Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Create a league CTA */}
        {!ownedLeague && (
          <section>
            <div style={{ background: 'var(--bg2)', border: '1px dashed var(--border2)', borderRadius: 8, padding: '28px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Run your own league?</div>
              <p style={{ fontSize: 14, color: 'var(--text3)', margin: '0 0 18px' }}>
                Create a league and get access to the full admin panel — schedule races, import results, manage drivers, and more.
              </p>
              <button
                onClick={() => setCreateModal(true)}
                style={{ padding: '10px 22px', borderRadius: 7, background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}
              >
                Create a League
              </button>
            </div>
          </section>
        )}
      </div>

      {createModal && (
        <CreateLeagueModal
          onClose={() => setCreateModal(false)}
          onCreated={(league) => {
            setOwnedLeague(league);
            setCreateModal(false);
            navigate('/admin');
          }}
        />
      )}

      {acceptingInvite && (
        <AcceptInviteModal
          invite={acceptingInvite}
          onClose={() => setAcceptingInvite(null)}
          onAccepted={() => {
            setAcceptingInvite(null);
            loadDashboard();
          }}
        />
      )}
    </div>
  );
}

const GT3_CARS = [
  'BMW M4 GT3',
  'Porsche 911 GT3 R',
  'Ferrari 296 GT3',
  'Mercedes-AMG GT3',
  'Audi R8 LMS GT3 Evo II',
  'Lamborghini Huracan GT3 EVO',
  'McLaren 720S GT3 EVO',
  'Ford Mustang GT3',
  'Chevrolet Corvette Z06 GT3.R',
  'Lexus RC F GT3',
];

function CarNumberPicker({ taken, value, onChange }) {
  const numbers = Array.from({ length: 99 }, (_, i) => String(i + 1));
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text2)', display: 'block', marginBottom: 8 }}>
        Car Number
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: 4 }}>
        {numbers.map(n => {
          const isTaken = taken.includes(n);
          const isSelected = value === n;
          return (
            <button
              key={n}
              type="button"
              disabled={isTaken}
              onClick={() => onChange(isSelected ? '' : n)}
              style={{
                padding: '5px 2px',
                borderRadius: 5,
                fontSize: 11,
                fontWeight: 700,
                textAlign: 'center',
                cursor: isTaken ? 'not-allowed' : 'pointer',
                border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border2)',
                background: isSelected ? 'var(--accent)' : isTaken ? 'var(--bg2)' : 'var(--bg3)',
                color: isSelected ? '#fff' : isTaken ? 'var(--border2)' : 'var(--text2)',
                opacity: isTaken ? 0.4 : 1,
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
      {value && (
        <p style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginTop: 6 }}>
          Selected: #{value}
        </p>
      )}
    </div>
  );
}

function AcceptInviteModal({ invite, onClose, onAccepted }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    display_name: user?.name || '',
    car_number: '',
    car_model: '',
    team_name: '',
  });
  const [takenNumbers, setTakenNumbers] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    userApi.getInviteCarNumbers(invite.id)
      .then(setTakenNumbers)
      .catch(() => {});
  }, [invite.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.car_number) { setError('Please choose a car number'); return; }
    if (!form.car_model) { setError('Please enter a car model'); return; }
    setError('');
    setSaving(true);
    try {
      await userApi.acceptInvite(invite.id, form);
      onAccepted();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Join ${invite.league_name}`} onClose={onClose} width={560}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0 }}>
          Set up your driver profile for this league. Your car number is unique within the league.
        </p>

        <Input
          label="Display Name"
          placeholder="How you'll appear in standings"
          value={form.display_name}
          onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
        />

        <CarNumberPicker
          taken={takenNumbers}
          value={form.car_number}
          onChange={n => setForm(f => ({ ...f, car_number: n }))}
        />

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
            Car Model
          </label>
          <input
            list="car-models"
            placeholder="e.g. BMW M4 GT3"
            value={form.car_model}
            onChange={e => setForm(f => ({ ...f, car_model: e.target.value }))}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, fontSize: 14, background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', outline: 'none' }}
          />
          <datalist id="car-models">
            {GT3_CARS.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>

        <Input
          label="Team Name (optional)"
          placeholder="e.g. Apex Motorsport"
          value={form.team_name}
          onChange={e => setForm(f => ({ ...f, team_name: e.target.value }))}
        />

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(232,48,42,0.1)', color: 'var(--accent)', border: '1px solid rgba(232,48,42,0.25)', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Joining...' : 'Join League'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function CreateLeagueModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', series: '', car_class: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const data = await api.post('/user/leagues', form);
      onCreated(data.league);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Create a League" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="League Name" placeholder="Apex Pro Racing League" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        <Input label="Description (optional)" placeholder="A brief description of your league" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        <Input label="Series (optional)" placeholder="GT3 Championship" value={form.series} onChange={e => setForm(f => ({ ...f, series: e.target.value }))} />
        <Input label="Car Class (optional)" placeholder="GT3" value={form.car_class} onChange={e => setForm(f => ({ ...f, car_class: e.target.value }))} />
        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(232,48,42,0.1)', color: 'var(--accent)', border: '1px solid rgba(232,48,42,0.25)', fontSize: 13 }}>
            {error}
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create League'}</Button>
        </div>
      </form>
    </Modal>
  );
}
