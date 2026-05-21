import { api } from './client';

export interface KBResponse {
  id: string;
  name: string;
  description: string | null;
  owner_type: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export const kbApi = {
  list: () => api.get<KBResponse[]>('/knowledge-bases'),
  create: (name: string, description?: string) =>
    api.post<KBResponse>('/knowledge-bases', {
      name,
      description: description || null,
      owner_type: 'user',
    }),
  get: (id: string) => api.get<KBResponse>(`/knowledge-bases/${id}`),
  delete: (id: string) => api.delete(`/knowledge-bases/${id}`),
};
