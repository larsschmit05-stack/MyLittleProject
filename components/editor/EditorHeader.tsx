'use client';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import useFlowStore from '../../store/useFlowStore';
import { useModelAccess } from '../../hooks/useModelAccess';
import ShareModal from './ShareModal';
import { panelInputStyle } from './styles';

const actionBtn: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: '13px',
  borderRadius: '4px',
  border: 'none',
  background: 'var(--color-action)',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 500,
};

const secondaryBtn: React.CSSProperties = {
  ...actionBtn,
  background: 'transparent',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)',
};

export default function EditorHeader() {
  const savedModelId = useFlowStore((s) => s.savedModelId);
  const savedModelName = useFlowStore((s) => s.savedModelName);
  const isSaving = useFlowStore((s) => s.isSaving);
  const saveError = useFlowStore((s) => s.saveError);
  const updateSavedModel = useFlowStore((s) => s.updateSavedModel);
  const saveAsNewModel = useFlowStore((s) => s.saveAsNewModel);

  const { isOwner, canEdit, role } = useModelAccess(savedModelId);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [newName, setNewName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    };
  }, []);

  function showStatus(msg: string, durationMs = 3000) {
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    setStatus(msg);
    statusTimeoutRef.current = setTimeout(() => setStatus(null), durationMs);
  }

  useEffect(() => {
    if (saveError) {
      showStatus(saveError, 4000);
    }
  }, [saveError]); // eslint-disable-line react-hooks/exhaustive-deps -- showStatus is stable

  async function handleSave() {
    await updateSavedModel();
    if (!useFlowStore.getState().saveError) {
      showStatus('Saved');
    }
  }

  async function handleSaveNew() {
    const name = newName.trim() || 'Untitled Model';
    await saveAsNewModel(name);
    if (!useFlowStore.getState().saveError) {
      showStatus('Saved');
      setNewName('');
      setShowSaveInput(false);
    }
  }

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        height: '48px',
        padding: '0 16px',
        background: 'var(--color-bg-primary)',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}
    >
      {/* Back link */}
      <Link
        href="/dashboard"
        style={{
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        ← Dashboard
      </Link>

      {/* Model name + access badge */}
      <span
        style={{
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {savedModelName || 'Untitled Model'}
        {role && !isOwner && (
          <span
            onClick={() => savedModelId && setShowShareModal(true)}
            style={{
              fontSize: '11px',
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: '10px',
              background: 'rgba(128, 128, 128, 0.1)',
              color: 'var(--color-text-secondary)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              cursor: 'pointer',
            }}
            title="View sharing info"
          >
            Shared with you ({role === 'edit' ? 'Edit' : 'View'})
          </span>
        )}
      </span>

      {/* Status */}
      {status && (
        <span
          style={{
            fontSize: '12px',
            color: status.toLowerCase().includes('fail') || status.toLowerCase().includes('error')
              ? 'var(--color-bottleneck)'
              : 'var(--color-healthy)',
          }}
        >
          {status}
        </span>
      )}

      {/* Save as New — inline input */}
      {showSaveInput ? (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            autoFocus
            type="text"
            placeholder="Model name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveNew();
              if (e.key === 'Escape') setShowSaveInput(false);
            }}
            style={{ ...panelInputStyle, width: '160px' }}
          />
          <button onClick={handleSaveNew} disabled={isSaving} style={actionBtn}>
            {isSaving ? 'Saving…' : 'Confirm'}
          </button>
          <button onClick={() => setShowSaveInput(false)} style={secondaryBtn}>
            Cancel
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px' }}>
          {isOwner && savedModelId && (
            <button onClick={() => setShowShareModal(true)} style={secondaryBtn}>
              Share
            </button>
          )}
          {savedModelId && (
            <button
              onClick={handleSave}
              disabled={isSaving || !canEdit}
              style={{ ...secondaryBtn, ...(!canEdit ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          )}
          <button
            onClick={() => setShowSaveInput(true)}
            disabled={isSaving || !canEdit}
            style={{ ...actionBtn, ...(!canEdit ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
          >
            Save as New
          </button>
        </div>
      )}
      {showShareModal && savedModelId && (
        <ShareModal modelId={savedModelId} onClose={() => setShowShareModal(false)} readOnly={!isOwner} />
      )}
    </header>
  );
}
