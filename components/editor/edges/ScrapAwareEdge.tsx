import { EdgeProps, getBezierPath } from 'reactflow';
import type { EdgeData } from '../../../types/flow';

export default function ScrapAwareEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<EdgeData>) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const isScrap = data?.isScrap === true;

  return (
    <g>
      {/* Invisible hit-area path for easier clicking */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        strokeLinecap="round"
        pointerEvents="stroke"
        style={{ cursor: 'pointer' }}
      />
      {/* Visible path */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected
            ? 'var(--color-action)'
            : isScrap
              ? 'var(--color-text-label)'
              : 'var(--color-border)',
          strokeWidth: selected ? 2 : 1.5,
          strokeDasharray: isScrap ? '6 3' : undefined,
          pointerEvents: 'none',
        }}
      />
    </g>
  );
}
