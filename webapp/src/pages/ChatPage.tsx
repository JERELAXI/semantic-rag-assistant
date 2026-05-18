import { useEffect, useRef, useState } from 'react';
import { MessageSquarePlus, Trash2 } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { FONT, MONO } from '../styles/theme';
import { kbApi } from '../api/knowledgeBases';
import { chatApi, type CitationResponse, type MessageResponse, type SessionResponse } from '../api/chat';
import { MessageBubble } from '../components/Chat/MessageBubble';
import { InputBar } from '../components/Chat/InputBar';
import { CitationPanel } from '../components/Chat/CitationPanel';
import type { KBResponse } from '../api/knowledgeBases';

export function ChatPage() {
  const t = useTheme();

  const [kbs, setKbs] = useState<KBResponse[]>([]);
  const [selectedKbId, setSelectedKbId] = useState('');
  const [allSessions, setAllSessions] = useState<SessionResponse[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [streamingContent, setStreamingContent] = useState('');
  const [streamingCitations, setStreamingCitations] = useState<CitationResponse[]>([]);
  const [streaming, setStreaming] = useState(false);

  const [activeCitation, setActiveCitation] = useState<{ citation: CitationResponse; index: number } | null>(null);
  const [error, setError] = useState('');

  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load KBs and sessions on mount
  useEffect(() => {
    kbApi.list().then(({ data }) => setKbs(data));
    loadSessions();
  }, []);

  // Load messages when active session changes
  useEffect(() => {
    if (!activeSessionId) { setMessages([]); return; }
    setLoadingMsgs(true);
    setActiveCitation(null);
    chatApi.getMessages(activeSessionId)
      .then(({ data }) => setMessages(data))
      .catch(() => setError('Failed to load messages'))
      .finally(() => setLoadingMsgs(false));
  }, [activeSessionId]);

  // Auto-scroll on new content
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingContent]);

  async function loadSessions() {
    const { data } = await chatApi.listSessions();
    setAllSessions(data);
  }

  const sessions = allSessions
    .filter((s) => !selectedKbId || s.knowledge_base_id === selectedKbId)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  async function handleNewChat() {
    if (!selectedKbId || streaming) return;
    const { data: session } = await chatApi.createSession(selectedKbId);
    setAllSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    setMessages([]);
    setActiveCitation(null);
    setError('');
  }

  async function handleDeleteSession(e: React.MouseEvent, sessionId: string) {
    e.stopPropagation();
    await chatApi.deleteSession(sessionId);
    setAllSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      setMessages([]);
    }
  }

  async function handleSend(content: string) {
    if (!activeSessionId || streaming) return;
    setError('');
    setStreaming(true);
    setStreamingContent('');
    setStreamingCitations([]);

    const userMsg: MessageResponse = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      created_at: new Date().toISOString(),
      citations: [],
    };
    setMessages((prev) => [...prev, userMsg]);

    let accContent = '';
    let accCitations: CitationResponse[] = [];

    try {
      for await (const event of chatApi.streamMessage(activeSessionId, content)) {
        if ('token' in event) {
          accContent += event.token;
          setStreamingContent(accContent);
        } else if ('citations' in event) {
          accCitations = event.citations;
          setStreamingCitations(accCitations);
        } else if ('done' in event) {
          setStreamingContent('');
          setStreamingCitations([]);
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: accContent,
              created_at: new Date().toISOString(),
              citations: accCitations,
            },
          ]);
          await loadSessions();
        }
      }
    } catch {
      setError('Streaming failed — please try again.');
      setStreamingContent('');
      setStreamingCitations([]);
    } finally {
      setStreaming(false);
    }
  }

  function handleCitationClick(citation: CitationResponse, index: number) {
    setActiveCitation((prev) => (prev?.index === index ? null : { citation, index }));
  }

  const activeKb = kbs.find((kb) => kb.id === selectedKbId);
  const isStreaming = streaming;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Session panel ── */}
      <div
        style={{
          width: 240, minWidth: 240,
          borderRight: `1px solid ${t.border}`,
          background: t.surface,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* KB selector */}
        <div style={{ padding: '14px 12px', borderBottom: `1px solid ${t.borderSubtle}` }}>
          <label style={{ fontSize: 11, color: t.textTri, fontFamily: FONT, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Knowledge Base
          </label>
          <select
            value={selectedKbId}
            onChange={(e) => {
              setSelectedKbId(e.target.value);
              setActiveSessionId(null);
              setMessages([]);
              setActiveCitation(null);
            }}
            style={{
              width: '100%', padding: '7px 10px', borderRadius: 8,
              border: `1px solid ${t.border}`, background: t.surfaceAlt,
              color: selectedKbId ? t.text : t.textTri,
              fontSize: 13, fontFamily: FONT, outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="">Select KB…</option>
            {kbs.map((kb) => (
              <option key={kb.id} value={kb.id}>{kb.name}</option>
            ))}
          </select>
        </div>

        {/* New chat button */}
        <div style={{ padding: '10px 12px', borderBottom: `1px solid ${t.borderSubtle}` }}>
          <button
            onClick={handleNewChat}
            disabled={!selectedKbId || isStreaming}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 0', borderRadius: 8, border: `1px solid ${t.accentBorder}`,
              background: !selectedKbId ? 'transparent' : t.accentSoft,
              color: !selectedKbId ? t.textTri : t.accent,
              fontSize: 13, fontWeight: 500, fontFamily: FONT,
              cursor: !selectedKbId || isStreaming ? 'not-allowed' : 'pointer',
              opacity: !selectedKbId || isStreaming ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
          >
            <MessageSquarePlus size={14} />
            New chat
          </button>
        </div>

        {/* Session list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sessions.length === 0 && (
            <p style={{ fontSize: 12, color: t.textTri, fontFamily: FONT, padding: '16px 12px', textAlign: 'center' }}>
              {selectedKbId ? 'No chats yet' : 'Select a KB to see chats'}
            </p>
          )}
          {sessions.map((s) => {
            const isActive = s.id === activeSessionId;
            const isHovered = hoveredSessionId === s.id;
            return (
              <div
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                onMouseEnter={() => setHoveredSessionId(s.id)}
                onMouseLeave={() => setHoveredSessionId(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 12px', cursor: 'pointer',
                  background: isActive ? t.accentSoft : isHovered ? t.surfaceAlt : 'transparent',
                  borderLeft: `2px solid ${isActive ? t.accent : 'transparent'}`,
                  transition: 'background 0.1s',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 13, fontWeight: isActive ? 500 : 400,
                    color: isActive ? t.accent : t.text, fontFamily: FONT,
                    margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {s.title ?? 'Untitled chat'}
                  </p>
                  <p style={{ fontSize: 11, color: t.textTri, fontFamily: MONO, margin: '2px 0 0' }}>
                    {fmtDate(s.updated_at)}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDeleteSession(e, s.id)}
                  style={{
                    background: 'none', border: 'none', padding: 3,
                    borderRadius: 5, cursor: 'pointer', color: t.textTri,
                    opacity: isHovered ? 1 : 0, transition: 'opacity 0.1s', flexShrink: 0,
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Chat area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div
          style={{
            padding: '10px 24px', borderBottom: `1px solid ${t.border}`,
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 13, color: t.textTri, fontFamily: FONT }}>Knowledge Base:</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: t.text, fontFamily: FONT }}>
            {activeKb?.name ?? '—'}
          </span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: t.textTri, fontFamily: MONO }}>hybrid · top 5</span>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {!activeSessionId ? (
            <EmptyState hasKb={!!selectedKbId} onNewChat={handleNewChat} />
          ) : loadingMsgs ? (
            <LoadingDots t={t} />
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  citations={msg.citations}
                  onCitationClick={handleCitationClick}
                  activeCitationIndex={activeCitation?.index ?? null}
                />
              ))}

              {/* Streaming message */}
              {streaming && (
                <MessageBubble
                  role="assistant"
                  content={streamingContent}
                  citations={streamingCitations}
                  streaming={true}
                  onCitationClick={handleCitationClick}
                  activeCitationIndex={activeCitation?.index ?? null}
                />
              )}

              {error && (
                <p style={{ fontSize: 13, color: t.danger, fontFamily: FONT, marginBottom: 12 }}>
                  {error}
                </p>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input — only shown when a session is active */}
        {activeSessionId && (
          <InputBar onSend={handleSend} disabled={isStreaming} />
        )}
      </div>

      {/* ── Citation panel ── */}
      {activeCitation && (
        <CitationPanel
          citation={activeCitation.citation}
          index={activeCitation.index}
          onClose={() => setActiveCitation(null)}
        />
      )}
    </div>
  );
}

function EmptyState({ hasKb, onNewChat }: { hasKb: boolean; onNewChat: () => void }) {
  const t = useTheme();
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', gap: 12, paddingBottom: 60,
      }}
    >
      <MessageSquarePlus size={40} color={t.textTri} strokeWidth={1.5} />
      <p style={{ fontSize: 14, color: t.textSec, fontFamily: FONT, margin: 0 }}>
        {hasKb ? 'Start a new chat' : 'Select a knowledge base to begin'}
      </p>
      {hasKb && (
        <button
          onClick={onNewChat}
          style={{
            marginTop: 4, padding: '8px 16px', borderRadius: 8,
            border: `1px solid ${t.accentBorder}`,
            background: t.accentSoft, color: t.accent,
            fontSize: 13, fontWeight: 500, fontFamily: FONT, cursor: 'pointer',
          }}
        >
          New chat
        </button>
      )}
    </div>
  );
}

function LoadingDots({ t }: { t: ReturnType<typeof useTheme> }) {
  return (
    <div style={{ display: 'flex', gap: 6, padding: '20px 0', justifyContent: 'center' }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 6, height: 6, borderRadius: 3, background: t.textTri,
            animation: `loadDot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`@keyframes loadDot { 0%,80%,100%{opacity:.3;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }`}</style>
    </div>
  );
}
