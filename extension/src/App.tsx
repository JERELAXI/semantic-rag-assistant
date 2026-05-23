import { useEffect, useRef, useState } from 'react'
import { darkTokens, lightTokens, type Tokens, SANS, MONO } from './theme'
import {
  login, storeTokens, clearTokens, isLoggedIn,
  listKBs, createKB, createSession, uploadPageText, getDocumentStatus,
  getBaseUrl, setBaseUrl,
  type KBItem,
} from './api'
import { streamMessage, type Citation } from './stream'

// ── Theme hook ────────────────────────────────────────────────────────────

function useTheme(): Tokens {
  const [isDark, setIsDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const h = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return isDark ? darkTokens : lightTokens
}

// ── Types ─────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations: Citation[]
}

interface PageInfo {
  title: string
  url: string
  textLength: number
  text: string
}

// ── Root app ──────────────────────────────────────────────────────────────

export default function App() {
  const t = useTheme()
  const [authState, setAuthState] = useState<'loading' | 'login' | 'app'>('loading')

  useEffect(() => {
    isLoggedIn().then((ok) => setAuthState(ok ? 'app' : 'login'))
  }, [])

  const handleLogin = async (email: string, password: string) => {
    const tokens = await login(email, password)
    await storeTokens(tokens.access_token, tokens.refresh_token)
    setAuthState('app')
  }

  const handleLogout = async () => {
    await clearTokens()
    setAuthState('login')
  }

  const handleSessionExpired = () => {
    clearTokens().then(() => setAuthState('login'))
  }

  if (authState === 'loading') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.bg }}>
        <LoadingSpinner t={t} />
      </div>
    )
  }

  if (authState === 'login') {
    return <LoginView t={t} onLogin={handleLogin} />
  }

  return (
    <AppShell
      t={t}
      onLogout={handleLogout}
      onSessionExpired={handleSessionExpired}
    />
  )
}

// ── Loading spinner ───────────────────────────────────────────────────────

function LoadingSpinner({ t }: { t: Tokens }) {
  return (
    <div style={{ display: 'flex', gap: 5 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%', background: t.accent,
          animation: `dotPulse 1.2s ease-in-out ${i * 0.15}s infinite`,
        }} />
      ))}
    </div>
  )
}

// ── Login view ────────────────────────────────────────────────────────────

function LoginView({ t, onLogin }: { t: Tokens; onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onLogin(email, password)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${t.border}`, background: t.inputBg,
    color: t.text, fontSize: 13, fontFamily: SANS,
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: t.bg, padding: '0 24px' }}>
      {/* Logo */}
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 13, background: t.accentSoft,
          border: `1.5px solid ${t.accentBorder}`, margin: '0 auto 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: t.text, fontFamily: SANS, letterSpacing: '-0.3px' }}>
          Semantic RAG
        </div>
        <div style={{ fontSize: 12, color: t.textTertiary, fontFamily: SANS, marginTop: 4 }}>
          Sign in to your account
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: t.textSecondary, fontFamily: SANS, display: 'block', marginBottom: 5 }}>
            Email
          </label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: t.textSecondary, fontFamily: SANS, display: 'block', marginBottom: 5 }}>
            Password
          </label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={inputStyle}
          />
        </div>

        {error && (
          <p style={{ fontSize: 12, color: t.danger, fontFamily: SANS, marginBottom: 12 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !email || !password}
          style={{
            width: '100%', padding: '10px 0', borderRadius: 9, border: 'none',
            background: t.accent, color: '#fff', fontSize: 13, fontWeight: 600,
            fontFamily: SANS, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading || !email || !password ? 0.65 : 1,
          }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

// ── Authenticated shell ───────────────────────────────────────────────────

function AppShell({
  t, onLogout, onSessionExpired,
}: {
  t: Tokens
  onLogout: () => void
  onSessionExpired: () => void
}) {
  const [view, setView] = useState<'chat' | 'sources'>('chat')
  const [showSettings, setShowSettings] = useState(false)
  const [kbs, setKbs] = useState<KBItem[]>([])
  const [selectedKbId, setSelectedKbId] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const [streamCitations, setStreamCitations] = useState<Citation[]>([])
  const [activeCit, setActiveCit] = useState<{ msgId: string; n: number } | null>(null)
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [ingestKbId, setIngestKbId] = useState('__auto')
  const [ingesting, setIngesting] = useState(false)
  const [processingDoc, setProcessingDoc] = useState<{ docId: string; kbId: string } | null>(null)

  useEffect(() => {
    listKBs()
      .then(setKbs)
      .catch((e) => { if (e?.message === 'Session expired') onSessionExpired() })
  }, [])

  useEffect(() => {
    chrome.storage.local.get('page_info', (r) => {
      if (r.page_info) setPageInfo(r.page_info as PageInfo)
    })
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if ('page_info' in changes) {
        setPageInfo(changes.page_info.newValue ?? null)
        setBannerDismissed(false)
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  const handleKBSelect = async (kbId: string) => {
    setSelectedKbId(kbId)
    setMessages([])
    setSessionId(null)
    setActiveCit(null)
    if (!kbId) return
    try {
      const s = await createSession(kbId)
      setSessionId(s.id)
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'Session expired') onSessionExpired()
    }
  }

  const handleIngest = async () => {
    if (!pageInfo || ingesting) return
    setIngesting(true)
    try {
      let kbId = ingestKbId

      if (kbId === '__auto') {
        // Always create a new unique KB — each page gets its own isolated KB.
        // Naming: "Browser Pages", then "Browser Pages 1", "Browser Pages 2", …
        const all = await listKBs()
        const base = 'Browser Pages'
        const matches = all.filter((kb) => kb.name === base || /^Browser Pages \d+$/.test(kb.name))
        let newName: string
        if (matches.length === 0) {
          newName = base
        } else {
          const nums = matches.map((kb) =>
            kb.name === base ? 0 : parseInt(kb.name.match(/\d+$/)![0]),
          )
          newName = `${base} ${Math.max(...nums) + 1}`
        }
        const created = await createKB(newName)
        kbId = created.id
        setKbs((prev) => [...prev, created])
      }

      const doc = await uploadPageText(kbId, pageInfo.title, pageInfo.text)
      setProcessingDoc({ docId: doc.id, kbId })
      setBannerDismissed(true)
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'Session expired') onSessionExpired()
    } finally {
      setIngesting(false)
    }
  }

  const handleDismiss = () => {
    setBannerDismissed(true)
    chrome.storage.local.remove('page_info')
  }

  const handleNewChat = async () => {
    if (!selectedKbId) return
    setMessages([])
    setActiveCit(null)
    try {
      const s = await createSession(selectedKbId)
      setSessionId(s.id)
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'Session expired') onSessionExpired()
    }
  }

  const handleSend = async (content: string) => {
    if (!sessionId || streaming) return
    setActiveCit(null)
    setStreaming(true)
    setStreamContent('')
    setStreamCitations([])

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content, citations: [] }
    setMessages((prev) => [...prev, userMsg])

    let accContent = ''
    let accCitations: Citation[] = []

    try {
      for await (const event of streamMessage(sessionId, content)) {
        if ('token' in event) {
          accContent += event.token
          setStreamContent(accContent)
        } else if ('citations' in event) {
          accCitations = event.citations
          setStreamCitations(accCitations)
        } else if ('done' in event) {
          const finalContent = event.final_content ?? accContent
          setStreamContent('')
          setStreamCitations([])
          setMessages((prev) => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: finalContent,
            citations: accCitations,
          }])
        }
      }
    } catch (e: unknown) {
      setStreamContent('')
      setStreamCitations([])
      if (e instanceof Error && e.message === 'Session expired') onSessionExpired()
    } finally {
      setStreaming(false)
    }
  }

  // Last assistant message's citations for Sources tab
  const lastCitations = [...messages].reverse().find((m) => m.role === 'assistant')?.citations ?? []

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: t.bg, position: 'relative' }}>
      <style>{`::-webkit-scrollbar-thumb { background: ${t.scrollThumb}; }`}</style>

      <PanelHeader
        t={t}
        view={view}
        onViewChange={setView}
        onLogout={onLogout}
        showSettings={showSettings}
        onSettingsClick={() => setShowSettings(!showSettings)}
      />

      <KBSelector
        t={t}
        kbs={kbs}
        selectedKbId={selectedKbId}
        onSelect={handleKBSelect}
        onNewChat={handleNewChat}
        sessionId={sessionId}
      />

      {pageInfo && !bannerDismissed && (
        <IngestBanner
          t={t}
          pageInfo={pageInfo}
          kbs={kbs}
          ingestKbId={ingestKbId}
          ingesting={ingesting}
          onKbChange={setIngestKbId}
          onIngest={handleIngest}
          onDismiss={handleDismiss}
        />
      )}

      {showSettings ? (
        <SettingsView t={t} onClose={() => setShowSettings(false)} />
      ) : (
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {processingDoc ? (
            <ProcessingView
              t={t}
              docId={processingDoc.docId}
              kbId={processingDoc.kbId}
              onReady={(id) => { setProcessingDoc(null); handleKBSelect(id) }}
              onDismiss={() => setProcessingDoc(null)}
            />
          ) : view === 'chat' ? (
            <ChatView
              t={t}
              messages={messages}
              streaming={streaming}
              streamContent={streamContent}
              streamCitations={streamCitations}
              sessionId={sessionId}
              activeCit={activeCit}
              onCitClick={(n, msgId) => setActiveCit(
                activeCit?.msgId === msgId && activeCit?.n === n ? null : { msgId, n },
              )}
              onSend={handleSend}
            />
          ) : (
            <SourcesView t={t} citations={lastCitations} />
          )}
        </div>
      )}

    </div>
  )
}

// ── Header ────────────────────────────────────────────────────────────────

function PanelHeader({
  t, view, onViewChange, onLogout, showSettings, onSettingsClick,
}: {
  t: Tokens
  view: 'chat' | 'sources'
  onViewChange: (v: 'chat' | 'sources') => void
  onLogout: () => void
  showSettings: boolean
  onSettingsClick: () => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '11px 14px',
      borderBottom: `1px solid ${t.border}`, flexShrink: 0, gap: 10,
    }}>
      {/* Logo */}
      <div style={{
        width: 28, height: 28, borderRadius: 8, background: t.accentSoft,
        border: `1px solid ${t.accentBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      <span style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: SANS, letterSpacing: '-0.2px', flex: 1 }}>
        Semantic RAG
      </span>

      {/* Tab switcher */}
      <div style={{ display: 'flex', background: t.surfaceHover, borderRadius: 8, padding: 2 }}>
        {(['chat', 'sources'] as const).map((v) => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            style={{
              border: 'none',
              background: view === v ? t.surface : 'transparent',
              color: view === v ? t.text : t.textTertiary,
              fontSize: 11.5, fontWeight: 500, padding: '4px 10px', borderRadius: 6,
              cursor: 'pointer', fontFamily: SANS, transition: 'all 0.15s',
              boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {v === 'chat' ? 'Chat' : 'Sources'}
          </button>
        ))}
      </div>

      {/* Settings button */}
      <button
        onClick={onSettingsClick}
        title="Settings"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: showSettings ? t.accent : t.textTertiary,
          display: 'flex', padding: 4, borderRadius: 6,
          transition: 'color 0.12s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = t.accent)}
        onMouseLeave={(e) => (e.currentTarget.style.color = showSettings ? t.accent : t.textTertiary)}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>

      {/* Logout button */}
      <button
        onClick={onLogout}
        title="Sign out"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: t.textTertiary, display: 'flex', padding: 4, borderRadius: 6,
          transition: 'color 0.12s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = t.danger)}
        onMouseLeave={(e) => (e.currentTarget.style.color = t.textTertiary)}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </div>
  )
}

// ── KB selector ───────────────────────────────────────────────────────────

function KBSelector({
  t, kbs, selectedKbId, onSelect, onNewChat, sessionId,
}: {
  t: Tokens; kbs: KBItem[]; selectedKbId: string
  onSelect: (id: string) => void; onNewChat: () => void; sessionId: string | null
}) {
  return (
    <div style={{
      padding: '8px 14px',
      borderBottom: `1px solid ${t.borderSubtle}`,
      display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
    }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={t.textTertiary} strokeWidth="2"
          style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <select
          value={selectedKbId}
          onChange={(e) => onSelect(e.target.value)}
          style={{
            width: '100%', padding: '6px 10px 6px 28px', borderRadius: 8,
            border: `1px solid ${t.border}`, background: t.surface,
            color: selectedKbId ? t.text : t.textTertiary,
            fontSize: 12, fontFamily: SANS, outline: 'none', cursor: 'pointer',
            appearance: 'none',
          }}
        >
          <option value="">Select knowledge base…</option>
          {kbs.map((kb) => (
            <option key={kb.id} value={kb.id}>{kb.name}</option>
          ))}
        </select>
      </div>

      {/* New chat button — only when a session exists */}
      {sessionId && (
        <button
          onClick={onNewChat}
          title="New chat"
          style={{
            background: t.accentSoft, border: `1px solid ${t.accentBorder}`,
            color: t.accent, borderRadius: 7, padding: '5px 8px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0,
            fontSize: 11, fontFamily: SANS, fontWeight: 600, gap: 4,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New
        </button>
      )}
    </div>
  )
}

// ── Ingest banner ─────────────────────────────────────────────────────────

function IngestBanner({
  t, pageInfo, kbs, ingestKbId, ingesting, onKbChange, onIngest, onDismiss,
}: {
  t: Tokens
  pageInfo: PageInfo
  kbs: KBItem[]
  ingestKbId: string
  ingesting: boolean
  onKbChange: (id: string) => void
  onIngest: () => void
  onDismiss: () => void
}) {
  const title = pageInfo.title.length > 38 ? pageInfo.title.slice(0, 38) + '…' : pageInfo.title
  const chars = pageInfo.textLength.toLocaleString()

  return (
    <div style={{
      padding: '7px 14px', borderBottom: `1px solid ${t.accentBorder}`,
      background: t.accentSoft,
      display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>

      <span style={{ fontSize: 11.5, color: t.text, fontFamily: SANS, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', minWidth: 0 }}>
        <strong style={{ fontWeight: 600 }}>{title}</strong>
        <span style={{ color: t.textTertiary }}> — {chars} chars</span>
      </span>

      <select
        value={ingestKbId}
        onChange={(e) => onKbChange(e.target.value)}
        disabled={ingesting}
        style={{
          fontSize: 11, fontFamily: SANS, padding: '3px 6px', borderRadius: 6,
          border: `1px solid ${t.accentBorder}`, background: t.surface,
          color: t.text, cursor: 'pointer', flexShrink: 0, maxWidth: 115,
        }}
      >
        <option value="__auto">Auto (Browser Pages)</option>
        {kbs.map((kb) => (
          <option key={kb.id} value={kb.id}>{kb.name}</option>
        ))}
      </select>

      <button
        onClick={onIngest}
        disabled={ingesting}
        style={{
          padding: '4px 10px', borderRadius: 6, border: 'none',
          background: t.accent, color: '#fff',
          fontSize: 11, fontWeight: 600, fontFamily: SANS,
          cursor: ingesting ? 'not-allowed' : 'pointer',
          opacity: ingesting ? 0.65 : 1, flexShrink: 0,
        }}
      >
        {ingesting ? '…' : 'Add to KB'}
      </button>

      <button
        onClick={onDismiss}
        title="Dismiss"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: t.textTertiary, fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}

// ── Processing view ───────────────────────────────────────────────────────

function ProcessingView({
  t, docId, kbId, onReady, onDismiss,
}: {
  t: Tokens
  docId: string
  kbId: string
  onReady: (kbId: string) => void
  onDismiss: () => void
}) {
  const [phase, setPhase] = useState<'uploading' | 'processing' | 'ready' | 'failed'>('uploading')
  const [error, setError] = useState<string | null>(null)
  const [transitioning, setTransitioning] = useState(false)

  // Keep latest callbacks in refs so the polling interval closure never goes stale.
  const onReadyRef = useRef(onReady)
  const onDismissRef = useRef(onDismiss)
  useEffect(() => { onReadyRef.current = onReady }, [onReady])
  useEffect(() => { onDismissRef.current = onDismiss }, [onDismiss])

  // Poll /documents/{id}/status every 2 s until terminal state.
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const s = await getDocumentStatus(docId)
        setPhase(s.status)
        if (s.status === 'ready') {
          clearInterval(id)
          setTransitioning(true)
        } else if (s.status === 'failed') {
          clearInterval(id)
          setError(s.error ?? 'Processing failed')
        }
      } catch { /* network hiccup — keep polling */ }
    }, 2000)
    return () => clearInterval(id)
  }, [docId])

  // After "ready" shows for 1 s, hand off to chat.
  useEffect(() => {
    if (!transitioning) return
    const id = setTimeout(() => onReadyRef.current(kbId), 1000)
    return () => clearTimeout(id)
  }, [transitioning, kbId])

  if (phase === 'failed') {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '0 28px', gap: 14,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: `${t.danger}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={t.danger} strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: t.text, fontFamily: SANS, marginBottom: 4 }}>
            Processing failed
          </p>
          {error && (
            <p style={{ fontSize: 12, color: t.textSecondary, fontFamily: SANS }}>{error}</p>
          )}
        </div>
        <button
          onClick={() => onDismissRef.current()}
          style={{
            padding: '7px 18px', borderRadius: 8, border: `1px solid ${t.border}`,
            background: 'transparent', color: t.textSecondary,
            fontSize: 12, fontFamily: SANS, cursor: 'pointer',
          }}
        >
          Dismiss
        </button>
      </div>
    )
  }

  if (transitioning) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 14,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', background: t.accentSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: t.accent, fontFamily: SANS }}>
          Document ready!
        </p>
      </div>
    )
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%', background: t.accent,
            animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <p style={{ fontSize: 13, color: t.textSecondary, fontFamily: SANS }}>
        Analyzing document…
      </p>
    </div>
  )
}

// ── Chat view ─────────────────────────────────────────────────────────────

function ChatView({
  t, messages, streaming, streamContent, streamCitations,
  sessionId, activeCit, onCitClick, onSend,
}: {
  t: Tokens
  messages: Message[]
  streaming: boolean
  streamContent: string
  streamCitations: Citation[]
  sessionId: string | null
  activeCit: { msgId: string; n: number } | null
  onCitClick: (n: number, msgId: string) => void
  onSend: (content: string) => void
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamContent])

  if (!sessionId) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 10, padding: '0 20px',
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={t.textTertiary} strokeWidth="1.5">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <p style={{ fontSize: 13, color: t.textSecondary, fontFamily: SANS, textAlign: 'center' }}>
          Select a knowledge base to start chatting
        </p>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Message area — relative for popup positioning */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', position: 'relative' }}>
        {messages.length === 0 && !streaming && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: 8, paddingBottom: 40,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={t.textTertiary} strokeWidth="1.5" strokeLinecap="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p style={{ fontSize: 12.5, color: t.textTertiary, fontFamily: SANS, textAlign: 'center' }}>
              Ask a question about your documents
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageRow
            key={msg.id}
            msg={msg}
            t={t}
            activeCit={activeCit}
            onCitClick={(n) => onCitClick(n, msg.id)}
          />
        ))}

        {streaming && (
          <MessageRow
            msg={{ id: '__streaming', role: 'assistant', content: streamContent, citations: streamCitations }}
            t={t}
            activeCit={activeCit}
            onCitClick={(n) => onCitClick(n, '__streaming')}
            isStreaming
          />
        )}

        {/* Citation popup — floats inside the message area, uses the source message's citations */}
        {activeCit !== null && (() => {
          const citations = activeCit.msgId === '__streaming'
            ? streamCitations
            : messages.find(m => m.id === activeCit.msgId)?.citations ?? []
          const cit = citations[activeCit.n - 1]
          return cit
            ? <CitationPopup t={t} citation={cit} index={activeCit.n} onClose={() => onCitClick(activeCit.n, activeCit.msgId)} />
            : null
        })()}

        <div ref={messagesEndRef} />
      </div>

      {/* Status bar */}
      <div style={{ textAlign: 'center', padding: '4px 0', fontSize: 10.5, color: t.textTertiary, fontFamily: MONO }}>
        hybrid · top 5
      </div>

      <InputBar t={t} onSend={onSend} disabled={streaming} />
    </div>
  )
}

// ── Message row ───────────────────────────────────────────────────────────

function MessageRow({
  msg, t, activeCit, onCitClick, isStreaming = false,
}: {
  msg: Message; t: Tokens; activeCit: { msgId: string; n: number } | null
  onCitClick: (n: number) => void; isStreaming?: boolean
}) {
  return (
    <div style={{
      marginBottom: 18,
      display: 'flex', flexDirection: 'column',
      alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
      animation: 'fadeIn 0.15s ease-out',
    }}>
      {msg.role === 'user' ? (
        <div style={{
          background: t.userBubble, borderRadius: '15px 15px 4px 15px',
          padding: '9px 13px', maxWidth: '88%',
          fontSize: 13.5, lineHeight: 1.65, color: t.text, fontFamily: SANS,
        }}>
          {msg.content}
        </div>
      ) : (
        <div style={{ maxWidth: '97%', paddingBottom: 2 }}>
          {/* Streaming dots when no content yet */}
          {isStreaming && !msg.content ? (
            <div style={{ display: 'flex', gap: 4, padding: '6px 0' }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%', background: t.accent,
                  animation: `dotPulse 1.2s ease-in-out ${i * 0.15}s infinite`,
                }} />
              ))}
            </div>
          ) : (
            <RichText content={msg.content} msgId={msg.id} activeCit={activeCit} onCitClick={onCitClick} t={t} />
          )}

          {/* Citation cards */}
          {msg.citations.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
              {msg.citations.map((cit, idx) => (
                <CitationCard
                  key={cit.chunk_id}
                  citation={cit}
                  index={idx + 1}
                  active={activeCit?.msgId === msg.id && activeCit?.n === idx + 1}
                  onClick={() => onCitClick(idx + 1)}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Rich text renderer ────────────────────────────────────────────────────

function RichText({
  content, msgId, activeCit, onCitClick, t,
}: { content: string; msgId: string; activeCit: { msgId: string; n: number } | null; onCitClick: (n: number) => void; t: Tokens }) {
  const parts = content.split(/(\[\d+\])/g)

  return (
    <div style={{ fontSize: 13.5, lineHeight: 1.7, color: t.text, fontFamily: SANS }}>
      {parts.map((part, i) => {
        const match = part.match(/\[(\d+)\]/)
        if (match) {
          const n = parseInt(match[1])
          const active = activeCit?.msgId === msgId && activeCit?.n === n
          return (
            <span
              key={i}
              onClick={() => onCitClick(n)}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 19, height: 19, borderRadius: 5, fontSize: 10.5, fontWeight: 700,
                background: active ? t.accent : t.citBg,
                color: active ? '#fff' : t.citText,
                cursor: 'pointer', margin: '0 2px', verticalAlign: 'middle',
                fontFamily: MONO, transition: 'all 0.15s',
                transform: active ? 'scale(1.1)' : 'scale(1)',
                position: 'relative', top: -1,
              }}
            >
              {n}
            </span>
          )
        }

        const lines = part.split('\n')
        return lines.map((line, li) => {
          const boldMatch = line.match(/\*\*(.+?)\*\*/)
          if (boldMatch) {
            const idx = line.indexOf(boldMatch[0])
            return (
              <span key={`${i}-${li}`}>
                {li > 0 && <br />}
                {line.slice(0, idx)}
                <strong style={{ fontWeight: 600 }}>{boldMatch[1]}</strong>
                {line.slice(idx + boldMatch[0].length)}
              </span>
            )
          }
          return <span key={`${i}-${li}`}>{li > 0 && <br />}{line}</span>
        })
      })}
    </div>
  )
}

// ── Citation card (below message) ─────────────────────────────────────────

function CitationCard({
  citation, index, active, onClick, t,
}: { citation: Citation; index: number; active: boolean; onClick: () => void; t: Tokens }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 9px', borderRadius: 8,
        border: `1px solid ${active ? t.accent : t.border}`,
        background: active ? t.accentSoft : 'transparent',
        cursor: 'pointer', transition: 'all 0.15s', maxWidth: 200,
      }}
    >
      <span style={{
        width: 17, height: 17, borderRadius: 4, flexShrink: 0,
        background: active ? t.accent : t.citBg,
        color: active ? '#fff' : t.citText,
        fontSize: 10, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: MONO,
      }}>{index}</span>
      <span style={{
        fontSize: 11, color: t.textSecondary, fontFamily: SANS,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {citation.document_title}
      </span>
    </div>
  )
}

// ── Citation popup ────────────────────────────────────────────────────────

function CitationPopup({
  citation, index, onClose, t,
}: { citation: Citation; index: number; onClose: () => void; t: Tokens }) {
  return (
    <div style={{
      position: 'sticky', bottom: 8,
      background: t.popupBg, border: `1px solid ${t.border}`,
      borderRadius: 12, padding: '13px 14px',
      boxShadow: t.popupShadow,
      animation: 'popupIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
      zIndex: 10, marginTop: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.accent, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: t.text, fontFamily: SANS }}>
            [{index}] {citation.document_title}
          </span>
        </div>
        <span
          onClick={onClose}
          style={{ fontSize: 16, color: t.textTertiary, cursor: 'pointer', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
        >
          ×
        </span>
      </div>

      <div style={{ fontSize: 11, color: t.textTertiary, fontFamily: MONO, marginBottom: 9 }}>
        {(citation.relevance_score * 100).toFixed(0)}% relevance
      </div>

      <div style={{
        fontSize: 12.5, color: t.textSecondary, lineHeight: 1.65, fontFamily: SANS,
        borderLeft: `2px solid ${t.accent}`, paddingLeft: 11,
      }}>
        {citation.content_excerpt}
      </div>
    </div>
  )
}

// ── Sources tab view ──────────────────────────────────────────────────────

function SourcesView({ t, citations }: { t: Tokens; citations: Citation[] }) {
  if (citations.length === 0) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 8, padding: '0 20px',
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={t.textTertiary} strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <p style={{ fontSize: 12.5, color: t.textTertiary, fontFamily: SANS, textAlign: 'center' }}>
          No sources yet — send a message first
        </p>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '14px' }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: t.textTertiary, fontFamily: SANS, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
        Sources from last answer
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {citations.map((cit, i) => (
          <div key={cit.chunk_id} style={{
            padding: '11px 13px', borderRadius: 10,
            border: `1px solid ${t.border}`, background: t.surface,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
              <span style={{
                width: 18, height: 18, borderRadius: 5,
                background: t.citBg, color: t.citText,
                fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: MONO, flexShrink: 0,
              }}>{i + 1}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: t.text, fontFamily: SANS, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {cit.document_title}
              </span>
              <span style={{ fontSize: 10.5, color: t.textTertiary, fontFamily: MONO, flexShrink: 0 }}>
                {(cit.relevance_score * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{
              fontSize: 12, color: t.textSecondary, lineHeight: 1.6, fontFamily: SANS,
              borderLeft: `2px solid ${t.accentBorder}`, paddingLeft: 10,
              display: '-webkit-box',
              WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            } as React.CSSProperties}>
              {cit.content_excerpt}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Input bar ─────────────────────────────────────────────────────────────

function InputBar({
  t, onSend, disabled,
}: { t: Tokens; onSend: (content: string) => void; disabled: boolean }) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const text = input.trim()
    if (!text || disabled) return
    onSend(text)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  return (
    <div style={{ padding: '6px 14px 14px', flexShrink: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 8,
        background: t.inputBg, border: `1px solid ${t.inputBorder}`,
        borderRadius: 13, padding: '3px 4px 3px 13px',
      }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onInput={(e) => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = Math.min(el.scrollHeight, 120) + 'px'
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
          }}
          placeholder="Ask a question…"
          rows={1}
          disabled={disabled}
          style={{
            flex: 1, border: 'none', outline: 'none', resize: 'none',
            background: 'transparent', fontSize: 13.5, lineHeight: 1.5,
            color: t.text, fontFamily: SANS, padding: '8px 0', maxHeight: 120,
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || disabled}
          style={{
            width: 34, height: 34, borderRadius: 9, border: 'none',
            background: input.trim() && !disabled ? t.accent : t.border,
            cursor: input.trim() && !disabled ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'background 0.15s',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Settings view ─────────────────────────────────────────────────────────

function SettingsView({ t, onClose }: { t: Tokens; onClose: () => void }) {
  const [url, setUrl] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getBaseUrl().then(setUrl)
  }, [])

  const handleSave = async () => {
    const trimmed = url.trim()
    if (!trimmed) return
    await setBaseUrl(trimmed)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: t.text, fontFamily: SANS }}>Settings</span>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: t.textTertiary, fontSize: 18, lineHeight: 1, padding: '0 2px',
          }}
        >
          ×
        </button>
      </div>

      {/* Server URL */}
      <div>
        <label style={{
          fontSize: 11, fontWeight: 600, color: t.textSecondary,
          fontFamily: SANS, display: 'block', marginBottom: 5,
        }}>
          Server URL
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setSaved(false) }}
          placeholder="http://localhost:8000"
          style={{
            width: '100%', padding: '9px 12px', borderRadius: 8,
            border: `1px solid ${t.border}`, background: t.inputBg,
            color: t.text, fontSize: 13, fontFamily: SANS,
            outline: 'none', boxSizing: 'border-box',
          } as React.CSSProperties}
        />
        <p style={{ fontSize: 11, color: t.textTertiary, fontFamily: SANS, marginTop: 5, marginBottom: 16 }}>
          Base URL of the backend. Change to point to a remote server.
        </p>
        <button
          onClick={handleSave}
          disabled={!url.trim()}
          style={{
            padding: '8px 18px', borderRadius: 8,
            border: saved ? `1px solid ${t.accentBorder}` : 'none',
            background: saved ? t.accentSoft : t.accent,
            color: saved ? t.accent : '#fff',
            fontSize: 13, fontWeight: 600, fontFamily: SANS,
            cursor: url.trim() ? 'pointer' : 'not-allowed',
            opacity: url.trim() ? 1 : 0.6,
            transition: 'all 0.15s',
          } as React.CSSProperties}
        >
          {saved ? 'Saved ✓' : 'Save'}
        </button>
      </div>
    </div>
  )
}
