'use client';

import { Handle, Position, NodeProps } from 'reactflow';
import type { ProcessNodeData } from '../../../types/flow';
import { getNodeStyle, nodeLabelStyle } from '../styles';
import useFlowStore from '../../../store/useFlowStore';

function fmt(n: number): string {
  return isFinite(n) ? n.toFixed(2) : 'N/A';
}

function fmtUtil(utilization: number): string {
  if (!isFinite(utilization)) return 'N/A';
  return (utilization * 100).toFixed(1) + '%';
}

export default function ProcessNode({ id, data, selected }: NodeProps<ProcessNodeData>) {
  const nodeResult = useFlowStore((s) => s.derivedResults?.nodeResults[id] ?? null);

  return (
    <div style={getNodeStyle(selected)}>
      <div style={nodeLabelStyle}>Process</div>
      <div>{data.name}</div>
      {nodeResult && (
        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          <div>Req: {fmt(nodeResult.requiredThroughput)}</div>
          <div>Cap: {fmt(nodeResult.effectiveCapacity)}</div>
          <div>Util: {fmtUtil(nodeResult.utilization)}</div>
        </div>
      )}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
