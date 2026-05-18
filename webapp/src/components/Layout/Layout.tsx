import { Outlet } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { Sidebar } from './Sidebar';

export function Layout() {
  const t = useTheme();

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
      `}</style>
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Outlet />
      </div>
    </div>
  );
}
