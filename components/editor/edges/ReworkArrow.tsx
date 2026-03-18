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

  // Quadratic bezier going upward (backward flow)
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  // Control point goes above the midpoint for a nice arc
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  const offset = Math.max(40, dist * 0.3);
  const cpX = midX;
  const cpY = midY - offset;

  const path = `M ${sourceX} ${sourceY} Q ${cpX} ${cpY} ${targetX} ${targetY}`;

  // Label position at the control point area
  const labelX = cpX;
  const labelY = cpY - 4;

  // Arrowhead at target
  const t = 0.95;
  const ax = (1 - t) * (1 - t) * sourceX + 2 * (1 - t) * t * cpX + t * t * targetX;
  const ay = (1 - t) * (1 - t) * sourceY + 2 * (1 - t) * t * cpY + t * t * targetY;
  const angle = Math.atan2(targetY - ay, targetX - ax);

  return (
    <g>
      {/* Invisible hit-area */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
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
        opacity={0.85}
        pointerEvents="none"
      />
      {/* Arrowhead */}
      <polygon
        points={`0,-4 8,0 0,4`}
        fill="#F97316"
        opacity={0.85}
        transform={`translate(${targetX},${targetY}) rotate(${(angle * 180) / Math.PI})`}
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
