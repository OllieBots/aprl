import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import Card, { CardHeader } from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import TabBar from '../../components/TabBar';
import { iracing } from '../../lib/api';

const TABS = [
  { id: 'auth', label: 'Authentication' },
  { id: 'endpoints', label: 'Endpoints' },
  { id: 'sync', label: 'Sync Settings' },
];

const ENDPOINTS = [
  { method: 'POST', path: '/auth', description: 'Authenticate and obtain session cookie' },
  { method: 'GET', path: '/data/league/get', description: 'Fetch league info by league ID' },
  { method: 'GET', path: '/data/league/roster', description: 'Get all league members' },
  { method: 'GET', path: '/data/league/season_standings', description: 'Season points and standings' },
  { method: 'GET', path: '/data/results/get', description: 'Full race result by subsession ID' },
  { method: 'GET', path: '/data/results/lap_data', description: 'Per-driver lap times for a subsession' },
  { method: 'GET', path: '/data/member/profile', description: 'Driver iRating and safety rating' },
];

export default function IRacingConfig() {
  const [tab, setTab] = useState('auth');
  const [status, setStatus] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connError, setConnError] = useState('');
  const [connSuccess, setConnSuccess] = useState('');
  const [syncConfig, setSyncConfig] = useState({
    auto_sync: true,
    sync_delay_minutes: 15,
    discord_post_on_sync: true,
    irating_update_frequency: 'weekly',
  });
  const [savingSync, setSavingSync] = useState(false);

  useEffect(() => { loadStatus(); }, []);

  async function loadStatus() {
    try {
      const data = await iracing.status();
      setStatus(data);
      const cfg = await iracing.getConfig();
      setSyncConfig(cfg);
    } catch {}
  }

  async function handleConnect(e) {
    e.preventDefault();
    setConnecting(true);
    setConnError('');
    setConnSuccess('');
    try {
      await iracing.connect(email, password);
      setConnSuccess('Successfully connected to iRacing!');
      setPassword('');
      await loadStatus();
    } catch (err) {
      setConnError(err.message);
    } finally {
      setConnecting(false);
    }
  }

  async function handleSyncSave() {
    setSavingSync(true);
    try {
      await iracing.updateConfig(syncConfig);
    } finally {
      setSavingSync(false);
    }
  }

  return (
    <div>
      <PageHeader title="iRacing API" subtitle="Authentication and sync configuration">
        {/* Connection status badge */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-md" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: status?.connected ? 'var(--green)' : '#555a65' }}
          />
          <span className="text-sm font-semibold" style={{ color: status?.connected ? 'var(--green)' : 'var(--text3)' }}>
            {status?.connected ? 'Connected' : 'Disconnected'}
          </span>
          {status?.last_sync && (
            <span className="text-xs" style={{ color: 'var(--text3)' }}>
              · Last sync {new Date(status.last_sync * 1000).toLocaleTimeString()}
            </span>
          )}
        </div>
      </PageHeader>

      <div className="px-8 py-6">
        <Card>
          <TabBar tabs={TABS} active={tab} onChange={setTab} />

          {tab === 'auth' && (
            <div className="p-6 max-w-lg">
              <p className="text-sm mb-5" style={{ color: 'var(--text2)' }}>
                Connect your iRacing account to enable automatic result imports and data sync.
                Credentials are stored securely on the server — never sent to the frontend.
              </p>
              <form onSubmit={handleConnect} className="space-y-4">
                <Input
                  label="iRacing Email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoComplete="off"
                />
                <Input
                  label="iRacing Password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
                {connError && (
                  <div className="px-4 py-3 rounded-md text-sm" style={{ background: 'rgba(232,48,42,0.1)', color: 'var(--accent)', border: '1px solid rgba(232,48,42,0.25)' }}>
                    {connError}
                  </div>
                )}
                {connSuccess && (
                  <div className="px-4 py-3 rounded-md text-sm" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--green)', border: '1px solid rgba(34,197,94,0.25)' }}>
                    {connSuccess}
                  </div>
                )}
                <div className="pt-1">
                  <Button type="submit" disabled={connecting}>
                    {connecting ? 'Connecting...' : status?.connected ? 'Reconnect' : 'Connect to iRacing'}
                  </Button>
                </div>
              </form>

              <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
                <h3 className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--text3)' }}>
                  Authentication Notes
                </h3>
                <ul className="space-y-1.5 text-sm" style={{ color: 'var(--text2)' }}>
                  <li>• Password is SHA-256 hashed before transmission</li>
                  <li>• Session cookie is stored in the local database</li>
                  <li>• Cookie is automatically refreshed on expiry</li>
                  <li>• Rate limit: ~100 requests/hour per account</li>
                </ul>
              </div>
            </div>
          )}

          {tab === 'endpoints' && (
            <div className="p-6">
              <p className="text-sm mb-5" style={{ color: 'var(--text2)' }}>
                API endpoints used by APRL. All requests go through <span style={{ color: 'var(--text)' }}>members-ng.iracing.com</span>
              </p>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Method', 'Endpoint', 'Description'].map(h => (
                      <th key={h} className="px-0 py-2 text-left text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--text3)' }}>
                        <span className="px-4">{h}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ENDPOINTS.map((ep, i) => (
                    <tr key={i} className="table-row" style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-bold font-mono px-2 py-0.5 rounded"
                          style={{
                            background: ep.method === 'POST' ? 'rgba(240,179,35,0.12)' : 'rgba(34,197,94,0.12)',
                            color: ep.method === 'POST' ? 'var(--gold)' : 'var(--green)',
                          }}
                        >
                          {ep.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono" style={{ color: 'var(--text)' }}>{ep.path}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text2)' }}>{ep.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'sync' && (
            <div className="p-6 max-w-lg space-y-5">
              <ToggleRow
                label="Auto-Sync Results"
                description="Automatically import race results after each scheduled race"
                checked={syncConfig.auto_sync}
                onChange={v => setSyncConfig(s => ({ ...s, auto_sync: v }))}
              />
              <ToggleRow
                label="Post to Discord on Sync"
                description="Automatically post results embed when results are synced"
                checked={syncConfig.discord_post_on_sync}
                onChange={v => setSyncConfig(s => ({ ...s, discord_post_on_sync: v }))}
              />

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text2)' }}>
                  Sync Delay After Race (minutes)
                </label>
                <input
                  type="number"
                  min="5" max="120"
                  value={syncConfig.sync_delay_minutes}
                  onChange={e => setSyncConfig(s => ({ ...s, sync_delay_minutes: parseInt(e.target.value) }))}
                  className="w-40 px-3 py-2 rounded-md text-sm"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)' }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text2)' }}>
                  iRating Update Frequency
                </label>
                <select
                  value={syncConfig.irating_update_frequency}
                  onChange={e => setSyncConfig(s => ({ ...s, irating_update_frequency: e.target.value }))}
                  className="w-40 px-3 py-2 rounded-md text-sm"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)' }}
                >
                  <option value="each_race">Each Race</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <Button onClick={handleSyncSave} disabled={savingSync}>
                {savingSync ? 'Saving...' : 'Save Sync Settings'}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{label}</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--text2)' }}>{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="relative w-11 h-6 rounded-full flex-shrink-0 transition-colors"
        style={{ background: checked ? 'var(--accent)' : 'var(--bg4)', border: 'none' }}
      >
        <span
          className="absolute top-1 w-4 h-4 rounded-full transition-all"
          style={{ background: 'white', left: checked ? '24px' : '4px' }}
        />
      </button>
    </div>
  );
}
