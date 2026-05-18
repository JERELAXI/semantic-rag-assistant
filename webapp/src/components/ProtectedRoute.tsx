import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { FONT } from '../styles/theme';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const t = useTheme();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: t.bg,
          color: t.textSec,
          fontFamily: FONT,
          fontSize: 14,
        }}
      >
        Loading…
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
