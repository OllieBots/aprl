import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';

const NEWS = [
  {
    id: 1,
    date: 'Mar 28, 2026',
    category: 'Platform',
    title: 'APRL v1.0 launches — free league management for iRacing',
    excerpt: 'Today we\'re opening APRL to all iRacing league admins. Create your league, import results directly from iRacing, and post standings to Discord automatically.',
  },
  {
    id: 2,
    date: 'Mar 25, 2026',
    category: 'Feature',
    title: 'Discord bot now supports live race countdown commands',
    excerpt: 'The /nextrace command now posts a live countdown embed that updates in real-time. Configure your bot in the Admin panel under Discord settings.',
  },
  {
    id: 3,
    date: 'Mar 20, 2026',
    category: 'Guide',
    title: 'How to import race results from iRacing in under 60 seconds',
    excerpt: 'Grab your subsession ID from iRacing, paste it into the Results page, and APRL pulls in full lap data, incidents, and positions automatically.',
  },
];

const SPONSORS = [
  { id: 1, name: 'Sponsor One',   placeholder: true },
  { id: 2, name: 'Sponsor Two',   placeholder: true },
  { id: 3, name: 'Sponsor Three', placeholder: true },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [recruitingLeagues, setRecruitingLeagues] = useState([]);

  useEffect(() => {
    api.get('/public/leagues', { params: { recruiting: 1 } })
      .then(setRecruitingLeagues)
      .catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <Nav />
      <Hero />
      <SponsorBanner sponsors={SPONSORS} />
      <OpenRecruitment leagues={recruitingLeagues} />
      <DriverSearch />
      <SponsorBanner sponsors={SPONSORS} slim />
      <NewsSection articles={NEWS} />
      <Footer />
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav
      className="sticky top-0 z-40"
      style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="max-w-6xl mx-auto px-8 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 no-underline">
          <div
            className="flex items-center justify-center w-8 h-8 rounded font-display font-bold text-sm text-white flex-shrink-0"
            style={{ background: 'var(--accent)' }}
          >
            A
          </div>
          <span
            className="font-display font-bold text-base uppercase tracking-wider"
            style={{ color: 'var(--text)', letterSpacing: '0.08em' }}
          >
            APRL
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-8">
          {[
            { label: 'Leagues', href: '#leagues' },
            { label: 'Drivers', href: '#drivers' },
            { label: 'News',    href: '#news' },
          ].map(item => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-semibold"
              style={{ color: 'var(--text2)', textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}
            >
              {item.label}
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            to="/login"
            className="px-4 py-2 rounded-md text-sm font-semibold"
            style={{ color: 'var(--text2)', textDecoration: 'none', border: '1px solid var(--border2)' }}
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold"
            style={{ background: 'var(--accent)', color: 'white', textDecoration: 'none' }}
          >
            Join APRL
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'var(--accent)' }} />

      {/* Grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-8 py-20 text-center">
        <div
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full mb-6"
          style={{ background: 'rgba(232,48,42,0.12)', color: 'var(--accent)', border: '1px solid rgba(232,48,42,0.25)' }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--accent)' }}
          />
          iRacing League Management
        </div>

        <h1
          className="font-display font-bold uppercase leading-none mb-5"
          style={{ fontSize: '4.5rem', color: 'var(--text)', letterSpacing: '0.03em' }}
        >
          Run your league.<br />
          <span style={{ color: 'var(--accent)' }}>The right way.</span>
        </h1>

        <p className="text-lg max-w-2xl mx-auto mb-10" style={{ color: 'var(--text2)', lineHeight: 1.7 }}>
          APRL gives iRacing league admins a full management suite — standings, results,
          Discord integration, and driver rosters — all in one place.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md font-semibold text-base"
            style={{ background: 'var(--accent)', color: 'white', textDecoration: 'none' }}
          >
            Create your league
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
          <a
            href="#leagues"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md font-semibold text-base"
            style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border2)', textDecoration: 'none' }}
          >
            Browse open leagues
          </a>
        </div>

        {/* Platform stats */}
        <div className="flex items-center justify-center gap-12 mt-14">
          {[
            { value: '12',  label: 'Active Leagues' },
            { value: '340', label: 'Registered Drivers' },
            { value: '180', label: 'Races Completed' },
            { value: '24',  label: 'Seasons Run' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div
                className="font-display font-bold text-3xl"
                style={{ color: 'var(--text)', letterSpacing: '0.02em' }}
              >
                {s.value}
              </div>
              <div className="text-xs uppercase tracking-widest mt-1" style={{ color: 'var(--text3)' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Sponsor Banner ───────────────────────────────────────────────────────────

function SponsorBanner({ sponsors, slim = false }) {
  return (
    <div
      className="w-full"
      style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}
    >
      <div className={`max-w-6xl mx-auto px-8 ${slim ? 'py-4' : 'py-6'}`}>
        <div className="flex items-center gap-6">
          <span
            className="text-xs uppercase tracking-widest font-semibold flex-shrink-0"
            style={{ color: 'var(--text3)' }}
          >
            Sponsors
          </span>
          <div className="flex items-center gap-4 flex-1">
            {sponsors.map(s => (
              <div
                key={s.id}
                className="flex-1 rounded flex items-center justify-center font-semibold text-sm"
                style={{
                  height: slim ? 36 : 52,
                  background: 'var(--bg4)',
                  border: '1px dashed var(--border2)',
                  color: 'var(--text3)',
                  cursor: 'pointer',
                }}
              >
                {s.name}
              </div>
            ))}
            <div
              className="flex-1 rounded flex items-center justify-center text-xs font-semibold"
              style={{
                height: slim ? 36 : 52,
                background: 'transparent',
                border: '1px dashed rgba(232,48,42,0.3)',
                color: 'var(--accent)',
                cursor: 'pointer',
              }}
            >
              + Your ad here
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Open Recruitment ─────────────────────────────────────────────────────────

function OpenRecruitment({ leagues }) {
  return (
    <section id="leagues" className="py-16">
      <div className="max-w-6xl mx-auto px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>
              Open Now
            </div>
            <h2 className="font-display font-bold text-3xl uppercase" style={{ color: 'var(--text)', letterSpacing: '0.04em' }}>
              Leagues Recruiting
            </h2>
          </div>
          <span className="text-sm" style={{ color: 'var(--text3)' }}>
            {leagues.length} league{leagues.length !== 1 ? 's' : ''} with open spots
          </span>
        </div>

        {leagues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text3)', fontSize: 14 }}>
            No leagues are currently recruiting. Check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {leagues.map(league => (
              <LeagueCard key={league.id} league={league} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function LeagueCard({ league }) {
  const navigate = useNavigate();
  const [applying, setApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState('');

  const spotsLeft = league.open_spots ?? null;
  const totalSpots = league.total_spots ?? null;
  const pctFull = spotsLeft != null && totalSpots != null && totalSpots > 0
    ? Math.round(((totalSpots - spotsLeft) / totalSpots) * 100)
    : null;
  const urgency = spotsLeft == null ? 'var(--blue)'
    : spotsLeft <= 3 ? 'var(--accent)'
    : spotsLeft <= 7 ? 'var(--gold)'
    : 'var(--green)';

  const accentColor = league.primary_color || 'var(--accent)';

  async function handleApply() {
    try {
      setApplying(true);
      setApplyMsg('');
      await api.post(`/user/leagues/${league.slug}/join`);
      setApplyMsg('Request sent! Waiting for admin approval.');
    } catch (err) {
      if (err.message?.includes('already') || err.message?.includes('pending') || err.message?.includes('invited')) {
        setApplyMsg(err.message);
      } else if (err.message?.includes('401') || err.message?.includes('auth')) {
        navigate('/login');
      } else {
        // Not authenticated — redirect to login
        navigate('/login');
      }
    } finally {
      setApplying(false);
    }
  }

  const details = [];
  if (league.race_day && league.race_time) details.push({ icon: '📅', text: `${league.race_day} · ${league.race_time}` });
  else if (league.race_day) details.push({ icon: '📅', text: league.race_day });
  if (league.season_name) details.push({ icon: '🏁', text: league.season_name });
  if (league.irating_min != null || league.irating_max != null) {
    const min = league.irating_min ?? 0;
    const text = league.irating_max
      ? `iRating: ${min.toLocaleString()}–${league.irating_max.toLocaleString()}`
      : `iRating: ${min.toLocaleString()}+`;
    details.push({ icon: '📊', text });
  }

  return (
    <div className="rounded-md flex flex-col overflow-hidden" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
      {/* Top color stripe */}
      <div className="h-0.5" style={{ background: accentColor }} />

      <div className="p-5 flex-1">
        {/* Badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {league.car_class && <SmallBadge label={league.car_class} color={accentColor} />}
          {league.skill_level && <SmallBadge label={league.skill_level} color="var(--blue)" />}
          <SmallBadge label="iRacing" color="var(--text3)" />
        </div>

        {/* Name + series */}
        <h3 className="font-display font-bold text-lg uppercase mb-1 leading-tight" style={{ color: 'var(--text)', letterSpacing: '0.03em' }}>
          {league.name}
        </h3>
        {league.series && <div className="text-sm mb-3" style={{ color: accentColor }}>{league.series}</div>}

        {/* Description */}
        {(league.recruitment_blurb || league.description) && (
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text2)' }}>
            {league.recruitment_blurb || league.description}
          </p>
        )}

        {/* Details */}
        {details.length > 0 && (
          <div className="space-y-1.5 mb-4">
            {details.map(d => (
              <div key={d.text} className="flex items-center gap-2">
                <span className="text-xs">{d.icon}</span>
                <span className="text-xs" style={{ color: 'var(--text2)' }}>{d.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Spots fill bar */}
        {pctFull != null && (
          <>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text3)' }}>
                {totalSpots - spotsLeft}/{totalSpots} spots filled
              </span>
              <span className="text-xs font-semibold" style={{ color: urgency }}>
                {spotsLeft} open
              </span>
            </div>
            <div className="rounded-full overflow-hidden h-1.5" style={{ background: 'var(--bg4)' }}>
              <div className="h-full rounded-full" style={{ width: `${pctFull}%`, background: urgency }} />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-5 space-y-2">
        {applyMsg && (
          <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>{applyMsg}</p>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <Link
            to={`/league/${league.slug}`}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 7, textAlign: 'center',
              fontSize: 13, fontWeight: 600, textDecoration: 'none',
              background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border2)',
            }}
          >
            View League
          </Link>
          <button
            onClick={handleApply}
            disabled={applying || !!applyMsg}
            style={{
              flex: 2, padding: '9px 0', borderRadius: 7, fontSize: 13, fontWeight: 700,
              background: applyMsg ? 'var(--bg3)' : `${accentColor}20`,
              color: applyMsg ? 'var(--text3)' : accentColor,
              border: `1px solid ${applyMsg ? 'var(--border2)' : accentColor + '40'}`,
              cursor: applying || applyMsg ? 'default' : 'pointer',
              opacity: applying ? 0.7 : 1,
            }}
          >
            {applying ? 'Applying...' : applyMsg ? 'Applied ✓' : 'Apply to Join'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Driver Search ────────────────────────────────────────────────────────────

function DriverSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();
  const timerRef = useRef(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get('/public/drivers', { params: { q: query.trim() } });
        setResults(data);
        setSearched(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  return (
    <section id="drivers" className="py-16" style={{ borderTop: '1px solid var(--border)' }}>
      <div className="max-w-6xl mx-auto px-8">
        {/* Heading */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>
              Community
            </div>
            <h2 className="font-display font-bold text-3xl uppercase" style={{ color: 'var(--text)', letterSpacing: '0.04em' }}>
              Find a Driver
            </h2>
          </div>
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', maxWidth: 480, marginBottom: 24 }}>
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by iRacing name…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: '100%', height: 44, paddingLeft: 42, paddingRight: 16,
              background: 'var(--bg2)', border: '1px solid var(--border2)',
              borderRadius: 8, fontSize: 14, color: 'var(--text)',
              outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border2)'}
          />
          {loading && (
            <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 12 }}>
              …
            </div>
          )}
        </div>

        {/* Results */}
        {searched && results.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>No drivers found for "{query}"</p>
        )}
        {results.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {results.map(d => (
              <div
                key={d.id}
                onClick={() => navigate(`/driver/${d.id}`)}
                style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
                  padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {/* Number */}
                <div style={{
                  width: 44, height: 44, borderRadius: 8, background: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: d.car_number ? 13 : 18, fontWeight: 900, color: '#fff', flexShrink: 0,
                }}>
                  {d.car_number ? `#${d.car_number}` : d.name?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {d.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                    {d.car_model || 'No car set'}
                    {d.irating ? ` · iR ${d.irating.toLocaleString()}` : ''}
                  </div>
                  {d.active_leagues > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>
                      {d.active_leagues} league{d.active_leagues > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text3)', flexShrink: 0 }}>
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
            ))}
          </div>
        )}

        {!searched && (
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>
            Search for any registered driver to view their profile and career stats.
          </p>
        )}
      </div>
    </section>
  );
}

// ─── News ─────────────────────────────────────────────────────────────────────

function NewsSection({ articles }) {
  return (
    <section
      id="news"
      className="py-16"
      style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)' }}
    >
      <div className="max-w-6xl mx-auto px-8">
        <div className="mb-8">
          <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>
            Latest
          </div>
          <h2
            className="font-display font-bold text-3xl uppercase"
            style={{ color: 'var(--text)', letterSpacing: '0.04em' }}
          >
            News & Updates
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {articles.map((article, i) => (
            <NewsCard key={article.id} article={article} featured={i === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}

function NewsCard({ article, featured }) {
  return (
    <div
      className="rounded-md p-5 flex flex-col gap-3 cursor-pointer"
      style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div className="flex items-center justify-between">
        <SmallBadge label={article.category} color="var(--blue)" />
        <span className="text-xs" style={{ color: 'var(--text3)' }}>{article.date}</span>
      </div>
      <h3
        className={`font-display font-bold uppercase leading-tight ${featured ? 'text-lg' : 'text-base'}`}
        style={{ color: 'var(--text)', letterSpacing: '0.03em' }}
      >
        {article.title}
      </h3>
      <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--text2)' }}>
        {article.excerpt}
      </p>
      <span
        className="text-xs font-semibold"
        style={{ color: 'var(--accent)' }}
      >
        Read more →
      </span>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)' }}>
      <div className="max-w-6xl mx-auto px-8 py-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-7 h-7 rounded font-display font-bold text-xs text-white"
            style={{ background: 'var(--accent)' }}
          >
            A
          </div>
          <span className="font-display font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--text2)' }}>
            APRL — Apex Pro Racing League Tool
          </span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="text-xs" style={{ color: 'var(--text3)', textDecoration: 'none' }}>Terms</a>
          <a href="#" className="text-xs" style={{ color: 'var(--text3)', textDecoration: 'none' }}>Privacy</a>
          <Link to="/login" className="text-xs" style={{ color: 'var(--text3)', textDecoration: 'none' }}>Driver Login</Link>
        </div>
      </div>
    </footer>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function SmallBadge({ label, color }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide"
      style={{
        background: `${color}18`,
        color: color,
        border: `1px solid ${color}35`,
      }}
    >
      {label}
    </span>
  );
}
