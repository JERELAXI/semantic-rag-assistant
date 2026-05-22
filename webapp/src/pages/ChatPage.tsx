import { useEffect, useRef, useState } from 'react';
import { MessageSquarePlus, Trash2 } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { FONT, MONO } from '../styles/theme';
import { kbApi } from '../api/knowledgeBases';
import { chatApi, type CitationResponse, type MessageResponse, type SessionResponse } from '../api/chat';
import { MessageBubble } from '../components/Chat/MessageBubble';
import { InputBar } from '../components/Chat/InputBar';
import { CitationPanel } from '../components/Chat/CitationPanel';
import { Skeleton } from '../components/UI/Skeleton';
import { useToast } from '../contexts/ToastContext';
import { getSearchPrefs } from '../hooks/useSearchPrefs';
import type { KBResponse } from '../api/knowledgeBases';

export function ChatPage() {
  const t = useTheme();
  const { showToast } = useToast();

  const [kbs, setKbs] = useState<KBResponse[]>([]);
  const [selectedKbId, setSelectedKbId] = useState('');
  const [allSessions, setAllSessions] = useState<SessionResponse[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [streamingContent, setStreamingContent] = useState('');
  const [streaming, setStreaming] = useState(false);

  const [activeCitation, setActiveCitation] = useState<{ citation: CitationResponse; index: number; messageId: string } | null>(null);

  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Read prefs once on mount — remounts when navigating back from Settings
  const searchPrefs = getSearchPrefs();

  useEffect(() => {
    kbApi.list().then(({ data }) => setKbs(data)).catch(() => {});
    loadSessions();
  }, []);

  useEffect(() => {
    if (!activeSessionId) { setMessages([]); return; }
    setLoadingMsgs(true);
    setActiveCitation(null);
    chatApi.getMessages(activeSessionId)
      .then(({ data }) => setMessages(data))
      .catch(() => showToast('Failed to load messages', 'error'))
      .finally(() => setLoadingMsgs(false));
  }, [activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingContent]);

  async function loadSessions() {
    setLoadingSessions(true);
    try {
      const { data } = await chatApi.listSessions();
      setAllSessions(data);
    } catch {
      showToast('Failed to load sessions', 'error');
    } finally {
      setLoadingSessions(false);
    }
  }

  const sessions = allSessions
    .filter((s) => !selectedKbId || s.knowledge_base_id === selectedKbId)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  async function handleNewChat() {
    if (!selectedKbId || streaming) return;
    try {
      const { data: session } = await chatApi.createSession(selectedKbId);
      setAllSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      setMessages([]);
      setActiveCitation(null);
    } catch {
      showToast('Failed to create chat session', 'error');
    }
  }

  async function handleDeleteSession(e: React.MouseEvent, sessionId: string) {
    e.stopPropagation();
    try {
      await chatApi.deleteSession(sessionId);
      setAllSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch {
      showToast('Failed to delete session', 'error');
    }
  }

  async function handleSend(content: string) {
    if (!activeSessionId || streaming) return;
    setStreaming(true);
    setStreamingContent('');

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
      const { searchMode, topK } = getSearchPrefs();
      for await (const event of chatApi.streamMessage(activeSessionId, content, { searchMode, topK })) {
        if ('token' in event) {
          accContent += event.token;
          setStreamingContent(accContent);
        } else if ('citations' in event) {
          accCitations = event.citations;
        } else if ('done' in event) {
          const finalContent = event.final_content ?? accContent;
          setStreamingContent('');
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: finalContent,
              created_at: new Date().toISOString(),
              citations: accCitations,
            },
          ]);
          await loadSessions();
        }
      }
    } catch {
      showToast('Streaming failed — please try again.', 'error');
      setStreamingContent('');
    } finally {
      setStreaming(false);
    }
  }

  function handleCitationClick(citation: CitationResponse, index: number, messageId: string) {
    setActiveCitation((prev) =>
      prev?.index === index && prev?.messageId === messageId
        ? null
        : { citation, index, messageId },
    );
  }

  const activeKb = kbs.find((kb) => kb.id === selectedKbId);

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
            disabled={!selectedKbId || streaming}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 0', borderRadius: 8, border: `1px solid ${t.accentBorder}`,
              background: !selectedKbId ? 'transparent' : t.accentSoft,
              color: !selectedKbId ? t.textTri : t.accent,
              fontSize: 13, fontWeight: 500, fontFamily: FONT,
              cursor: !selectedKbId || streaming ? 'not-allowed' : 'pointer',
              opacity: !selectedKbId || streaming ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
          >
            <MessageSquarePlus size={14} />
            New chat
          </button>
        </div>

        {/* Session list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingSessions ? (
            <div style={{ padding: '12px 12px' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <Skeleton width="75%" height={12} style={{ marginBottom: 6 }} />
                  <Skeleton width="45%" height={10} />
                </div>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <p style={{ fontSize: 12, color: t.textTri, fontFamily: FONT, padding: '16px 12px', textAlign: 'center' }}>
              {selectedKbId ? 'No chats yet' : 'Select a KB to see chats'}
            </p>
          ) : (
            sessions.map((s) => {
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
            })
          )}
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
          <span style={{ fontSize: 11, color: t.textTri, fontFamily: MONO }}>
            {searchPrefs.searchMode} · top {searchPrefs.topK}
          </span>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {!activeSessionId ? (
            <EmptyState hasKb={!!selectedKbId} onNewChat={handleNewChat} />
          ) : loadingMsgs ? (
            <LoadingDots t={t} />
          ) : (
            <>
              {messages.length === 0 && (
                <div
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', height: '100%', gap: 8, paddingBottom: 60,
                    color: t.textTri, fontFamily: FONT, fontSize: 13,
                  }}
                >
                  <MessageSquarePlus size={32} strokeWidth={1.5} color={t.textTri} />
                  Ask a question to start the conversation
                </div>
              )}

              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  citations={msg.citations}
                  onCitationClick={(cit, idx) => handleCitationClick(cit, idx, msg.id)}
                  activeCitationIndex={
                    activeCitation?.messageId === msg.id ? activeCitation.index : null
                  }
                />
              ))}

              {streaming && (
                <MessageBubble
                  role="assistant"
                  content={streamingContent}
                  citations={[]}
                  streaming={true}
                />
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {activeSessionId && (
          <InputBar onSend={handleSend} disabled={streaming} />
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
