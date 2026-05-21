import { useTheme } from '../../hooks/useTheme';
import { MONO } from '../../styles/theme';

interface FileIconProps {
  contentType: string;
}

const TYPE_MAP: Record<string, { ext: string; color: string }> = {
  'application/pdf': { ext: 'pdf', color: '#E5534B' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    ext: 'docx',
    color: '#4B7BE5',
  },
  'text/plain':    { ext: 'txt', color: '' },
  'text/markdown': { ext: 'md',  color: '#9B7AE8' },
};

export function FileIcon({ contentType }: FileIconProps) {
  const t = useTheme();
  const { ext, color } = TYPE_MAP[contentType] ?? { ext: '?', color: '' };
  const resolvedColor = color || t.textTri;

  return (
    <div
      style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: `${resolvedColor}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700,
        color: resolvedColor,
        fontFamily: MONO,
        textTransform: 'uppercase',
      }}
    >
      {ext}
    </div>
  );
}
