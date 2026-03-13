'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import useFlowStore from '../../store/useFlowStore';
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

  const [showSaveInput, setShowSaveInput] = useState(false);
  const [newName, setNewName] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (saveError) {
      setStatus(saveError);
      const t = setTimeout(() => setStatus(null), 4000);
      return () => clearTimeout(t);
    }
  }, [saveError]);

  async function handleSave() {
    await updateSavedModel();
    if (!useFlowStore.getState().saveError) {
      setStatus('Saved');
      const t = setTimeout(() => setStatus(null), 3000);
      return () => clearTimeout(t);
    }
  }

  async function handleSaveNew() {
    const name = newName.trim() || 'Untitled Model';
    await saveAsNewModel(name);
    if (!useFlowStore.getState().saveError) {
      setStatus('Saved');
      setNewName('');
      setShowSaveInput(false);
      const t = setTimeout(() => setStatus(null), 3000);
      return () => clearTimeout(t);
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

      {/* Model name */}
      <span
        style={{
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {savedModelName || 'Untitled Model'}
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
          {savedModelId && (
            <button onClick={handleSave} disabled={isSaving} style={secondaryBtn}>
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          )}
          <button onClick={() => setShowSaveInput(true)} disabled={isSaving} style={actionBtn}>
            Save as New
          </button>
        </div>
      )}
    </header>
  );
}
