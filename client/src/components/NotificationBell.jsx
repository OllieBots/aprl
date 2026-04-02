import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notifications as notifApi } from '../lib/api';

const TYPE_ICONS = {
  invite:       '📨',
  join_approved:'✅',
  join_rejected:'❌',
  join_request: '🙋',
  irt_submitted:'⚠️',
  irt_status:   '⚖️',
  result:       '🏁',
};

function timeAgo(epochSecs) {
  const diff = Math.floor(Date.now() / 1000) - epochSecs;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell() {
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function load() {
    try {
      const d = await notifApi.list();
      setData(d);
    } catch {}
  }

  async function handleClick(notif) {
    await notifApi.markRead(notif.id);
    setOpen(false);
    setData(prev => ({
      notifications: prev.notifications.map(n => n.id === notif.id ? { ...n, read: true } : n),
      unread: Math.max(0, prev.unread - (notif.read ? 0 : 1)),
    }));
    if (notif.link_path) navigate(notif.link_path);
  }

  async function markAllRead() {
    await notifApi.markAllRead();
    setData(prev => ({
      notifications: prev.notifications.map(n => ({ ...n, read: true })),
      unread: 0,
    }));
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Notifications"
        style={{
          position: 'relative', background: 'none', border: 'none', cursor: 'pointer',
          color: open ? 'var(--text)' : 'var(--text2)', padding: '4px 6px',
          display: 'flex', alignItems: 'center', borderRadius: 6,
          transition: 'color 0.15s',
        }}
      >
        <BellIcon size={18} />
        {data.unread > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            background: 'var(--accent)', color: '#fff',
            borderRadius: '50%', width: 16, height: 16,
            fontSize: 9, fontWeight: 800, lineHeight: '16px', textAlign: 'center',
            pointerEvents: 'none',
          }}>
            {data.unread > 9 ? '9+' : data.unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          width: 320, background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.35)', zIndex: 200,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '10px 14px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
              Notifications
              {data.unread > 0 && (
                <span style={{
                  marginLeft: 6, background: 'var(--accent)', color: '#fff',
                  borderRadius: 10, padding: '1px 6px', fontSize: 11,
                }}>
                  {data.unread}
                </span>
              )}
            </span>
            {data.unread > 0 && (
              <button
                onClick={markAllRead}
                style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {data.notifications.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text3)' }}>
                No notifications yet
              </div>
            ) : (
              data.notifications.slice(0, 25).map(n => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{
                    padding: '10px 14px',
                    cursor: n.link_path ? 'pointer' : 'default',
                    borderBottom: '1px solid var(--border)',
                    background: n.read ? 'transparent' : 'rgba(232,48,42,0.05)',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (n.link_path) e.currentTarget.style.background = 'var(--bg3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(232,48,42,0.05)'; }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>
                    {TYPE_ICONS[n.type] || '🔔'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.45, wordBreak: 'break-word' }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                      {timeAgo(n.created_at)}
                      {n.league_name && <span style={{ opacity: 0.7 }}> · {n.league_name}</span>}
                    </div>
                  </div>
                  {!n.read && (
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', marginTop: 4, flexShrink: 0 }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}
