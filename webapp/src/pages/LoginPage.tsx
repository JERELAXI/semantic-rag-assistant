import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { FONT, type Tokens } from '../styles/theme';

type Mode = 'login' | 'register';

function inputStyle(t: Tokens): React.CSSProperties {
  return {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    border: `1px solid ${t.border}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 14,
    fontFamily: FONT,
    outline: 'none',
    boxSizing: 'border-box',
  };
}

export function LoginPage() {
  const t = useTheme();
  const { user, loading, login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  if (loading) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, displayName);
      }
      navigate('/');
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setDisplayName('');
    setEmail('');
    setPassword('');
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: t.bg,
      }}
    >
      <div style={{ width: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: t.accentSoft,
              border: `1.5px solid ${t.accentBorder}`,
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke={t.accent}
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: t.text, fontFamily: FONT, margin: 0 }}>
            Semantic RAG
          </h1>
          <p style={{ fontSize: 13, color: t.textSec, fontFamily: FONT, marginTop: 6 }}>
            {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
          </p>
        </div>

        {/* Mode switcher */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            marginBottom: 24,
            background: t.surfaceAlt,
            borderRadius: 10,
            padding: 4,
            border: `1px solid ${t.border}`,
          }}
        >
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: 7,
                border: 'none',
                background: mode === m ? t.surface : 'transparent',
                color: mode === m ? t.text : t.textSec,
                fontSize: 13,
                fontWeight: 500,
                fontFamily: FONT,
                cursor: 'pointer',
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {m === 'login' ? 'Sign in' : 'Sign up'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  fontSize: 12,
                  color: t.textSec,
                  fontFamily: FONT,
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                placeholder="Your name"
                style={inputStyle(t)}
              />
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                fontSize: 12,
                color: t.textSec,
                fontFamily: FONT,
                display: 'block',
                marginBottom: 6,
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={inputStyle(t)}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                fontSize: 12,
                color: t.textSec,
                fontFamily: FONT,
                display: 'block',
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={inputStyle(t)}
            />
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                marginBottom: 16,
                background: t.dangerSoft,
                color: t.danger,
                fontSize: 13,
                fontFamily: FONT,
                border: `1px solid ${t.danger}30`,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '11px 0',
              borderRadius: 10,
              border: 'none',
              background: submitting ? t.border : t.accent,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: FONT,
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
