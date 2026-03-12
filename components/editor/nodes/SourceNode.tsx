'use client';

import { Handle, Position, NodeProps } from 'reactflow';

export default function SourceNode({ data, selected }: NodeProps<{ label: string }>) {
  return (
    <div
      style={{
        background: 'var(--color-bg-primary)',
        border: `2px solid ${selected ? 'var(--color-action)' : 'var(--color-border)'}`,
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
        Source
      </div>
      <div>{data.label}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
