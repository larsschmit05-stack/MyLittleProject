'use client';

import { Handle, Position, NodeProps } from 'reactflow';
import type { SourceNodeData } from '../../../types/flow';
import { getNodeStyle, nodeLabelStyle } from '../styles';

export default function SourceNode({ data, selected }: NodeProps<SourceNodeData>) {
  return (
    <div style={getNodeStyle(selected)}>
      <div style={nodeLabelStyle}>Source</div>
      <div style={{ fontWeight: 600 }}>{data.label}</div>
      {data.outputMaterial && (
        <div style={{ fontSize: '10px', color: 'var(--color-text-label)' }}>
          {data.outputMaterial}
        </div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
