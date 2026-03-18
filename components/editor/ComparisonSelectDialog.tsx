'use client';

import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import type { Scenario } from '../../types/flow';

interface ComparisonSelectDialogProps {
  scenarios: Scenario[];
  defaultScenario1Id: string;
  onCompare: (scenario1Id: string, scenario2Id: string) => void;
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

const selectStyle: CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: '13px',
  borderRadius: '6px',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-secondary)',
  color: 'var(--color-text-primary)',
  cursor: 'pointer',
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

const labelStyle: CSSProperties = {
  fontSize: '13px',
  color: 'var(--color-text-secondary)',
  marginBottom: '4px',
  display: 'block',
};

export default function ComparisonSelectDialog({
  scenarios,
  defaultScenario1Id,
  onCompare,
  onCancel,
}: ComparisonSelectDialogProps) {
  const firstOther = scenarios.find(s => s.id !== defaultScenario1Id)?.id ?? defaultScenario1Id;
  const [scenario1Id, setScenario1Id] = useState(defaultScenario1Id);
  const [scenario2Id, setScenario2Id] = useState(firstOther);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const isSame = scenario1Id === scenario2Id;

  return (
    <div onClick={onCancel} style={overlayStyle}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-dialog-title"
        onClick={(e) => e.stopPropagation()}
        style={cardStyle}
      >
        <h3
          id="compare-dialog-title"
          style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-text-primary)', margin: '0 0 16px 0' }}
        >
          Compare Scenarios
        </h3>

        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>Scenario 1</label>
          <select
            aria-label="Scenario 1"
            style={selectStyle}
            value={scenario1Id}
            onChange={(e) => setScenario1Id(e.target.value)}
          >
            {scenarios.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Scenario 2</label>
          <select
            aria-label="Scenario 2"
            style={selectStyle}
            value={scenario2Id}
            onChange={(e) => setScenario2Id(e.target.value)}
          >
            {scenarios.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button style={secondaryBtn} onClick={onCancel}>Cancel</button>
          <button
            style={{
              ...actionBtn,
              opacity: isSame ? 0.4 : 1,
              cursor: isSame ? 'not-allowed' : 'pointer',
            }}
            disabled={isSame}
            onClick={() => onCompare(scenario1Id, scenario2Id)}
          >
            Compare
          </button>
        </div>
      </div>
    </div>
  );
}
