const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

// Event shapes emitted by POST /chat/sessions/:id/messages
export interface TokenEvent     { token: string }
export interface CitationsEvent { citations: Citation[] }
export interface DoneEvent      { done: true; final_content?: string }
export type SSEEvent = TokenEvent | CitationsEvent | DoneEvent;

// Matches backend CitationResponse schema exactly
export interface Citation {
  chunk_id: string;
  document_title: string;
  content_excerpt: string;
  relevance_score: number;
}

/**
 * Sends a chat message and yields parsed SSE events from the streaming response.
 *
 * Why fetch() and not EventSource: EventSource only supports GET requests.
 * The backend endpoint is POST (message content in the body), so we use
 * fetch() + ReadableStream to consume the text/event-stream response.
 *
 * Usage:
 *   for await (const event of streamChat(sessionId, 'hello')) {
 *     if ('token' in event) appendToken(event.token);
 *     else if ('citations' in event) setCitations(event.citations);
 *     else if ('done' in event) finalize();
 *   }
 */
export interface StreamChatOpts {
  searchMode?: string;
  topK?: number;
}

export async function* streamChat(
  sessionId: string,
  content: string,
  opts?: StreamChatOpts,
): AsyncGenerator<SSEEvent, void, unknown> {
  const token = localStorage.getItem('access_token');

  const body: Record<string, unknown> = { content };
  if (opts?.searchMode) body.search_mode = opts.searchMode;
  if (opts?.topK !== undefined) body.top_k = opts.topK;

  const response = await fetch(`${BASE_URL}/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`Stream request failed (${response.status}): ${text}`);
  }

  if (!response.body) throw new Error('Response body is null');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE lines are separated by \n; events are separated by \n\n.
      // We split on \n and process complete lines, keeping any partial line
      // in the buffer for the next chunk.
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (!payload || payload === '[DONE]') return;
        try {
          yield JSON.parse(payload) as SSEEvent;
        } catch {
          // skip malformed lines
        }
      }
    }

    // Flush anything left in the buffer after the stream closes
    if (buffer.startsWith('data: ')) {
      const payload = buffer.slice(6).trim();
      if (payload && payload !== '[DONE]') {
        try {
          yield JSON.parse(payload) as SSEEvent;
        } catch { /* ignore */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
