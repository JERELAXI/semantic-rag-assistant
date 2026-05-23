import { useState } from 'react';
import { LayoutDashboard, LogOut, MessageSquare, Settings } from 'lucide-react';

function GraphIcon({ size = 16, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <line x1="12" y1="12" x2="20" y2="12" stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
      <line x1="12" y1="12" x2="16" y2="5.1" stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
      <line x1="12" y1="12" x2="8" y2="5.1" stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
      <line x1="12" y1="12" x2="4" y2="12" stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
      <line x1="12" y1="12" x2="8" y2="18.9" stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
      <line x1="12" y1="12" x2="16" y2="18.9" stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
      <circle cx="20" cy="12" r="2" fill={color} opacity="0.7"/>
      <circle cx="16" cy="5.1" r="2" fill={color} opacity="0.7"/>
      <circle cx="8" cy="5.1" r="2" fill={color} opacity="0.7"/>
      <circle cx="4" cy="12" r="2" fill={color} opacity="0.7"/>
      <circle cx="8" cy="18.9" r="2" fill={color} opacity="0.7"/>
      <circle cx="16" cy="18.9" r="2" fill={color} opacity="0.7"/>
      <circle cx="12" cy="12" r="3.5" fill={color}/>
    </svg>
  );
}
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { useT, useLang } from '../../contexts/LangContext';
import { FONT } from '../../styles/theme';

const NAV_ITEMS = [
  { path: '/dashboard', icon: LayoutDashboard, key: 'nav.knowledgeBases' },
  { path: '/chat', icon: MessageSquare, key: 'nav.chat' },
  { path: '/settings', icon: Settings, key: 'nav.settings' },
] as const;

export function Sidebar() {
  const t = useTheme();
  const tx = useT();
  const { lang, setLang } = useLang();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + '/');

  return (
    <div
      style={{
        width: 220,
        minWidth: 220,
        borderRight: `1px solid ${t.border}`,
        background: t.surface,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 0',
        height: '100vh',
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 16px 20px',
          borderBottom: `1px solid ${t.borderSubtle}`,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: t.accentSoft,
            border: `1px solid ${t.accentBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <GraphIcon size={17} color={t.accent} />
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: FONT }}>
          Semantic RAG
        </span>
      </div>

      {/* Nav items */}
      {NAV_ITEMS.map(({ path, icon: Icon, key }) => {
        const active = isActive(path);
        const hovered = hoveredPath === path && !active;
        return (
          <div
            key={path}
            onClick={() => navigate(path)}
            onMouseEnter={() => setHoveredPath(path)}
            onMouseLeave={() => setHoveredPath(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 16px',
              margin: '2px 8px',
              borderRadius: 8,
              cursor: 'pointer',
              background: active ? t.accentSoft : hovered ? t.surfaceAlt : 'transparent',
              color: active ? t.accent : hovered ? t.text : t.textSec,
              transition: 'background 0.12s, color 0.12s',
            }}
          >
            <Icon size={16} />
            <span style={{ fontSize: 13, fontWeight: 500, fontFamily: FONT }}>{tx(key)}</span>
          </div>
        );
      })}

      <div style={{ flex: 1 }} />

      {/* Language toggle */}
      <div
        style={{
          margin: '0 16px 10px',
          display: 'flex',
          gap: 4,
          padding: '4px',
          borderRadius: 8,
          background: t.surfaceAlt,
          border: `1px solid ${t.borderSubtle}`,
        }}
      >
        {(['uk', 'en'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            style={{
              flex: 1,
              padding: '5px 0',
              borderRadius: 5,
              border: 'none',
              background: lang === l ? t.accent : 'transparent',
              color: lang === l ? '#fff' : t.textTri,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: FONT,
              cursor: 'pointer',
              letterSpacing: '0.04em',
              transition: 'all 0.15s',
            }}
          >
            {l === 'uk' ? 'UA' : 'EN'}
          </button>
        ))}
      </div>

      {/* User card */}
      <div
        style={{
          margin: '0 16px',
          padding: '10px 12px',
          borderRadius: 8,
          background: t.surfaceAlt,
          border: `1px solid ${t.borderSubtle}`,
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t.text, fontFamily: FONT }}>
            {user?.display_name}
          </div>
          <div style={{ fontSize: 11, color: t.textTri, fontFamily: FONT, marginTop: 2 }}>
            {user?.email}
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: t.textTri,
            fontSize: 11,
            fontFamily: FONT,
            padding: 0,
            transition: 'color 0.12s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = t.text)}
          onMouseLeave={(e) => (e.currentTarget.style.color = t.textTri)}
        >
          <LogOut size={12} />
          {tx('nav.signOut')}
        </button>
      </div>
    </div>
  );
}
