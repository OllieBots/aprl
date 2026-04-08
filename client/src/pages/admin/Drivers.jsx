import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input, { Select } from '../../components/Input';
import PosBadge from '../../components/PosBadge';
import { drivers, members } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { formatLapTime } from '../../lib/utils';

export default function Drivers() {
  const { ownedLeague } = useAuth();
  const [driverList, setDriverList] = useState([]);
  const [memberList, setMemberList] = useState([]);
  const [addModal, setAddModal] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [detailDriver, setDetailDriver] = useState(null);
  const [editDriver, setEditDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [carNumEdit, setCarNumEdit] = useState(null); // { membershipId, value }
  const [carNumError, setCarNumError] = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [d, m] = await Promise.all([
        drivers.list(),
        ownedLeague ? members.list(ownedLeague.id) : Promise.resolve([]),
      ]);
      setDriverList(d);
      setMemberList(m);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Remove ${name} from the roster?`)) return;
    await drivers.delete(id);
    setDriverList(prev => prev.filter(d => d.id !== id));
  }

  async function handleStatusChange(driver, status) {
    await drivers.update(driver.id, { ...driver, status });
    setDriverList(prev => prev.map(d => d.id === driver.id ? { ...d, status } : d));
  }

  async function openDetail(driver) {
    const data = await drivers.get(driver.id);
    setDetailDriver(data);
  }

  async function handleRevoke(membershipId) {
    if (!confirm('Revoke this invite?')) return;
    await members.remove(ownedLeague.id, membershipId);
    setMemberList(prev => prev.filter(m => m.id !== membershipId));
  }

  // Map iracing_cust_id -> membership so we can look up membership id per driver
  const membershipByIR = Object.fromEntries(
    memberList.filter(m => m.iracing_cust_id).map(m => [String(m.iracing_cust_id), m])
  );

  async function saveCarNumber(driver) {
    const membership = membershipByIR[String(driver.iracing_cust_id)];
    if (!membership) return;
    const value = carNumEdit?.value?.trim() || '';
    setCarNumError('');
    try {
      await members.update(ownedLeague.id, membership.id, { car_number: value });
      setMemberList(prev => prev.map(m => m.id === membership.id ? { ...m, car_number: value || null } : m));
      setCarNumEdit(null);
    } catch (err) {
      setCarNumError(err.message);
    }
  }

  const active = driverList.filter(d => d.status === 'active');
  const others = driverList.filter(d => d.status !== 'active');
  const pendingInvites = memberList.filter(m => m.status === 'invited');
  const pendingRequests = memberList.filter(m => m.status === 'pending');

  return (
    <div>
      <PageHeader
        title="Driver Roster"
        subtitle={`${active.length} active · ${others.length} inactive/suspended`}
      >
        <Button variant="secondary" onClick={() => setAddModal(true)}>
          <PlusIcon /> Add Driver
        </Button>
        <Button onClick={() => setInviteModal(true)}>
          <MailIcon /> Invite Driver
        </Button>
      </PageHeader>

      <div className="px-8 py-6 space-y-6">

        {/* Pending join requests */}
        {pendingRequests.length > 0 && (
          <Card>
            <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text3)' }}>
                Join Requests ({pendingRequests.length})
              </span>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {pendingRequests.map(m => (
                <div key={m.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{m.name || 'Unknown'}</span>
                    <span className="ml-3 text-xs" style={{ color: 'var(--text3)' }}>iRacing #{m.iracing_cust_id || '—'}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        await members.update(ownedLeague.id, m.id, { status: 'active' });
                        loadAll();
                      }}
                      className="px-3 py-1 rounded text-xs font-semibold"
                      style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--green)', border: '1px solid rgba(34,197,94,0.25)' }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={async () => {
                        await members.remove(ownedLeague.id, m.id);
                        loadAll();
                      }}
                      className="px-3 py-1 rounded text-xs font-semibold"
                      style={{ background: 'rgba(232,48,42,0.1)', color: 'var(--accent)', border: '1px solid rgba(232,48,42,0.25)' }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <Card>
            <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text3)' }}>
                Pending Invites ({pendingInvites.length})
              </span>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {pendingInvites.map(m => (
                <div key={m.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    {m.name ? (
                      <>
                        <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{m.name}</span>
                        <span className="ml-3 text-xs" style={{ color: 'var(--text3)' }}>iRacing #{m.iracing_cust_id}</span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-sm" style={{ color: 'var(--text2)' }}>iRacing #{m.invited_iracing_cust_id}</span>
                        <span className="ml-3 text-xs italic" style={{ color: 'var(--text3)' }}>awaiting signup</span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => handleRevoke(m.id)}
                    className="px-3 py-1 rounded text-xs font-semibold"
                    style={{ background: 'var(--bg3)', color: 'var(--text3)', border: '1px solid var(--border2)' }}
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Driver roster table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['#', 'Driver', 'Car', 'Car No.', 'iRating', 'Safety', 'Starts', 'Wins', 'Podiums', 'Points', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-widest font-semibold whitespace-nowrap" style={{ color: 'var(--text3)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {driverList.map((driver, i) => (
                  <tr key={driver.id} className="table-row" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3">
                      <PosBadge pos={i + 1} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openDetail(driver)}
                        className="font-semibold text-sm hover:underline text-left"
                        style={{ color: 'var(--text)', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        {driver.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--text2)' }}>
                      {driver.car_model || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const membership = membershipByIR[String(driver.iracing_cust_id)];
                        const displayNum = membership?.car_number ?? driver.car_number;
                        const isEditing = carNumEdit?.driverId === driver.id;
                        if (isEditing) {
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <input
                                autoFocus
                                value={carNumEdit.value}
                                onChange={e => setCarNumEdit(v => ({ ...v, value: e.target.value }))}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') saveCarNumber(driver);
                                  if (e.key === 'Escape') { setCarNumEdit(null); setCarNumError(''); }
                                }}
                                onBlur={() => saveCarNumber(driver)}
                                placeholder="e.g. 44"
                                style={{ width: 56, padding: '3px 6px', borderRadius: 4, background: 'var(--bg3)', border: '1px solid var(--accent)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
                              />
                              {carNumError && <span style={{ fontSize: 10, color: 'var(--accent)' }}>{carNumError}</span>}
                            </div>
                          );
                        }
                        return (
                          <button
                            onClick={() => { setCarNumError(''); setCarNumEdit({ driverId: driver.id, value: displayNum || '' }); }}
                            title="Click to override car number"
                            style={{ background: 'none', border: 'none', cursor: membership ? 'pointer' : 'default', padding: 0 }}
                          >
                            {displayNum ? (
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded font-display font-bold text-sm"
                                style={{ background: 'var(--bg4)', color: 'var(--text)' }}>
                                #{displayNum}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text3)', fontSize: 13 }}>{membership ? '+ set' : '—'}</span>
                            )}
                          </button>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      {driver.irating?.toLocaleString() || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Badge label={driver.safety_rating_class || '?'} variant={driver.safety_rating_class || 'inactive'} />
                        <span className="text-sm" style={{ color: 'var(--text2)' }}>
                          {driver.safety_rating_value?.toFixed(2) || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text2)' }}>{driver.starts || 0}</td>
                    <td className="px-4 py-3 text-sm font-semibold" style={{ color: driver.wins > 0 ? 'var(--gold)' : 'var(--text2)' }}>
                      {driver.wins || 0}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text2)' }}>{driver.podiums || 0}</td>
                    <td className="px-4 py-3">
                      <span className="font-display font-bold text-base" style={{ color: 'var(--text)' }}>
                        {driver.total_points || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={driver.status} variant={driver.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setEditDriver(driver)}
                          className="px-2.5 py-1 rounded text-xs font-semibold"
                          style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border2)' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(driver.id, driver.name)}
                          className="px-2.5 py-1 rounded text-xs font-semibold"
                          style={{ background: 'rgba(232,48,42,0.1)', color: 'var(--accent)', border: '1px solid rgba(232,48,42,0.25)' }}
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && driverList.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-5 py-12 text-center text-sm" style={{ color: 'var(--text3)' }}>
                      No drivers in roster
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {addModal && (
        <DriverModal
          title="Add Driver"
          onClose={() => setAddModal(false)}
          onSave={async (data) => {
            await drivers.create(data);
            await loadAll();
            setAddModal(false);
          }}
        />
      )}

      {editDriver && (
        <DriverModal
          title="Edit Driver"
          initial={editDriver}
          onClose={() => setEditDriver(null)}
          onSave={async (data) => {
            await drivers.update(editDriver.id, data);
            await loadAll();
            setEditDriver(null);
          }}
        />
      )}

      {inviteModal && (
        <InviteDriverModal
          leagueId={ownedLeague?.id}
          onClose={() => setInviteModal(false)}
          onSent={() => { loadAll(); setInviteModal(false); }}
        />
      )}

      {detailDriver && (
        <DriverDetailModal driver={detailDriver} onClose={() => setDetailDriver(null)} />
      )}
    </div>
  );
}

function InviteDriverModal({ leagueId, onClose, onSent }) {
  const [iracingId, setIracingId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await members.invite(leagueId, iracingId.trim());
      onSent();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Invite Driver" onClose={onClose} width={440}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm" style={{ color: 'var(--text3)' }}>
          Enter the driver's iRacing Customer ID. They'll receive an invite in their dashboard — if they don't have an APRL account yet, the invite will be waiting when they sign up.
        </p>
        <Input
          label="iRacing Customer ID"
          placeholder="e.g. 123456"
          value={iracingId}
          onChange={e => setIracingId(e.target.value)}
          required
          autoFocus
        />
        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(232,48,42,0.1)', color: 'var(--accent)', border: '1px solid rgba(232,48,42,0.25)', fontSize: 13 }}>
            {error}
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Sending...' : 'Send Invite'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function DriverModal({ title, initial, onClose, onSave }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    iracing_cust_id: initial?.iracing_cust_id || '',
    car_number: initial?.car_number || '',
    car_model: initial?.car_model || '',
    irating: initial?.irating || '',
    safety_rating_class: initial?.safety_rating_class || 'B',
    safety_rating_value: initial?.safety_rating_value || '',
    status: initial?.status || 'active',
  });
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
    <Modal title={title} onClose={onClose} width={520}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="col-span-2" />
          <Input label="Car Number" placeholder="#44" value={form.car_number} onChange={e => setForm(f => ({ ...f, car_number: e.target.value }))} />
          <Input label="iRacing Customer ID" value={form.iracing_cust_id} onChange={e => setForm(f => ({ ...f, iracing_cust_id: e.target.value }))} />
        </div>
        <Input label="Car Model" placeholder="BMW M4 GT3" value={form.car_model} onChange={e => setForm(f => ({ ...f, car_model: e.target.value }))} />
        <div className="grid grid-cols-3 gap-4">
          <Input label="iRating" type="number" value={form.irating} onChange={e => setForm(f => ({ ...f, irating: e.target.value }))} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text2)' }}>SR Class</label>
            <select value={form.safety_rating_class} onChange={e => setForm(f => ({ ...f, safety_rating_class: e.target.value }))}
              className="w-full px-3 py-2 rounded-md text-sm"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)' }}>
              {['A', 'B', 'C', 'D', 'R'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Input label="SR Value" type="number" step="0.01" value={form.safety_rating_value} onChange={e => setForm(f => ({ ...f, safety_rating_value: e.target.value }))} />
        </div>
        {initial && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text2)' }}>Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full px-3 py-2 rounded-md text-sm"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)' }}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Driver'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function DriverDetailModal({ driver, onClose }) {
  return (
    <Modal title={driver.name} onClose={onClose} width={600}>
      <div className="space-y-5">
        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'iRating', value: driver.irating?.toLocaleString() || '—' },
            { label: 'Safety Rating', value: `${driver.safety_rating_class} ${driver.safety_rating_value?.toFixed(2) || ''}` },
            { label: 'Starts', value: driver.starts || 0 },
            { label: 'Wins', value: driver.wins || 0 },
            { label: 'Podiums', value: driver.podiums || 0 },
            { label: 'Total Points', value: driver.total_points || 0 },
            { label: 'Car', value: driver.car_model || '—' },
            { label: 'Car No.', value: driver.car_number ? `#${driver.car_number}` : '—' },
          ].map(s => (
            <div key={s.label} className="rounded-md px-3 py-3" style={{ background: 'var(--bg3)' }}>
              <div className="text-xs uppercase tracking-widest" style={{ color: 'var(--text3)' }}>{s.label}</div>
              <div className="font-semibold text-sm mt-1" style={{ color: 'var(--text)' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Race history */}
        {driver.history?.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--text3)' }}>Race History</div>
            <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
                    {['Round', 'Track', 'Finish', 'Points', 'Incidents'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--text3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {driver.history.map(r => (
                    <tr key={r.id} className="table-row" style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-4 py-2.5 text-sm font-semibold" style={{ color: 'var(--accent)' }}>R{r.round_number}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--text)' }}>{r.track_name}</td>
                      <td className="px-4 py-2.5"><PosBadge pos={r.finish_position} /></td>
                      <td className="px-4 py-2.5 text-sm font-semibold" style={{ color: 'var(--text)' }}>{r.points_awarded || 0}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--text2)' }}>{r.incidents || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
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

function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  );
}
