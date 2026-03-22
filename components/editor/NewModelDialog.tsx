'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import useFlowStore from '../../store/useFlowStore';
import { panelInputStyle } from './styles';

interface NewModelDialogProps {
  onCreated: (modelId: string) => void;
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
  padding: '24px',
};

const actionBtn: CSSProperties = {
  padding: '8px 20px',
  fontSize: '14px',
  borderRadius: '6px',
  border: 'none',
  background: 'var(--color-action)',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 600,
  width: '100%',
};

export default function NewModelDialog({ onCreated }: NewModelDialogProps) {
  const [name, setName] = useState('');
  const isSaving = useFlowStore((s) => s.isSaving);
  const saveError = useFlowStore((s) => s.saveError);
  const saveAsNewModel = useFlowStore((s) => s.saveAsNewModel);

  async function handleStart() {
    const trimmed = name.trim();
    if (!trimmed || isSaving) return;
    await saveAsNewModel(trimmed);
    const modelId = useFlowStore.getState().savedModelId;
    if (modelId) {
      onCreated(modelId);
    }
  }

  const disabled = !name.trim() || isSaving;

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <h3 style={{ fontWeight: 600, fontSize: '16px', color: 'var(--color-text-primary)', margin: '0 0 4px 0' }}>
          Name your model
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 20px 0' }}>
          Give your process model a name to get started.
        </p>
        <input
          autoFocus
          type="text"
          placeholder="e.g. Assembly Line Q2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleStart();
          }}
          style={{ ...panelInputStyle, marginBottom: '16px' }}
        />
        {saveError && (
          <p style={{ fontSize: '12px', color: 'var(--color-bottleneck)', margin: '0 0 12px 0' }}>
            {saveError}
          </p>
        )}
        <button
          onClick={handleStart}
          disabled={disabled}
          style={{
            ...actionBtn,
            ...(disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
          }}
        >
          {isSaving ? 'Creating…' : 'Start'}
        </button>
      </div>
    </div>
  );
}
