'use client';

import { useRef, useEffect, useCallback } from 'react';
import useFlowStore from '../../store/useFlowStore';
import { SelectionContent, fmt, fmtPct } from './PropertiesPanel';
import { panelDividerStyle, panelSectionHeadingStyle } from './styles';
import type { PanelSnapshot } from '../../hooks/useFloatingPanel';
import type { ProcessNodeData, SourceNodeData } from '../../types/flow';

interface FloatingParameterPanelProps {
  onClose: () => void;
  onReset: () => void;
  onSave: () => Promise<void>;
  isDirty: boolean;
  snapshot: PanelSnapshot | null;
  isDesktop: boolean;
}

// ─── Before / After Comparison ───────────────────────────────────────────────

function BeforeAfterSection({ snapshot }: { snapshot: PanelSnapshot }) {
  const derivedResults = useFlowStore((s) => s.derivedResults);
  const nodes = useFlowStore((s) => s.nodes);
  const selectedElement = useFlowStore((s) => s.selectedElement);

  const before = snapshot.derivedResults;
  const after = derivedResults;

  if (!after) return null;

  const beforeThroughput = before.systemThroughput;
  const afterThroughput = after.systemThroughput;
  const throughputDelta =
    beforeThroughput > 0
      ? ((afterThroughput - beforeThroughput) / beforeThroughput) * 100
      : 0;

  const beforeBottleneckName = before.bottleneckNodeId
    ? (nodes.find((n) => n.id === before.bottleneckNodeId)?.data as ProcessNodeData)?.name ?? '—'
    : '—';
  const afterBottleneckName = after.bottleneckNodeId
    ? (nodes.find((n) => n.id === after.bottleneckNodeId)?.data as ProcessNodeData)?.name ?? '—'
    : '—';
  const bottleneckChanged = beforeBottleneckName !== afterBottleneckName;

  const nodeId =
    selectedElement?.kind === 'node' &&
    (selectedElement.nodeType === 'process' || selectedElement.nodeType === 'source')
      ? selectedElement.id
      : null;
  const beforeNodeUtil = nodeId ? before.nodeResults[nodeId]?.utilization : null;
  const afterNodeUtil = nodeId ? after.nodeResults[nodeId]?.utilization : null;

  return (
    <section>
      <h2 style={panelSectionHeadingStyle}>Before / After</h2>

      {/* Header row */}
      <div style={headerRowStyle}>
        <span style={headerCellStyle}>Metric</span>
        <span style={headerCellStyle}>Before</span>
        <span style={headerCellStyle}>After</span>
        <span style={headerCellStyle}>Change</span>
      </div>

      {/* Throughput */}
      <div style={dataRowStyle}>
        <span style={metricCellStyle}>Throughput</span>
        <span style={valueCellStyle}>{fmt(beforeThroughput)}</span>
        <span style={valueCellStyle}>{fmt(afterThroughput)}</span>
        <span style={{ ...valueCellStyle, color: getDeltaColor(throughputDelta) }}>
          {formatDelta(throughputDelta)}
        </span>
      </div>

      {/* Bottleneck */}
      <div style={dataRowStyle}>
        <span style={metricCellStyle}>Bottleneck</span>
        <span style={valueCellStyle}>{beforeBottleneckName}</span>
        <span style={valueCellStyle}>{afterBottleneckName}</span>
        <span style={{ ...valueCellStyle, color: bottleneckChanged ? 'var(--color-warning)' : 'var(--color-text-secondary)' }}>
          {bottleneckChanged ? 'Shifted' : '—'}
        </span>
      </div>

      {/* Node Utilization */}
      {beforeNodeUtil != null && afterNodeUtil != null && (
        <div style={dataRowStyle}>
          <span style={metricCellStyle}>Utilization</span>
          <span style={valueCellStyle}>{fmtPct(beforeNodeUtil)}</span>
          <span style={valueCellStyle}>{fmtPct(afterNodeUtil)}</span>
          <span
            style={{
              ...valueCellStyle,
              color: getDeltaColor(-(afterNodeUtil - beforeNodeUtil)), // lower util = better
            }}
          >
            {formatDelta((afterNodeUtil - beforeNodeUtil) * 100)}
          </span>
        </div>
      )}
    </section>
  );
}

function getDeltaColor(delta: number): string {
  if (delta > 0.05) return 'var(--color-healthy)';
  if (delta < -0.05) return 'var(--color-bottleneck)';
  return 'var(--color-text-secondary)';
}

function formatDelta(delta: number): string {
  if (Math.abs(delta) < 0.05) return '—';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}%`;
}

const headerRowStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr 1fr',
  gap: '4px',
  marginBottom: '6px',
  paddingBottom: '4px',
  borderBottom: '1px solid var(--color-border)',
} as const;

const headerCellStyle = {
  fontSize: '10px',
  fontWeight: 600,
  color: 'var(--color-text-label)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const dataRowStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr 1fr',
  gap: '4px',
  marginBottom: '4px',
} as const;

const metricCellStyle = {
  fontSize: '12px',
  color: 'var(--color-text-secondary)',
  fontWeight: 500,
} as const;

const valueCellStyle = {
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--color-text-primary)',
} as const;

// ─── Floating Panel ──────────────────────────────────────────────────────────

export default function FloatingParameterPanel({
  onClose,
  onReset,
  onSave,
  isDirty,
  snapshot,
  isDesktop,
}: FloatingParameterPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const selectedElement = useFlowStore((s) => s.selectedElement);
  const nodes = useFlowStore((s) => s.nodes);
  const savedModelId = useFlowStore((s) => s.savedModelId);

  const nodeName = (() => {
    if (selectedElement?.kind !== 'node') return 'Parameters';
    const node = nodes.find((n) => n.id === selectedElement.id);
    if (!node) return 'Parameters';
    if (node.type === 'process') return (node.data as ProcessNodeData)?.name ?? 'Process';
    if (node.type === 'source') return (node.data as SourceNodeData)?.label ?? 'Source';
    return 'Parameters';
  })();

  // Click outside to close
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [onClose]);

  // Escape to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = useCallback(async () => {
    await onSave();
  }, [onSave]);

  const containerStyle = isDesktop ? desktopPanelStyle : mobilePanelStyle;

  return (
    <>
      {/* Backdrop for mobile */}
      {!isDesktop && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 9,
          }}
          onClick={onClose}
        />
      )}
      <div ref={panelRef} style={containerStyle} role="dialog" aria-label="Floating parameter panel">
        {/* Header */}
        <div style={headerStyle}>
          <span style={{ fontWeight: 600, fontSize: '14px' }}>{nodeName}</span>
          <button
            onClick={onClose}
            style={closeButtonStyle}
            aria-label="Close floating panel"
          >
            ×
          </button>
        </div>

        {/* Parameter Controls */}
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
          <SelectionContent />

          {snapshot && (
            <>
              <hr style={panelDividerStyle} />
              <BeforeAfterSection snapshot={snapshot} />
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div style={footerStyle}>
          <button
            onClick={onReset}
            disabled={!isDirty}
            style={{
              ...secondaryButtonStyle,
              opacity: isDirty ? 1 : 0.4,
              cursor: isDirty ? 'pointer' : 'not-allowed',
            }}
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!savedModelId}
            style={{
              ...primaryButtonStyle,
              opacity: savedModelId ? 1 : 0.4,
              cursor: savedModelId ? 'pointer' : 'not-allowed',
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const desktopPanelStyle = {
  position: 'absolute' as const,
  top: '16px',
  right: '16px',
  width: '320px',
  maxHeight: 'calc(100vh - 120px)',
  background: 'var(--color-bg-secondary)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  zIndex: 10,
  display: 'flex',
  flexDirection: 'column' as const,
  overflow: 'hidden',
};

const mobilePanelStyle = {
  position: 'fixed' as const,
  bottom: 0,
  left: 0,
  right: 0,
  maxHeight: '60vh',
  background: 'var(--color-bg-secondary)',
  border: '1px solid var(--color-border)',
  borderRadius: '12px 12px 0 0',
  boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
  zIndex: 10,
  display: 'flex',
  flexDirection: 'column' as const,
  overflow: 'hidden',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid var(--color-border)',
  flexShrink: 0,
} as const;

const closeButtonStyle = {
  background: 'none',
  border: 'none',
  fontSize: '20px',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
  padding: '4px 8px',
  lineHeight: 1,
  minWidth: '44px',
  minHeight: '44px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const;

const footerStyle = {
  display: 'flex',
  gap: '8px',
  padding: '12px 16px',
  borderTop: '1px solid var(--color-border)',
  flexShrink: 0,
} as const;

const secondaryButtonStyle = {
  flex: 1,
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--color-text-primary)',
  background: 'none',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  padding: '8px 16px',
  minHeight: '44px',
} as const;

const primaryButtonStyle = {
  flex: 1,
  fontSize: '13px',
  fontWeight: 500,
  color: '#fff',
  background: 'var(--color-action)',
  border: 'none',
  borderRadius: '6px',
  padding: '8px 16px',
  minHeight: '44px',
} as const;
