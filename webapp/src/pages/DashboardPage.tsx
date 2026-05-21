import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Database, Trash2 } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { FONT } from '../styles/theme';
import { kbApi, KBResponse } from '../api/knowledgeBases';
import { documentsApi } from '../api/documents';
import { Modal } from '../components/UI/Modal';
import { ConfirmDialog } from '../components/UI/ConfirmDialog';
import { Skeleton } from '../components/UI/Skeleton';
import { useToast } from '../contexts/ToastContext';

interface KBCard extends KBResponse {
  docCount: number;
  chunkCount: number;
}

export function DashboardPage() {
  const t = useTheme();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [kbs, setKbs] = useState<KBCard[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<KBCard | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => { loadKBs(); }, []);

  async function loadKBs() {
    setLoading(true);
    try {
      const { data } = await kbApi.list();
      const cards = await Promise.all(
        data.map(async (kb) => {
          try {
            const { data: docs } = await documentsApi.list(kb.id);
            const chunkCount = docs.reduce((sum, d) => sum + d.chunk_count, 0);
            return { ...kb, docCount: docs.length, chunkCount };
          } catch {
            return { ...kb, docCount: 0, chunkCount: 0 };
          }
        }),
      );
      setKbs(cards);
    } catch {
      showToast('Failed to load knowledge bases', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!createName.trim()) { setCreateError('Name is required'); return; }
    setCreating(true);
    setCreateError('');
    try {
      await kbApi.create(createName.trim(), createDesc.trim() || undefined);
      setCreateOpen(false);
      setCreateName('');
      setCreateDesc('');
      showToast('Knowledge base created');
      await loadKBs();
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? 'Failed to create knowledge base';
      setCreateError(msg);
      showToast(msg, 'error');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await kbApi.delete(deleteTarget.id);
      showToast(`"${deleteTarget.name}" deleted`);
    } catch {
      showToast('Failed to delete knowledge base', 'error');
    }
    setDeleteTarget(null);
    await loadKBs();
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: t.text, fontFamily: FONT, margin: 0 }}>
            Knowledge Bases
          </h1>
          <p style={{ fontSize: 13, color: t.textSec, fontFamily: FONT, marginTop: 4, marginBottom: 0 }}>
            Manage your document collections
          </p>
        </div>
        <button
          onClick={() => { setCreateOpen(true); setCreateError(''); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 16px', borderRadius: 8, border: 'none',
            background: t.accent, color: '#fff',
            fontSize: 13, fontWeight: 600, fontFamily: FONT, cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <Plus size={15} />
          New KB
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ background: t.surface, borderRadius: 12, padding: 20, border: `1px solid ${t.border}` }}>
              <Skeleton width={120} height={14} style={{ marginBottom: 10 }} />
              <Skeleton width="80%" height={11} style={{ marginBottom: 20 }} />
              <div style={{ display: 'flex', gap: 16 }}>
                <Skeleton width={60} height={11} />
                <Skeleton width={60} height={11} />
              </div>
            </div>
          ))}
        </div>
      ) : kbs.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
          <Database size={40} color={t.textTri} strokeWidth={1.5} />
          <p style={{ fontSize: 14, color: t.textSec, fontFamily: FONT, margin: 0 }}>No knowledge bases yet</p>
          <p style={{ fontSize: 12, color: t.textTri, fontFamily: FONT, margin: 0 }}>Create one to start uploading documents</p>
          <button
            onClick={() => { setCreateOpen(true); setCreateError(''); }}
            style={{
              marginTop: 8, padding: '8px 16px', borderRadius: 8,
              border: `1px solid ${t.accentBorder}`,
              background: t.accentSoft, color: t.accent,
              fontSize: 13, fontWeight: 500, fontFamily: FONT, cursor: 'pointer',
            }}
          >
            Create knowledge base
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {kbs.map((kb) => (
            <div
              key={kb.id}
              onClick={() => navigate(`/kb/${kb.id}`)}
              onMouseEnter={() => setHoveredId(kb.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                background: t.surface,
                border: `1px solid ${hoveredId === kb.id ? t.accentBorder : t.border}`,
                borderRadius: 12, padding: 20,
                cursor: 'pointer', position: 'relative',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                boxShadow: hoveredId === kb.id ? `0 4px 16px ${t.accent}12` : 'none',
              }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(kb); }}
                style={{
                  position: 'absolute', top: 12, right: 12,
                  background: 'none', border: 'none',
                  padding: 4, borderRadius: 6, cursor: 'pointer',
                  color: t.textTri,
                  opacity: hoveredId === kb.id ? 1 : 0,
                  transition: 'opacity 0.15s',
                }}
              >
                <Trash2 size={14} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: t.accentSoft,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Database size={16} color={t.accent} />
                </div>
                <span style={{
                  fontSize: 14, fontWeight: 600, color: t.text, fontFamily: FONT,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  maxWidth: 160,
                }}>
                  {kb.name}
                </span>
              </div>

              {kb.description && (
                <p style={{
                  fontSize: 12, color: t.textSec, fontFamily: FONT,
                  margin: '0 0 12px', lineHeight: 1.5,
                  display: '-webkit-box' as any,
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical' as any,
                  overflow: 'hidden',
                }}>
                  {kb.description}
                </p>
              )}

              <div style={{ display: 'flex', gap: 16, marginTop: kb.description ? 0 : 12 }}>
                <KBStat label="docs" value={kb.docCount} t={t} />
                <KBStat label="chunks" value={kb.chunkCount} t={t} />
              </div>

              <p style={{ fontSize: 11, color: t.textTri, fontFamily: FONT, margin: '10px 0 0' }}>
                Updated {fmtDate(kb.updated_at)}
              </p>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New Knowledge Base" maxWidth={440}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: t.textSec, fontFamily: FONT, display: 'block', marginBottom: 6 }}>
              Name *
            </label>
            <input
              autoFocus
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Product Documentation"
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8,
                border: `1px solid ${t.border}`, background: t.surfaceAlt,
                color: t.text, fontSize: 13, fontFamily: FONT,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: t.textSec, fontFamily: FONT, display: 'block', marginBottom: 6 }}>
              Description
            </label>
            <textarea
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              placeholder="Optional description"
              rows={3}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8,
                border: `1px solid ${t.border}`, background: t.surfaceAlt,
                color: t.text, fontSize: 13, fontFamily: FONT,
                outline: 'none', resize: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          {createError && (
            <p style={{ fontSize: 12, color: t.danger, fontFamily: FONT, margin: 0 }}>{createError}</p>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              onClick={() => setCreateOpen(false)}
              disabled={creating}
              style={{
                padding: '8px 16px', borderRadius: 8, border: `1px solid ${t.border}`,
                background: 'transparent', color: t.textSec,
                fontSize: 13, fontFamily: FONT, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !createName.trim()}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: t.accent, color: '#fff',
                fontSize: 13, fontWeight: 600, fontFamily: FONT,
                cursor: creating || !createName.trim() ? 'not-allowed' : 'pointer',
                opacity: creating || !createName.trim() ? 0.65 : 1,
              }}
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Knowledge Base"
        message={`Delete "${deleteTarget?.name}"? This will permanently remove all documents and embeddings. This action cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}

function KBStat({ label, value, t }: { label: string; value: number; t: any }) {
  return (
    <div>
      <span style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: FONT }}>{value}</span>
      <span style={{ fontSize: 11, color: t.textTri, fontFamily: FONT, marginLeft: 4 }}>{label}</span>
    </div>
  );
}
