'use client';

import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import useModelAccessStore from '../../store/useModelAccessStore';
import useAuthStore from '../../store/useAuthStore';
import type { AccessListItem } from '../../types/modelAccess';

interface ShareModalProps {
  modelId: string;
  onClose: () => void;
  readOnly?: boolean;
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
};

const cardStyle: CSSProperties = {
  background: 'var(--color-bg-primary)',
  borderRadius: '12px',
  border: '1px solid var(--color-border)',
  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
  width: '520px',
  maxWidth: '90vw',
  maxHeight: '80vh',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const inputStyle: CSSProperties = {
  fontSize: '13px',
  color: 'var(--color-text-primary)',
  background: 'var(--color-bg-primary)',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  padding: '8px 12px',
  outline: 'none',
  boxSizing: 'border-box',
};

const actionBtn: CSSProperties = {
  padding: '6px 12px',
  fontSize: '13px',
  borderRadius: '4px',
  border: 'none',
  background: 'var(--color-action)',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 500,
};

const secondaryBtn: CSSProperties = {
  ...actionBtn,
  background: 'transparent',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)',
};

const dangerBtn: CSSProperties = {
  ...secondaryBtn,
  color: 'var(--color-bottleneck)',
  border: '1px solid var(--color-bottleneck)',
};

const badgeBase: CSSProperties = {
  display: 'inline-block',
  fontSize: '11px',
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: '10px',
  textTransform: 'capitalize',
};

function roleBadgeStyle(role: string, status?: string): CSSProperties {
  if (status === 'pending' || status === 'expired') {
    return {
      ...badgeBase,
      background: status === 'expired' ? 'rgba(var(--color-bottleneck-rgb, 220, 38, 38), 0.1)' : 'rgba(128, 128, 128, 0.1)',
      color: status === 'expired' ? 'var(--color-bottleneck)' : 'var(--color-text-secondary)',
    };
  }
  if (role === 'owner') {
    return { ...badgeBase, background: 'rgba(var(--color-action-rgb, 59, 130, 246), 0.1)', color: 'var(--color-action)' };
  }
  if (role === 'edit') {
    return { ...badgeBase, background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a' };
  }
  return { ...badgeBase, background: 'rgba(128, 128, 128, 0.1)', color: 'var(--color-text-secondary)' };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ShareModal({ modelId, onClose, readOnly = false }: ShareModalProps) {
  const accessList = useModelAccessStore((s) => s.accessList);
  const isLoadingAccess = useModelAccessStore((s) => s.isLoadingAccess);
  const isInviting = useModelAccessStore((s) => s.isInviting);
  const inviteError = useModelAccessStore((s) => s.inviteError);
  const inviteSuccess = useModelAccessStore((s) => s.inviteSuccess);
  const fetchAccessList = useModelAccessStore((s) => s.fetchAccessList);
  const inviteUser = useModelAccessStore((s) => s.inviteUser);
  const revokeAccess = useModelAccessStore((s) => s.revokeAccess);
  const cancelInvite = useModelAccessStore((s) => s.cancelInvite);
  const resendInvite = useModelAccessStore((s) => s.resendInvite);
  const clearInviteMessages = useModelAccessStore((s) => s.clearInviteMessages);

  const currentUserEmail = useAuthStore((s) => s.user?.email);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'edit' | 'view'>('edit');
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);

  useEffect(() => {
    fetchAccessList(modelId);
  }, [modelId, fetchAccessList]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleInvite() {
    setLocalError(null);
    clearInviteMessages();

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setLocalError('Please enter an email address');
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setLocalError('Invalid email address');
      return;
    }
    if (currentUserEmail && trimmed === currentUserEmail.toLowerCase()) {
      setLocalError('Cannot invite yourself');
      return;
    }

    await inviteUser(modelId, trimmed, role);
    if (!useModelAccessStore.getState().inviteError) {
      setEmail('');
    }
  }

  async function handleRemove(item: AccessListItem) {
    if (item.userId) {
      await revokeAccess(modelId, item.userId);
    } else if (item.email) {
      // Pending/expired invite with no userId — cancel by email
      await cancelInvite(modelId, item.email);
    }
    setConfirmRemoveId(null);
  }

  async function handleResend(item: AccessListItem) {
    if (!item.token) return;
    setResending(item.id);
    await resendInvite(modelId, item.token);
    setResending(null);
  }

  function statusLabel(item: AccessListItem): string {
    if (item.role === 'owner') return 'Owner';
    if (item.status === 'pending') return 'Pending';
    if (item.status === 'expired') return 'Expired';
    if (item.status === 'accepted') return item.role === 'edit' ? 'Edit' : 'View';
    return String(item.status);
  }

  return (
    <div onClick={onClose} style={overlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={cardStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontWeight: 600, fontSize: '16px', color: 'var(--color-text-primary)', margin: 0 }}>
            Share Model
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Invite Form — owner only */}
        {!readOnly && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setLocalError(null); clearInviteMessages(); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); }}
                  style={{ ...inputStyle, flex: 1, minWidth: '160px' }}
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'edit' | 'view')}
                  style={{ ...inputStyle, width: '90px', cursor: 'pointer' }}
                >
                  <option value="edit">Edit</option>
                  <option value="view">View</option>
                </select>
                <button
                  onClick={handleInvite}
                  disabled={isInviting}
                  style={{ ...actionBtn, opacity: isInviting ? 0.6 : 1 }}
                >
                  {isInviting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>

              {/* Messages */}
              {(localError || inviteError) && (
                <p style={{ fontSize: '12px', color: 'var(--color-bottleneck)', margin: '8px 0 0 0' }}>
                  {localError || inviteError}
                </p>
              )}
              {inviteSuccess && (
                <p style={{ fontSize: '12px', color: 'var(--color-healthy)', margin: '8px 0 0 0' }}>
                  {inviteSuccess}
                </p>
              )}
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid var(--color-border)', marginBottom: '16px' }} />
          </>
        )}

        {/* Access List */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-label)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px 0' }}>
            People with access
          </h4>

          {isLoadingAccess && (
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Loading...</p>
          )}

          {!isLoadingAccess && accessList.length === 0 && (
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>No access records found.</p>
          )}

          {accessList.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 0',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              {/* Email */}
              <span
                style={{
                  flex: 1,
                  fontSize: '13px',
                  color: 'var(--color-text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.email}
              </span>

              {/* Badge */}
              <span style={roleBadgeStyle(item.role, item.status as string)}>
                {statusLabel(item)}
              </span>

              {/* Actions — owner only */}
              {!readOnly && item.status === 'expired' && item.token && (
                <button
                  onClick={() => handleResend(item)}
                  disabled={resending === item.id}
                  style={{ ...secondaryBtn, padding: '3px 8px', fontSize: '11px' }}
                >
                  {resending === item.id ? 'Resending...' : 'Resend'}
                </button>
              )}

              {!readOnly && item.canRemove && confirmRemoveId !== item.id && (
                <button
                  onClick={() => setConfirmRemoveId(item.id)}
                  style={{ ...dangerBtn, padding: '3px 8px', fontSize: '11px' }}
                >
                  Remove
                </button>
              )}

              {!readOnly && confirmRemoveId === item.id && (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => handleRemove(item)}
                    style={{ ...dangerBtn, padding: '3px 8px', fontSize: '11px' }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmRemoveId(null)}
                    style={{ ...secondaryBtn, padding: '3px 8px', fontSize: '11px' }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
