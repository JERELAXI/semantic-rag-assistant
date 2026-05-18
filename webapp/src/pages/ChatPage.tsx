import { useTheme } from '../hooks/useTheme';
import { FONT } from '../styles/theme';

export function ChatPage() {
  const t = useTheme();
  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: t.text, fontFamily: FONT, margin: 0 }}>
        Chat
      </h2>
      <p style={{ fontSize: 13, color: t.textSec, fontFamily: FONT, marginTop: 6 }}>
        Coming soon — Day 10
      </p>
    </div>
  );
}
