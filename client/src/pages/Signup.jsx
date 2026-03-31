import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function Signup() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', iracing_cust_id: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [iracingNote, setIracingNote] = useState('');

  function set(key) { return e => setForm(f => ({ ...f, [key]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.iracing_cust_id) return setError('iRacing Customer ID is required');
    setLoading(true);
    try {
      const data = await api.post('/auth/signup', { ...form, iracing_cust_id: parseInt(form.iracing_cust_id) });
      if (!data.iracing_verified) {
        setIracingNote("We couldn't verify your iRacing ID right now — you're still signed up and it'll be confirmed automatically when you appear in race results.");
      }
      login(data.token, data.user, null);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 10, background: 'var(--accent)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 12,
          }}>A</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Create your APRL account</div>
          <div style={{ fontSize: 14, color: 'var(--text3)', marginTop: 4 }}>Join leagues, track your stats, submit incidents</div>
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 28 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Full Name" value={form.name} onChange={set('name')} placeholder="Your name" required />
            <Field label="Email" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
            <Field label="Password" type="password" value={form.password} onChange={set('password')} placeholder="Minimum 8 characters" minLength={8} required />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                iRacing Customer ID <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <input
                type="number"
                value={form.iracing_cust_id}
                onChange={set('iracing_cust_id')}
                placeholder="e.g. 123456"
                required
                style={{ padding: '10px 12px', borderRadius: 6, background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
              />
              <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>
                Find this on your iRacing profile page — it's the number in the URL. Required to link your race results.
              </p>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(232,48,42,0.1)', color: 'var(--accent)', border: '1px solid rgba(232,48,42,0.25)', fontSize: 13 }}>
                {error}
              </div>
            )}

            {iracingNote && (
              <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(240,179,35,0.1)', color: 'var(--gold)', border: '1px solid rgba(240,179,35,0.2)', fontSize: 13 }}>
                {iracingNote}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '11px 0', borderRadius: 7, background: 'var(--accent)', color: '#fff',
                fontWeight: 700, fontSize: 14, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1, marginTop: 4,
              }}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text3)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: 8, fontSize: 13, color: 'var(--text3)' }}>
          <Link to="/" style={{ color: 'var(--text3)', textDecoration: 'none' }}>← Back to APRL</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <input
        {...props}
        style={{ padding: '10px 12px', borderRadius: 6, background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
      />
    </div>
  );
}
