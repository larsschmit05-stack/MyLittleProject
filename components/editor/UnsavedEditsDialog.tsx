'use client';

import { useEffect } from 'react';
import type { CSSProperties } from 'react';

interface UnsavedEditsDialogProps {
  scenarioName: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
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
  width: '420px',
  maxWidth: '90vw',
  padding: '20px',
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

const discardBtn: CSSProperties = {
  ...secondaryBtn,
  color: 'var(--color-bottleneck)',
};

export default function UnsavedEditsDialog({
  scenarioName,
  onSave,
  onDiscard,
  onCancel,
}: UnsavedEditsDialogProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div onClick={onCancel} style={overlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={cardStyle}>
        <h3 style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-text-primary)', margin: '0 0 12px 0' }}>
          Unsaved Changes
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 20px 0', lineHeight: '1.5' }}>
          You have unsaved changes in &ldquo;{scenarioName}&rdquo;. What would you like to do?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button style={secondaryBtn} onClick={onCancel}>Cancel</button>
          <button style={discardBtn} onClick={onDiscard}>Discard</button>
          <button style={actionBtn} onClick={onSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
