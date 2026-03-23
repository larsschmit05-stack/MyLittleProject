import { EdgeProps, EdgeLabelRenderer, getBezierPath } from 'reactflow';
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
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const isScrap = data?.isScrap === true;
  const routeSplit = data?.routeSplitPercent;

  return (
    <>
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
      {routeSplit != null && !isScrap && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              background: 'var(--color-bg-primary)',
              padding: '1px 4px',
              borderRadius: '3px',
              border: '1px solid var(--color-border)',
            }}
          >
            {routeSplit}%
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
