import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { FONT } from '../../styles/theme';

interface UploadZoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

export function UploadZone({ onFiles, disabled = false }: UploadZoneProps) {
  const t = useTheme();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = (files: FileList | null) => {
    if (!files || disabled) return;
    const valid = Array.from(files).filter((f) =>
      [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown',
      ].includes(f.type),
    );
    if (valid.length) onFiles(valid);
  };

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handle(e.dataTransfer.files);
      }}
      style={{
        border: `2px dashed ${dragging ? t.accent : t.border}`,
        borderRadius: 12,
        padding: '28px 20px',
        textAlign: 'center',
        background: dragging ? t.accentSoft : 'transparent',
        transition: 'all 0.2s',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handle(e.target.files)}
      />
      <div
        style={{
          display: 'flex', justifyContent: 'center', marginBottom: 10,
          color: dragging ? t.accent : t.textTri,
        }}
      >
        <Upload size={24} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: t.text, fontFamily: FONT }}>
        {disabled ? 'Uploading…' : 'Drop files here or click to browse'}
      </div>
      <div style={{ fontSize: 11, color: t.textTri, fontFamily: FONT, marginTop: 4 }}>
        PDF, DOCX, TXT, MD · max 50 MB
      </div>
    </div>
  );
}
