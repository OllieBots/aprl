export default function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className="px-5 py-3 text-sm font-semibold transition-all relative"
          style={{
            color: active === tab.id ? 'var(--text)' : 'var(--text2)',
            background: 'transparent',
            border: 'none',
          }}
        >
          {tab.label}
          {active === tab.id && (
            <span
              className="absolute bottom-0 left-0 right-0 h-0.5"
              style={{ background: 'var(--accent)' }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
