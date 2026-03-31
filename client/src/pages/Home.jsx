import { useState } from 'react';
import { Link } from 'react-router-dom';

// ─── Mock data (replace with API calls later) ────────────────────────────────

const OPEN_LEAGUES = [
  {
    id: 1,
    name: 'Apex Pro Racing League',
    series: 'GT3 Championship',
    car_class: 'GT3',
    platform: 'iRacing',
    open_spots: 4,
    total_spots: 20,
    skill_level: 'Intermediate',
    irating_min: 2500,
    irating_max: 5000,
    race_day: 'Thursdays',
    race_time: '8:00 PM EST',
    season: 'Season 2 — Starting Apr 17',
    description: 'Competitive GT3 series with structured championship points, full stewards process, and Discord community.',
  },
  {
    id: 2,
    name: 'Pacific Coast Sim Series',
    series: 'LMP2 Endurance',
    car_class: 'LMP2',
    platform: 'iRacing',
    open_spots: 7,
    total_spots: 16,
    skill_level: 'Advanced',
    irating_min: 4000,
    irating_max: null,
    race_day: 'Saturdays',
    race_time: '7:00 PM PST',
    season: 'Season 1 — Starting May 3',
    description: '2–3 hour endurance races with mandatory pit windows, driver swaps optional. Full broadcast production.',
  },
  {
    id: 3,
    name: 'Friday Night Racers',
    series: 'Skippy Cup',
    car_class: 'Formula',
    platform: 'iRacing',
    open_spots: 12,
    total_spots: 24,
    skill_level: 'Beginner',
    irating_min: 0,
    irating_max: 3000,
    race_day: 'Fridays',
    race_time: '9:00 PM EST',
    season: 'Season 3 — Starting Apr 11',
    description: 'Welcoming open-wheel league for drivers new to competitive racing. Coaching available. Low-pressure environment.',
  },
];

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
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <Nav />
      <Hero />
      <SponsorBanner sponsors={SPONSORS} />
      <OpenRecruitment leagues={OPEN_LEAGUES} />
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
            { label: 'Leagues',     href: '#leagues' },
            { label: 'News',        href: '#news' },
            { label: 'About',       href: '#about' },
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

        {/* Admin login */}
        <Link
          to="/admin"
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold"
          style={{
            background: 'var(--accent)',
            color: 'white',
            textDecoration: 'none',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
          </svg>
          League Admin
        </Link>
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
            <div
              className="text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: 'var(--accent)' }}
            >
              Open Now
            </div>
            <h2
              className="font-display font-bold text-3xl uppercase"
              style={{ color: 'var(--text)', letterSpacing: '0.04em' }}
            >
              Leagues Recruiting
            </h2>
          </div>
          <span className="text-sm" style={{ color: 'var(--text3)' }}>
            {leagues.length} leagues with open spots
          </span>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {leagues.map(league => (
            <LeagueCard key={league.id} league={league} />
          ))}
        </div>
      </div>
    </section>
  );
}

function LeagueCard({ league }) {
  const spotsLeft = league.open_spots;
  const pctFull = Math.round(((league.total_spots - spotsLeft) / league.total_spots) * 100);
  const urgency = spotsLeft <= 3 ? 'var(--accent)' : spotsLeft <= 7 ? 'var(--gold)' : 'var(--green)';

  return (
    <div
      className="rounded-md flex flex-col overflow-hidden"
      style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
    >
      {/* Top accent */}
      <div className="h-0.5" style={{ background: 'var(--accent)' }} />

      <div className="p-5 flex-1">
        {/* Badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <SmallBadge label={league.car_class} color="var(--accent)" />
          <SmallBadge label={league.skill_level} color="var(--blue)" />
          <SmallBadge label={league.platform} color="var(--text3)" />
        </div>

        <h3
          className="font-display font-bold text-lg uppercase mb-1 leading-tight"
          style={{ color: 'var(--text)', letterSpacing: '0.03em' }}
        >
          {league.name}
        </h3>
        <div className="text-sm mb-3" style={{ color: 'var(--accent)' }}>{league.series}</div>
        <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text2)' }}>
          {league.description}
        </p>

        {/* Details */}
        <div className="space-y-1.5 mb-4">
          {[
            { icon: '📅', text: `${league.race_day} · ${league.race_time}` },
            { icon: '🏁', text: league.season },
            {
              icon: '📊',
              text: league.irating_max
                ? `iRating: ${league.irating_min.toLocaleString()}–${league.irating_max.toLocaleString()}`
                : `iRating: ${league.irating_min.toLocaleString()}+`,
            },
          ].map(d => (
            <div key={d.text} className="flex items-center gap-2">
              <span className="text-xs">{d.icon}</span>
              <span className="text-xs" style={{ color: 'var(--text2)' }}>{d.text}</span>
            </div>
          ))}
        </div>

        {/* Spots fill bar */}
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text3)' }}>
            {league.total_spots - spotsLeft}/{league.total_spots} spots filled
          </span>
          <span className="text-xs font-semibold" style={{ color: urgency }}>
            {spotsLeft} open
          </span>
        </div>
        <div className="rounded-full overflow-hidden h-1.5" style={{ background: 'var(--bg4)' }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${pctFull}%`, background: urgency }}
          />
        </div>
      </div>

      {/* Apply button */}
      <div className="px-5 pb-5">
        <button
          className="w-full py-2.5 rounded-md text-sm font-semibold"
          style={{ background: 'rgba(232,48,42,0.12)', color: 'var(--accent)', border: '1px solid rgba(232,48,42,0.25)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,48,42,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(232,48,42,0.12)'}
        >
          Apply to Join
        </button>
      </div>
    </div>
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
          <Link to="/admin" className="text-xs" style={{ color: 'var(--text3)', textDecoration: 'none' }}>Admin Login</Link>
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
