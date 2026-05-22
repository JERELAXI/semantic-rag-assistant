import { X } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../contexts/LangContext';
import { FONT, MONO } from '../../styles/theme';
import type { CitationResponse } from '../../api/chat';

interface CitationPanelProps {
  citation: CitationResponse;
  index: number;
  onClose: () => void;
}

export function CitationPanel({ citation, index, onClose }: CitationPanelProps) {
  const t = useTheme();
  const tx = useT();

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
    </div>
  );
}
