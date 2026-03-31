export default function PageHeader({ title, subtitle, children }) {
  return (
    <div
      className="flex items-center justify-between px-8 py-5"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div>
        <h1
          className="font-display font-bold text-2xl uppercase tracking-wide"
          style={{ color: 'var(--text)', letterSpacing: '0.06em' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-0.5" style={{ color: 'var(--text2)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
