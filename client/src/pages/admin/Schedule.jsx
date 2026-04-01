import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import { races, iracing } from '../../lib/api';
import { formatDateTime } from '../../lib/utils';

const SKY_LABELS = ['Clear', 'Mostly Clear', 'Partly Cloudy', 'Mostly Cloudy', 'Overcast'];
const SKY_ICONS  = ['☀️', '🌤️', '⛅', '🌥️', '☁️'];
const TOD_LABELS = ['Morning', 'Noon', 'Afternoon', 'Dusk', 'Midnight', 'Dawn'];
const TOD_ICONS  = ['🌅', '☀️', '🌄', '🌇', '🌙', '🌄'];

function WeatherBadge({ race }) {
  if (race.weather_temp == null && race.weather_sky == null && race.time_of_day == null) return null;

  const skyLabel = race.weather_sky != null ? SKY_LABELS[race.weather_sky] ?? '—' : null;
  const skyIcon  = race.weather_sky != null ? SKY_ICONS[race.weather_sky]  ?? '' : '';
  const todLabel = race.time_of_day != null ? TOD_LABELS[race.time_of_day] ?? '—' : null;
  const todIcon  = race.time_of_day != null ? TOD_ICONS[race.time_of_day]  ?? '' : '';
  const tempUnit = race.weather_temp_units === 1 ? '°C' : '°F';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {race.weather_temp != null && (
        <span style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
          {skyIcon} {Math.round(race.weather_temp)}{tempUnit}
          {race.weather_humidity != null && <span style={{ color: 'var(--text3)' }}> · {race.weather_humidity}% humidity</span>}
        </span>
      )}
      {skyLabel && (
        <span style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{skyLabel}</span>
      )}
      {todLabel && (
        <span style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{todIcon} {todLabel} (sim)</span>
      )}
    </div>
  );
}

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
];

export default function Schedule() {
  const [raceList, setRaceList] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editRace, setEditRace] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadRaces(); }, []);

  async function loadRaces() {
    try {
      const data = await races.list();
      setRaceList(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this race?')) return;
    await races.delete(id);
    setRaceList(prev => prev.filter(r => r.id !== id));
  }

  const hasConditions = raceList.some(r => r.weather_temp != null || r.weather_sky != null || r.time_of_day != null);
  const filtered = filter === 'all' ? raceList : raceList.filter(r => r.status === filter);

  return (
    <div>
      <PageHeader title="Race Schedule" subtitle={`${raceList.length} races this season`}>
        <Button variant="secondary" onClick={() => setShowImportModal(true)}>
          <DownloadIcon /> Import from iRacing
        </Button>
        <Button onClick={() => setShowAddModal(true)}>
          <PlusIcon /> Add Race
        </Button>
      </PageHeader>

      {/* Filter tabs */}
      <div className="px-8 pt-5">
        <div className="flex gap-1 p-1 rounded-md w-fit" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className="px-4 py-1.5 rounded text-sm font-semibold transition-all"
              style={{
                background: filter === tab.id ? 'var(--bg4)' : 'transparent',
                color: filter === tab.id ? 'var(--text)' : 'var(--text2)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-8 pt-4 pb-8">
        <Card>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Round', 'Track', 'Config', 'Date & Time', 'Laps', ...(hasConditions ? ['Conditions'] : []), 'Status', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--text3)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(race => (
                <tr key={race.id} className="table-row" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-5 py-3">
                    <span className="font-display font-bold text-lg" style={{ color: 'var(--accent)' }}>
                      R{race.round_number}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{race.track_name}</div>
                    {race.session_name && (
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{race.session_name}</div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm" style={{ color: 'var(--text2)' }}>
                    {race.track_config || '—'}
                  </td>
                  <td className="px-5 py-3 text-sm" style={{ color: 'var(--text2)' }}>
                    {formatDateTime(race.scheduled_at)}
                  </td>
                  <td className="px-5 py-3 text-sm" style={{ color: 'var(--text2)' }}>
                    {race.laps || '—'}
                  </td>
                  {hasConditions && (
                    <td className="px-5 py-3">
                      <WeatherBadge race={race} />
                    </td>
                  )}
                  <td className="px-5 py-3">
                    <Badge label={race.status} variant={race.status} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditRace(race)}
                        className="px-3 py-1 rounded text-xs font-semibold"
                        style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border2)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(race.id)}
                        className="px-3 py-1 rounded text-xs font-semibold"
                        style={{ background: 'rgba(232,48,42,0.1)', color: 'var(--accent)', border: '1px solid rgba(232,48,42,0.25)' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={hasConditions ? 8 : 7} className="px-5 py-12 text-center text-sm" style={{ color: 'var(--text3)' }}>
                    No races found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      {showAddModal && (
        <RaceModal
          title="Add Race"
          onClose={() => setShowAddModal(false)}
          onSave={async (data) => {
            await races.create({ ...data, season_id: 1 });
            await loadRaces();
            setShowAddModal(false);
          }}
        />
      )}

      {editRace && (
        <RaceModal
          title="Edit Race"
          initial={editRace}
          onClose={() => setEditRace(null)}
          onSave={async (data) => {
            await races.update(editRace.id, data);
            await loadRaces();
            setEditRace(null);
          }}
        />
      )}

      {showImportModal && (
        <ImportScheduleModal
          onClose={() => setShowImportModal(false)}
          onImported={() => { loadRaces(); setShowImportModal(false); }}
        />
      )}
    </div>
  );
}

function ImportScheduleModal({ onClose, onImported }) {
  const [form, setForm] = useState({ iracing_league_id: '', iracing_season_id: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const data = await iracing.importSchedule({
        iracing_league_id: form.iracing_league_id,
        iracing_season_id: form.iracing_season_id,
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Import Schedule from iRacing" onClose={onClose} width={500}>
      <div className="space-y-4">
        <div style={{ padding: '12px 14px', borderRadius: 7, background: 'var(--bg3)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
          Import your pre-planned race sessions directly from iRacing. This pulls track info, date/time, laps, weather settings, and time of day for each session.
          <br /><br />
          Find your <strong style={{ color: 'var(--text)' }}>League ID</strong> and <strong style={{ color: 'var(--text)' }}>Season ID</strong> in iRacing under <em>My Content → League</em> in the member site — they appear in the URL when viewing your league season.
        </div>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="iRacing League ID"
              placeholder="e.g. 12345"
              value={form.iracing_league_id}
              onChange={e => setForm(f => ({ ...f, iracing_league_id: e.target.value }))}
              required
            />
            <Input
              label="iRacing Season ID"
              placeholder="e.g. 67890"
              value={form.iracing_season_id}
              onChange={e => setForm(f => ({ ...f, iracing_season_id: e.target.value }))}
              required
            />
            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(232,48,42,0.1)', color: 'var(--accent)', border: '1px solid rgba(232,48,42,0.25)', fontSize: 13 }}>
                {error}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Importing...' : 'Import Schedule'}</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div style={{ padding: '14px 16px', borderRadius: 7, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
              <div style={{ fontWeight: 700, color: 'var(--green)', fontSize: 14, marginBottom: 6 }}>Import complete</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span>{result.imported} session{result.imported !== 1 ? 's' : ''} added/updated</span>
                {result.skipped > 0 && <span style={{ color: 'var(--text3)' }}>{result.skipped} skipped (already completed or no data)</span>}
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={onImported}>Done</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function RaceModal({ title, initial, onClose, onSave }) {
  const toDatetimeLocal = (unix) => {
    if (!unix) return '';
    const d = new Date(unix * 1000);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [form, setForm] = useState({
    round_number: initial?.round_number || '',
    track_name: initial?.track_name || '',
    track_config: initial?.track_config || '',
    scheduled_at_local: toDatetimeLocal(initial?.scheduled_at),
    laps: initial?.laps || '',
    status: initial?.status || 'upcoming',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const unix = form.scheduled_at_local
        ? Math.floor(new Date(form.scheduled_at_local).getTime() / 1000)
        : null;
      await onSave({ ...form, scheduled_at: unix });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Round Number"
            type="number"
            value={form.round_number}
            onChange={e => setForm(f => ({ ...f, round_number: e.target.value }))}
            required
          />
          <Input
            label="Laps"
            type="number"
            value={form.laps}
            onChange={e => setForm(f => ({ ...f, laps: e.target.value }))}
          />
        </div>
        <Input
          label="Track Name"
          value={form.track_name}
          onChange={e => setForm(f => ({ ...f, track_name: e.target.value }))}
          required
        />
        <Input
          label="Configuration"
          placeholder="e.g. Grand Prix, Full Circuit"
          value={form.track_config}
          onChange={e => setForm(f => ({ ...f, track_config: e.target.value }))}
        />
        <Input
          label="Date & Time"
          type="datetime-local"
          value={form.scheduled_at_local}
          onChange={e => setForm(f => ({ ...f, scheduled_at_local: e.target.value }))}
        />
        {initial && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text2)' }}>Status</label>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full px-3 py-2 rounded-md text-sm"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)' }}
            >
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Race'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}
