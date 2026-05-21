const BASE_URL = 'http://localhost:8000'

// ── chrome.storage helpers ────────────────────────────────────────────────

async function storageGet(keys: string[]): Promise<Record<string, string>> {
  return new Promise((resolve) =>
    chrome.storage.local.get(keys, (r) => resolve(r as Record<string, string>)),
  )
}

async function storageSet(items: Record<string, unknown>): Promise<void> {
  return new Promise((resolve) => chrome.storage.local.set(items, resolve))
}

async function storageRemove(keys: string[]): Promise<void> {
  return new Promise((resolve) => chrome.storage.local.remove(keys, resolve))
}

// ── Token management ──────────────────────────────────────────────────────

export async function getTokens() {
  return storageGet(['access_token', 'refresh_token'])
}

export async function storeTokens(accessToken: string, refreshToken: string) {
  return storageSet({ access_token: accessToken, refresh_token: refreshToken })
}

export async function clearTokens() {
  return storageRemove(['access_token', 'refresh_token'])
}

export async function isLoggedIn(): Promise<boolean> {
  const t = await getTokens()
  return !!t.access_token
}

// ── Core fetch with auth + auto-refresh ───────────────────────────────────

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  _retry = true,
): Promise<Response> {
  const tokens = await getTokens()

  const headers = new Headers(options.headers as HeadersInit | undefined)
  if (tokens.access_token) headers.set('Authorization', `Bearer ${tokens.access_token}`)

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (res.status === 401 && _retry && tokens.refresh_token) {
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: tokens.refresh_token }),
    })
    if (refreshRes.ok) {
      const data = await refreshRes.json()
      await storeTokens(data.access_token, data.refresh_token)
      return apiFetch(path, options, false)
    }
    await clearTokens()
    throw new Error('Session expired')
  }

  return res
}

// ── Auth ──────────────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? 'Login failed')
  }
  return res.json() as Promise<{ access_token: string; refresh_token: string }>
}

// ── Knowledge Bases ───────────────────────────────────────────────────────

export interface KBItem {
  id: string
  name: string
  description: string | null
  updated_at: string
}

export async function listKBs(): Promise<KBItem[]> {
  const res = await apiFetch('/knowledge-bases')
  if (!res.ok) throw new Error('Failed to load knowledge bases')
  return res.json()
}

export async function createKB(name: string): Promise<KBItem> {
  const res = await apiFetch('/knowledge-bases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description: null, owner_type: 'user' }),
  })
  if (!res.ok) throw new Error('Failed to create knowledge base')
  return res.json()
}

// ── Chat sessions ─────────────────────────────────────────────────────────

export interface SessionItem {
  id: string
  title: string | null
  knowledge_base_id: string
  updated_at: string
}

export async function createSession(kbId: string): Promise<SessionItem> {
  const res = await apiFetch('/chat/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ knowledge_base_id: kbId }),
  })
  if (!res.ok) throw new Error('Failed to create session')
  return res.json()
}

// ── Document upload (page text → .txt file) ───────────────────────────────

export async function uploadPageText(kbId: string, title: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain' })
  const file = new File([blob], `${title.slice(0, 80)}.txt`, { type: 'text/plain' })

  const form = new FormData()
  form.append('file', file)
  form.append('title', title.slice(0, 255))
  form.append('knowledge_base_id', kbId)

  const res = await apiFetch('/documents/upload', { method: 'POST', body: form })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? 'Upload failed')
  }
  return res.json()
}
