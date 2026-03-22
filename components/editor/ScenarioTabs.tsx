'use client';

import { useRef, useCallback } from 'react';
import type { CSSProperties } from 'react';
import type { Scenario } from '../../types/flow';

interface ScenarioTabsProps {
  scenarios: Scenario[];
  activeScenarioId: string;
  onSelectScenario: (id: string) => void;
  onNewScenario: () => void;
  onContextMenu: (id: string, position: { x: number; y: number }) => void;
  onCompare: () => void;
  canCompare: boolean;
  onExport: () => void;
  isExporting?: boolean;
  isMobile: boolean;
  readOnly?: boolean;
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

const compareBtnStyle: CSSProperties = {
  ...tabBase,
  background: 'transparent',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)',
  fontWeight: 400,
};

export default function ScenarioTabs({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onNewScenario,
  onContextMenu,
  onCompare,
  canCompare,
  onExport,
  isExporting = false,
  isMobile,
  readOnly = false,
}: ScenarioTabsProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

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
              onContextMenu={readOnly ? undefined : (e) => {
                e.preventDefault();
                onContextMenu(s.id, { x: e.clientX, y: e.clientY });
              }}
              onTouchStart={readOnly ? undefined : (e) => {
                longPressFired.current = false;
                const touch = e.touches[0];
                const pos = { x: touch.clientX, y: touch.clientY };
                longPressTimer.current = setTimeout(() => {
                  longPressFired.current = true;
                  onContextMenu(s.id, pos);
                }, 500);
              }}
              onTouchMove={readOnly ? undefined : () => clearLongPress()}
              onTouchEnd={readOnly ? undefined : (e) => {
                clearLongPress();
                if (longPressFired.current) {
                  e.preventDefault();
                }
              }}
            >
              {s.name}
            </button>
          );
        })}
        {!readOnly && (
          <button
            style={newBtnStyle}
            onClick={onNewScenario}
            aria-label="Create new scenario"
          >
            {isMobile ? '+ New' : '+ New Scenario'}
          </button>
        )}
        <button
          style={{
            ...compareBtnStyle,
            opacity: canCompare ? 1 : 0.4,
            cursor: canCompare ? 'pointer' : 'not-allowed',
          }}
          onClick={canCompare ? onCompare : undefined}
          disabled={!canCompare}
          aria-label="Compare scenarios"
        >
          Compare
        </button>
        <button
          style={{
            ...compareBtnStyle,
            opacity: isExporting ? 0.6 : 1,
            cursor: isExporting ? 'wait' : 'pointer',
          }}
          onClick={isExporting ? undefined : onExport}
          disabled={isExporting}
          aria-label="Export scenario as PDF"
        >
          {isExporting ? 'Exporting...' : (isMobile ? 'PDF' : 'Export PDF')}
        </button>
      </div>
    </div>
  );
}
