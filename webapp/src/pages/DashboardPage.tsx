import { useTheme } from '../hooks/useTheme';
import { FONT } from '../styles/theme';

export function DashboardPage() {
  const t = useTheme();
  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: t.text, fontFamily: FONT, margin: 0 }}>
        Knowledge Bases
      </h2>
      <p style={{ fontSize: 13, color: t.textSec, fontFamily: FONT, marginTop: 6 }}>
        Coming soon — Day 9
      </p>
    </div>
  );
}
