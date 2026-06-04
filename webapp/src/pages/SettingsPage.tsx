import { useEffect, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useT } from '../contexts/LangContext';
import { FONT, MONO } from '../styles/theme';
import { SEARCH_MODE_KEY, TOP_K_KEY, type SearchMode, getSearchPrefs } from '../hooks/useSearchPrefs';
import { settingsApi } from '../api/settings';
import { apiKeysApi, type ApiKeyResponse, type ApiKeyCreated } from '../api/apiKeys';

export { getSearchPrefs };

export function SettingsPage() {
  const t = useTheme();
  const tx = useT();
  const { isMobile } = useIsMobile();
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

  const [apiKeys, setApiKeys] = useState<ApiKeyResponse[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    settingsApi.get().then((res) => {
      setProvider(res.data.embedding_provider);
      setRerankerEnabled(res.data.reranker_enabled);
    });
    apiKeysApi.list().then((res) => setApiKeys(res.data));
  }, []);

  async function handleCreateKey() {
    if (!newKeyName.trim() || creatingKey) return;
    setCreatingKey(true);
    try {
      const res = await apiKeysApi.create(newKeyName.trim());
      setCreatedKey(res.data);
      setNewKeyName('');
      const listRes = await apiKeysApi.list();
      setApiKeys(listRes.data);
    } finally {
      setCreatingKey(false);
    }
  }

  async function handleRevokeKey(id: string) {
    await apiKeysApi.revoke(id);
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
  }

  function handleCopyKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

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
    <div style={{ padding: isMobile ? '16px' : '32px 40px', maxWidth: 600 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: t.text, fontFamily: FONT, margin: 0 }}>
          {tx('settings.heading')}
        </h1>
        <p style={{ fontSize: 13, color: t.textSec, fontFamily: FONT, marginTop: 4, marginBottom: 0 }}>
          {tx('settings.subtitle')}
        </p>
      </div>

      <SectionLabel title={tx('settings.search.title')} sub={tx('settings.search.subtitle')} t={t} />

      <SettingRow label={tx('settings.searchMode.label')} desc={tx('settings.searchMode.desc')} isLast={false} isMobile={isMobile} t={t}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['vector', 'fts', 'hybrid'] as SearchMode[]).map((m) => (
            <ModeBtn key={m} label={m} active={searchMode === m} onClick={() => handleSearchMode(m)} t={t} />
          ))}
        </div>
      </SettingRow>

      <SettingRow label={tx('settings.topK.label', { value: topK })} desc={tx('settings.topK.desc')} isLast isMobile={isMobile} t={t}>
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
        isMobile={isMobile}
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
        isMobile={isMobile}
        t={t}
      >
        <Toggle on={rerankerEnabled} disabled={saving} onClick={handleRerankerToggle} t={t} />
      </SettingRow>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16 }}>
        <span style={{ fontSize: 11, color: t.textTri, fontFamily: MONO }}>
          {tx('settings.restart.note')}
        </span>
      </div>

      <div style={{ height: 32 }} />

      <SectionLabel
        title="API Keys"
        sub="Long-lived keys for MCP integrations (Claude Desktop). A key is shown only once — copy it immediately."
        t={t}
      />

      {/* Existing keys */}
      {apiKeys.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {apiKeys.map((k) => (
            <div key={k.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 0', borderBottom: `1px solid ${t.borderSubtle}`,
            }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 500, color: t.text, fontFamily: FONT }}>{k.name}</span>
                <span style={{ fontSize: 11, color: t.textTri, fontFamily: MONO, marginLeft: 10 }}>{k.key_prefix}…</span>
                {k.last_used_at && (
                  <span style={{ fontSize: 11, color: t.textTri, fontFamily: FONT, marginLeft: 10 }}>
                    last used {new Date(k.last_used_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleRevokeKey(k.id)}
                style={{
                  padding: '5px 12px', borderRadius: 7, fontSize: 12,
                  border: `1px solid ${t.border}`, background: 'transparent',
                  color: t.danger ?? '#E5534B', cursor: 'pointer', fontFamily: FONT,
                }}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}

      {/* New key revealed */}
      {createdKey && (
        <div style={{
          padding: '14px 16px', borderRadius: 10,
          border: `1px solid ${t.accent}`, background: t.accentSoft,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t.accent, fontFamily: FONT, marginBottom: 8 }}>
            Copy your new API key — it won't be shown again
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code style={{
              flex: 1, fontSize: 12, color: t.text, fontFamily: MONO,
              background: t.inputBg, padding: '8px 12px', borderRadius: 7,
              border: `1px solid ${t.border}`, wordBreak: 'break-all',
            }}>
              {createdKey.key}
            </code>
            <button
              onClick={() => handleCopyKey(createdKey.key)}
              style={{
                padding: '8px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                border: 'none', background: copiedKey ? t.accentSoft : t.accent,
                color: copiedKey ? t.accent : '#fff', cursor: 'pointer', fontFamily: FONT,
                flexShrink: 0, transition: 'all 0.15s',
              }}
            >
              {copiedKey ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button
            onClick={() => setCreatedKey(null)}
            style={{
              marginTop: 10, fontSize: 11, color: t.textTri, fontFamily: FONT,
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            I've copied it, dismiss
          </button>
        </div>
      )}

      {/* Create new key */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
          placeholder="Key name, e.g. Claude Desktop"
          style={{
            flex: 1, padding: '9px 12px', borderRadius: 8, fontSize: 13,
            border: `1px solid ${t.border}`, background: t.inputBg,
            color: t.text, fontFamily: FONT, outline: 'none',
          }}
        />
        <button
          onClick={handleCreateKey}
          disabled={!newKeyName.trim() || creatingKey}
          style={{
            padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            border: 'none', background: t.accent, color: '#fff',
            cursor: !newKeyName.trim() || creatingKey ? 'not-allowed' : 'pointer',
            fontFamily: FONT, opacity: !newKeyName.trim() || creatingKey ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          {creatingKey ? '…' : 'Generate'}
        </button>
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
  label, desc, isLast, isMobile, children, t,
}: {
  label: string;
  desc: string;
  isLast: boolean;
  isMobile?: boolean;
  children: React.ReactNode;
  t: ReturnType<typeof useTheme>;
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'flex-start' : 'center',
      gap: isMobile ? 12 : 0,
      padding: '16px 0',
      borderBottom: isLast ? 'none' : `1px solid ${t.borderSubtle}`,
    }}>
      <div style={{ flex: 1, marginRight: isMobile ? 0 : 24 }}>
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
