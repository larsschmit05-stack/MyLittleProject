'use client';

import { useMemo, useEffect } from 'react';
import type { CSSProperties } from 'react';
import type { Scenario, FlowNode, EdgeData } from '../../types/flow';
import { simulateWithRework } from '../../utils/rework';
import { validateGraph } from '../../lib/flow/validation';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import ReadOnlyCanvas from './ReadOnlyCanvas';
import MetricsPanel from './MetricsPanel';
import type { Node, Edge } from 'reactflow';

interface ComparisonViewProps {
  scenario1: Scenario;
  scenario2: Scenario;
  onClose: () => void;
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 60,
  background: 'var(--color-bg-primary)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const headerStyle: CSSProperties = {
  height: '48px',
  display: 'flex',
  alignItems: 'center',
  padding: '0 16px',
  borderBottom: '1px solid var(--color-border)',
  background: 'var(--color-bg-secondary)',
  flexShrink: 0,
  gap: '12px',
};

const closeBtnStyle: CSSProperties = {
  padding: '6px 12px',
  fontSize: '13px',
  borderRadius: '4px',
  border: '1px solid var(--color-border)',
  background: 'transparent',
  color: 'var(--color-text-primary)',
  cursor: 'pointer',
  fontWeight: 500,
};

function useScenarioData(scenario: Scenario) {
  return useMemo(() => {
    const model = scenario.model;
    const nodes = JSON.parse(JSON.stringify(model.nodes)) as FlowNode[];
    const edges = model.edges.map(e => ({ ...e }));
    const derivedResults = simulateWithRework(model);
    const validationResult = validateGraph(
      nodes as unknown as Node[],
      edges as unknown as Edge<EdgeData>[],
    );
    return { nodes, edges, derivedResults, validationResult };
  }, [scenario]);
}

export default function ComparisonView({
  scenario1,
  scenario2,
  onClose,
}: ComparisonViewProps) {
  const isWide = useMediaQuery('(min-width: 800px)');
  const data1 = useScenarioData(scenario1);
  const data2 = useScenarioData(scenario2);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const columnStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minHeight: 0,
  };

  const canvasContainerStyle: CSSProperties = {
    flex: 1,
    minHeight: isWide ? '200px' : '250px',
    borderBottom: '1px solid var(--color-border)',
  };

  const metricsContainerStyle: CSSProperties = {
    padding: '12px 16px',
    overflowY: 'auto',
    maxHeight: isWide ? '40%' : '300px',
    flexShrink: 0,
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="comparison-view-title" style={overlayStyle}>
      <div style={headerStyle}>
        <button style={closeBtnStyle} onClick={onClose} aria-label="Close comparison">
          ← Close
        </button>
        <span id="comparison-view-title" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {scenario1.name} vs {scenario2.name}
        </span>
      </div>

      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: isWide ? '1fr 1fr' : '1fr',
          overflow: 'auto',
          minHeight: 0,
        }}
      >
        {/* Column 1 */}
        <div style={{ ...columnStyle, borderRight: isWide ? '1px solid var(--color-border)' : undefined }}>
          {!isWide && (
            <div style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)' }}>
              {scenario1.name}
            </div>
          )}
          <div style={canvasContainerStyle}>
            <ReadOnlyCanvas nodes={data1.nodes} edges={data1.edges} scenarioData={data1} />
          </div>
          <div style={metricsContainerStyle}>
            <MetricsPanel
              nodes={data1.nodes}
              derivedResults={data1.derivedResults}
              validationResult={data1.validationResult}
              selectedElement={null}
            />
          </div>
        </div>

        {/* Column 2 */}
        <div style={columnStyle}>
          {!isWide && (
            <div style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)' }}>
              {scenario2.name}
            </div>
          )}
          <div style={canvasContainerStyle}>
            <ReadOnlyCanvas nodes={data2.nodes} edges={data2.edges} scenarioData={data2} />
          </div>
          <div style={metricsContainerStyle}>
            <MetricsPanel
              nodes={data2.nodes}
              derivedResults={data2.derivedResults}
              validationResult={data2.validationResult}
              selectedElement={null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
