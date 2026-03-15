'use client';

import { Handle, Position, NodeProps } from 'reactflow';
import type { ProcessNodeData } from '../../../types/flow';
import { getNodeStyle, nodeLabelStyle, nodeValueStyle } from '../styles';
import useFlowStore from '../../../store/useFlowStore';
import {
  getProcessNodeStatusColor,
  shouldShowProcessNodeWarning,
} from './processNodeStatus';
import { formatNumberShort } from '../../../utils/format';

function fmtUtil(utilization: number): string {
  if (!isFinite(utilization)) return 'N/A';
  return (utilization * 100).toFixed(1) + '%';
}

export default function ProcessNode({ id, data, selected }: NodeProps<ProcessNodeData>) {
  const nodeResult = useFlowStore((s) => s.derivedResults?.nodeResults[id] ?? null);
  const isBottleneck = useFlowStore((s) => s.derivedResults?.bottleneckNodeId === id);
  const statusColor = nodeResult
    ? getProcessNodeStatusColor(nodeResult.utilization)
    : 'var(--color-border)';
  const showWarning = nodeResult ? shouldShowProcessNodeWarning(nodeResult.utilization) : false;

  const border =
    selected
      ? '2px solid var(--color-action)'
      : nodeResult
        ? `2px solid ${statusColor}`
        : '1px solid var(--color-border)';

  const boxShadow = isBottleneck
    ? '0 0 0 3px color-mix(in srgb, var(--color-action) 20%, transparent)'
    : undefined;

  return (
    <div style={{ ...getNodeStyle(selected), border, boxShadow, position: 'relative' }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '4px' }}>
            <span style={{ fontSize: '10px', color: 'var(--color-text-label)' }}>UTIL</span>
            <span style={{ ...nodeValueStyle, color: statusColor }}>{fmtUtil(nodeResult.utilization)}</span>
          </div>
        </div>
      )}

      {isBottleneck && (
        <div style={{
          position: 'absolute',
          top: '-20px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '9px',
          fontWeight: 700,
          color: 'var(--color-bottleneck)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          whiteSpace: 'nowrap'
        }}>
          Bottleneck
        </div>
      )}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
