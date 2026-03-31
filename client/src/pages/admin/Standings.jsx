import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import PageHeader from '../../components/PageHeader';
import Card, { CardHeader } from '../../components/Card';
import PosBadge from '../../components/PosBadge';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import { standings, discord } from '../../lib/api';

const CHART_COLORS = ['#e8302a', '#3b82f6', '#22c55e', '#f0b323', '#a855f7', '#06b6d4', '#f97316', '#ec4899'];
const PLAYOFF_OPTIONS = [3, 4, 5, 6, 8, 10, 12, 16];

export default function Standings() {
  const [standingsList, setStandings] = useState([]);
  const [progression, setProgression] = useState(null);
  const [adjustModal, setAdjustModal] = useState(null);
  const [embedModal, setEmbedModal] = useState(false);
  const [discordModal, setDiscordModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Playoff mode state
  const [playoffMode, setPlayoffMode] = useState(false);
  const [playoffCutoff, setPlayoffCutoff] = useState(10);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [s, p] = await Promise.all([standings.get(), standings.progression()]);
      setStandings(s);
      setProgression(p);
    } catch (err) {
      console.error('Standings load error:', err);
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    const headers = ['Pos', 'Driver', 'Car', 'Starts', 'Wins', 'Podiums', 'Poles', 'Avg Inc', 'Points', 'Gap'];
    const rows = standingsList.map(s => [
      s.position, s.driver_name, s.car_model, s.starts, s.wins,
      s.podiums, s.poles, s.avg_incidents?.toFixed(2) ?? '—', s.total_points,
      s.gap > 0 ? `-${s.gap}` : '—',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'standings.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const chartData = progression?.races?.map((race, i) => {
    const point = { round: `R${race.round_number}`, track: race.track_name };
    progression.progression?.forEach(driver => {
      point[driver.driver_name] = driver.points[i]?.points ?? 0;
    });
    return point;
  }) || [];

  const top8 = standingsList.slice(0, 8);
  const inPlayoffs = standingsList.slice(0, playoffCutoff);
  const outPlayoffs = standingsList.slice(playoffCutoff);

  return (
    <div>
      <PageHeader title="Season Standings" subtitle="Points table and progression">
        <div className="flex items-center gap-3">
          {/* Playoff mode toggle */}
          <div
            className="flex items-center gap-3 px-4 py-2 rounded-md"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border2)' }}
          >
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text2)' }}>
              Playoff Mode
            </span>
            <button
              onClick={() => setPlayoffMode(p => !p)}
              className="relative flex-shrink-0"
              style={{ width: 36, height: 20 }}
            >
              <div
                className="absolute inset-0 rounded-full transition-colors"
                style={{ background: playoffMode ? 'var(--accent)' : 'var(--bg4)' }}
              />
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: playoffMode ? '18px' : '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
              />
            </button>
          </div>

          {/* Cutoff selector — only visible in playoff mode */}
          {playoffMode && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--text2)' }}>Top</span>
              <div className="flex gap-1">
                {PLAYOFF_OPTIONS.map(n => (
                  <button
                    key={n}
                    onClick={() => setPlayoffCutoff(n)}
                    className="w-8 h-8 rounded text-xs font-bold transition-all"
                    style={{
                      background: playoffCutoff === n ? 'var(--accent)' : 'var(--bg3)',
                      color: playoffCutoff === n ? 'white' : 'var(--text2)',
                      border: `1px solid ${playoffCutoff === n ? 'var(--accent)' : 'var(--border2)'}`,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <span className="text-xs font-semibold" style={{ color: 'var(--text2)' }}>advance</span>
            </div>
          )}

          <Button variant="secondary" size="sm" onClick={() => setEmbedModal(true)}>
            <CodeIcon /> Embed
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setDiscordModal(true)}>
            <DiscordIcon /> Post to Discord
          </Button>
          <Button variant="secondary" size="sm" onClick={exportCSV}>
            <DownloadIcon /> Export CSV
          </Button>
        </div>
      </PageHeader>

      <div className="px-8 py-6 space-y-6">
        {/* Standings Table */}
        <Card>
          <CardHeader title={playoffMode ? `Playoff Standings — Top ${playoffCutoff} Advance` : 'Driver Standings'}>
            <span className="text-xs" style={{ color: 'var(--text3)' }}>
              {standingsList.length} drivers
            </span>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Pos', 'Driver', 'Car', 'Wins', 'Poles', 'Fast Laps', 'Avg Inc', 'Points', 'Gap', ''].map(h => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs uppercase tracking-widest font-semibold whitespace-nowrap"
                      style={{ color: 'var(--text3)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Drivers IN playoffs */}
                {(playoffMode ? inPlayoffs : standingsList).map(driver => (
                  <StandingsRow
                    key={driver.id}
                    driver={driver}
                    onAdjust={() => setAdjustModal(driver)}
                    inPlayoffs={playoffMode}
                  />
                ))}

                {/* Playoff cutoff divider */}
                {playoffMode && outPlayoffs.length > 0 && (
                  <tr>
                    <td colSpan={10} className="px-5 py-2">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px" style={{ background: 'var(--accent)', opacity: 0.4 }} />
                        <span
                          className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded"
                          style={{ background: 'rgba(232,48,42,0.12)', color: 'var(--accent)', border: '1px solid rgba(232,48,42,0.25)', whiteSpace: 'nowrap' }}
                        >
                          Playoff Cutoff — Below this line eliminated
                        </span>
                        <div className="flex-1 h-px" style={{ background: 'var(--accent)', opacity: 0.4 }} />
                      </div>
                    </td>
                  </tr>
                )}

                {/* Drivers OUT of playoffs */}
                {playoffMode && outPlayoffs.map(driver => (
                  <StandingsRow
                    key={driver.id}
                    driver={driver}
                    onAdjust={() => setAdjustModal(driver)}
                    inPlayoffs={false}
                    eliminated
                  />
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
          onSave={async () => { await loadData(); setAdjustModal(null); }}
        />
      )}

      {embedModal && <EmbedModal onClose={() => setEmbedModal(false)} />}
      {discordModal && <DiscordPostModal onClose={() => setDiscordModal(false)} />}
    </div>
  );
}

function StandingsRow({ driver, onAdjust, inPlayoffs, eliminated }) {
  return (
    <tr
      className="table-row"
      style={{
        borderBottom: '1px solid var(--border)',
        opacity: eliminated ? 0.45 : 1,
      }}
    >
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          <PosBadge pos={driver.position} />
          {inPlayoffs && (
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: 'var(--green)' }}
              title="In playoffs"
            />
          )}
        </div>
      </td>
      <td className="px-5 py-3 font-semibold text-sm" style={{ color: eliminated ? 'var(--text2)' : 'var(--text)' }}>
        {driver.driver_name}
      </td>
      <td className="px-5 py-3 text-sm" style={{ color: 'var(--text2)' }}>{driver.car_model}</td>
      <td className="px-5 py-3 text-sm font-semibold" style={{ color: driver.wins > 0 ? 'var(--gold)' : 'var(--text2)' }}>
        {driver.wins ?? 0}
      </td>
      <td className="px-5 py-3 text-sm" style={{ color: 'var(--text2)' }}>{driver.poles ?? 0}</td>
      <td className="px-5 py-3 text-sm" style={{ color: 'var(--text2)' }}>—</td>
      <td className="px-5 py-3 text-sm" style={{ color: (driver.avg_incidents ?? 0) > 4 ? 'var(--accent)' : 'var(--text2)' }}>
        {driver.avg_incidents != null ? driver.avg_incidents.toFixed(1) : '—'}
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
          onClick={onAdjust}
          className="px-2.5 py-1 rounded text-xs font-semibold"
          style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border2)' }}
        >
          Adjust
        </button>
      </td>
    </tr>
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
          label="Points Adjustment (negative to deduct)"
          type="number"
          placeholder="e.g. -10 or 5"
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

function EmbedModal({ onClose }) {
  const embedUrl = `${window.location.origin}/embed/standings`;
  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="500" frameborder="0" style="border-radius:8px;overflow:hidden;"></iframe>`;
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(iframeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal title="Embed Standings" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm" style={{ color: 'var(--text2)' }}>
          Copy this code and paste it into any webpage to display a live standings widget.
        </p>
        <div
          className="p-3 rounded-md text-xs font-mono break-all select-all"
          style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border2)', lineHeight: 1.6 }}
        >
          {iframeCode}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold" style={{ color: 'var(--text3)' }}>Preview</p>
          <iframe
            src={embedUrl}
            width="100%"
            height="300"
            frameBorder="0"
            style={{ borderRadius: 6, border: '1px solid var(--border2)' }}
          />
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} type="button">Close</Button>
          <Button onClick={copy}>{copied ? 'Copied!' : 'Copy Code'}</Button>
        </div>
      </div>
    </Modal>
  );
}

function DiscordPostModal({ onClose }) {
  const [channel, setChannel] = useState('standings');
  const [posting, setPosting] = useState(false);
  const [result, setResult] = useState(null);

  async function handlePost(e) {
    e.preventDefault();
    setPosting(true);
    setResult(null);
    try {
      await discord.postStandings(channel);
      setResult({ ok: true, msg: `Standings posted to #${channel}` });
    } catch (err) {
      setResult({ ok: false, msg: err.message });
    } finally {
      setPosting(false);
    }
  }

  return (
    <Modal title="Post Standings to Discord" onClose={onClose}>
      <form onSubmit={handlePost} className="space-y-4">
        <p className="text-sm" style={{ color: 'var(--text2)' }}>
          Post the current standings as a Discord embed to a channel in your server.
        </p>
        <Input
          label="Channel name (without #)"
          placeholder="standings"
          value={channel}
          onChange={e => setChannel(e.target.value)}
          required
        />
        {result && (
          <div
            className="px-3 py-2 rounded text-sm"
            style={{
              background: result.ok ? 'rgba(34,197,94,0.1)' : 'rgba(232,48,42,0.1)',
              color: result.ok ? 'var(--green)' : 'var(--accent)',
              border: `1px solid ${result.ok ? 'rgba(34,197,94,0.2)' : 'rgba(232,48,42,0.2)'}`,
            }}
          >
            {result.msg}
          </div>
        )}
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} type="button">Close</Button>
          <Button type="submit" disabled={posting}>{posting ? 'Posting…' : 'Post to Discord'}</Button>
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

function CodeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}
