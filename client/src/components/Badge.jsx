const variants = {
  active:    { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', border: 'rgba(34,197,94,0.3)' },
  inactive:  { bg: 'rgba(139,144,154,0.12)', color: '#8b909a', border: 'rgba(139,144,154,0.3)' },
  suspended: { bg: 'rgba(232,48,42,0.12)',  color: '#e8302a', border: 'rgba(232,48,42,0.3)' },
  upcoming:  { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
  completed: { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', border: 'rgba(34,197,94,0.3)' },
  cancelled: { bg: 'rgba(232,48,42,0.12)',  color: '#e8302a', border: 'rgba(232,48,42,0.3)' },
  result:    { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
  driver:    { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', border: 'rgba(34,197,94,0.3)' },
  discord:   { bg: 'rgba(88,101,242,0.15)', color: '#7289da', border: 'rgba(88,101,242,0.3)' },
  settings:  { bg: 'rgba(240,179,35,0.12)', color: '#f0b323', border: 'rgba(240,179,35,0.3)' },
  A:  { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', border: 'rgba(34,197,94,0.3)' },
  B:  { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
  C:  { bg: 'rgba(240,179,35,0.12)', color: '#f0b323', border: 'rgba(240,179,35,0.3)' },
  D:  { bg: 'rgba(232,48,42,0.12)',  color: '#e8302a', border: 'rgba(232,48,42,0.3)' },
  R:  { bg: 'rgba(139,144,154,0.12)', color: '#8b909a', border: 'rgba(139,144,154,0.3)' },
};

export default function Badge({ label, variant }) {
  const style = variants[variant] || variants.inactive;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide"
      style={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
      }}
    >
      {label}
    </span>
  );
}
