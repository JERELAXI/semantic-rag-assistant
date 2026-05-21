import { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { FONT } from '../../styles/theme';

export interface ToastItem {
  id: string;
  type: 'success' | 'error';
  message: string;
}

function ToastMessage({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const t = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const isSuccess = toast.type === 'success';
  const iconColor = isSuccess ? t.statusReady : t.danger;
  const borderColor = isSuccess ? t.accentBorder : `${t.danger}40`;

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 14px', borderRadius: 10,
        background: t.surface, border: `1px solid ${borderColor}`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        minWidth: 260, maxWidth: 380,
        animation: 'toastIn 0.2s ease-out',
      }}
    >
      <span style={{ color: iconColor, flexShrink: 0, display: 'flex' }}>
        {isSuccess ? <CheckCircle size={15} /> : <XCircle size={15} />}
      </span>
      <span style={{ flex: 1, fontSize: 13, color: t.text, fontFamily: FONT, lineHeight: 1.4 }}>
        {toast.message}
      </span>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: t.textTri, display: 'flex', padding: 2, flexShrink: 0,
        }}
      >
        <X size={13} />
      </button>
    </div>
  );
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (!toasts.length) return null;
  return (
    <>
      <style>{`@keyframes toastIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <div
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}
      >
        {toasts.map((toast) => (
          <ToastMessage key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </div>
    </>
  );
}
