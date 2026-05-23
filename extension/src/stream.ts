import { getBaseUrl, getTokens } from './api'

export interface Citation {
  chunk_id: string
  document_title: string
  content_excerpt: string
  relevance_score: number
}

export type SSEEvent = { token: string } | { citations: Citation[] } | { done: true; final_content?: string }

export async function* streamMessage(
  sessionId: string,
  content: string,
  searchMode = 'hybrid',
  topK = 5,
): AsyncGenerator<SSEEvent, void, unknown> {
  const [tokens, base] = await Promise.all([getTokens(), getBaseUrl()])

  const res = await fetch(`${base}/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(tokens.access_token ? { Authorization: `Bearer ${tokens.access_token}` } : {}),
    },
    body: JSON.stringify({ content, search_mode: searchMode, top_k: topK }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Stream failed (${res.status}): ${text}`)
  }
  if (!res.body) throw new Error('No response body')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (!payload || payload === '[DONE]') return
        try { yield JSON.parse(payload) as SSEEvent } catch { /* skip malformed */ }
      }
    }
    if (buffer.startsWith('data: ')) {
      const payload = buffer.slice(6).trim()
      if (payload && payload !== '[DONE]') {
        try { yield JSON.parse(payload) as SSEEvent } catch { /* skip */ }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
