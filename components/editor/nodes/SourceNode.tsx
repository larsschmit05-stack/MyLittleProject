'use client';

import { Handle, Position, NodeProps } from 'reactflow';
import { getNodeStyle, nodeLabelStyle } from '../styles';

export default function SourceNode({ data, selected }: NodeProps<{ label: string }>) {
  return (
    <div style={getNodeStyle(selected)}>
      <div style={nodeLabelStyle}>Source</div>
      <div>{data.label}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
