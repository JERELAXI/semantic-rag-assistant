import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../contexts/LangContext';
import { FONT } from '../../styles/theme';

type Status = 'uploading' | 'processing' | 'ready' | 'failed';

interface StatusBadgeProps {
  status: Status;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const t = useTheme();
  const tx = useT();

  const conf: Record<Status, { bg: string; color: string; key: string }> = {
    ready:      { bg: t.accentSoft,       color: t.statusReady, key: 'status.ready' },
    processing: { bg: `${t.statusProc}20`, color: t.statusProc,  key: 'status.processing' },
    uploading:  { bg: `${t.statusProc}20`, color: t.statusProc,  key: 'status.uploading' },
    failed:     { bg: t.dangerSoft,       color: t.statusFail,  key: 'status.failed' },
  };

  const { bg, color, key } = conf[status] ?? conf.processing;

  return (
    <span
      style={{
        fontSize: 11, fontWeight: 600,
        padding: '3px 8px', borderRadius: 6,
        background: bg, color,
        fontFamily: FONT, whiteSpace: 'nowrap',
      }}
    >
      {tx(key)}
    </span>
  );
}
