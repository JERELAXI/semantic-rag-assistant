import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { Sidebar } from './Sidebar';
import { FONT } from '../../styles/theme';

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

export function Layout() {
  const t = useTheme();
  const location = useLocation();
  const { isMobile } = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        background: t.bg,
        overflow: 'hidden',
        flexDirection: 'column',
      }}
    >
      <style>{`
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: ${t.scrollThumb}; border-radius: 4px; }
        ::placeholder { color: ${t.textTri}; }
        @keyframes pageEnter { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sidebarSlideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
      `}</style>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Desktop sidebar */}
        {!isMobile && <Sidebar />}

        {/* Mobile overlay */}
        {isMobile && sidebarOpen && (
          <>
            <div
              onClick={() => setSidebarOpen(false)}
              style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 200,
              }}
            />
            <div
              style={{
                position: 'fixed', left: 0, top: 0, bottom: 0,
                width: 'min(280px, calc(100vw - 48px))',
                zIndex: 201,
                animation: 'sidebarSlideIn 0.2s ease-out',
              }}
            >
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>
          </>
        )}

        {/* Main area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Mobile top bar */}
          {isMobile && (
            <div
              style={{
                height: 52,
                background: t.surface,
                borderBottom: `1px solid ${t.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: t.accentSoft, border: `1px solid ${t.accentBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <GraphIcon size={14} color={t.accent} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: t.text, fontFamily: FONT }}>
                  Semantic RAG
                </span>
              </div>
              <button
                onClick={() => setSidebarOpen(true)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: t.textSec, display: 'flex', alignItems: 'center',
                  padding: 6, borderRadius: 8,
                }}
              >
                <Menu size={22} />
              </button>
            </div>
          )}

          <div
            key={location.key}
            style={{ flex: 1, overflowY: 'auto', animation: 'pageEnter 0.18s ease-out' }}
          >
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
