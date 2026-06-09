import { api } from './client';

export interface OrgMemberResponse {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export interface OrgResponse {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  members: OrgMemberResponse[];
}

export const orgsApi = {
  list: () => api.get<OrgResponse[]>('/organizations'),
  create: (name: string) => api.post<OrgResponse>('/organizations', { name }),
  delete: (id: string) => api.delete(`/organizations/${id}`),
  invite: (orgId: string, email: string, role: 'member' | 'owner' = 'member') =>
    api.post<OrgMemberResponse>(`/organizations/${orgId}/invite`, { email, role }),
  removeMember: (orgId: string, userId: string) =>
    api.delete(`/organizations/${orgId}/members/${userId}`),
};
