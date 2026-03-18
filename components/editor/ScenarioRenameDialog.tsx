'use client';

import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { panelLabelStyle, panelInputStyle } from './styles';

interface ScenarioRenameDialogProps {
  initialName: string;
  onCreate: (name: string) => void;
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
  width: '400px',
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

const disabledBtn: CSSProperties = {
  ...actionBtn,
  opacity: 0.5,
  cursor: 'not-allowed',
};

export default function ScenarioRenameDialog({
  initialName,
  onCreate,
  onCancel,
}: ScenarioRenameDialogProps) {
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);
  const isValid = name.trim().length > 0;

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  function handleSubmit() {
    if (isValid) onCreate(name.trim());
  }

  return (
    <div onClick={onCancel} style={overlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={cardStyle}>
        <h3 style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-text-primary)', margin: '0 0 16px 0' }}>
          New Scenario
        </h3>
        <div style={{ marginBottom: '20px' }}>
          <label style={panelLabelStyle}>Scenario Name</label>
          <input
            ref={inputRef}
            autoFocus
            style={panelInputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button style={secondaryBtn} onClick={onCancel}>Cancel</button>
          <button
            style={isValid ? actionBtn : disabledBtn}
            onClick={handleSubmit}
            disabled={!isValid}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
