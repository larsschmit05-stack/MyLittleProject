'use client';

import { Handle, Position, NodeProps } from 'reactflow';
import { getNodeStyle, nodeLabelStyle } from '../styles';
import useFlowStore from '../../../store/useFlowStore';

export default function SinkNode({ id, data, selected }: NodeProps<{ label: string }>) {
  const hasValidationError = useFlowStore((s) =>
    s.validationResult?.errorDetails?.some(e => e.nodeIds.includes(id)) ?? false
  );

  const style = {
    ...getNodeStyle(selected),
    ...(hasValidationError && !selected ? { border: '2px solid var(--color-bottleneck)' } : {}),
  };

  return (
    <div style={style}>
      <div style={nodeLabelStyle}>Sink</div>
      <div style={{ fontWeight: 600 }}>{data.label}</div>
      <Handle type="target" position={Position.Left} />
    </div>
  );
}
