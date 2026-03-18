'use client';

import { Handle, Position, NodeProps } from 'reactflow';
import type { SourceNodeData } from '../../../types/flow';
import { getNodeStyle, nodeLabelStyle } from '../styles';
import useFlowStore from '../../../store/useFlowStore';
import { useReadOnlyFlow } from '../ReadOnlyFlowContext';

export default function SourceNode({ id, data, selected }: NodeProps<SourceNodeData>) {
  const readOnly = useReadOnlyFlow();
  const storeHasValidationError = useFlowStore((s) =>
    s.validationResult?.errorDetails?.some(e => e.nodeIds.includes(id)) ?? false
  );
  const hasValidationError = readOnly
    ? (readOnly.validationResult?.errorDetails?.some(e => e.nodeIds.includes(id)) ?? false)
    : storeHasValidationError;

  const style = {
    ...getNodeStyle(selected),
    ...(hasValidationError && !selected ? { border: '2px solid var(--color-bottleneck)' } : {}),
  };

  return (
    <div style={style}>
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
