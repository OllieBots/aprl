import { useState, useEffect } from 'react';
import { standings as standingsApi, league as leagueApi } from '../lib/api';

export default function EmbedStandings() {
  const [standingsList, setStandings] = useState([]);
  const [leagueName, setLeagueName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([standingsApi.get(), leagueApi.get()])
      .then(([s, l]) => { setStandings(s); setLeagueName(l?.name || 'APRL'); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#12141a', color: '#f0f2f5', minHeight: '100vh', padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10 }}>
        <div style={{ width: 4, height: 20, background: '#e8302a', borderRadius: 2 }} />
        <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#f0f2f5' }}>
          {leagueName} — Standings
        </span>
      </div>

      {loading ? (
        <div style={{ color: '#8b909a', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>Loading…</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['Pos', 'Driver', 'Car', 'Wins', 'Points', 'Gap'].map(h => (
                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#8b909a', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {standingsList.map(driver => (
              <tr key={driver.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '7px 10px' }}>
                  <span style={{
                    display: 'inline-block', width: 22, height: 22, lineHeight: '22px',
                    textAlign: 'center', borderRadius: 4, fontSize: 11, fontWeight: 700,
                    background: driver.position === 1 ? '#c9a227' : driver.position === 2 ? '#7a8a9a' : driver.position === 3 ? '#a0522d' : 'rgba(255,255,255,0.08)',
                    color: driver.position <= 3 ? '#fff' : '#8b909a',
                  }}>
                    {driver.position}
                  </span>
                </td>
                <td style={{ padding: '7px 10px', fontWeight: 600, color: '#f0f2f5' }}>{driver.driver_name}</td>
                <td style={{ padding: '7px 10px', color: '#8b909a' }}>{driver.car_model || '—'}</td>
                <td style={{ padding: '7px 10px', color: driver.wins > 0 ? '#c9a227' : '#8b909a', fontWeight: driver.wins > 0 ? 700 : 400 }}>{driver.wins ?? 0}</td>
                <td style={{ padding: '7px 10px', fontWeight: 700, fontSize: 15, color: '#f0f2f5' }}>{driver.total_points}</td>
                <td style={{ padding: '7px 10px', color: '#8b909a' }}>{driver.gap > 0 ? `−${driver.gap}` : '—'}</td>
              </tr>
            ))}
            {!loading && standingsList.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '20px 10px', textAlign: 'center', color: '#8b909a' }}>No standings data yet</td></tr>
            )}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 10, textAlign: 'right', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
        Powered by APRL
      </div>
    </div>
  );
}
