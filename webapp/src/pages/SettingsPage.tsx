import { useEffect, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useT } from '../contexts/LangContext';
import { FONT, MONO } from '../styles/theme';
import { SEARCH_MODE_KEY, TOP_K_KEY, type SearchMode, getSearchPrefs } from '../hooks/useSearchPrefs';
import { settingsApi } from '../api/settings';

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

  const [provider, setProvider] = useState<string>('openai');
  const [rerankerEnabled, setRerankerEnabled] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);
  const [showProviderWarning, setShowProviderWarning] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);

  useEffect(() => {
    settingsApi.get().then((res) => {
      setProvider(res.data.embedding_provider);
      setRerankerEnabled(res.data.reranker_enabled);
    });
  }, []);

  function handleSearchMode(mode: SearchMode) {
    setSearchMode(mode);
    localStorage.setItem(SEARCH_MODE_KEY, mode);
  }

  function handleTopK(value: number) {
    setTopK(value);
    localStorage.setItem(TOP_K_KEY, String(value));
  }

  function handleProviderClick(value: string) {
    if (value === provider || saving) return;
    setPendingProvider(value);
    setShowProviderWarning(true);
  }

  async function confirmProviderSwitch() {
    if (!pendingProvider) return;
    setSaving(true);
    try {
      const res = await settingsApi.patch({ embedding_provider: pendingProvider });
      setProvider(res.data.embedding_provider);
    } finally {
      setSaving(false);
      setShowProviderWarning(false);
      setPendingProvider(null);
    }
  }

  function cancelProviderSwitch() {
    setShowProviderWarning(false);
    setPendingProvider(null);
  }

  async function handleRerankerToggle() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await settingsApi.patch({ reranker_enabled: !rerankerEnabled });
      setRerankerEnabled(res.data.reranker_enabled);
    } finally {
      setSaving(false);
    }
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
        isLast={false}
        t={t}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          <ModeBtn
            label="OpenAI"
            active={provider === 'openai'}
            onClick={() => handleProviderClick('openai')}
            disabled={saving}
            t={t}
          />
          <ModeBtn
            label="NVIDIA NIM"
            active={provider === 'nvidia'}
            onClick={() => handleProviderClick('nvidia')}
            disabled={saving}
            t={t}
          />
        </div>
      </SettingRow>

      <SettingRow
        label={tx('settings.reranker.label')}
        desc={tx('settings.reranker.desc')}
        isLast
        t={t}
      >
        <Toggle on={rerankerEnabled} disabled={saving} onClick={handleRerankerToggle} t={t} />
      </SettingRow>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16 }}>
        <span style={{ fontSize: 11, color: t.textTri, fontFamily: MONO }}>
          {tx('settings.restart.note')}
        </span>
      </div>

      {showProviderWarning && (
        <ProviderWarningModal
          pendingProvider={pendingProvider ?? ''}
          onConfirm={confirmProviderSwitch}
          onCancel={cancelProviderSwitch}
          saving={saving}
          t={t}
          tx={tx}
        />
      )}
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
  label, desc, isLast, children, t,
}: {
  label: string;
  desc: string;
  isLast: boolean;
  children: React.ReactNode;
  t: ReturnType<typeof useTheme>;
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '16px 0',
      borderBottom: isLast ? 'none' : `1px solid ${t.borderSubtle}`,
    }}>
      <div style={{ flex: 1, marginRight: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: t.text, fontFamily: FONT }}>{label}</div>
        <div style={{ fontSize: 12, color: t.textTri, fontFamily: FONT, marginTop: 3 }}>{desc}</div>
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

function Toggle({
  on, disabled, onClick, t,
}: {
  on: boolean;
  disabled?: boolean;
  onClick?: () => void;
  t: ReturnType<typeof useTheme>;
}) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      role="switch"
      aria-checked={on}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: on ? t.accent : t.border,
        cursor: disabled ? 'default' : 'pointer', position: 'relative',
        transition: 'background 0.2s',
        opacity: disabled ? 0.65 : 1, flexShrink: 0,
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: 9, background: '#fff',
        position: 'absolute', top: 3, left: on ? 23 : 3,
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 0.2s',
      }} />
    </div>
  );
}

function ProviderWarningModal({
  pendingProvider, onConfirm, onCancel, saving, t, tx,
}: {
  pendingProvider: string;
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
  t: ReturnType<typeof useTheme>;
  tx: (key: string) => string;
}) {
  const label = pendingProvider === 'nvidia' ? 'NVIDIA NIM' : 'OpenAI';
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }}>
      <div style={{
        background: t.surface, border: `1px solid ${t.border}`,
        borderRadius: 12, padding: '28px 32px', maxWidth: 420, width: '90%',
      }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: t.text, fontFamily: FONT }}>
          {tx('settings.provider.warning.title')}
        </h3>
        <p style={{ margin: '0 0 8px', fontSize: 13, color: t.textSec, fontFamily: FONT, lineHeight: 1.5 }}>
          {tx('settings.provider.warning.body')}
        </p>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: t.textSec, fontFamily: FONT }}>
          → <strong style={{ color: t.text }}>{label}</strong>
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{
              padding: '8px 18px', borderRadius: 8, fontSize: 13,
              border: `1px solid ${t.border}`, background: 'transparent',
              color: t.textSec, cursor: 'pointer', fontFamily: FONT,
            }}
          >
            {tx('settings.provider.warning.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            style={{
              padding: '8px 18px', borderRadius: 8, fontSize: 13,
              border: 'none', background: t.accent,
              color: '#fff', cursor: saving ? 'default' : 'pointer',
              fontFamily: FONT, opacity: saving ? 0.65 : 1,
            }}
          >
            {saving ? '…' : tx('settings.provider.warning.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
