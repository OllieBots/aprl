export default function Button({ children, variant = 'primary', size = 'md', onClick, disabled, type = 'button', className = '' }) {
  const base = 'inline-flex items-center gap-2 font-semibold rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'text-white hover:opacity-90 active:scale-95',
    secondary: 'hover:opacity-90 active:scale-95',
    ghost: 'hover:bg-bg4 active:scale-95',
    danger: 'hover:opacity-90 active:scale-95',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  const styles = {
    primary: { background: 'var(--accent)', color: 'white' },
    secondary: { background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border2)' },
    ghost: { background: 'transparent', color: 'var(--text2)' },
    danger: { background: 'rgba(232,48,42,0.15)', color: 'var(--accent)', border: '1px solid rgba(232,48,42,0.3)' },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      style={styles[variant]}
    >
      {children}
    </button>
  );
}
