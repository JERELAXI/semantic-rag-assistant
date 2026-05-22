import { useState } from 'react';
import { Modal } from './Modal';
import { useTheme } from '../../hooks/useTheme';
import { useT } from '../../contexts/LangContext';
import { FONT } from '../../styles/theme';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: string;
  confirmLabel?: string;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
}: ConfirmDialogProps) {
  const t = useTheme();
  const tx = useT();
  const [loading, setLoading] = useState(false);

  const label = confirmLabel ?? tx('confirm.delete');

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth={400}>
      <p style={{ fontSize: 14, color: t.textSec, fontFamily: FONT, lineHeight: 1.6 }}>
        {message}
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
        <button
          onClick={onClose}
          disabled={loading}
          style={{
            padding: '8px 16px', borderRadius: 8, border: `1px solid ${t.border}`,
            background: 'transparent', color: t.textSec,
            fontSize: 13, fontWeight: 500, fontFamily: FONT, cursor: 'pointer',
          }}
        >
          {tx('confirm.cancel')}
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: t.danger, color: '#fff',
            fontSize: 13, fontWeight: 600, fontFamily: FONT,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? tx('confirm.deleting') : label}
        </button>
      </div>
    </Modal>
  );
}
