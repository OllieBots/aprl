import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';

export default function DriverProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/public/drivers/${id}`)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageShell><LoadingPulse /></PageShell>;
  if (error || !data) return (
    <PageShell>
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text3)' }}>
        {error || 'Driver not found'}
      </div>
    </PageShell>
  );

  const { driver, stats, recentResults, leagues } = data;
  const srColor = { A: 'var(--green)', B: 'var(--blue)', C: 'var(--gold)', D: 'var(--accent)', R: 'var(--text3)' }[driver.safety_rating_class] || 'var(--text3)';

  return (
    <PageShell>
      {/* Header */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px 28px' }}>
          <Link to="/" style={{ fontSize: 12, color: 'var(--text3)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 20 }}>
            ← Back to home
          </Link>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
            {/* Avatar */}
            <div style={{
              width: 72, height: 72, borderRadius: 12, flexShrink: 0,
              background: 'var(--accent)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#fff',
            }}>
              {driver.car_number ? `#${driver.car_number}` : driver.name?.[0]?.toUpperCase() || '?'}
            </div>

            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
                {driver.name}
              </h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                {driver.car_model && (
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>{driver.car_model}</span>
                )}
                {driver.irating && (
                  <Chip label={`iR ${driver.irating.toLocaleString()}`} color="var(--blue)" />
                )}
                {driver.safety_rating_class && driver.safety_rating_value && (
                  <Chip label={`${driver.safety_rating_class} ${driver.safety_rating_value?.toFixed(2)}`} color={srColor} />
                )}
                {driver.iracing_cust_id && (
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                    cust #{driver.iracing_cust_id}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px' }}>
        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Starts',    value: stats?.starts ?? 0 },
            { label: 'Wins',      value: stats?.wins ?? 0 },
            { label: 'Podiums',   value: stats?.podiums ?? 0 },
            { label: 'Points',    value: stats?.total_points ?? 0 },
            { label: 'Avg Finish', value: stats?.avg_finish ?? '—' },
            { label: 'Avg Inc',   value: stats?.avg_incidents != null ? stats.avg_incidents.toFixed(2) : '—' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--bg2)', borderRadius: 8, padding: '14px 12px', textAlign: 'center',
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                {s.value}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: leagues.length > 0 ? '1fr 300px' : '1fr', gap: 20 }}>
          {/* Recent results */}
          <section>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
              Recent Results
            </h2>
            {recentResults.length === 0 ? (
              <EmptyState text="No race results yet" />
            ) : (
              <div style={{ background: 'var(--bg2)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Round', 'Track', 'Finish', 'Points', 'Inc'].map(h => (
                        <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentResults.map((r, i) => (
                      <tr key={i} style={{ borderBottom: i < recentResults.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '10px 14px', color: 'var(--text3)' }}>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>R{r.round_number}</div>
                          <div style={{ fontSize: 10, color: 'var(--text3)', opacity: 0.6 }}>{r.league_name}</div>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text2)' }}>{r.track_name}</td>
                        <td style={{ padding: '10px 14px' }}>
                          {r.dnf ? (
                            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>DNF</span>
                          ) : (
                            <FinishBadge pos={r.finish_position} />
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text)' }}>
                          {r.points_awarded ?? 0}
                        </td>
                        <td style={{ padding: '10px 14px', color: r.incidents >= 4 ? 'var(--accent)' : 'var(--text2)' }}>
                          {r.incidents ?? 0}x
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Active leagues */}
          {leagues.length > 0 && (
            <section>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
                Active Leagues
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {leagues.map(l => (
                  <Link
                    key={l.slug}
                    to={`/league/${l.slug}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div style={{
                      background: 'var(--bg2)', borderRadius: 8, padding: '14px',
                      border: '1px solid var(--border)', transition: 'border-color 0.15s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                        {l.league_name}
                      </div>
                      {l.season_name && (
                        <div style={{ fontSize: 12, color: 'var(--text3)' }}>{l.season_name}</div>
                      )}
                      {l.series && (
                        <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>{l.series}</div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function PageShell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <nav style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', height: 52, display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 30, height: 30, borderRadius: 6, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 14 }}>A</div>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>APRL</span>
        </Link>
      </nav>
      {children}
    </div>
  );
}

function FinishBadge({ pos }) {
  const colors = { 1: ['var(--gold)', '#000'], 2: ['#9ca3af', '#000'], 3: ['#b45309', '#fff'] };
  const [bg, fg] = colors[pos] || ['var(--bg4)', 'var(--text2)'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, fontWeight: 800, fontSize: 13, background: bg, color: fg }}>
      {pos}
    </span>
  );
}

function Chip({ label, color }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 600, color, background: `${color}18`, border: `1px solid ${color}35`, borderRadius: 6, padding: '2px 8px' }}>
      {label}
    </span>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ background: 'var(--bg2)', borderRadius: 10, border: '1px solid var(--border)', padding: '28px', textAlign: 'center', fontSize: 13, color: 'var(--text3)' }}>
      {text}
    </div>
  );
}

function LoadingPulse() {
  return (
    <div style={{ maxWidth: 860, margin: '40px auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[200, 100, 300].map(w => (
        <div key={w} style={{ height: 20, width: w, borderRadius: 6, background: 'var(--bg2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  );
}
