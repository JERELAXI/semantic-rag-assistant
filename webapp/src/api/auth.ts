import { api } from './client';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
}

export const authApi = {
  register: (email: string, password: string, display_name: string) =>
    api.post<TokenResponse>('/auth/register', { email, password, display_name }),

  login: (email: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { email, password }),

  me: () => api.get<UserResponse>('/auth/me'),
};
