'use client';

import type { CSSProperties } from 'react';
import type { Scenario } from '../../types/flow';

interface ScenarioTabsProps {
  scenarios: Scenario[];
  activeScenarioId: string;
  onSelectScenario: (id: string) => void;
  onNewScenario: () => void;
  isMobile: boolean;
}

const containerStyle: CSSProperties = {
  height: '40px',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '4px',
  padding: '0 16px',
  background: 'var(--color-bg-secondary)',
  borderBottom: '1px solid var(--color-border)',
  flexShrink: 0,
};

const tabBase: CSSProperties = {
  padding: '6px 14px',
  borderRadius: '6px',
  fontSize: '13px',
  cursor: 'pointer',
  maxWidth: '160px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  lineHeight: '1.4',
};

const activeTabStyle: CSSProperties = {
  ...tabBase,
  background: 'var(--color-action)',
  color: '#fff',
  fontWeight: 600,
  border: 'none',
};

const inactiveTabStyle: CSSProperties = {
  ...tabBase,
  background: 'transparent',
  border: '1px solid var(--color-border)',
  fontWeight: 400,
  color: 'var(--color-text-primary)',
};

const newBtnStyle: CSSProperties = {
  ...tabBase,
  background: 'transparent',
  border: '1px dashed var(--color-border)',
  color: 'var(--color-text-secondary)',
  fontWeight: 400,
};

export default function ScenarioTabs({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onNewScenario,
  isMobile,
}: ScenarioTabsProps) {
  return (
    <div style={{ ...containerStyle, overflowX: isMobile ? 'auto' : undefined }}>
      <div role="tablist" aria-label="Scenario tabs" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {scenarios.map((s) => {
          const isActive = s.id === activeScenarioId;
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={isActive}
              style={isActive ? activeTabStyle : inactiveTabStyle}
              onClick={() => {
                if (!isActive) onSelectScenario(s.id);
              }}
            >
              {s.name}
            </button>
          );
        })}
        <button
          style={newBtnStyle}
          onClick={onNewScenario}
          aria-label="Create new scenario"
        >
          {isMobile ? '+ New' : '+ New Scenario'}
        </button>
      </div>
    </div>
  );
}
