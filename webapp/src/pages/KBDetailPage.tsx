import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2, FileText } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { FONT } from '../styles/theme';
import { kbApi, KBResponse } from '../api/knowledgeBases';
import { documentsApi, DocumentResponse } from '../api/documents';
import { UploadZone } from '../components/Documents/UploadZone';
import { FileIcon } from '../components/UI/FileIcon';
import { StatusBadge } from '../components/UI/StatusBadge';
import { ConfirmDialog } from '../components/UI/ConfirmDialog';
import { Skeleton } from '../components/UI/Skeleton';

export function KBDetailPage() {
  const t = useTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [kb, setKb] = useState<KBResponse | null>(null);
  const [docs, setDocs] = useState<DocumentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [deleteDocTarget, setDeleteDocTarget] = useState<DocumentResponse | null>(null);
  const [deleteKbOpen, setDeleteKbOpen] = useState(false);

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
    setUploadError('');
    const errors: string[] = [];
    for (const file of files) {
      try {
        const title = file.name.replace(/\.[^/.]+$/, '');
        await documentsApi.upload(file, title, id);
      } catch (e: any) {
        errors.push(file.name + ': ' + (e?.response?.data?.detail ?? 'Upload failed'));
      }
    }
    if (errors.length) setUploadError(errors.join('\n'));
    await refreshDocs();
    setUploading(false);
  }

  async function handleDeleteDoc() {
    if (!deleteDocTarget) return;
    await documentsApi.delete(deleteDocTarget.id);
    setDeleteDocTarget(null);
    await refreshDocs();
  }

  async function handleDeleteKb() {
    if (!id) return;
    await kbApi.delete(id);
    navigate('/');
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const chunkCount = docs.reduce((sum, d) => sum + d.chunk_count, 0);

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
          cursor: 'pointer', marginBottom: 20,
        }}
      >
        <ArrowLeft size={15} />
        All Knowledge Bases
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: t.text, fontFamily: FONT, margin: 0 }}>
            {kb?.name ?? '—'}
          </h1>
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
        <button
          onClick={() => setDeleteKbOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', borderRadius: 8,
            border: `1px solid ${t.border}`,
            background: 'none', color: t.danger,
            fontSize: 12, fontFamily: FONT, cursor: 'pointer',
          }}
        >
          <Trash2 size={13} />
          Delete KB
        </button>
      </div>

      {/* Upload zone */}
      <div style={{ marginBottom: 28 }}>
        <UploadZone onFiles={handleUpload} disabled={uploading} />
        {uploadError && (
          <pre style={{
            fontSize: 11, color: t.danger, fontFamily: FONT,
            marginTop: 8, whiteSpace: 'pre-wrap',
          }}>
            {uploadError}
          </pre>
        )}
      </div>

      {/* Document list */}
      {docs.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', gap: 10 }}>
          <FileText size={36} color={t.textTri} strokeWidth={1.5} />
          <p style={{ fontSize: 14, color: t.textSec, fontFamily: FONT, margin: 0 }}>No documents yet</p>
          <p style={{ fontSize: 12, color: t.textTri, fontFamily: FONT, margin: 0 }}>
            Drop files above to get started
          </p>
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
                onDelete={() => setDeleteDocTarget(doc)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Delete document confirm */}
      <ConfirmDialog
        isOpen={!!deleteDocTarget}
        onClose={() => setDeleteDocTarget(null)}
        onConfirm={handleDeleteDoc}
        title="Delete Document"
        message={`Delete "${deleteDocTarget?.title}"? All associated chunks and embeddings will be removed.`}
        confirmLabel="Delete"
      />

      {/* Delete KB confirm */}
      <ConfirmDialog
        isOpen={deleteKbOpen}
        onClose={() => setDeleteKbOpen(false)}
        onConfirm={handleDeleteKb}
        title="Delete Knowledge Base"
        message={`Delete "${kb?.name}"? This will permanently remove all ${docs.length} document(s) and their embeddings.`}
        confirmLabel="Delete"
      />
    </div>
  );
}

function DocRow({
  doc,
  t,
  fmtDate,
  onDelete,
}: {
  doc: DocumentResponse;
  t: any;
  fmtDate: (iso: string) => string;
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
