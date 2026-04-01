import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';
import Button from './Button';
import { irt } from '../lib/api';
import { relativeTime } from '../lib/utils';

const STATUS_OPTIONS = [
  { value: 'open',         label: 'Open',         color: '#60a5fa' },
  { value: 'under_review', label: 'Under Review',  color: 'var(--gold)' },
  { value: 'resolved',     label: 'Resolved',      color: 'var(--green)' },
  { value: 'dismissed',    label: 'Dismissed',     color: 'var(--text3)' },
];

const VOTE_OPTIONS = [
  { value: 'guilty',    label: 'Guilty',     color: 'var(--accent)' },
  { value: 'not_guilty',label: 'Not Guilty', color: 'var(--green)' },
  { value: 'abstain',   label: 'Abstain',    color: 'var(--text3)' },
];

function parseDrivers(val) {
  if (!val) return [];
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val;
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch { return []; }
}

export default function IRTDetailModal({ incident: initial, onClose, onSaved }) {
  const { user } = useAuth();
  const [detail, setDetail] = useState(initial);
  const [status, setStatus] = useState(initial.status);
  const [adminNotes, setAdminNotes] = useState(initial.admin_notes || '');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = detail.userRole === 'admin';
  const myVote = detail.votes?.find(v => v.user_id === user?.id)?.vote;
  const tally = {
    guilty:    detail.votes?.filter(v => v.vote === 'guilty').length ?? 0,
    not_guilty:detail.votes?.filter(v => v.vote === 'not_guilty').length ?? 0,
    abstain:   detail.votes?.filter(v => v.vote === 'abstain').length ?? 0,
  };
  const drivers = parseDrivers(detail.involved_drivers);

  async function refreshDetail() {
    const updated = await irt.get(detail.id);
    setDetail(updated);
  }

  async function handleVote(v) {
    try {
      if (myVote === v) {
        await irt.removeVote(detail.id);
      } else {
        await irt.vote(detail.id, v);
      }
      await refreshDetail();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    setCommenting(true);
    try {
      await irt.comment(detail.id, comment);
      setComment('');
      await refreshDetail();
    } catch (err) {
      setError(err.message);
    } finally {
      setCommenting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await irt.update(detail.id, { status, admin_notes: adminNotes });
      const updated = { ...detail, status, admin_notes: adminNotes };
      setDetail(updated);
      onSaved?.(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const adminDirty = status !== detail.status || adminNotes !== (detail.admin_notes || '');

  return (
    <Modal title={`Incident #${detail.id}`} onClose={onClose} width={680}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Meta */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: 'Reported By', value: detail.reporter_name },
            { label: 'Race', value: detail.track_name ? `R${detail.round_number} — ${detail.track_name}` : '—' },
            { label: 'Session / Lap', value: [detail.session_type, detail.lap_number ? `Lap ${detail.lap_number}` : null].filter(Boolean).join(' · ') || '—' },
          ].map(item => (
            <div key={item.label} style={{ background: 'var(--bg3)', borderRadius: 6, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: 3 }}>{item.label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Drivers involved */}
        {drivers.length > 0 && (
          <div>
            <SectionLabel>Drivers Involved</SectionLabel>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {drivers.map((d, i) => (
                <span key={i} style={{ fontSize: 13, fontWeight: 600, padding: '4px 10px', borderRadius: 5, background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border2)' }}>
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Explanation */}
        <div>
          <SectionLabel>Explanation</SectionLabel>
          <div style={{ background: 'var(--bg3)', borderRadius: 6, padding: '12px 14px', fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, whiteSpace: 'pre-wrap', border: '1px solid var(--border)' }}>
            {detail.explanation}
          </div>
        </div>

        {/* Clip */}
        {detail.clip_url && (
          <div>
            <SectionLabel>Clip</SectionLabel>
            <a href={detail.clip_url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 13, color: '#60a5fa', wordBreak: 'break-all' }}>
              {detail.clip_url}
            </a>
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--border)' }} />

        {/* Voting */}
        <div>
          <SectionLabel>Vote</SectionLabel>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {VOTE_OPTIONS.map(opt => {
              const isActive = myVote === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleVote(opt.value)}
                  style={{
                    padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    border: `1px solid ${isActive ? opt.color : 'var(--border2)'}`,
                    background: isActive ? `${opt.color}25` : 'var(--bg3)',
                    color: isActive ? opt.color : 'var(--text2)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {opt.label}
                  {tally[opt.value] > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '1px 5px', borderRadius: 10,
                      background: isActive ? `${opt.color}40` : 'var(--bg4)', color: isActive ? opt.color : 'var(--text3)' }}>
                      {tally[opt.value]}
                    </span>
                  )}
                </button>
              );
            })}
            {myVote && (
              <span style={{ fontSize: 12, color: 'var(--text3)', alignSelf: 'center', marginLeft: 4 }}>
                Click your vote again to remove it
              </span>
            )}
          </div>

          {/* Vote breakdown */}
          {detail.votes?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {detail.votes.map(v => {
                const opt = VOTE_OPTIONS.find(o => o.value === v.vote);
                const isMe = v.user_id === user?.id;
                return (
                  <div key={v.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 10px', borderRadius: 5, background: 'var(--bg3)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: isMe ? 700 : 400 }}>
                      {v.name}{isMe && ' (you)'}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                      background: `${opt?.color ?? 'var(--text3)'}20`, color: opt?.color ?? 'var(--text3)',
                      border: `1px solid ${opt?.color ?? 'var(--text3)'}40` }}>
                      {opt?.label ?? v.vote}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>{relativeTime(v.created_at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--border)' }} />

        {/* Discussion */}
        <div>
          <SectionLabel>Discussion</SectionLabel>
          {detail.comments?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, maxHeight: 220, overflowY: 'auto' }}>
              {detail.comments.map(c => {
                const isMe = c.user_id === user?.id;
                return (
                  <div key={c.id} style={{ background: 'var(--bg3)', borderRadius: 6, padding: '10px 12px', border: isMe ? '1px solid rgba(232,48,42,0.2)' : '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: isMe ? 'var(--accent)' : 'var(--text2)' }}>
                        {c.name}{isMe && ' (you)'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{relativeTime(c.created_at)}</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{c.body}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 10 }}>No discussion yet.</p>
          )}
          <form onSubmit={handleComment} style={{ display: 'flex', gap: 8 }}>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 6, fontSize: 13, background: 'var(--bg3)',
                border: '1px solid var(--border2)', color: 'var(--text)', resize: 'none', outline: 'none', lineHeight: 1.5 }}
            />
            <button
              type="submit"
              disabled={commenting || !comment.trim()}
              style={{ padding: '0 16px', borderRadius: 6, background: 'var(--accent)', color: '#fff',
                fontWeight: 700, fontSize: 13, border: 'none', cursor: comment.trim() ? 'pointer' : 'not-allowed',
                opacity: comment.trim() ? 1 : 0.5, alignSelf: 'stretch' }}
            >
              {commenting ? '...' : 'Post'}
            </button>
          </form>
        </div>

        {/* Admin-only controls */}
        {isAdmin && (
          <>
            <div style={{ borderTop: '1px solid var(--border)' }} />
            <div>
              <SectionLabel>Status</SectionLabel>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setStatus(opt.value)}
                    style={{
                      padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${status === opt.value ? opt.color : 'var(--border2)'}`,
                      background: status === opt.value ? `${opt.color}20` : 'var(--bg3)',
                      color: status === opt.value ? opt.color : 'var(--text2)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <SectionLabel>Admin Notes</SectionLabel>
              <textarea
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                placeholder="Decision, penalty, or notes for the record..."
                rows={3}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, fontSize: 13,
                  background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)',
                  resize: 'vertical', lineHeight: 1.5, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </>
        )}

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(232,48,42,0.1)', color: 'var(--accent)', border: '1px solid rgba(232,48,42,0.25)', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>Submitted {relativeTime(detail.created_at)}</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={onClose}>Close</Button>
            {isAdmin && (
              <Button onClick={handleSave} disabled={saving || !adminDirty}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: 8 }}>
      {children}
    </div>
  );
}
