import { Outlet, useLocation } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { Sidebar } from './Sidebar';

export function Layout() {
  const t = useTheme();
  const location = useLocation();

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        background: t.bg,
        overflow: 'hidden',
      }}
    >
      <style>{`
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: ${t.scrollThumb}; border-radius: 4px; }
        ::placeholder { color: ${t.textTri}; }
        @keyframes pageEnter { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <Sidebar />
      <div
        key={location.key}
        style={{ flex: 1, overflowY: 'auto', animation: 'pageEnter 0.18s ease-out' }}
      >
        <Outlet />
      </div>
    </div>
  );
}
