import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import PageHeader from '../../components/PageHeader';
import Card, { CardHeader } from '../../components/Card';
import PosBadge from '../../components/PosBadge';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import { standings, drivers } from '../../lib/api';

const CHART_COLORS = ['#e8302a', '#3b82f6', '#22c55e', '#f0b323', '#a855f7', '#06b6d4', '#f97316', '#ec4899'];

export default function Standings() {
  const [standingsList, setStandings] = useState([]);
  const [progression, setProgression] = useState(null);
  const [adjustModal, setAdjustModal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [s, p] = await Promise.all([standings.get(), standings.progression()]);
      setStandings(s);
      setProgression(p);
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    const headers = ['Pos', 'Driver', 'Car', 'Starts', 'Wins', 'Podiums', 'Poles', 'Avg Incidents', 'Points', 'Gap'];
    const rows = standingsList.map(s => [
      s.position, s.driver_name, s.car_model, s.starts, s.wins,
      s.podiums, s.poles, s.avg_incidents?.toFixed(2), s.total_points, s.gap > 0 ? `-${s.gap}` : '—'
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'standings.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Build chart data — one point per round
  const chartData = progression?.races?.map((race, i) => {
    const point = { round: `R${race.round_number}`, track: race.track_name };
    progression.progression?.forEach(driver => {
      point[driver.driver_name] = driver.points[i]?.points ?? 0;
    });
    return point;
  }) || [];

  const top8 = standingsList.slice(0, 8);

  return (
    <div>
      <PageHeader title="Season Standings" subtitle="Points table and progression">
        <Button variant="secondary" onClick={exportCSV}>
          <DownloadIcon /> Export CSV
        </Button>
      </PageHeader>

      <div className="px-8 py-6 space-y-6">
        {/* Standings Table */}
        <Card>
          <CardHeader title="Driver Standings">
            <span className="text-xs" style={{ color: 'var(--text3)' }}>
              {standingsList.length} drivers
            </span>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Pos', 'Driver', 'Car', 'Wins', 'Poles', 'Fast Laps', 'Avg Inc', 'Points', 'Gap', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs uppercase tracking-widest font-semibold whitespace-nowrap" style={{ color: 'var(--text3)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {standingsList.map(driver => (
                  <tr key={driver.id} className="table-row" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-5 py-3"><PosBadge pos={driver.position} /></td>
                    <td className="px-5 py-3 font-semibold text-sm" style={{ color: 'var(--text)' }}>{driver.driver_name}</td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--text2)' }}>{driver.car_model}</td>
                    <td className="px-5 py-3 text-sm font-semibold" style={{ color: driver.wins > 0 ? 'var(--gold)' : 'var(--text2)' }}>
                      {driver.wins || 0}
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--text2)' }}>{driver.poles || 0}</td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--text2)' }}>—</td>
                    <td className="px-5 py-3 text-sm" style={{ color: driver.avg_incidents > 4 ? 'var(--accent)' : 'var(--text2)' }}>
                      {driver.avg_incidents?.toFixed(1) || '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-display font-bold text-xl" style={{ color: 'var(--text)' }}>
                        {driver.total_points}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--text3)' }}>
                      {driver.gap > 0 ? `−${driver.gap}` : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => setAdjustModal(driver)}
                        className="px-2.5 py-1 rounded text-xs font-semibold"
                        style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border2)' }}
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && standingsList.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-5 py-12 text-center text-sm" style={{ color: 'var(--text3)' }}>
                      No standings data yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Points Progression Chart */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader title="Points Progression" />
            <div className="p-5">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="round" tick={{ fill: '#8b909a', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8b909a', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1a1d25', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px' }}
                    labelStyle={{ color: '#f0f2f5', fontWeight: 600 }}
                    itemStyle={{ color: '#8b909a' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#8b909a' }} />
                  {top8.map((driver, i) => (
                    <Line
                      key={driver.id}
                      type="monotone"
                      dataKey={driver.driver_name}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {adjustModal && (
        <AdjustModal
          driver={adjustModal}
          onClose={() => setAdjustModal(null)}
          onSave={async () => {
            await loadData();
            setAdjustModal(null);
          }}
        />
      )}
    </div>
  );
}

function AdjustModal({ driver, onClose, onSave }) {
  const [adjustment, setAdjustment] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      // This would apply points adjustment to the most recent race result
      // For now just simulate
      await onSave();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Points Adjustment — ${driver.driver_name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="px-4 py-3 rounded-md" style={{ background: 'var(--bg3)' }}>
          <span className="text-sm" style={{ color: 'var(--text2)' }}>Current points: </span>
          <span className="font-display font-bold text-lg" style={{ color: 'var(--text)' }}>{driver.total_points}</span>
        </div>
        <Input
          label="Points Adjustment (use negative to deduct)"
          type="number"
          placeholder="e.g. -10 or +5"
          value={adjustment}
          onChange={e => setAdjustment(e.target.value)}
          required
        />
        <Input
          label="Reason"
          placeholder="e.g. Unsafe driving penalty"
          value={reason}
          onChange={e => setReason(e.target.value)}
          required
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Apply Adjustment'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}
