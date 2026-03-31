export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text2)' }}>
          {label}
        </label>
      )}
      <input
        {...props}
        className="w-full px-3 py-2 rounded-md text-sm"
        style={{
          background: 'var(--bg3)',
          border: `1px solid ${error ? 'var(--accent)' : 'var(--border2)'}`,
          color: 'var(--text)',
        }}
      />
      {error && <span className="text-xs" style={{ color: 'var(--accent)' }}>{error}</span>}
    </div>
  );
}

export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text2)' }}>
          {label}
        </label>
      )}
      <select
        {...props}
        className="w-full px-3 py-2 rounded-md text-sm"
        style={{
          background: 'var(--bg3)',
          border: `1px solid ${error ? 'var(--accent)' : 'var(--border2)'}`,
          color: 'var(--text)',
        }}
      >
        {children}
      </select>
    </div>
  );
}
