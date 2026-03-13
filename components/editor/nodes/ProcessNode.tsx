'use client';

import { Handle, Position, NodeProps } from 'reactflow';
import type { ProcessNodeData } from '../../../types/flow';
import { getNodeStyle, nodeLabelStyle } from '../styles';
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
    ? isBottleneck
      ? 'var(--color-bottleneck)'
      : getProcessNodeStatusColor(nodeResult.utilization)
    : 'var(--color-border)';
  const showWarning = nodeResult ? shouldShowProcessNodeWarning(nodeResult.utilization) : false;

  const border =
    selected
      ? '2px solid var(--color-action)'
      : nodeResult
        ? `2px solid ${statusColor}`
        : '1px solid var(--color-border)';

  const boxShadow = isBottleneck
    ? '0 0 0 3px color-mix(in srgb, var(--color-bottleneck) 20%, transparent)'
    : undefined;

  return (
    <div style={{ ...getNodeStyle(selected), border, boxShadow, position: 'relative' }}>
      {showWarning && (
        <div
          aria-label="High utilization warning"
          title="Utilization above 95%"
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
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
      <div>{data.name}</div>
      {isBottleneck && nodeResult && (
        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-bottleneck)', marginTop: '4px' }}>
          Bottleneck
        </div>
      )}
      {nodeResult && (
        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          <div>Req: {formatNumberShort(nodeResult.requiredThroughput)}</div>
          <div>Cap: {formatNumberShort(nodeResult.effectiveCapacity)}</div>
          <div>Util: {fmtUtil(nodeResult.utilization)}</div>
        </div>
      )}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
