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
  const splitRatio = data?.splitRatio;

  const hasRouteSplit = routeSplit != null && !isScrap;
  const hasSplitRatio = splitRatio != null && !isScrap;
  const hasBoth = hasRouteSplit && hasSplitRatio;

  // When both labels exist, offset toward source (split) and target (route split)
  const splitLabelX = hasBoth ? sourceX + (labelX - sourceX) * 0.5 : labelX;
  const splitLabelY = hasBoth ? sourceY + (labelY - sourceY) * 0.5 : labelY;
  const routeLabelX = hasBoth ? targetX + (labelX - targetX) * 0.5 : labelX;
  const routeLabelY = hasBoth ? targetY + (labelY - targetY) * 0.5 : labelY;

  const labelStyle = {
    position: 'absolute' as const,
    pointerEvents: 'none' as const,
    fontSize: '10px',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    background: 'var(--color-bg-primary)',
    padding: '1px 4px',
    borderRadius: '3px',
    border: '1px solid var(--color-border)',
  };

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
      {(hasSplitRatio || hasRouteSplit) && (
        <EdgeLabelRenderer>
          {hasSplitRatio && (
            <div
              style={{
                ...labelStyle,
                transform: `translate(-50%, -50%) translate(${splitLabelX}px, ${splitLabelY}px)`,
              }}
            >
              {splitRatio}%
            </div>
          )}
          {hasRouteSplit && (
            <div
              style={{
                ...labelStyle,
                transform: `translate(-50%, -50%) translate(${routeLabelX}px, ${routeLabelY}px)`,
              }}
            >
              {routeSplit}%
            </div>
          )}
        </EdgeLabelRenderer>
      )}
    </>
  );
}
