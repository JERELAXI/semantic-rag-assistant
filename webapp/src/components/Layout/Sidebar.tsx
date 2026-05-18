import { LayoutDashboard, LogOut, MessageSquare, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { FONT } from '../../styles/theme';

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Knowledge Bases' },
  { path: '/chat', icon: MessageSquare, label: 'Chat' },
  { path: '/settings', icon: Settings, label: 'Settings' },
] as const;

export function Sidebar() {
  const t = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path);

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
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke={t.accent}
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: FONT }}>
          Semantic RAG
        </span>
      </div>

      {/* Nav items */}
      {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
        const active = isActive(path);
        return (
          <div
            key={path}
            onClick={() => navigate(path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 16px',
              margin: '2px 8px',
              borderRadius: 8,
              cursor: 'pointer',
              background: active ? t.accentSoft : 'transparent',
              color: active ? t.accent : t.textSec,
              transition: 'all 0.15s',
            }}
          >
            <Icon size={16} />
            <span style={{ fontSize: 13, fontWeight: 500, fontFamily: FONT }}>{label}</span>
          </div>
        );
      })}

      <div style={{ flex: 1 }} />

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
          }}
        >
          <LogOut size={12} />
          Sign out
        </button>
      </div>
    </div>
  );
}
