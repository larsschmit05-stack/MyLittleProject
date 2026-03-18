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

  // Orthogonal path: up → left → down
  // Offset distances for the path routing
  const verticalOffset = Math.max(60, Math.abs(sourceY - targetY) / 2 + 20);
  const horizontalOffset = Math.min(-50, targetX - sourceX - 100);

  // Path points
  const upY = sourceY - verticalOffset;
  const leftX = targetX + horizontalOffset;

  // Orthogonal path: vertical up → horizontal left → vertical down
  const path = `M ${sourceX} ${sourceY} L ${sourceX} ${upY} L ${leftX} ${upY} L ${leftX} ${targetY} L ${targetX} ${targetY}`;

  // Label position directly above the horizontal segment
  const labelX = (sourceX + leftX) / 2;
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
      {/* Arrowhead */}
      <polygon
        points={`0,-4 8,0 0,4`}
        fill="#F97316"
        opacity={0.85}
        transform={`translate(${targetX},${targetY}) rotate(270)`}
        pointerEvents="none"
      />
      {/* Label */}
      <g pointerEvents="none">
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
