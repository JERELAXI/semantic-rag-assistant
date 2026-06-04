import { api } from './client';

export interface ApiKeyResponse {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked: boolean;
}

export interface ApiKeyCreated {
  id: string;
  name: string;
  key_prefix: string;
  key: string;
  created_at: string;
}

export const apiKeysApi = {
  list: () => api.get<ApiKeyResponse[]>('/api-keys'),
  create: (name: string) => api.post<ApiKeyCreated>('/api-keys', { name }),
  revoke: (id: string) => api.delete(`/api-keys/${id}`),
};
