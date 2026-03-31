export default function PosBadge({ pos }) {
  const cls = pos === 1 ? 'p1' : pos === 2 ? 'p2' : pos === 3 ? 'p3' : 'default';
  return <span className={`pos-badge ${cls}`}>{pos}</span>;
}
