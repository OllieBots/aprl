import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import Card, { CardHeader } from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Modal from '../../components/Modal';
import { league, seasons } from '../../lib/api';

const DEFAULT_SCORING = {
  p1: 50, p2: 40, p3: 35, p4: 30, p5: 27, p6: 24, p7: 22, p8: 20,
  p9: 18, p10: 16, p11: 14, p12: 12, p13: 10, p14: 9, p15: 8,
  p16: 7, p17: 6, p18: 5, p19: 4, p20: 3, pole: 3, fl: 1,
};

export default function Settings() {
  const [leagueData, setLeagueData] = useState({ name: '', iracing_league_id: '', discord_guild_id: '', primary_color: '#e8302a', secondary_color: '#f0b323', banner_url: '', logo_url: '' });
  const [seasonData, setSeasonData] = useState(null);
  const [scoring, setScoring] = useState(DEFAULT_SCORING);
  const [savingLeague, setSavingLeague] = useState(false);
  const [savingScoring, setSavingScoring] = useState(false);
  const [newSeasonModal, setNewSeasonModal] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveErr, setSaveErr] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [l, s] = await Promise.all([league.get(), seasons.list()]);
      if (l) setLeagueData({
        name: l.name || '',
        iracing_league_id: l.iracing_league_id || '',
        discord_guild_id: l.discord_guild_id || '',
        primary_color: l.primary_color || '#e8302a',
        secondary_color: l.secondary_color || '#f0b323',
        banner_url: l.banner_url || '',
        logo_url: l.logo_url || '',
      });
      const active = s?.find(s => s.is_active) || s?.[0];
      if (active) {
        setSeasonData(active);
        try {
          const sc = JSON.parse(active.scoring_config);
          setScoring({ ...DEFAULT_SCORING, ...sc });
        } catch {}
      }
    } catch {}
  }

  async function saveLeague(e) {
    e?.preventDefault();
    setSavingLeague(true);
    setSaveErr('');
    try {
      await league.update(leagueData);
      showMsg('Saved');
    } catch (err) {
      setSaveErr(err.message);
    } finally {
      setSavingLeague(false);
    }
  }

  async function handleScoringSave() {
    setSavingScoring(true);
    try {
      if (seasonData) {
        await seasons.update(seasonData.id, { ...seasonData, scoring_config: scoring });
        showMsg('Scoring system saved');
      }
    } finally {
      setSavingScoring(false);
    }
  }

  function showMsg(msg) {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(''), 3000);
  }

  const positions = Array.from({ length: 20 }, (_, i) => `p${i + 1}`);

  return (
    <div>
      <PageHeader title="League Settings" subtitle="Configure your league, season, and scoring system">
        {saveMsg && (
          <div className="px-4 py-2 rounded-md text-sm" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--green)', border: '1px solid rgba(34,197,94,0.25)' }}>
            {saveMsg}
          </div>
        )}
        {saveErr && (
          <div className="px-4 py-2 rounded-md text-sm" style={{ background: 'rgba(232,48,42,0.1)', color: 'var(--accent)', border: '1px solid rgba(232,48,42,0.25)' }}>
            {saveErr}
          </div>
        )}
      </PageHeader>

      <div className="px-8 py-6 space-y-6">
        {/* League Config */}
        <Card>
          <CardHeader title="League Configuration" />
          <div className="p-6 max-w-lg">
            <form onSubmit={saveLeague} className="space-y-4">
              <Input
                label="League Name"
                value={leagueData.name}
                onChange={e => setLeagueData(d => ({ ...d, name: e.target.value }))}
                placeholder="Apex Pro Racing League"
              />
              <Input
                label="iRacing League ID"
                value={leagueData.iracing_league_id}
                onChange={e => setLeagueData(d => ({ ...d, iracing_league_id: e.target.value }))}
                placeholder="12345"
              />
              <div className="flex gap-3 pt-1">
                <Button type="submit" disabled={savingLeague}>
                  {savingLeague ? 'Saving...' : 'Save League Settings'}
                </Button>
              </div>
            </form>
          </div>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader title="League Appearance" />
          <div className="p-6 max-w-lg space-y-5">
            {/* Color pickers */}
            <div className="flex gap-8">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text2)' }}>Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={leagueData.primary_color}
                    onChange={e => setLeagueData(d => ({ ...d, primary_color: e.target.value }))}
                    style={{ width: 44, height: 44, borderRadius: 8, border: '2px solid var(--border2)', cursor: 'pointer', padding: 2, background: 'var(--bg3)' }}
                  />
                  <input
                    type="text"
                    value={leagueData.primary_color}
                    onChange={e => setLeagueData(d => ({ ...d, primary_color: e.target.value }))}
                    maxLength={7}
                    className="w-28 px-3 py-2 rounded-md text-sm font-mono"
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)' }}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text2)' }}>Secondary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={leagueData.secondary_color}
                    onChange={e => setLeagueData(d => ({ ...d, secondary_color: e.target.value }))}
                    style={{ width: 44, height: 44, borderRadius: 8, border: '2px solid var(--border2)', cursor: 'pointer', padding: 2, background: 'var(--bg3)' }}
                  />
                  <input
                    type="text"
                    value={leagueData.secondary_color}
                    onChange={e => setLeagueData(d => ({ ...d, secondary_color: e.target.value }))}
                    maxLength={7}
                    className="w-28 px-3 py-2 rounded-md text-sm font-mono"
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)' }}
                  />
                </div>
              </div>
            </div>

            {/* Logo URL */}
            <div>
              <Input
                label="Logo Image URL"
                placeholder="https://i.imgur.com/yourlogo.png"
                value={leagueData.logo_url}
                onChange={e => setLeagueData(d => ({ ...d, logo_url: e.target.value }))}
              />
              <p className="text-xs mt-1.5" style={{ color: 'var(--text3)' }}>
                Paste a direct image URL. Square image recommended (e.g. 256×256px). PNG with transparent background works great.
              </p>
            </div>

            {/* Preview swatch */}
            <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <div style={{ height: 6, background: `linear-gradient(90deg, ${leagueData.primary_color}, ${leagueData.secondary_color})` }} />
              <div style={{ padding: '10px 14px', background: 'var(--bg3)', display: 'flex', alignItems: 'center', gap: 10 }}>
                {leagueData.logo_url ? (
                  <img
                    src={leagueData.logo_url}
                    alt="Logo"
                    style={{ width: 32, height: 32, borderRadius: 7, objectFit: 'cover', border: `2px solid ${leagueData.primary_color}44` }}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: 7, background: leagueData.primary_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 14 }}>
                    {leagueData.name?.[0] || 'A'}
                  </div>
                )}
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{leagueData.name || 'Your League'}</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 4, background: leagueData.secondary_color + '22', color: leagueData.secondary_color, border: `1px solid ${leagueData.secondary_color}44` }}>
                  Preview
                </span>
              </div>
            </div>

            {/* Banner URL */}
            <div>
              <Input
                label="Banner Image URL"
                placeholder="https://i.imgur.com/yourimage.jpg"
                value={leagueData.banner_url}
                onChange={e => setLeagueData(d => ({ ...d, banner_url: e.target.value }))}
              />
              <p className="text-xs mt-1.5" style={{ color: 'var(--text3)' }}>
                Paste a direct image URL (Imgur, Discord CDN, etc.). Recommended size: 1400×300px or wider.
              </p>
            </div>

            {/* Banner preview */}
            {leagueData.banner_url && (
              <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border)', height: 100 }}>
                <img
                  src={leagueData.banner_url}
                  alt="Banner preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              </div>
            )}

            <Button onClick={saveLeague} disabled={savingLeague}>
              {savingLeague ? 'Saving...' : 'Save Appearance'}
            </Button>
          </div>
        </Card>

        {/* Season Management */}
        <Card>
          <CardHeader title="Season Management">
            <Button size="sm" onClick={() => setNewSeasonModal(true)}>
              + New Season
            </Button>
          </CardHeader>
          <div className="p-6 max-w-lg">
            {seasonData ? (
              <div className="space-y-4">
                <div className="px-4 py-3 rounded-md flex items-center justify-between" style={{ background: 'var(--bg3)' }}>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{seasonData.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text2)' }}>
                      {seasonData.series} · {seasonData.car_class}
                    </div>
                  </div>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded"
                    style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--green)', border: '1px solid rgba(34,197,94,0.25)' }}
                  >
                    Active
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text3)' }}>No season configured. Create one to get started.</p>
            )}
          </div>
        </Card>

        {/* Scoring System */}
        <Card>
          <CardHeader title="Scoring System">
            <Button variant="secondary" size="sm" onClick={() => setScoring(DEFAULT_SCORING)}>
              Reset to Default
            </Button>
          </CardHeader>
          <div className="p-6">
            <p className="text-sm mb-5" style={{ color: 'var(--text2)' }}>
              Points awarded per finishing position, plus bonuses for pole position and fastest lap.
            </p>

            {/* Position grid */}
            <div className="grid grid-cols-5 gap-3 mb-6">
              {positions.map(key => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase text-center" style={{ color: 'var(--text3)' }}>
                    {key.toUpperCase()}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={scoring[key] ?? 0}
                    onChange={e => setScoring(s => ({ ...s, [key]: parseInt(e.target.value) || 0 }))}
                    className="w-full px-2 py-2 rounded-md text-sm text-center font-semibold"
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)' }}
                  />
                </div>
              ))}
            </div>

            {/* Bonus points */}
            <div className="pt-4 mb-4" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--text3)' }}>
                Bonus Points
              </div>
              <div className="flex gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text3)' }}>Pole Position</label>
                  <input
                    type="number" min="0"
                    value={scoring.pole ?? 0}
                    onChange={e => setScoring(s => ({ ...s, pole: parseInt(e.target.value) || 0 }))}
                    className="w-24 px-3 py-2 rounded-md text-sm text-center font-semibold"
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)' }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text3)' }}>Fastest Lap</label>
                  <input
                    type="number" min="0"
                    value={scoring.fl ?? 0}
                    onChange={e => setScoring(s => ({ ...s, fl: parseInt(e.target.value) || 0 }))}
                    className="w-24 px-3 py-2 rounded-md text-sm text-center font-semibold"
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)' }}
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleScoringSave} disabled={savingScoring}>
              {savingScoring ? 'Saving...' : 'Save Scoring System'}
            </Button>
          </div>
        </Card>
      </div>

      {newSeasonModal && (
        <NewSeasonModal
          onClose={() => setNewSeasonModal(false)}
          onSave={async (data) => {
            await seasons.create({ ...data, scoring_config: DEFAULT_SCORING });
            await loadData();
            setNewSeasonModal(false);
            showMsg('New season created');
          }}
        />
      )}
    </div>
  );
}

function NewSeasonModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', series: '', car_class: '' });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Create New Season" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="px-4 py-3 rounded-md text-sm" style={{ background: 'rgba(240,179,35,0.08)', color: 'var(--gold)', border: '1px solid rgba(240,179,35,0.2)' }}>
          Creating a new season will archive the current active season.
        </div>
        <Input
          label="Season Name"
          placeholder="Season 2 — 2026"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          required
        />
        <Input
          label="Series"
          placeholder="GT3 Championship"
          value={form.series}
          onChange={e => setForm(f => ({ ...f, series: e.target.value }))}
        />
        <Input
          label="Car Class"
          placeholder="GT3"
          value={form.car_class}
          onChange={e => setForm(f => ({ ...f, car_class: e.target.value }))}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Season'}</Button>
        </div>
      </form>
    </Modal>
  );
}
