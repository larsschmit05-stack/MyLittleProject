'use client';

import { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { ProcessNodeData } from '../../../types/flow';
import { getNodeStyle, nodeLabelStyle, nodeValueStyle } from '../styles';
import useFlowStore from '../../../store/useFlowStore';
import { useReadOnlyFlow } from '../ReadOnlyFlowContext';
import {
  getProcessNodeStatusColor,
  shouldShowProcessNodeWarning,
  classifyBottlenecks,
} from './processNodeStatus';
import { formatNumberShort } from '../../../utils/format';

function fmtUtil(utilization: number): string {
  if (!isFinite(utilization)) return 'N/A';
  return (utilization * 100).toFixed(1) + '%';
}

export default function ProcessNode({ id, data, selected }: NodeProps<ProcessNodeData>) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [nodeHovered, setNodeHovered] = useState(false);

  const readOnly = useReadOnlyFlow();

  // Always call store hooks (rules of hooks), but prefer context values when in comparison mode
  const storeNodeResult = useFlowStore((s) => s.derivedResults?.nodeResults[id] ?? null);
  const storeNodes = useFlowStore((s) => s.nodes);
  const storeAllNodeResults = useFlowStore((s) => s.derivedResults?.nodeResults ?? {});
  const storeHasValidationError = useFlowStore((s) =>
    s.validationResult?.errorDetails?.some(e => e.nodeIds.includes(id)) ?? false
  );

  const nodeResult = readOnly ? (readOnly.derivedResults?.nodeResults[id] ?? null) : storeNodeResult;
  const nodes = readOnly ? readOnly.nodes : storeNodes;
  const allNodeResults = readOnly ? (readOnly.derivedResults?.nodeResults ?? {}) : storeAllNodeResults;
  const hasValidationError = readOnly
    ? (readOnly.validationResult?.errorDetails?.some(e => e.nodeIds.includes(id)) ?? false)
    : storeHasValidationError;

  const statusColor = nodeResult
    ? getProcessNodeStatusColor(nodeResult.utilization)
    : 'var(--color-border)';
  const showWarning = nodeResult ? shouldShowProcessNodeWarning(nodeResult.utilization) : false;

  // Bottleneck classification (single source of truth)
  const classification = classifyBottlenecks(nodes, allNodeResults);
  const showBottleneckBadge = classification.bottleneckNodeIds.includes(id);

  const border =
    selected
      ? '2px solid var(--color-action)'
      : hasValidationError
        ? '2px solid var(--color-bottleneck)'
        : nodeResult
          ? `2px solid ${statusColor}`
          : '1px solid var(--color-border)';

  const boxShadow = showBottleneckBadge
    ? '0 0 0 3px color-mix(in srgb, var(--color-bottleneck) 20%, transparent)'
    : undefined;

  return (
    <div
      style={{ ...getNodeStyle(selected), border, boxShadow, position: 'relative' }}
      onMouseEnter={() => setNodeHovered(true)}
      onMouseLeave={() => setNodeHovered(false)}
    >
      {showWarning && (
        <div
          aria-label="High utilization warning"
          title="Utilization above 95%"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '16px',
            height: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-bottleneck)',
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
          }}
        >
          <span
            style={{
              fontSize: '8px',
              lineHeight: 1,
              fontWeight: 700,
              color: 'var(--color-bg-primary)',
              transform: 'translateY(1px)',
            }}
          >
            !
          </span>
        </div>
      )}
      <div style={nodeLabelStyle}>Process</div>
      <div style={{ fontWeight: 600, marginBottom: '4px' }}>{data.name}</div>
      {data.outputMaterial && (
        <div style={{ fontSize: '10px', color: 'var(--color-text-label)', marginBottom: '4px' }}>
          {data.outputMaterial}
        </div>
      )}

      {nodeResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
            <span style={{ fontSize: '10px', color: 'var(--color-text-label)' }}>REQ</span>
            <span style={nodeValueStyle}>{formatNumberShort(nodeResult.requiredThroughput)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
            <span style={{ fontSize: '10px', color: 'var(--color-text-label)' }}>CAP</span>
            <span style={nodeValueStyle}>{formatNumberShort(nodeResult.effectiveCapacity)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '16px',
              borderTop: '1px solid var(--color-border)',
              paddingTop: '4px',
              position: 'relative',
              cursor: 'default',
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
            tabIndex={0}
            role="group"
            aria-label={`Utilization: ${fmtUtil(nodeResult.utilization)}`}
          >
            <span style={{ fontSize: '10px', color: 'var(--color-text-label)' }}>UTIL</span>
            <span style={{ ...nodeValueStyle, color: statusColor }}>{fmtUtil(nodeResult.utilization)}</span>
            {showTooltip && (
              <div
                role="tooltip"
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginBottom: '6px',
                  background: 'var(--color-text-primary)',
                  color: 'var(--color-bg-primary)',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  lineHeight: 1.5,
                  whiteSpace: 'nowrap',
                  zIndex: 10,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  pointerEvents: 'none',
                }}
              >
                <div>Utilization: {fmtUtil(nodeResult.utilization)}</div>
                <div>Required: {formatNumberShort(nodeResult.requiredThroughput)} units/hr</div>
                <div>Capacity: {formatNumberShort(nodeResult.effectiveCapacity)} units/hr</div>
                <div>Resources: {data.numberOfResources}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invalid badge — highest precedence, shown regardless of nodeResult */}
      {hasValidationError && (
        <div style={{
          position: 'absolute',
          top: '-20px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '9px',
          fontWeight: 700,
          color: 'var(--color-warning)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          whiteSpace: 'nowrap',
          background: 'var(--color-bg-primary)',
          padding: '1px 4px',
          borderRadius: '2px',
        }}>
          INVALID
        </div>
      )}

      {/* Bottleneck badge with pulse — only if not invalid */}
      {showBottleneckBadge && !hasValidationError && (
        <div
          className={`bottleneck-badge${nodeHovered || selected ? ' paused' : ''}`}
          tabIndex={0}
          aria-label="Bottleneck"
          style={{
            position: 'absolute',
            top: '-20px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '9px',
            fontWeight: 700,
            color: 'var(--color-bottleneck)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            whiteSpace: 'nowrap',
            background: 'var(--color-bg-primary)',
            padding: '1px 4px',
            borderRadius: '2px',
          }}
        >
          Bottleneck
        </div>
      )}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
