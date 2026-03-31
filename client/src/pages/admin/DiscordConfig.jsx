import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import Card, { CardHeader } from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import TabBar from '../../components/TabBar';
import Badge from '../../components/Badge';
import { discord, activity } from '../../lib/api';
import { relativeTime } from '../../lib/utils';

function DiscordLogoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

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
  const [config, setConfig] = useState({ guild_id: '' });
  const [inviteUrl, setInviteUrl] = useState(null);
  const [channels, setChannels] = useState({});
  const [logs, setLogs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [s, ch, discordLogs, inv] = await Promise.all([
        discord.status(),
        discord.getChannels(),
        discord.getLogs(),
        discord.inviteUrl(),
      ]);
      setStatus(s);
      setChannels(ch);
      setLogs(discordLogs);
      if (inv?.url) setInviteUrl(inv.url);
      if (s.guild_id) setConfig(c => ({ ...c, guild_id: s.guild_id }));
    } catch {}
  }

  async function handleSaveConfig(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await discord.saveConfig({ guild_id: config.guild_id });
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
            <div className="p-6 max-w-lg space-y-6">
              {/* Setup guide */}
              <div className="rounded-lg space-y-3" style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', padding: '16px 20px' }}>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text3)' }}>How to connect your Discord server</p>
                <ol className="space-y-2.5">
                  {[
                    <>Click <strong>Add APRL Bot to Server</strong> below and select your Discord server from the list.</>,
                    <>In Discord, enable <strong>Developer Mode</strong>: User Settings → Advanced → Developer Mode.</>,
                    <>Right-click your server name in the left sidebar and click <strong>Copy Server ID</strong>.</>,
                    <>Paste the Server ID below and hit <strong>Save</strong>.</>,
                    <>Click <strong>Test Connection</strong> — the bot will send a test message to <span style={{ color: 'var(--accent2)', fontFamily: 'monospace' }}>#general</span> to confirm it's working.</>,
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm" style={{ color: 'var(--text2)' }}>
                      <span
                        className="flex-shrink-0 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center mt-0.5"
                        style={{ background: 'rgba(232,48,42,0.15)', color: 'var(--accent)', border: '1px solid rgba(232,48,42,0.25)' }}
                      >
                        {i + 1}
                      </span>
                      <span style={{ lineHeight: 1.5 }}>{step}</span>
                    </li>
                  ))}
                </ol>
                {inviteUrl ? (
                  <a
                    href={inviteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold mt-1"
                    style={{ background: '#5865f2', color: '#fff', textDecoration: 'none' }}
                  >
                    <DiscordLogoIcon /> Add APRL Bot to Server
                  </a>
                ) : (
                  <p className="text-xs mt-1" style={{ color: 'var(--text3)' }}>
                    Bot invite link not configured — ask your APRL admin to set <span style={{ fontFamily: 'monospace' }}>DISCORD_CLIENT_ID</span> on the server.
                  </p>
                )}
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-4">
                <Input
                  label="Server ID"
                  value={config.guild_id}
                  onChange={e => setConfig(c => ({ ...c, guild_id: e.target.value }))}
                  placeholder="123456789012345678"
                />
                <div className="flex items-center gap-3 pt-1">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
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
                    {testResult === 'success' ? 'Test message sent to #general successfully!' : testResult}
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
