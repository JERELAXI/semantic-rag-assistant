import { useRef, useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../contexts/LangContext';
import { FONT } from '../../styles/theme';

interface InputBarProps {
  onSend: (content: string) => void;
  disabled: boolean;
}

export function InputBar({ onSend, disabled }: InputBarProps) {
  const t = useTheme();
  const tx = useT();
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  const send = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (ref.current) ref.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleInput = () => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${Math.min(ref.current.scrollHeight, 140)}px`;
    }
  };

  const hasContent = value.trim().length > 0;

  return (
    <div style={{ padding: '12px 24px 20px', flexShrink: 0 }}>
      <div
        style={{
          display: 'flex', alignItems: 'flex-end', gap: 10,
          background: t.inputBg, border: `1px solid ${t.border}`,
          borderRadius: 14, padding: '4px 6px 4px 16px',
        }}
      >
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={tx('input.placeholder')}
          rows={1}
          disabled={disabled}
          style={{
            flex: 1, border: 'none', outline: 'none', resize: 'none',
            background: 'transparent', fontSize: 14, lineHeight: 1.5,
            color: t.text, fontFamily: FONT, padding: '10px 0',
            maxHeight: 140, overflowY: 'auto',
            opacity: disabled ? 0.5 : 1,
          }}
        />
        <button
          onClick={send}
          disabled={disabled || !hasContent}
          style={{
            width: 38, height: 38, borderRadius: 10, border: 'none',
            background: hasContent && !disabled ? t.accent : t.border,
            cursor: hasContent && !disabled ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'background 0.15s',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
      <p style={{ fontSize: 11, color: t.textTri, fontFamily: FONT, textAlign: 'center', marginTop: 8 }}>
        {tx('input.hint')}
      </p>
    </div>
  );
}
