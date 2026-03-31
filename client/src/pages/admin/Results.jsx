import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import Card, { CardHeader } from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import PosBadge from '../../components/PosBadge';
import { races } from '../../lib/api';
import { formatDateTime, formatLapTime } from '../../lib/utils';

export default function Results() {
  const [completedRaces, setCompletedRaces] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [raceResults, setRaceResults] = useState({});
  const [importModal, setImportModal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadRaces(); }, []);

  async function loadRaces() {
    try {
      const data = await races.list({ status: 'completed' });
      setCompletedRaces(data);
    } finally {
      setLoading(false);
    }
  }

  async function toggleExpand(raceId) {
    const isOpen = expanded[raceId];
    setExpanded(prev => ({ ...prev, [raceId]: !isOpen }));
    if (!isOpen && !raceResults[raceId]) {
      try {
        const data = await races.getResults(raceId);
        setRaceResults(prev => ({ ...prev, [raceId]: data }));
      } catch (err) {
        console.error('Failed to load results:', err);
      }
    }
  }

  async function handleImport(raceId, subsessionId) {
    await races.importResults(raceId, subsessionId);
    const data = await races.getResults(raceId);
    setRaceResults(prev => ({ ...prev, [raceId]: data }));
    setImportModal(null);
  }

  return (
    <div>
      <PageHeader title="Race Results" subtitle={`${completedRaces.length} completed races`} />

      <div className="px-8 py-6 space-y-3">
        {loading && (
          <div className="text-sm text-center py-12" style={{ color: 'var(--text3)' }}>Loading results...</div>
        )}

        {!loading && completedRaces.length === 0 && (
          <div
            className="rounded-md px-8 py-16 text-center"
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--text3)' }}>No completed races yet.</p>
          </div>
        )}

        {completedRaces.map(race => {
          const results = raceResults[race.id];
          const isOpen = expanded[race.id];
          const winner = results?.results?.[0];
          const fastestLap = results?.results?.reduce((best, r) => {
            if (!r.fastest_lap_time) return best;
            return (!best || r.fastest_lap_time < best.fastest_lap_time) ? r : best;
          }, null);

          return (
            <Card key={race.id}>
              {/* Race header / summary row */}
              <button
                className="w-full text-left px-5 py-4 flex items-center gap-4"
                onClick={() => toggleExpand(race.id)}
                style={{ background: 'transparent' }}
              >
                <span className="font-display font-bold text-lg w-10 flex-shrink-0" style={{ color: 'var(--accent)' }}>
                  R{race.round_number}
                </span>
                <div className="flex-1">
                  <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{race.track_name}</span>
                  {race.track_config && (
                    <span className="text-sm ml-2" style={{ color: 'var(--text2)' }}>— {race.track_config}</span>
                  )}
                </div>
                <span className="text-sm" style={{ color: 'var(--text2)' }}>{formatDateTime(race.scheduled_at)}</span>
                {winner && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--text3)' }}>Winner:</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--gold)' }}>{winner.driver_name}</span>
                  </div>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setImportModal(race); }}
                >
                  Import from iRacing
                </Button>
                <ChevronIcon open={isOpen} />
              </button>

              {/* Summary stats */}
              {isOpen && results && (
                <>
                  <div
                    className="grid grid-cols-4 gap-0"
                    style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
                  >
                    {[
                      { label: 'Winner', value: winner?.driver_name || '—' },
                      { label: 'Fastest Lap', value: fastestLap ? `${fastestLap.driver_name} — ${formatLapTime(fastestLap.fastest_lap_time)}` : '—' },
                      { label: 'Total Laps', value: race.laps || '—' },
                      { label: 'Total Incidents', value: results.results?.reduce((s, r) => s + (r.incidents || 0), 0) || 0 },
                    ].map((stat, i) => (
                      <div
                        key={i}
                        className="px-5 py-3"
                        style={{ borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}
                      >
                        <div className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--text3)' }}>{stat.label}</div>
                        <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text)' }}>{stat.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Full results table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          {['Pos', 'Driver', 'Car', 'Laps Led', 'Fastest Lap', 'Incidents', 'Points'].map(h => (
                            <th key={h} className="px-5 py-2 text-left text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--text3)' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {results.results?.map(r => (
                          <tr key={r.driver_id} className="table-row" style={{ borderBottom: '1px solid var(--border)' }}>
                            <td className="px-5 py-2.5"><PosBadge pos={r.finish_position} /></td>
                            <td className="px-5 py-2.5 text-sm font-semibold" style={{ color: 'var(--text)' }}>{r.driver_name}</td>
                            <td className="px-5 py-2.5 text-sm" style={{ color: 'var(--text2)' }}>{r.car_model}</td>
                            <td className="px-5 py-2.5 text-sm" style={{ color: 'var(--text2)' }}>{r.laps_led ?? '—'}</td>
                            <td className="px-5 py-2.5 text-sm font-mono" style={{ color: r.fastest_lap_time === fastestLap?.fastest_lap_time ? 'var(--accent2)' : 'var(--text2)' }}>
                              {formatLapTime(r.fastest_lap_time)}
                            </td>
                            <td className="px-5 py-2.5 text-sm" style={{ color: r.incidents > 4 ? 'var(--accent)' : 'var(--text2)' }}>
                              {r.incidents ?? '—'}
                            </td>
                            <td className="px-5 py-2.5">
                              <span className="font-display font-bold text-base" style={{ color: 'var(--text)' }}>
                                {(r.points_awarded || 0) + (r.points_adjustment || 0)}
                              </span>
                              {r.points_adjustment !== 0 && (
                                <span className="text-xs ml-1" style={{ color: r.points_adjustment > 0 ? 'var(--green)' : 'var(--accent)' }}>
                                  ({r.points_adjustment > 0 ? '+' : ''}{r.points_adjustment})
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {isOpen && !results && (
                <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text3)', borderTop: '1px solid var(--border)' }}>
                  Loading results...
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {importModal && (
        <ImportModal
          race={importModal}
          onClose={() => setImportModal(null)}
          onImport={handleImport}
        />
      )}
    </div>
  );
}

function ImportModal({ race, onClose, onImport }) {
  const [subsessionId, setSubsessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onImport(race.id, subsessionId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Import from iRacing" onClose={onClose}>
      <div className="space-y-4">
        <div className="px-4 py-3 rounded-md text-sm" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
          Importing results for <strong style={{ color: 'var(--text)' }}>Round {race.round_number} — {race.track_name}</strong>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="iRacing Subsession ID"
            placeholder="e.g. 12345678"
            value={subsessionId}
            onChange={e => setSubsessionId(e.target.value)}
            required
            error={error}
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Importing...' : 'Import Results'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      style={{ color: 'var(--text3)', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
    >
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}
