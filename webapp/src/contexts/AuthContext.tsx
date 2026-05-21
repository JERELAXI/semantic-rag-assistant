import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi, type UserResponse } from '../api/auth';
import { api } from '../api/client';

interface AuthState {
  user: UserResponse | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  // On mount: validate stored token by fetching current user
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setState({ user: null, loading: false });
      return;
    }
    authApi
      .me()
      .then(({ data }) => setState({ user: data, loading: false }))
      .catch(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setState({ user: null, loading: false });
      });
  }, []);

  const storeTokens = (accessToken: string, refreshToken: string) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  };

  const login = useCallback(async (email: string, password: string) => {
    const { data: tokens } = await authApi.login(email, password);
    storeTokens(tokens.access_token, tokens.refresh_token);
    const { data: user } = await authApi.me();
    setState({ user, loading: false });
  }, []);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    const { data: tokens } = await authApi.register(email, password, displayName);
    storeTokens(tokens.access_token, tokens.refresh_token);
    const { data: user } = await authApi.me();
    setState({ user, loading: false });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    delete api.defaults.headers.common['Authorization'];
    setState({ user: null, loading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
