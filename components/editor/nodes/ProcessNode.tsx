'use client';

import { Handle, Position, NodeProps } from 'reactflow';
import type { ProcessNodeData } from '../../../types/flow';

export default function ProcessNode({ data, selected }: NodeProps<ProcessNodeData>) {
  return (
    <div
      style={{
        background: 'var(--color-bg-primary)',
        border: selected
          ? '2px solid var(--color-action)'
          : '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '10px 14px',
        minWidth: '120px',
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--color-text-primary)',
        cursor: 'default',
      }}
    >
      <div
        style={{
          marginBottom: '4px',
          fontSize: '10px',
          color: 'var(--color-text-label)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Process
      </div>
      <div>{data.name}</div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
