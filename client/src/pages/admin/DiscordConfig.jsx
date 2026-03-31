import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import Card, { CardHeader } from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import TabBar from '../../components/TabBar';
import Badge from '../../components/Badge';
import { discord, activity } from '../../lib/api';
import { relativeTime } from '../../lib/utils';

const TABS = [
  { id: 'config', label: 'Configuration' },
  { id: 'channels', label: 'Channels' },
  { id: 'commands', label: 'Commands' },
  { id: 'logs', label: 'Activity Logs' },
];

const COMMANDS = [
  { command: '/standings', description: 'Post current season standings embed', permission: 'Everyone' },
  { command: '/nextrace', description: 'Show next race info and countdown', permission: 'Everyone' },
  { command: '/results [round]', description: 'Results for a specific round', permission: 'Everyone' },
  { command: '/driver [name]', description: 'Driver stats card embed', permission: 'Everyone' },
  { command: '/admin sync', description: 'Force sync results from iRacing', permission: 'Admin' },
  { command: '/admin penalize', description: 'Apply points penalty to a driver', permission: 'Admin' },
];

const CHANNEL_KEYS = [
  { key: 'announcements', label: 'Announcements', description: 'League news and general announcements' },
  { key: 'results', label: 'Race Results', description: 'Auto-posted race result embeds' },
  { key: 'standings', label: 'Standings', description: 'Auto-posted standings after each race' },
  { key: 'general', label: 'General', description: 'General league chat' },
  { key: 'admin_logs', label: 'Admin Logs', description: 'Admin action audit trail' },
];

export default function DiscordConfig() {
  const [tab, setTab] = useState('config');
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState({ bot_token: '', guild_id: '', command_prefix: '!' });
  const [channels, setChannels] = useState({});
  const [logs, setLogs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [s, ch, discordLogs] = await Promise.all([
        discord.status(),
        discord.getChannels(),
        discord.getLogs(),
      ]);
      setStatus(s);
      setChannels(ch);
      setLogs(discordLogs);
      if (s.guild_id) setConfig(c => ({ ...c, guild_id: s.guild_id }));
    } catch {}
  }

  async function handleSaveConfig(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await discord.saveConfig(config);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult('');
    try {
      await discord.test();
      setTestResult('success');
    } catch (err) {
      setTestResult(`error: ${err.message}`);
    } finally {
      setTesting(false);
    }
  }

  async function handleSaveChannels() {
    await discord.saveChannels(channels);
  }

  return (
    <div>
      <PageHeader title="Discord Bot" subtitle="Bot configuration and slash commands">
        {/* Status */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-md" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: status?.online ? 'var(--green)' : '#555a65' }}
          />
          <span className="text-sm font-semibold" style={{ color: status?.online ? 'var(--green)' : 'var(--text3)' }}>
            {status?.online ? 'Online' : 'Offline'}
          </span>
        </div>
      </PageHeader>

      <div className="px-8 py-6">
        <Card>
          <TabBar tabs={TABS} active={tab} onChange={setTab} />

          {tab === 'config' && (
            <div className="p-6 max-w-lg space-y-5">
              <form onSubmit={handleSaveConfig} className="space-y-4">
                <Input
                  label="Bot Token"
                  type="password"
                  value={config.bot_token}
                  onChange={e => setConfig(c => ({ ...c, bot_token: e.target.value }))}
                  placeholder="••••••••••••••••"
                  autoComplete="off"
                />
                <Input
                  label="Guild (Server) ID"
                  value={config.guild_id}
                  onChange={e => setConfig(c => ({ ...c, guild_id: e.target.value }))}
                  placeholder="123456789012345678"
                />
                <Input
                  label="Command Prefix (legacy)"
                  value={config.command_prefix}
                  onChange={e => setConfig(c => ({ ...c, command_prefix: e.target.value }))}
                  placeholder="!"
                />
                <div className="flex items-center gap-3 pt-1">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Configuration'}
                  </Button>
                  <Button variant="secondary" type="button" onClick={handleTest} disabled={testing}>
                    {testing ? 'Testing...' : 'Test Connection'}
                  </Button>
                </div>
                {testResult && (
                  <div
                    className="px-4 py-3 rounded-md text-sm"
                    style={{
                      background: testResult === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(232,48,42,0.1)',
                      color: testResult === 'success' ? 'var(--green)' : 'var(--accent)',
                      border: `1px solid ${testResult === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(232,48,42,0.25)'}`,
                    }}
                  >
                    {testResult === 'success' ? 'Test message sent successfully!' : testResult}
                  </div>
                )}
              </form>
            </div>
          )}

          {tab === 'channels' && (
            <div className="p-6 max-w-xl space-y-4">
              <p className="text-sm mb-2" style={{ color: 'var(--text2)' }}>
                Map bot actions to Discord channel names. Enter the channel name without #.
              </p>
              {CHANNEL_KEYS.map(({ key, label, description }) => (
                <div key={key} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{label}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{description}</div>
                  </div>
                  <div className="flex items-center gap-1.5 w-48">
                    <span style={{ color: 'var(--text3)' }}>#</span>
                    <input
                      value={channels[key] || ''}
                      onChange={e => setChannels(c => ({ ...c, [key]: e.target.value }))}
                      className="flex-1 px-3 py-1.5 rounded-md text-sm"
                      style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)' }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <Button onClick={handleSaveChannels}>Save Channels</Button>
              </div>
            </div>
          )}

          {tab === 'commands' && (
            <div className="p-6">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Command', 'Description', 'Permission'].map(h => (
                      <th key={h} className="px-0 py-2 text-left text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--text3)' }}>
                        <span className="px-4">{h}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMMANDS.map((cmd, i) => (
                    <tr key={i} className="table-row" style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-4 py-3 font-mono text-sm" style={{ color: 'var(--accent2)' }}>{cmd.command}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text2)' }}>{cmd.description}</td>
                      <td className="px-4 py-3">
                        <Badge
                          label={cmd.permission}
                          variant={cmd.permission === 'Admin' ? 'suspended' : 'active'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'logs' && (
            <div className="p-5">
              {logs.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: 'var(--text3)' }}>No Discord activity logged yet</p>
              )}
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {logs.map(log => (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-md"
                    style={{ background: 'var(--bg3)' }}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#7289da' }} />
                    <span className="flex-1 text-sm" style={{ color: 'var(--text)' }}>{log.message}</span>
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--text3)' }}>
                      {relativeTime(log.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
