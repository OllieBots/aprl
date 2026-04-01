import { Outlet, NavLink, useLocation, Navigate, Link } from 'react-router-dom';
import { useEffect } from 'react';
import useLeagueStore from '../store/useLeagueStore';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: IconDashboard, exact: true },
  { to: '/admin/schedule', label: 'Race Schedule', icon: IconCalendar },
  { to: '/admin/results', label: 'Race Results', icon: IconFlag },
  { to: '/admin/drivers', label: 'Driver Roster', icon: IconUsers },
  { to: '/admin/standings', label: 'Standings', icon: IconTrophy },
  { to: '/admin/irt', label: 'IRT Intake', icon: IconIRT },
];

const CONFIG_ITEMS = [
  { to: '/admin/iracing', label: 'iRacing API', icon: IconCloud },
  { to: '/admin/discord', label: 'Discord Bot', icon: IconChat },
  { to: '/admin/settings', label: 'League Settings', icon: IconSettings },
];

export default function AdminLayout() {
  const { league, fetchLeague, fetchSeasons } = useLeagueStore();
  const { user, ownedLeague, loading } = useAuth();

  useEffect(() => {
    fetchLeague();
    fetchSeasons();
  }, []);

  if (loading) return null;

  if (!user) return <Navigate to="/login" replace />;

  if (!ownedLeague) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>No league found</div>
        <p style={{ fontSize: 14, color: 'var(--text3)' }}>You need to create a league first.</p>
        <Link to="/dashboard" style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Go to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col w-56 flex-shrink-0 h-full overflow-y-auto"
        style={{ background: 'var(--bg2)', borderRight: '1px solid var(--border)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div
            className="flex items-center justify-center w-9 h-9 rounded-md text-white font-display font-bold text-lg"
            style={{ background: 'var(--accent)' }}
          >
            A
          </div>
          <div>
            <div className="font-display font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--text)' }}>
              {league?.name ? abbreviate(league.name) : 'APRL'}
            </div>
            <div className="text-xs" style={{ color: 'var(--text3)' }}>Admin Panel</div>
          </div>
        </div>

        {/* Main Nav */}
        <nav className="flex-1 px-3 pt-4 pb-2">
          <div className="mb-1 px-2 text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--text3)' }}>
            Management
          </div>
          {NAV_ITEMS.map(item => (
            <SideNavLink key={item.to} {...item} />
          ))}

          <div className="mt-6 mb-1 px-2 text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--text3)' }}>
            Configuration
          </div>
          {CONFIG_ITEMS.map(item => (
            <SideNavLink key={item.to} {...item} />
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
          <Link to="/dashboard" style={{ display: 'block', fontSize: 12, color: 'var(--text3)', textDecoration: 'none' }}>← Driver Dashboard</Link>
          <div className="text-xs" style={{ color: 'var(--text3)' }}>APRL v1.0</div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
        <Outlet />
      </main>
    </div>
  );
}

function SideNavLink({ to, label, icon: Icon, exact }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md mb-0.5 text-sm font-medium transition-all ${
          isActive
            ? 'text-white bg-accent/10 border-l-2 border-accent pl-[10px]'
            : 'text-text2 hover:text-text hover:bg-bg4'
        }`
      }
      style={({ isActive }) => ({
        color: isActive ? 'var(--text)' : 'var(--text2)',
        background: isActive ? 'rgba(232,48,42,0.1)' : undefined,
        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
      })}
    >
      <Icon size={16} />
      {label}
    </NavLink>
  );
}

function abbreviate(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 4).toUpperCase();
}

// --- Inline SVG Icons ---
function IconDashboard({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  );
}
function IconCalendar({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}
function IconFlag({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
    </svg>
  );
}
function IconUsers({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
function IconTrophy({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8 21 12 21 16 21"/><line x1="12" y1="17" x2="12" y2="21"/><path d="M7 4H17l-1 7a5 5 0 0 1-8 0L7 4z"/><path d="M5 4H3v3a4 4 0 0 0 4 4"/><path d="M19 4h2v3a4 4 0 0 1-4 4"/>
    </svg>
  );
}
function IconCloud({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
    </svg>
  );
}
function IconChat({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
function IconIRT({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}
function IconSettings({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}
