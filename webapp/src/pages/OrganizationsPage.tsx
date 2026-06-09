import { useEffect, useState } from 'react';
import { Building2, ChevronDown, ChevronRight, Plus, Trash2, UserMinus, UserPlus } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useT } from '../contexts/LangContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { FONT, MONO } from '../styles/theme';
import { orgsApi, type OrgResponse } from '../api/organizations';
import { kbApi } from '../api/knowledgeBases';
import { Modal } from '../components/UI/Modal';
import { ConfirmDialog } from '../components/UI/ConfirmDialog';
import { Skeleton } from '../components/UI/Skeleton';

export function OrganizationsPage() {
  const t = useTheme();
  const tx = useT();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isMobile } = useIsMobile();

  const [orgs, setOrgs] = useState<OrgResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<OrgResponse | null>(null);

  const [inviteOrgId, setInviteOrgId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const [createKbOrgId, setCreateKbOrgId] = useState<string | null>(null);
  const [kbName, setKbName] = useState('');
  const [kbDesc, setKbDesc] = useState('');
  const [creatingKb, setCreatingKb] = useState(false);

  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await orgsApi.list();
      setOrgs(data);
    } catch {
      showToast(tx('toast.orgsLoadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!createName.trim() || creating) return;
    setCreating(true);
    try {
      const { data } = await orgsApi.create(createName.trim());
      setOrgs((prev) => [data, ...prev]);
      setCreateOpen(false);
      setCreateName('');
      setExpandedId(data.id);
      showToast(tx('toast.orgCreated'));
    } catch {
      showToast(tx('toast.orgCreateFailed'), 'error');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await orgsApi.delete(deleteTarget.id);
      setOrgs((prev) => prev.filter((o) => o.id !== deleteTarget.id));
      if (expandedId === deleteTarget.id) setExpandedId(null);
      showToast(tx('toast.orgDeleted', { name: deleteTarget.name }));
    } catch {
      showToast(tx('toast.orgDeleteFailed'), 'error');
    } finally {
      setDeleteTarget(null);
    }
  }

  async function handleInvite() {
    if (!inviteOrgId || !inviteEmail.trim() || inviting) return;
    setInviting(true);
    setInviteError('');
    try {
      const { data: member } = await orgsApi.invite(inviteOrgId, inviteEmail.trim());
      setOrgs((prev) =>
        prev.map((o) =>
          o.id === inviteOrgId ? { ...o, members: [...o.members, member] } : o
        )
      );
      setInviteEmail('');
      setInviteOrgId(null);
      showToast(tx('toast.orgInvited'));
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? tx('toast.orgInviteFailed');
      setInviteError(msg);
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember(orgId: string, userId: string) {
    setRemovingMemberId(userId);
    try {
      await orgsApi.removeMember(orgId, userId);
      setOrgs((prev) =>
        prev.map((o) =>
          o.id === orgId ? { ...o, members: o.members.filter((m) => m.user_id !== userId) } : o
        )
      );
      showToast(tx('toast.orgMemberRemoved'));
    } catch {
      showToast(tx('toast.orgMemberRemoveFailed'), 'error');
    } finally {
      setRemovingMemberId(null);
    }
  }

  async function handleCreateKb() {
    if (!createKbOrgId || !kbName.trim() || creatingKb) return;
    setCreatingKb(true);
    try {
      await kbApi.create(kbName.trim(), kbDesc.trim() || undefined, createKbOrgId);
      setCreateKbOrgId(null);
      setKbName('');
      setKbDesc('');
      showToast(tx('toast.kbCreated'));
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? tx('toast.kbCreateFailed');
      showToast(msg, 'error');
    } finally {
      setCreatingKb(false);
    }
  }

  const isOwner = (org: OrgResponse) =>
    org.members.some((m) => m.user_id === user?.id && m.role === 'owner');

  return (
    <div style={{ padding: isMobile ? '16px' : '32px 40px', maxWidth: 800 }}>
      {/* Header */}
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
            {tx('orgs.heading')}
          </h1>
          <p style={{ fontSize: 13, color: t.textSec, fontFamily: FONT, marginTop: 4, marginBottom: 0 }}>
            {tx('orgs.subtitle')}
          </p>
        </div>
        <button
          onClick={() => { setCreateOpen(true); setCreateName(''); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 16px', borderRadius: 8, border: 'none',
            background: t.accent, color: '#fff',
            fontSize: 13, fontWeight: 600, fontFamily: FONT, cursor: 'pointer',
            width: isMobile ? '100%' : 'auto', justifyContent: 'center',
          }}
        >
          <Plus size={15} />
          {tx('orgs.new')}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2].map((i) => (
            <div key={i} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Skeleton width={32} height={32} style={{ borderRadius: 8 }} />
                <Skeleton width={160} height={14} />
              </div>
            </div>
          ))}
        </div>
      ) : orgs.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', gap: 12 }}>
          <Building2 size={40} color={t.textTri} strokeWidth={1.5} />
          <p style={{ fontSize: 14, color: t.textSec, fontFamily: FONT, margin: 0 }}>{tx('orgs.empty.title')}</p>
          <p style={{ fontSize: 12, color: t.textTri, fontFamily: FONT, margin: 0 }}>{tx('orgs.empty.subtitle')}</p>
          <button
            onClick={() => setCreateOpen(true)}
            style={{
              marginTop: 8, padding: '8px 16px', borderRadius: 8,
              border: `1px solid ${t.accentBorder}`, background: t.accentSoft,
              color: t.accent, fontSize: 13, fontWeight: 500, fontFamily: FONT, cursor: 'pointer',
            }}
          >
            {tx('orgs.empty.create')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {orgs.map((org) => {
            const expanded = expandedId === org.id;
            const owner = isOwner(org);
            return (
              <div
                key={org.id}
                style={{
                  background: t.surface,
                  border: `1px solid ${expanded ? t.accentBorder : t.border}`,
                  borderRadius: 12,
                  overflow: 'hidden',
                  transition: 'border-color 0.15s',
                }}
              >
                {/* Org header row */}
                <div
                  onClick={() => setExpandedId(expanded ? null : org.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 20px', cursor: 'pointer',
                    background: expanded ? t.accentSoft : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 9,
                    background: t.accentSoft, border: `1px solid ${t.accentBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Building2 size={16} color={t.accent} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: FONT }}>
                      {org.name}
                    </span>
                    <span style={{
                      fontSize: 11, color: t.textTri, fontFamily: MONO, marginLeft: 10,
                    }}>
                      {org.members.length} {tx('orgs.members')}
                    </span>
                    {owner && (
                      <span style={{
                        fontSize: 10, fontWeight: 600, fontFamily: FONT,
                        padding: '2px 7px', borderRadius: 4, marginLeft: 8,
                        background: t.accentSoft, color: t.accent,
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        {tx('orgs.role.owner')}
                      </span>
                    )}
                  </div>
                  {owner && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(org); }}
                      style={{
                        background: 'none', border: 'none', padding: 6, borderRadius: 6,
                        cursor: 'pointer', color: t.textTri, display: 'flex', alignItems: 'center',
                        transition: 'color 0.1s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = t.danger ?? '#E5534B')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = t.textTri)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <div style={{ color: t.textTri, flexShrink: 0 }}>
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded && (
                  <div style={{ padding: '0 20px 18px', borderTop: `1px solid ${t.borderSubtle}` }}>
                    {/* Members */}
                    <p style={{ fontSize: 11, fontWeight: 600, color: t.textTri, fontFamily: FONT, margin: '14px 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {tx('orgs.membersLabel')}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {org.members.map((m) => {
                        const isMe = m.user_id === user?.id;
                        const isMemberOwner = m.role === 'owner';
                        return (
                          <div key={m.id} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 12px', borderRadius: 8,
                            background: t.surfaceAlt, border: `1px solid ${t.borderSubtle}`,
                          }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: t.accentSoft, border: `1px solid ${t.accentBorder}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700, color: t.accent, fontFamily: FONT, flexShrink: 0,
                            }}>
                              {m.user_id.slice(0, 2).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: 12, fontFamily: MONO, color: t.text }}>
                                {m.user_id.slice(0, 8)}…
                              </span>
                              {isMe && (
                                <span style={{ fontSize: 11, color: t.textTri, fontFamily: FONT, marginLeft: 6 }}>
                                  ({tx('orgs.you')})
                                </span>
                              )}
                            </div>
                            <span style={{
                              fontSize: 10, fontWeight: 600, fontFamily: FONT,
                              padding: '2px 7px', borderRadius: 4,
                              background: isMemberOwner ? t.accentSoft : t.surfaceAlt,
                              color: isMemberOwner ? t.accent : t.textSec,
                              border: `1px solid ${isMemberOwner ? t.accentBorder : t.border}`,
                              textTransform: 'uppercase', letterSpacing: '0.04em',
                            }}>
                              {tx(`orgs.role.${m.role}`)}
                            </span>
                            {owner && !isMe && (
                              <button
                                onClick={() => handleRemoveMember(org.id, m.user_id)}
                                disabled={removingMemberId === m.user_id}
                                style={{
                                  background: 'none', border: 'none', padding: 4, borderRadius: 5,
                                  cursor: removingMemberId === m.user_id ? 'not-allowed' : 'pointer',
                                  color: t.textTri, display: 'flex', alignItems: 'center',
                                  opacity: removingMemberId === m.user_id ? 0.5 : 1,
                                  transition: 'color 0.1s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = t.danger ?? '#E5534B')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = t.textTri)}
                              >
                                <UserMinus size={13} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Invite form (owner only) */}
                    {owner && (
                      <div style={{ marginTop: 12 }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: t.textTri, fontFamily: FONT, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {tx('orgs.invite.label')}
                        </p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            type="email"
                            value={inviteOrgId === org.id ? inviteEmail : ''}
                            onChange={(e) => { setInviteOrgId(org.id); setInviteEmail(e.target.value); setInviteError(''); }}
                            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                            placeholder={tx('orgs.invite.placeholder')}
                            style={{
                              flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13,
                              border: `1px solid ${t.border}`, background: t.inputBg ?? t.surfaceAlt,
                              color: t.text, fontFamily: FONT, outline: 'none',
                            }}
                          />
                          <button
                            onClick={() => { setInviteOrgId(org.id); handleInvite(); }}
                            disabled={inviting && inviteOrgId === org.id}
                            style={{
                              padding: '8px 14px', borderRadius: 8, border: 'none',
                              background: t.accent, color: '#fff',
                              fontSize: 13, fontWeight: 600, fontFamily: FONT,
                              cursor: inviting ? 'not-allowed' : 'pointer',
                              display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                              opacity: inviting && inviteOrgId === org.id ? 0.65 : 1,
                            }}
                          >
                            <UserPlus size={13} />
                            {inviting && inviteOrgId === org.id ? '…' : tx('orgs.invite.btn')}
                          </button>
                        </div>
                        {inviteOrgId === org.id && inviteError && (
                          <p style={{ fontSize: 12, color: t.danger ?? '#E5534B', fontFamily: FONT, margin: '6px 0 0' }}>
                            {inviteError}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Create KB for org */}
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${t.borderSubtle}` }}>
                      <button
                        onClick={() => { setCreateKbOrgId(org.id); setKbName(''); setKbDesc(''); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '7px 14px', borderRadius: 8,
                          border: `1px solid ${t.accentBorder}`, background: t.accentSoft,
                          color: t.accent, fontSize: 13, fontWeight: 500, fontFamily: FONT, cursor: 'pointer',
                        }}
                      >
                        <Plus size={13} />
                        {tx('orgs.createKb')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create org modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={tx('orgs.create.title')} maxWidth={420}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: t.textSec, fontFamily: FONT, display: 'block', marginBottom: 6 }}>
              {tx('orgs.create.nameLabel')}
            </label>
            <input
              autoFocus
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder={tx('orgs.create.namePlaceholder')}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8,
                border: `1px solid ${t.border}`, background: t.surfaceAlt,
                color: t.text, fontSize: 13, fontFamily: FONT,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setCreateOpen(false)}
              style={{
                padding: '8px 16px', borderRadius: 8, border: `1px solid ${t.border}`,
                background: 'transparent', color: t.textSec,
                fontSize: 13, fontFamily: FONT, cursor: 'pointer',
              }}
            >
              {tx('confirm.cancel')}
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
              {creating ? '…' : tx('orgs.create.submit')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete org confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={tx('orgs.delete.title')}
        message={tx('orgs.delete.message', { name: deleteTarget?.name ?? '' })}
      />

      {/* Create KB for org modal */}
      <Modal
        isOpen={!!createKbOrgId}
        onClose={() => setCreateKbOrgId(null)}
        title={tx('orgs.kbModal.title')}
        maxWidth={440}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: t.textSec, fontFamily: FONT, display: 'block', marginBottom: 6 }}>
              {tx('dashboard.create.nameLabel')}
            </label>
            <input
              autoFocus
              value={kbName}
              onChange={(e) => setKbName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateKb()}
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
              value={kbDesc}
              onChange={(e) => setKbDesc(e.target.value)}
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
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setCreateKbOrgId(null)}
              style={{
                padding: '8px 16px', borderRadius: 8, border: `1px solid ${t.border}`,
                background: 'transparent', color: t.textSec,
                fontSize: 13, fontFamily: FONT, cursor: 'pointer',
              }}
            >
              {tx('confirm.cancel')}
            </button>
            <button
              onClick={handleCreateKb}
              disabled={creatingKb || !kbName.trim()}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: t.accent, color: '#fff',
                fontSize: 13, fontWeight: 600, fontFamily: FONT,
                cursor: creatingKb || !kbName.trim() ? 'not-allowed' : 'pointer',
                opacity: creatingKb || !kbName.trim() ? 0.65 : 1,
              }}
            >
              {creatingKb ? tx('dashboard.create.creating') : tx('dashboard.create.submit')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
