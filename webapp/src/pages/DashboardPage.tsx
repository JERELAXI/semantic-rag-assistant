import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Database, Trash2, Bell, Check, X } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useT, useLang } from '../contexts/LangContext';
import { FONT } from '../styles/theme';
import { kbApi, KBResponse, KBInvitationResponse } from '../api/knowledgeBases';
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
  const tx = useT();
  const { lang } = useLang();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
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

  const [invitations, setInvitations] = useState<KBInvitationResponse[]>([]);
  const [invitationsOpen, setInvitationsOpen] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    await Promise.all([loadKBs(), loadInvitations()]);
  }

  async function loadInvitations() {
    try {
      const { data } = await kbApi.getPendingInvitations();
      setInvitations(data);
    } catch {
      // non-fatal — invitations banner is optional
    }
  }

  async function handleAccept(shareId: string) {
    setActingOn(shareId);
    try {
      await kbApi.acceptInvitation(shareId);
      setInvitations((prev) => prev.filter((i) => i.share_id !== shareId));
      await loadKBs();
      showToast(tx('toast.invitationAccepted'));
    } catch {
      showToast(tx('toast.invitationAcceptFailed'), 'error');
    } finally {
      setActingOn(null);
    }
  }

  async function handleDecline(shareId: string) {
    setActingOn(shareId);
    try {
      await kbApi.declineInvitation(shareId);
      setInvitations((prev) => prev.filter((i) => i.share_id !== shareId));
      showToast(tx('toast.invitationDeclined'));
    } catch {
      showToast(tx('toast.invitationDeclineFailed'), 'error');
    } finally {
      setActingOn(null);
    }
  }

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
      showToast(tx('toast.kbLoadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!createName.trim()) { setCreateError(tx('dashboard.create.nameRequired')); return; }
    setCreating(true);
    setCreateError('');
    try {
      await kbApi.create(createName.trim(), createDesc.trim() || undefined);
      setCreateOpen(false);
      setCreateName('');
      setCreateDesc('');
      showToast(tx('toast.kbCreated'));
      await loadKBs();
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? tx('toast.kbCreateFailed');
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
      showToast(tx('toast.kbDeleted', { name: deleteTarget.name }));
    } catch {
      showToast(tx('toast.kbDeleteFailed'), 'error');
    }
    setDeleteTarget(null);
    await loadKBs();
  }

  const locale = lang === 'uk' ? 'uk-UA' : 'en-US';
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });

  const bannerKey = invitations.length === 1
    ? 'dashboard.invitations.banner.one'
    : 'dashboard.invitations.banner.many';

  return (
    <div style={{ padding: isMobile ? '16px' : '32px 40px', maxWidth: 1100 }}>
      <div style={{
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        gap: isMobile ? 12 : 0,
        marginBottom: 28,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: t.text, fontFamily: FONT, margin: 0 }}>
            {tx('dashboard.heading')}
          </h1>
          <p style={{ fontSize: 13, color: t.textSec, fontFamily: FONT, marginTop: 4, marginBottom: 0 }}>
            {tx('dashboard.subtitle')}
          </p>
        </div>
        <button
          onClick={() => { setCreateOpen(true); setCreateError(''); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '9px 16px', borderRadius: 8, border: 'none',
            background: t.accent, color: '#fff',
            fontSize: 13, fontWeight: 600, fontFamily: FONT, cursor: 'pointer',
            transition: 'opacity 0.15s',
            width: isMobile ? '100%' : 'auto',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <Plus size={15} />
          {tx('dashboard.newKB')}
        </button>
      </div>

      {invitations.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderRadius: 10, marginBottom: 20,
          background: t.accentSoft, border: `1px solid ${t.accentBorder}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={15} color={t.accent} />
            <span style={{ fontSize: 13, fontFamily: FONT, color: t.text }}>
              {tx(bannerKey, { count: invitations.length })}
            </span>
          </div>
          <button
            onClick={() => setInvitationsOpen(true)}
            style={{
              padding: '6px 14px', borderRadius: 6, border: 'none',
              background: t.accent, color: '#fff',
              fontSize: 12, fontWeight: 600, fontFamily: FONT, cursor: 'pointer',
            }}
          >
            {tx('dashboard.invitations.view')}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Skeleton width={32} height={32} style={{ borderRadius: 8 }} />
                <Skeleton width={120} height={14} />
              </div>
              <Skeleton width="100%" height={11} style={{ marginBottom: 6 }} />
              <Skeleton width="70%" height={11} style={{ marginBottom: 16 }} />
              <div style={{ display: 'flex', gap: 16 }}>
                <Skeleton width={40} height={11} />
                <Skeleton width={60} height={11} />
              </div>
            </div>
          ))}
        </div>
      ) : kbs.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
          <Database size={40} color={t.textTri} strokeWidth={1.5} />
          <p style={{ fontSize: 14, color: t.textSec, fontFamily: FONT, margin: 0 }}>
            {tx('dashboard.empty.title')}
          </p>
          <p style={{ fontSize: 12, color: t.textTri, fontFamily: FONT, margin: 0 }}>
            {tx('dashboard.empty.subtitle')}
          </p>
          <button
            onClick={() => { setCreateOpen(true); setCreateError(''); }}
            style={{
              marginTop: 8, padding: '8px 16px', borderRadius: 8,
              border: `1px solid ${t.accentBorder}`,
              background: t.accentSoft, color: t.accent,
              fontSize: 13, fontWeight: 500, fontFamily: FONT, cursor: 'pointer',
            }}
          >
            {tx('dashboard.empty.create')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
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
              {kb.permission === 'owner' && (
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
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: t.accentSoft,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Database size={16} color={t.accent} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <span style={{
                    fontSize: 14, fontWeight: 600, color: t.text, fontFamily: FONT,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    display: 'block', maxWidth: 160,
                  }}>
                    {kb.name}
                  </span>
                  {kb.permission !== 'owner' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, fontFamily: FONT,
                        padding: '1px 6px', borderRadius: 4,
                        background: t.accentSoft, color: t.accent,
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        {tx('dashboard.card.shared')}
                      </span>
                      {kb.shared_by_name && (
                        <span style={{ fontSize: 11, color: t.textTri, fontFamily: FONT }}>
                          {tx('dashboard.card.sharedBy', { name: kb.shared_by_name })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
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
                <KBStat label={tx('dashboard.card.docs')} value={kb.docCount} t={t} />
                <KBStat label={tx('dashboard.card.chunks')} value={kb.chunkCount} t={t} />
              </div>

              <p style={{ fontSize: 11, color: t.textTri, fontFamily: FONT, margin: '10px 0 0' }}>
                {tx('dashboard.card.updated', { date: fmtDate(kb.updated_at) })}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Invitations modal */}
      <Modal isOpen={invitationsOpen} onClose={() => setInvitationsOpen(false)} title={tx('dashboard.invitations.title')} maxWidth={480}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {invitations.length === 0 ? (
            <p style={{ fontSize: 13, color: t.textSec, fontFamily: FONT, margin: 0, textAlign: 'center', padding: '20px 0' }}>
              {tx('dashboard.invitations.empty')}
            </p>
          ) : (
            invitations.map((inv) => (
              <div
                key={inv.share_id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 8,
                  background: t.surfaceAlt, border: `1px solid ${t.border}`,
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: t.text, fontFamily: FONT, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inv.kb_name}
                  </p>
                  <p style={{ fontSize: 11, color: t.textSec, fontFamily: FONT, margin: 0 }}>
                    {tx('kb.sharedBy', { name: inv.owner_name })} &middot; {tx(`permission.${inv.permission}`)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => handleDecline(inv.share_id)}
                    disabled={actingOn === inv.share_id}
                    title={tx('confirm.cancel')}
                    style={{
                      width: 30, height: 30, borderRadius: 6, border: `1px solid ${t.border}`,
                      background: 'transparent', color: t.textSec,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: actingOn === inv.share_id ? 'not-allowed' : 'pointer',
                      opacity: actingOn === inv.share_id ? 0.5 : 1,
                    }}
                  >
                    <X size={13} />
                  </button>
                  <button
                    onClick={() => handleAccept(inv.share_id)}
                    disabled={actingOn === inv.share_id}
                    title={tx('toast.invitationAccepted')}
                    style={{
                      width: 30, height: 30, borderRadius: 6, border: 'none',
                      background: t.accent, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: actingOn === inv.share_id ? 'not-allowed' : 'pointer',
                      opacity: actingOn === inv.share_id ? 0.5 : 1,
                    }}
                  >
                    <Check size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Create modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={tx('dashboard.create.title')} maxWidth={440}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: t.textSec, fontFamily: FONT, display: 'block', marginBottom: 6 }}>
              {tx('dashboard.create.nameLabel')}
            </label>
            <input
              autoFocus
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder={tx('dashboard.create.namePlaceholder')}
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
              {tx('dashboard.create.descLabel')}
            </label>
            <textarea
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              placeholder={tx('dashboard.create.descPlaceholder')}
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
              {tx('dashboard.create.cancel')}
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
              {creating ? tx('dashboard.create.creating') : tx('dashboard.create.submit')}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={tx('dashboard.deleteKb.title')}
        message={tx('dashboard.deleteKb.message', { name: deleteTarget?.name ?? '' })}
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
