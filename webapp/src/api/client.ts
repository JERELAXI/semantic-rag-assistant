import axios from 'axios';

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export const api = axios.create({ baseURL: BASE_URL });

// Separate bare instance for token refresh — bypasses the response interceptor
const refreshClient = axios.create({ baseURL: BASE_URL });

// Attach stored access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401: queue concurrent requests while refresh is in flight
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Don't attempt refresh if there's no token (e.g. login with wrong credentials)
    const hasRefreshToken = !!localStorage.getItem('refresh_token');
    if (error.response?.status !== 401 || original._retry || !hasRefreshToken) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem('refresh_token')!;
      const { data } = await refreshClient.post('/auth/refresh', { refresh_token: refreshToken });

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);

      processQueue(null, data.access_token);
      original.headers.Authorization = `Bearer ${data.access_token}`;
      return api(original);
    } catch (err) {
      processQueue(err, null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  },
);
