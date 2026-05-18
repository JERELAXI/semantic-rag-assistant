import { useTheme } from '../../hooks/useTheme';
import { FONT } from '../../styles/theme';

type Status = 'uploading' | 'processing' | 'ready' | 'failed';

interface StatusBadgeProps {
  status: Status;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const t = useTheme();

  const conf: Record<Status, { bg: string; color: string; label: string }> = {
    ready:      { bg: t.accentSoft,                color: t.statusReady, label: 'Ready' },
    processing: { bg: `${t.statusProc}20`,          color: t.statusProc,  label: 'Processing' },
    uploading:  { bg: `${t.statusProc}20`,          color: t.statusProc,  label: 'Uploading' },
    failed:     { bg: t.dangerSoft,                color: t.statusFail,  label: 'Failed' },
  };

  const { bg, color, label } = conf[status] ?? conf.processing;

  return (
    <span
      style={{
        fontSize: 11, fontWeight: 600,
        padding: '3px 8px', borderRadius: 6,
        background: bg, color,
        fontFamily: FONT, whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
