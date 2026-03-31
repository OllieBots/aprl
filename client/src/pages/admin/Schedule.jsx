import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import { races } from '../../lib/api';
import { formatDateTime } from '../../lib/utils';

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
];

export default function Schedule() {
  const [raceList, setRaceList] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
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

  const filtered = filter === 'all' ? raceList : raceList.filter(r => r.status === filter);

  return (
    <div>
      <PageHeader title="Race Schedule" subtitle={`${raceList.length} races this season`}>
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
                {['Round', 'Track', 'Config', 'Date & Time', 'Laps', 'Status', ''].map(h => (
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
                  <td className="px-5 py-3 font-semibold text-sm" style={{ color: 'var(--text)' }}>
                    {race.track_name}
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
                  <td colSpan={7} className="px-5 py-12 text-center text-sm" style={{ color: 'var(--text3)' }}>
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
    </div>
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
