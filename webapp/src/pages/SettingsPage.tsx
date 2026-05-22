import { useState } from 'react';
import { Server } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useT } from '../contexts/LangContext';
import { FONT, MONO } from '../styles/theme';
import { SEARCH_MODE_KEY, TOP_K_KEY, type SearchMode, getSearchPrefs } from '../hooks/useSearchPrefs';

export { getSearchPrefs };

export function SettingsPage() {
  const t = useTheme();
  const tx = useT();
  const [searchMode, setSearchMode] = useState<SearchMode>(
    () => (localStorage.getItem(SEARCH_MODE_KEY) as SearchMode) ?? 'hybrid',
  );
  const [topK, setTopK] = useState<number>(
    () => parseInt(localStorage.getItem(TOP_K_KEY) ?? '5', 10),
  );

  function handleSearchMode(mode: SearchMode) {
    setSearchMode(mode);
    localStorage.setItem(SEARCH_MODE_KEY, mode);
  }

  function handleTopK(value: number) {
    setTopK(value);
    localStorage.setItem(TOP_K_KEY, String(value));
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 600 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: t.text, fontFamily: FONT, margin: 0 }}>
          {tx('settings.heading')}
        </h1>
        <p style={{ fontSize: 13, color: t.textSec, fontFamily: FONT, marginTop: 4, marginBottom: 0 }}>
          {tx('settings.subtitle')}
        </p>
      </div>

      <SectionLabel title={tx('settings.search.title')} sub={tx('settings.search.subtitle')} t={t} />

      <SettingRow label={tx('settings.searchMode.label')} desc={tx('settings.searchMode.desc')} isLast={false} t={t}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['vector', 'fts', 'hybrid'] as SearchMode[]).map((m) => (
            <ModeBtn key={m} label={m} active={searchMode === m} onClick={() => handleSearchMode(m)} t={t} />
          ))}
        </div>
      </SettingRow>

      <SettingRow label={tx('settings.topK.label', { value: topK })} desc={tx('settings.topK.desc')} isLast t={t}>
        <div style={{ width: 180 }}>
          <input
            type="range"
            min={1}
            max={20}
            value={topK}
            onChange={(e) => handleTopK(Number(e.target.value))}
            style={{ width: '100%', accentColor: t.accent, cursor: 'pointer', display: 'block' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 10, color: t.textTri, fontFamily: MONO }}>1</span>
            <span style={{ fontSize: 10, color: t.textTri, fontFamily: MONO }}>20</span>
          </div>
        </div>
      </SettingRow>

      <div style={{ height: 32 }} />

      <SectionLabel title={tx('settings.server.title')} sub={tx('settings.server.subtitle')} t={t} />

      <SettingRow
        label={tx('settings.embedding.label')}
        desc={tx('settings.embedding.desc')}
        serverNote
        isLast={false}
        t={t}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          <ModeBtn label="OpenAI" active disabled t={t} />
          <ModeBtn label="NVIDIA NIM" active={false} disabled t={t} />
        </div>
      </SettingRow>

      <SettingRow
        label={tx('settings.reranker.label')}
        desc={tx('settings.reranker.desc')}
        serverNote
        isLast
        t={t}
      >
        <Toggle on={false} t={t} />
      </SettingRow>
    </div>
  );
}

function SectionLabel({ title, sub, t }: { title: string; sub: string; t: ReturnType<typeof useTheme> }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{
        fontSize: 11, fontWeight: 600, color: t.textTri, fontFamily: FONT,
        margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {title}
      </p>
      <p style={{ fontSize: 12, color: t.textTri, fontFamily: FONT, margin: '3px 0 0' }}>
        {sub}
      </p>
    </div>
  );
}

function SettingRow({
  label, desc, serverNote, isLast, children, t,
}: {
  label: string;
  desc: string;
  serverNote?: boolean;
  isLast: boolean;
  children: React.ReactNode;
  t: ReturnType<typeof useTheme>;
}) {
  const tx = useT();
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '16px 0',
      borderBottom: isLast ? 'none' : `1px solid ${t.borderSubtle}`,
    }}>
      <div style={{ flex: 1, marginRight: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: t.text, fontFamily: FONT }}>{label}</div>
        <div style={{ fontSize: 12, color: t.textTri, fontFamily: FONT, marginTop: 3 }}>{desc}</div>
        {serverNote && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
            <Server size={10} color={t.textTri} />
            <span style={{ fontSize: 11, color: t.textTri, fontFamily: MONO }}>
              {tx('settings.serverNote')}
            </span>
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function ModeBtn({
  label, active, onClick, disabled, t,
}: {
  label: string;
  active: boolean;
  onClick?: () => void;
  disabled?: boolean;
  t: ReturnType<typeof useTheme>;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
        border: `1px solid ${active ? t.accent : t.border}`,
        background: active ? t.accentSoft : 'transparent',
        color: active ? t.accent : t.textSec,
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: FONT, transition: 'all 0.15s',
        opacity: disabled ? 0.65 : 1,
      }}
    >
      {label}
    </button>
  );
}

function Toggle({ on, t }: { on: boolean; t: ReturnType<typeof useTheme> }) {
  return (
    <div
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: on ? t.accent : t.border,
        cursor: 'default', position: 'relative',
        transition: 'background 0.2s',
        opacity: 0.65, flexShrink: 0,
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: 9, background: '#fff',
        position: 'absolute', top: 3, left: on ? 23 : 3,
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  );
}
