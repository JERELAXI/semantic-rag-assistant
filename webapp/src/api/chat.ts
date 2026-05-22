import { api } from './client';
import { streamChat, type Citation, type StreamChatOpts } from '../hooks/useSSE';

// Re-export so consumers can import citation type from the API layer
export type CitationResponse = Citation;

export interface SessionResponse {
  id: string;
  title: string | null;
  knowledge_base_id: string;
  created_at: string;
  updated_at: string;
}

export interface MessageResponse {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  citations: CitationResponse[];
}

export const chatApi = {
  createSession: (kbId: string, title?: string) =>
    api.post<SessionResponse>('/chat/sessions', {
      knowledge_base_id: kbId,
      title: title ?? null,
    }),

  listSessions: () => api.get<SessionResponse[]>('/chat/sessions'),

  getMessages: (sessionId: string) =>
    api.get<MessageResponse[]>(`/chat/sessions/${sessionId}/messages`),

  renameSession: (sessionId: string, title: string) =>
    api.patch<SessionResponse>(`/chat/sessions/${sessionId}`, { title }),

  deleteSession: (sessionId: string) =>
    api.delete(`/chat/sessions/${sessionId}`),

  streamMessage: (sessionId: string, content: string, opts?: StreamChatOpts) =>
    streamChat(sessionId, content, opts),
};
