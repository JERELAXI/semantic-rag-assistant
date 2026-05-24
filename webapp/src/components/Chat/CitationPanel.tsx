import { X } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../contexts/LangContext';
import { FONT, MONO } from '../../styles/theme';
import type { CitationResponse } from '../../api/chat';

interface CitationPanelProps {
  citation: CitationResponse;
  index: number;
  onClose: () => void;
  isMobile?: boolean;
}

export function CitationPanel({ citation, index, onClose, isMobile }: CitationPanelProps) {
  const t = useTheme();
  const tx = useT();

  const content = (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: t.text, fontFamily: FONT }}>
          {tx('citation.source', { index })}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: t.textTri, display: 'flex', alignItems: 'center', padding: 2,
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Metadata card */}
      <div
        style={{
          padding: 14, borderRadius: 10, background: t.surfaceAlt,
          border: `1px solid ${t.borderSubtle}`,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: t.text, fontFamily: FONT, marginBottom: 10 }}>
          {citation.document_title}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: t.accent, fontFamily: FONT }}>
            {(citation.relevance_score * 100).toFixed(0)}%
          </span>
          <span style={{ fontSize: 11, color: t.textTri, fontFamily: FONT }}>
            {tx('citation.relevance')}
          </span>
        </div>
      </div>

      {/* Chunk text */}
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: t.textSec, fontFamily: MONO, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {tx('citation.excerpt')}
        </p>
        <div
          style={{
            fontSize: 13, lineHeight: 1.7, color: t.text, fontFamily: FONT,
            borderLeft: `2px solid ${t.accent}`, paddingLeft: 14,
          }}
        >
          {citation.content_excerpt}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <style>{`@keyframes citSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 300,
          }}
        />
        <div
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            height: '55vh',
            background: t.surface,
            borderTop: `1px solid ${t.border}`,
            borderRadius: '16px 16px 0 0',
            zIndex: 301,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            animation: 'citSlideUp 0.25s ease-out',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: t.border }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {content}
          </div>
        </div>
      </>
    );
  }

  return (
    <div
      style={{
        width: 320, minWidth: 320,
        borderLeft: `1px solid ${t.border}`,
        background: t.surface,
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
        animation: 'citSlideIn 0.2s ease-out',
      }}
    >
      <style>{`@keyframes citSlideIn { from { opacity:0; transform:translateX(12px); } to { opacity:1; transform:translateX(0); } }`}</style>
      {content}
    </div>
  );
}
