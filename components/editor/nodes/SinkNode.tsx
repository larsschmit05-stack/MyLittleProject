'use client';

import { Handle, Position, NodeProps } from 'reactflow';
import { getNodeStyle, nodeLabelStyle } from '../styles';

export default function SinkNode({ data, selected }: NodeProps<{ label: string }>) {
  return (
    <div style={getNodeStyle(selected)}>
      <div style={nodeLabelStyle}>Sink</div>
      <div style={{ fontWeight: 600 }}>{data.label}</div>
      <Handle type="target" position={Position.Left} />
    </div>
  );
}
