import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { FONT, MONO } from '../styles/theme';

export function NotFoundPage() {
  const t = useTheme();
  const navigate = useNavigate();

  return (
    <div
      style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: t.bg, gap: 12,
      }}
    >
      <span style={{ fontSize: 52, fontWeight: 800, color: t.textTri, fontFamily: MONO, lineHeight: 1 }}>
        404
      </span>
      <p style={{ fontSize: 16, fontWeight: 600, color: t.text, fontFamily: FONT, margin: 0 }}>
        Page not found
      </p>
      <p style={{ fontSize: 13, color: t.textSec, fontFamily: FONT, margin: 0 }}>
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <button
        onClick={() => navigate('/')}
        style={{
          marginTop: 12, display: 'flex', alignItems: 'center', gap: 6,
          padding: '9px 18px', borderRadius: 8, border: 'none',
          background: t.accent, color: '#fff',
          fontSize: 13, fontWeight: 600, fontFamily: FONT, cursor: 'pointer',
        }}
      >
        <Home size={14} />
        Go home
      </button>
    </div>
  );
}
