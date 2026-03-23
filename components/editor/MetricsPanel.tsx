import type { FlowNode, FlowResult, ProcessNodeData } from '../../types/flow';
import type { ValidationResult } from '../../lib/flow/validation';
import type { SelectedElement } from '../../types/flow';
import { fmt, fmtPct } from '../../lib/formatting';
import { classifyBottlenecks } from './nodes/processNodeStatus';
import { panelSectionHeadingStyle } from './styles';

/**
 * Metrics-panel color thresholds per V1.8 PRD (Section 3.5 / Step 6.2):
 *   Green: <80%  |  Orange: 80–95%  |  Red: >95%
 *
 * These differ from the node-border thresholds in getProcessNodeStatusColor()
 * (85% / >95%), which are tuned for at-a-glance canvas highlighting.
 */
export function getMetricsUtilizationColor(utilization: number): string {
  if (!isFinite(utilization) || utilization > 0.95) return 'var(--color-bottleneck)';
  if (utilization >= 0.80) return 'var(--color-warning)';
  return 'var(--color-healthy)';
}

interface MetricsPanelProps {
  nodes: FlowNode[];
  derivedResults: FlowResult | null;
  validationResult: ValidationResult | null;
  selectedElement: SelectedElement;
}

const resultRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '13px',
  marginBottom: '6px',
} as const;

const resultLabelStyle = {
  color: 'var(--color-text-secondary)',
} as const;

const resultValueStyle = {
  fontWeight: 500,
  color: 'var(--color-text-primary)',
} as const;

export default function MetricsPanel({
  nodes,
  derivedResults,
  validationResult,
  selectedElement,
}: MetricsPanelProps) {
  const processNodes = nodes.filter((n) => n.type === 'process');

  const isEmpty =
    processNodes.length === 0 ||
    !derivedResults ||
    (derivedResults.systemThroughput === 0 &&
      derivedResults.bottleneckNodeId === null &&
      Object.keys(derivedResults.nodeResults).length === 0);

  if (isEmpty) {
    return (
      <section>
        <h2 style={panelSectionHeadingStyle}>Results</h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          Run simulation to see metrics.
        </p>
      </section>
    );
  }

  const isInvalid = validationResult && !validationResult.isValid;
  const classification = classifyBottlenecks(nodes, derivedResults.nodeResults);

  const bottleneckNames = classification.bottleneckNodeIds.map((nid) => {
    const node = nodes.find((n) => n.id === nid);
    return (node?.data as ProcessNodeData)?.name ?? '—';
  });

  // Sort process nodes alphabetically for the utilization table
  const sortedProcessNodes = [...processNodes].sort((a, b) => {
    const nameA = (a.data as ProcessNodeData).name.toLowerCase();
    const nameB = (b.data as ProcessNodeData).name.toLowerCase();
    return nameA.localeCompare(nameB);
  });

  // Selected node detail
  const selectedNodeResult =
    selectedElement?.kind === 'node' && selectedElement.nodeType === 'process' && derivedResults
      ? derivedResults.nodeResults[selectedElement.id] ?? null
      : null;

  const selectedNodeData =
    selectedElement?.kind === 'node' && selectedElement.nodeType === 'process'
      ? (nodes.find((n) => n.id === selectedElement.id)?.data as ProcessNodeData | undefined) ?? null
      : null;

  return (
    <section>
      <h2 style={panelSectionHeadingStyle}>Results</h2>

      {isInvalid && (
        <p style={{ fontSize: '12px', color: 'var(--color-warning)', marginBottom: '8px' }}>
          Invalid parameters — results may not be realistic.
        </p>
      )}

      {/* Primary metrics */}
      <div style={resultRowStyle}>
        <span style={resultLabelStyle}>System Throughput</span>
        <span style={resultValueStyle}>{fmt(derivedResults.systemThroughput)}</span>
      </div>

      {classification.status === 'balanced' ? (
        <div style={resultRowStyle}>
          <span style={resultLabelStyle}>Bottleneck</span>
          <span style={{ ...resultValueStyle, color: 'var(--color-healthy)' }}>
            System is balanced
          </span>
        </div>
      ) : classification.status === 'elevated' ? (
        <div style={resultRowStyle}>
          <span style={resultLabelStyle}>Bottleneck</span>
          <span style={{ ...resultValueStyle, color: 'var(--color-warning)' }}>
            No critical bottleneck (high utilization)
          </span>
        </div>
      ) : classification.status !== 'empty' ? (
        <div style={resultRowStyle}>
          <span style={resultLabelStyle}>Bottleneck</span>
          <span style={resultValueStyle}>{bottleneckNames[0] ?? '—'}</span>
        </div>
      ) : null}

      {/* Utilization by node table */}
      <p
        style={{
          fontSize: '11px',
          color: 'var(--color-text-label)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: '10px 0 6px 0',
          fontWeight: 500,
        }}
      >
        Utilization by Node
      </p>
      {sortedProcessNodes.map((node) => {
        const nodeResult = derivedResults.nodeResults[node.id];
        const hasResult = nodeResult != null;
        const utilization = nodeResult?.utilization;
        const color = hasResult
          ? getMetricsUtilizationColor(utilization!)
          : 'var(--color-text-secondary)';
        const isSelected =
          selectedElement?.kind === 'node' && selectedElement.id === node.id;
        const name = (node.data as ProcessNodeData).name;

        return (
          <div
            key={node.id}
            data-testid={`utilization-row-${node.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '13px',
              marginBottom: '4px',
              padding: '2px 4px',
              borderLeft: isSelected ? '3px solid var(--color-action)' : '3px solid transparent',
              background: isSelected ? 'var(--color-bg-hover, rgba(0,0,0,0.03))' : 'transparent',
              borderRadius: '2px',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                data-testid={`status-dot-${node.id}`}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: color,
                  flexShrink: 0,
                }}
              />
              <span style={{ color: 'var(--color-text-primary)' }}>{name}</span>
            </span>
            <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {hasResult ? fmtPct(utilization!) : 'N/A'}
            </span>
          </div>
        );
      })}

      {/* Selected node detail */}
      {selectedNodeResult && (
        <>
          <p
            style={{
              fontSize: '11px',
              color: 'var(--color-text-label)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: '10px 0 6px 0',
              fontWeight: 500,
            }}
          >
            Selected Node
          </p>
          <div style={resultRowStyle}>
            <span style={resultLabelStyle}>Required Throughput</span>
            <span style={resultValueStyle}>{fmt(selectedNodeResult.requiredThroughput)}</span>
          </div>
          <div style={resultRowStyle}>
            <span style={resultLabelStyle}>Effective Capacity</span>
            <span style={resultValueStyle}>{fmt(selectedNodeResult.effectiveCapacity)}</span>
          </div>
          {selectedNodeData && (selectedNodeData.availabilityRate != null || selectedNodeData.performanceEfficiency != null || selectedNodeData.qualityRate != null) && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px', paddingLeft: '4px' }}>
              <span>A {selectedNodeData.availabilityRate ?? 100}%</span>
              <span style={{ margin: '0 6px' }}>&middot;</span>
              <span>P {selectedNodeData.performanceEfficiency ?? 100}%</span>
              <span style={{ margin: '0 6px' }}>&middot;</span>
              <span>Q {selectedNodeData.qualityRate ?? 100}%</span>
            </div>
          )}
          <div style={resultRowStyle}>
            <span style={resultLabelStyle}>Utilization</span>
            <span style={resultValueStyle}>{fmtPct(selectedNodeResult.utilization)}</span>
          </div>
        </>
      )}
    </section>
  );
}
