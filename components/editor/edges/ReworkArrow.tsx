import { useState } from 'react';

interface ReworkArrowProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  percentage: number;
  tooltip: string;
}

export default function ReworkArrow({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  percentage,
  tooltip,
}: ReworkArrowProps) {
  const [hovered, setHovered] = useState(false);

  // Orthogonal path: up → horizontal to target center → down
  // Shortest path that descends at the target node center (where rework handle is)
  const verticalOffset = Math.max(60, Math.abs(sourceY - targetY) / 2 + 20);
  const upY = sourceY - verticalOffset;

  // Orthogonal path: vertical up → horizontal to target X → vertical down
  const path = `M ${sourceX} ${sourceY} L ${sourceX} ${upY} L ${targetX} ${upY} L ${targetX} ${targetY}`;

  // Label position at the midpoint of the horizontal segment
  const labelX = (sourceX + targetX) / 2;
  const labelY = upY - 12;

  return (
    <g>
      {/* Invisible hit-area */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        strokeLinecap="round"
        strokeLinejoin="round"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: 'default' }}
      />
      {/* Visible dashed arrow */}
      <path
        d={path}
        fill="none"
        stroke="#F97316"
        strokeWidth={hovered ? 2.5 : 1.5}
        strokeDasharray="6 3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
        pointerEvents="none"
      />
      {/* Arrowhead pointing upward into the node — positioned so tip just touches */}
      <polygon
        points={`0,-4 8,0 0,4`}
        fill="#F97316"
        opacity={0.85}
        transform={`translate(${targetX},${targetY - 8}) rotate(90)`}
        pointerEvents="none"
      />
      {/* Label */}
      <g pointerEvents="none">
        {/* Fully opaque background to hide the dashed line */}
        <rect
          x={labelX - 18}
          y={labelY - 10}
          width={36}
          height={20}
          rx={3}
          fill="white"
          opacity={1}
        />
        {/* Styled label rect */}
        <rect
          x={labelX - 16}
          y={labelY - 8}
          width={32}
          height={16}
          rx={3}
          fill="white"
          stroke="#F97316"
          strokeWidth={0.5}
          opacity={0.95}
        />
        <text
          x={labelX}
          y={labelY + 4}
          textAnchor="middle"
          fontSize={10}
          fontWeight={600}
          fill="#F97316"
        >
          {percentage}%
        </text>
      </g>
      {/* Tooltip on hover */}
      {hovered && (
        <g pointerEvents="none">
          <rect
            x={labelX - 80}
            y={labelY - 28}
            width={160}
            height={18}
            rx={4}
            fill="rgba(0,0,0,0.8)"
          />
          <text
            x={labelX}
            y={labelY - 16}
            textAnchor="middle"
            fontSize={10}
            fill="white"
          >
            {tooltip}
          </text>
        </g>
      )}
    </g>
  );
}
