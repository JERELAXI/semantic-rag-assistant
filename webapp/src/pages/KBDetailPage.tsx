import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Share2, Trash2, UserMinus, X } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { FONT, MONO } from '../styles/theme';
import { kbApi, KBResponse, KBShareResponse } from '../api/knowledgeBases';
import { documentsApi, DocumentResponse } from '../api/documents';
import { UploadZone } from '../components/Documents/UploadZone';
import { FileIcon } from '../components/UI/FileIcon';
import { StatusBadge } from '../components/UI/StatusBadge';
import { ConfirmDialog } from '../components/UI/ConfirmDialog';
import { Modal } from '../components/UI/Modal';
import { Skeleton } from '../components/UI/Skeleton';
import { useToast } from '../contexts/ToastContext';

export function KBDetailPage() {
  const t = useTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [kb, setKb] = useState<KBResponse | null>(null);
  const [docs, setDocs] = useState<DocumentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [deleteDocTarget, setDeleteDocTarget] = useState<DocumentResponse | null>(null);
  const [deleteKbOpen, setDeleteKbOpen] = useState(false);

  // Share modal state
  const [shareOpen, setShareOpen] = useState(false);
  const [shares, setShares] = useState<KBShareResponse[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<'viewer' | 'editor'>('viewer');
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id) return;
    loadData();
    return () => stopPoll();
  }, [id]);

  useEffect(() => {
    const hasActive = docs.some((d) => d.status === 'uploading' || d.status === 'processing');
    if (hasActive) {
      startPoll();
    } else {
      stopPoll();
    }
  }, [docs]);

  useEffect(() => {
    if (!shareOpen || !id) return;
    setSharesLoading(true);
    kbApi.listShares(id)
      .then(({ data }) => setShares(data))
      .catch(() => showToast('Failed to load shares', 'error'))
      .finally(() => setSharesLoading(false));
  }, [shareOpen]);

  async function loadData() {
    if (!id) return;
    setLoading(true);
    try {
      const [{ data: kbData }, { data: docsData }] = await Promise.all([
        kbApi.get(id),
        documentsApi.list(id),
      ]);
      setKb(kbData);
      setDocs(docsData);
    } catch {
      showToast('Failed to load knowledge base', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function refreshDocs() {
    if (!id) return;
    const { data } = await documentsApi.list(id);
    setDocs(data);
  }

  function startPoll() {
    if (pollRef.current) return;
    pollRef.current = setInterval(refreshDocs, 2000);
  }

  function stopPoll() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function handleUpload(files: File[]) {
    if (!id) return;
    setUploading(true);
    let successCount = 0;
    for (const file of files) {
      try {
        const title = file.name.replace(/\.[^/.]+$/, '');
        await documentsApi.upload(file, title, id);
        successCount++;
      } catch (e: any) {
        if (e?.response?.status === 409) {
          showToast(`"${file.name}": Document already exists in this knowledge base`, 'error');
        } else {
          const msg = e?.response?.data?.detail ?? 'Upload failed';
          showToast(`${file.name}: ${msg}`, 'error');
        }
      }
    }
    if (successCount > 0) {
      showToast(`${successCount} file${successCount > 1 ? 's' : ''} uploaded — processing started`);
    }
    await refreshDocs();
    setUploading(false);
  }

  async function handleDeleteDoc() {
    if (!deleteDocTarget) return;
    try {
      await documentsApi.delete(deleteDocTarget.id);
      showToast(`"${deleteDocTarget.title}" deleted`);
    } catch {
      showToast('Failed to delete document', 'error');
    }
    setDeleteDocTarget(null);
    await refreshDocs();
  }

  async function handleDeleteKb() {
    if (!id) return;
    try {
      await kbApi.delete(id);
      showToast(`"${kb?.name}" deleted`);
      navigate('/');
    } catch {
      showToast('Failed to delete knowledge base', 'error');
    }
  }

  async function handleShare() {
    if (!id || !shareEmail.trim()) return;
    setSharing(true);
    setShareError('');
    try {
      await kbApi.share(id, shareEmail.trim(), sharePermission);
      setShareEmail('');
      const { data } = await kbApi.listShares(id);
      setShares(data);
      showToast('Access granted');
    } catch (e: any) {
      setShareError(e?.response?.data?.detail ?? 'Failed to share');
    } finally {
      setSharing(false);
    }
  }

  async function handleUnshare(userId: string) {
    if (!id) return;
    try {
      await kbApi.unshare(id, userId);
      setShares((prev) => prev.filter((s) => s.shared_with_user_id !== userId));
    } catch {
      showToast('Failed to remove access', 'error');
    }
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const chunkCount = docs.reduce((sum, d) => sum + d.chunk_count, 0);
  const isOwner = kb?.permission === 'owner';
  const canWrite = kb?.permission !== 'viewer';

  if (loading) {
    return (
      <div style={{ padding: '32px 40px', maxWidth: 860 }}>
        <Skeleton width={80} height={13} style={{ marginBottom: 24 }} />
        <Skeleton width={200} height={22} style={{ marginBottom: 8 }} />
        <Skeleton width={120} height={12} style={{ marginBottom: 32 }} />
        <Skeleton width="100%" height={100} style={{ marginBottom: 24, borderRadius: 12 }} />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} width="100%" height={56} style={{ marginBottom: 8, borderRadius: 8 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 860 }}>
      {/* Back */}
      <button
        onClick={() => navigate('/')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', padding: 0,
          color: t.textSec, fontSize: 13, fontFamily: FONT,
          cursor: 'pointer', marginBottom: 20, transition: 'color 0.12s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = t.text)}
        onMouseLeave={(e) => (e.currentTarget.style.color = t.textSec)}
      >
        <ArrowLeft size={15} />
        All Knowledge Bases
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: t.text, fontFamily: FONT, margin: 0 }}>
              {kb?.name ?? '—'}
            </h1>
            {!isOwner && kb?.shared_by_name && (
              <span style={{
                fontSize: 11, fontFamily: FONT, padding: '2px 8px', borderRadius: 6,
                background: t.accentSoft, color: t.accent, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                Shared by {kb.shared_by_name}
              </span>
            )}
          </div>
          {kb?.description && (
            <p style={{ fontSize: 13, color: t.textSec, fontFamily: FONT, marginTop: 4, marginBottom: 0 }}>
              {kb.description}
            </p>
          )}
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <HeaderStat label="documents" value={docs.length} t={t} />
            <HeaderStat label="chunks" value={chunkCount} t={t} />
          </div>
        </div>

        {/* Action buttons — owner only */}
        {isOwner && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShareOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 12px', borderRadius: 8,
                border: `1px solid ${t.accentBorder}`,
                background: t.accentSoft, color: t.accent,
                fontSize: 12, fontFamily: FONT, cursor: 'pointer',
                transition: 'opacity 0.12s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <Share2 size={13} />
              Share
            </button>
            <button
              onClick={() => setDeleteKbOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 12px', borderRadius: 8,
                border: `1px solid ${t.border}`,
                background: 'none', color: t.danger,
                fontSize: 12, fontFamily: FONT, cursor: 'pointer',
                transition: 'border-color 0.12s, background 0.12s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = t.danger;
                e.currentTarget.style.background = t.dangerSoft;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = t.border;
                e.currentTarget.style.background = 'none';
              }}
            >
              <Trash2 size={13} />
              Delete KB
            </button>
          </div>
        )}
      </div>

      {/* Upload zone — owner and editor only */}
      {canWrite && (
        <div style={{ marginBottom: 28 }}>
          <UploadZone onFiles={handleUpload} disabled={uploading} />
        </div>
      )}

      {/* Document list */}
      {docs.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', gap: 10 }}>
          <FileText size={36} color={t.textTri} strokeWidth={1.5} />
          <p style={{ fontSize: 14, color: t.textSec, fontFamily: FONT, margin: 0 }}>No documents yet</p>
          {canWrite && (
            <p style={{ fontSize: 12, color: t.textTri, fontFamily: FONT, margin: 0 }}>
              Drop files above to get started
            </p>
          )}
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: t.textTri, fontFamily: FONT, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Documents
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {docs.map((doc) => (
              <DocRow
                key={doc.id}
                doc={doc}
                t={t}
                fmtDate={fmtDate}
                canDelete={canWrite}
                onDelete={() => setDeleteDocTarget(doc)}
              />
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteDocTarget}
        onClose={() => setDeleteDocTarget(null)}
        onConfirm={handleDeleteDoc}
        title="Delete Document"
        message={`Delete "${deleteDocTarget?.title}"? All associated chunks and embeddings will be removed.`}
        confirmLabel="Delete"
      />

      <ConfirmDialog
        isOpen={deleteKbOpen}
        onClose={() => setDeleteKbOpen(false)}
        onConfirm={handleDeleteKb}
        title="Delete Knowledge Base"
        message={`Delete "${kb?.name}"? This will permanently remove all ${docs.length} document(s) and their embeddings.`}
        confirmLabel="Delete"
      />

      {/* Share modal */}
      <Modal
        isOpen={shareOpen}
        onClose={() => { setShareOpen(false); setShareEmail(''); setShareError(''); }}
        title="Share Knowledge Base"
        maxWidth={480}
      >
        {/* Invite row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: t.textSec, fontFamily: FONT, display: 'block', marginBottom: 6 }}>
              Invite by email
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                autoFocus
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleShare()}
                placeholder="colleague@example.com"
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8,
                  border: `1px solid ${t.border}`, background: t.surfaceAlt,
                  color: t.text, fontSize: 13, fontFamily: FONT,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              <select
                value={sharePermission}
                onChange={(e) => setSharePermission(e.target.value as 'viewer' | 'editor')}
                style={{
                  padding: '8px 10px', borderRadius: 8,
                  border: `1px solid ${t.border}`, background: t.surfaceAlt,
                  color: t.text, fontSize: 13, fontFamily: FONT,
                  outline: 'none', cursor: 'pointer',
                }}
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <button
                onClick={handleShare}
                disabled={sharing || !shareEmail.trim()}
                style={{
                  padding: '8px 14px', borderRadius: 8, border: 'none',
                  background: t.accent, color: '#fff',
                  fontSize: 13, fontWeight: 600, fontFamily: FONT,
                  cursor: sharing || !shareEmail.trim() ? 'not-allowed' : 'pointer',
                  opacity: sharing || !shareEmail.trim() ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {sharing ? 'Sharing…' : 'Share'}
              </button>
            </div>
            {shareError && (
              <p style={{ fontSize: 12, color: t.danger, fontFamily: FONT, margin: '6px 0 0' }}>{shareError}</p>
            )}
          </div>

          {/* Permission legend */}
          <p style={{ fontSize: 11, color: t.textTri, fontFamily: FONT, margin: 0 }}>
            Viewer — can search and chat · Editor — can also upload documents
          </p>

          {/* Current shares */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: t.textTri, fontFamily: FONT, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              People with access
            </p>
            {sharesLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2].map((i) => <Skeleton key={i} width="100%" height={40} style={{ borderRadius: 8 }} />)}
              </div>
            ) : shares.length === 0 ? (
              <p style={{ fontSize: 13, color: t.textTri, fontFamily: FONT, margin: 0 }}>
                Only you have access to this knowledge base.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Owner row */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: t.text, fontFamily: FONT, margin: 0 }}>
                      You
                    </p>
                  </div>
                  <span style={{
                    fontSize: 11, fontFamily: MONO, padding: '2px 8px', borderRadius: 4,
                    background: t.accentSoft, color: t.accent, fontWeight: 600,
                  }}>
                    Owner
                  </span>
                </div>
                {shares.map((s) => (
                  <ShareRow
                    key={s.id}
                    share={s}
                    t={t}
                    onRemove={() => handleUnshare(s.shared_with_user_id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ShareRow({
  share, t, onRemove,
}: {
  share: KBShareResponse;
  t: any;
  onRemove: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', borderRadius: 8,
        background: hovered ? t.surfaceAlt : 'transparent',
        transition: 'background 0.12s',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: t.text, fontFamily: FONT, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {share.shared_with_display_name}
        </p>
        <p style={{ fontSize: 11, color: t.textTri, fontFamily: MONO, margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {share.shared_with_email}
        </p>
      </div>
      <span style={{
        fontSize: 11, fontFamily: MONO, padding: '2px 8px', borderRadius: 4,
        background: t.surfaceAlt, color: t.textSec, flexShrink: 0,
      }}>
        {share.permission}
      </span>
      <button
        onClick={onRemove}
        style={{
          background: 'none', border: 'none', padding: 4,
          borderRadius: 6, cursor: 'pointer', color: t.danger,
          opacity: hovered ? 1 : 0, transition: 'opacity 0.12s', flexShrink: 0,
          display: 'flex', alignItems: 'center',
        }}
      >
        <UserMinus size={13} />
      </button>
    </div>
  );
}

function DocRow({
  doc, t, fmtDate, canDelete, onDelete,
}: {
  doc: DocumentResponse;
  t: any;
  fmtDate: (iso: string) => string;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 12px', borderRadius: 8,
        background: hovered ? t.surfaceAlt : 'transparent',
        transition: 'background 0.12s',
      }}
    >
      <FileIcon contentType={doc.content_type} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13, fontWeight: 500, color: t.text, fontFamily: FONT,
          margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {doc.title}
        </p>
        <p style={{ fontSize: 11, color: t.textTri, fontFamily: FONT, margin: '2px 0 0' }}>
          {doc.chunk_count > 0 ? `${doc.chunk_count} chunks · ` : ''}{fmtDate(doc.created_at)}
        </p>
      </div>

      <StatusBadge status={doc.status} />

      {canDelete && (
        <button
          onClick={onDelete}
          style={{
            background: 'none', border: 'none', padding: 4,
            borderRadius: 6, cursor: 'pointer', color: t.textTri,
            opacity: hovered ? 1 : 0, transition: 'opacity 0.12s', flexShrink: 0,
          }}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

function HeaderStat({ label, value, t }: { label: string; value: number; t: any }) {
  return (
    <span style={{ fontSize: 12, color: t.textSec, fontFamily: FONT }}>
      <strong style={{ color: t.text }}>{value}</strong> {label}
    </span>
  );
}
