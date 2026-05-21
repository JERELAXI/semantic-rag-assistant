import React from 'react';
import { useTheme } from '../../hooks/useTheme';
import { FONT, MONO } from '../../styles/theme';
import type { CitationResponse } from '../../api/chat';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  citations?: CitationResponse[];
  streaming?: boolean;
  onCitationClick?: (citation: CitationResponse, index: number) => void;
  activeCitationIndex?: number | null;
}

export function MessageBubble({
  role,
  content,
  citations = [],
  streaming = false,
  onCitationClick,
  activeCitationIndex = null,
}: MessageBubbleProps) {
  const t = useTheme();

  if (role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <div
          style={{
            maxWidth: '72%', padding: '10px 14px',
            borderRadius: '12px 12px 4px 12px',
            background: t.userBub, fontSize: 14, lineHeight: 1.6,
            color: t.text, fontFamily: FONT, wordBreak: 'break-word',
          }}
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <style>{`@keyframes cursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>

      {/* Role row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div
          style={{
            width: 26, height: 26, borderRadius: 8,
            background: t.accentSoft, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
          </svg>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: t.textSec, fontFamily: FONT }}>
          Assistant
        </span>
      </div>

      {/* Content */}
      <div
        style={{
          fontSize: 14, lineHeight: 1.75, color: t.text,
          fontFamily: FONT, paddingLeft: 34,
        }}
      >
        {parseContent(content, citations, activeCitationIndex, onCitationClick, t)}
        {streaming && (
          <span style={{ animation: 'cursorBlink 1s step-end infinite', marginLeft: 1 }}>▋</span>
        )}
      </div>

      {/* Citation cards below message */}
      {citations.length > 0 && (
        <div
          style={{
            display: 'flex', gap: 8, marginTop: 12,
            paddingLeft: 34, flexWrap: 'wrap',
          }}
        >
          {citations.map((cit, idx) => {
            const num = idx + 1;
            const isActive = activeCitationIndex === num;
            return (
              <div
                key={`${cit.chunk_id}-${idx}`}
                onClick={() => onCitationClick?.(cit, num)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: 10, maxWidth: 280,
                  border: `1px solid ${isActive ? t.accent : t.border}`,
                  background: isActive ? t.accentSoft : t.surface,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <span
                  style={{
                    width: 22, height: 22, borderRadius: 6,
                    fontSize: 11, fontWeight: 700,
                    background: isActive ? t.accent : t.citBg,
                    color: isActive ? '#fff' : t.citText,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: MONO, flexShrink: 0,
                  }}
                >
                  {num}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12, fontWeight: 500, color: t.text, fontFamily: FONT,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {cit.document_title}
                  </div>
                  <div style={{ fontSize: 10, color: t.textTri, fontFamily: FONT }}>
                    {(cit.relevance_score * 100).toFixed(0)}% match
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function parseContent(
  content: string,
  citations: CitationResponse[],
  activeCitationIndex: number | null,
  onCitationClick: ((cit: CitationResponse, idx: number) => void) | undefined,
  t: ReturnType<typeof useTheme>,
): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  const parts = content.split(/(\[\d+\])/g);

  parts.forEach((part, partIdx) => {
    const citMatch = part.match(/^\[(\d+)\]$/);
    if (citMatch) {
      const num = parseInt(citMatch[1]);
      const cit = citations[num - 1] ?? null;
      const isActive = activeCitationIndex === num;
      result.push(
        <span
          key={`cit-${partIdx}`}
          onClick={() => cit && onCitationClick?.(cit, num)}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 20, height: 20, borderRadius: 6,
            fontSize: 11, fontWeight: 600,
            background: isActive ? t.accent : t.citBg,
            color: isActive ? '#fff' : t.citText,
            cursor: cit ? 'pointer' : 'default',
            margin: '0 2px', verticalAlign: 'middle',
            fontFamily: MONO, transition: 'all 0.15s', flexShrink: 0,
          }}
        >
          {num}
        </span>,
      );
      return;
    }

    // Text: handle newlines then bold
    part.split('\n').forEach((line, lineIdx) => {
      if (lineIdx > 0) result.push(<br key={`br-${partIdx}-${lineIdx}`} />);

      const boldParts = line.split(/(\*\*[^*]+\*\*)/g);
      boldParts.forEach((bp, bpIdx) => {
        if (bp.startsWith('**') && bp.endsWith('**')) {
          result.push(<strong key={`b-${partIdx}-${lineIdx}-${bpIdx}`}>{bp.slice(2, -2)}</strong>);
        } else if (bp) {
          result.push(<span key={`t-${partIdx}-${lineIdx}-${bpIdx}`}>{bp}</span>);
        }
      });
    });
  });

  return result;
}
