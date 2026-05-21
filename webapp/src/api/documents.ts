import { api } from './client';

export interface DocumentResponse {
  id: string;
  title: string;
  content_type: string;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentStatus {
  id: string;
  status: string;
  chunk_count: number;
  error: string | null;
}

export const documentsApi = {
  upload: (file: File, title: string, kbId: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('title', title);
    form.append('knowledge_base_id', kbId);
    return api.post<DocumentResponse>('/documents/upload', form);
  },
  list: (kbId: string) => api.get<DocumentResponse[]>(`/documents/kb/${kbId}`),
  getStatus: (id: string) => api.get<DocumentStatus>(`/documents/${id}/status`),
  delete: (id: string) => api.delete(`/documents/${id}`),
};
