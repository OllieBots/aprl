export default function Card({ children, className = '', style = {} }) {
  return (
    <div
      className={`rounded-md ${className}`}
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, children }) {
  return (
    <div
      className="flex items-center justify-between px-5 py-3"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <span
        className="font-display font-semibold text-sm uppercase tracking-widest"
        style={{ color: 'var(--text)', letterSpacing: '0.08em' }}
      >
        {title}
      </span>
      {children}
    </div>
  );
}
