import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import Card, { CardHeader } from '../../components/Card';
import PosBadge from '../../components/PosBadge';
import Badge from '../../components/Badge';
import { races, standings, activity, drivers } from '../../lib/api';
import { formatDateTime, formatCountdown, relativeTime } from '../../lib/utils';

export default function Dashboard() {
  const [nextRace, setNextRace] = useState(null);
  const [stats, setStats] = useState({ drivers: 0, racesCompleted: 0, pointsLeader: null, avgIrating: 0 });
  const [topStandings, setTopStandings] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [countdown, setCountdown] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!nextRace?.scheduled_at) return;
    const interval = setInterval(() => {
      setCountdown(formatCountdown(nextRace.scheduled_at));
    }, 1000);
    setCountdown(formatCountdown(nextRace.scheduled_at));
    return () => clearInterval(interval);
  }, [nextRace]);

  async function loadData() {
    try {
      const [raceList, standingsList, actLog, driverList] = await Promise.all([
        races.list(),
        standings.get(),
        activity.list({ limit: 8 }),
        drivers.list(),
      ]);

      const upcoming = raceList.filter(r => r.status === 'upcoming').sort((a, b) => a.scheduled_at - b.scheduled_at);
      setNextRace(upcoming[0] || null);

      const completed = raceList.filter(r => r.status === 'completed');
      const active = driverList.filter(d => d.status === 'active');
      const avgIr = active.length
        ? Math.round(active.reduce((s, d) => s + (d.irating || 0), 0) / active.length)
        : 0;

      setStats({
        drivers: active.length,
        racesCompleted: completed.length,
        pointsLeader: standingsList[0] || null,
        avgIrating: avgIr,
      });

      setTopStandings(standingsList.slice(0, 5));
      setActivityLog(actLog);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="League overview and activity" />

      <div className="p-8 space-y-6">
        {/* Next Race Banner */}
        {nextRace && (
          <div
            className="relative rounded-md p-6 overflow-hidden"
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
            }}
          >
            {/* Red accent bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'var(--accent)' }} />
            <div className="flex items-center justify-between gap-6 flex-wrap">
              <div>
                <div className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--accent)' }}>
                  Next Race
                </div>
                <div className="font-display font-bold text-3xl uppercase" style={{ color: 'var(--text)', letterSpacing: '0.04em' }}>
                  {nextRace.track_name}
                </div>
                <div className="flex items-center gap-4 mt-1 flex-wrap">
                  {nextRace.track_config && (
                    <span className="text-sm" style={{ color: 'var(--text2)' }}>{nextRace.track_config}</span>
                  )}
                  <span className="text-sm" style={{ color: 'var(--text2)' }}>Round {nextRace.round_number}</span>
                  <span className="text-sm" style={{ color: 'var(--text2)' }}>{formatDateTime(nextRace.scheduled_at)}</span>
                  {nextRace.laps && (
                    <span className="text-sm" style={{ color: 'var(--text2)' }}>{nextRace.laps} laps</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--text3)' }}>
                  Time Until Race
                </div>
                <div className="font-display font-bold text-4xl" style={{ color: 'var(--accent)', letterSpacing: '0.02em' }}>
                  {countdown}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Active Drivers"
            value={stats.drivers}
            color="accent"
            icon="👤"
          />
          <StatCard
            label="Races Completed"
            value={stats.racesCompleted}
            color="green"
            icon="🏁"
          />
          <StatCard
            label="Points Leader"
            value={stats.pointsLeader ? `${stats.pointsLeader.driver_name}` : '—'}
            sub={stats.pointsLeader ? `${stats.pointsLeader.total_points} pts` : ''}
            color="gold"
            icon="🏆"
          />
          <StatCard
            label="Avg iRating"
            value={stats.avgIrating.toLocaleString()}
            color="blue"
            icon="📊"
          />
        </div>

        {/* Standings Preview + Activity */}
        <div className="grid grid-cols-5 gap-4">
          {/* Standings */}
          <Card className="col-span-3">
            <CardHeader title="Season Standings — Top 5">
              <a href="/admin/standings" className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                View All →
              </a>
            </CardHeader>
            <div>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Pos', 'Driver', 'Car', 'iRating', 'Points'].map(h => (
                      <th key={h} className="px-5 py-2 text-left text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--text3)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topStandings.map((driver, i) => (
                    <tr key={driver.id} className="table-row" style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-5 py-3">
                        <PosBadge pos={i + 1} />
                      </td>
                      <td className="px-5 py-3 font-semibold text-sm" style={{ color: 'var(--text)' }}>
                        {driver.driver_name}
                      </td>
                      <td className="px-5 py-3 text-sm" style={{ color: 'var(--text2)' }}>
                        {driver.car_model}
                      </td>
                      <td className="px-5 py-3 text-sm" style={{ color: 'var(--text2)' }}>
                        {driver.irating?.toLocaleString() || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-display font-bold text-base" style={{ color: 'var(--text)' }}>
                          {driver.total_points}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {topStandings.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text3)' }}>No standings data yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Activity Feed */}
          <Card className="col-span-2">
            <CardHeader title="Recent Activity" />
            <div className="p-4 space-y-1">
              {activityLog.map(item => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-md"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    <ActivityDot type={item.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug" style={{ color: 'var(--text)' }}>
                      {item.message}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                      {relativeTime(item.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              {activityLog.length === 0 && (
                <p className="text-sm text-center py-6" style={{ color: 'var(--text3)' }}>No activity yet</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon }) {
  const colors = { accent: '#e8302a', gold: '#f0b323', green: '#22c55e', blue: '#3b82f6' };
  return (
    <div
      className="relative rounded-md p-5 overflow-hidden"
      style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: colors[color] }} />
      <div className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--text3)' }}>
        {label}
      </div>
      <div className="font-display font-bold text-3xl truncate" style={{ color: 'var(--text)', letterSpacing: '0.02em' }}>
        {value}
      </div>
      {sub && (
        <div className="text-sm mt-1" style={{ color: colors[color] }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function ActivityDot({ type }) {
  const colors = {
    result: '#3b82f6',
    driver: '#22c55e',
    discord: '#7289da',
    settings: '#f0b323',
  };
  return (
    <span
      className="block w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
      style={{ background: colors[type] || '#555a65' }}
    />
  );
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-sm" style={{ color: 'var(--text3)' }}>Loading dashboard...</div>
    </div>
  );
}
