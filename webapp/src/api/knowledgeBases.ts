import { api } from './client';

export interface KBResponse {
  id: string;
  name: string;
  description: string | null;
  owner_type: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  permission: 'owner' | 'editor' | 'viewer';
  shared_by_name: string | null;
}

export interface KBShareResponse {
  id: string;
  shared_with_user_id: string;
  shared_with_email: string;
  shared_with_display_name: string;
  permission: 'viewer' | 'editor';
  status: 'pending' | 'accepted';
  created_at: string;
}

export interface KBInvitationResponse {
  share_id: string;
  kb_id: string;
  kb_name: string;
  owner_name: string;
  permission: 'viewer' | 'editor';
  created_at: string;
}

export const kbApi = {
  list: () => api.get<KBResponse[]>('/knowledge-bases'),
  create: (name: string, description?: string, orgId?: string) =>
    api.post<KBResponse>('/knowledge-bases', {
      name,
      description: description || null,
      owner_type: orgId ? 'organization' : 'user',
      ...(orgId ? { owner_id: orgId } : {}),
    }),
  get: (id: string) => api.get<KBResponse>(`/knowledge-bases/${id}`),
  delete: (id: string) => api.delete(`/knowledge-bases/${id}`),

  share: (kbId: string, email: string, permission: 'viewer' | 'editor') =>
    api.post<KBShareResponse>(`/knowledge-bases/${kbId}/share`, { email, permission }),
  listShares: (kbId: string) =>
    api.get<KBShareResponse[]>(`/knowledge-bases/${kbId}/shares`),
  unshare: (kbId: string, userId: string) =>
    api.delete(`/knowledge-bases/${kbId}/shares/${userId}`),

  getPendingInvitations: () =>
    api.get<KBInvitationResponse[]>('/knowledge-bases/invitations'),
  acceptInvitation: (shareId: string) =>
    api.post(`/knowledge-bases/invitations/${shareId}/accept`),
  declineInvitation: (shareId: string) =>
    api.post(`/knowledge-bases/invitations/${shareId}/decline`),
};
