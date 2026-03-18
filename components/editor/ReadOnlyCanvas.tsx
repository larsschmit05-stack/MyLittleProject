'use client';

import 'reactflow/dist/style.css';
import { useMemo } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlowProvider,
  useViewport,
} from 'reactflow';
import SourceNode from './nodes/SourceNode';
import ProcessNode from './nodes/ProcessNode';
import SinkNode from './nodes/SinkNode';
import ScrapAwareEdge from './edges/ScrapAwareEdge';
import ReworkArrow from './edges/ReworkArrow';
import { ReadOnlyFlowContext } from './ReadOnlyFlowContext';
import type { ReadOnlyFlowData } from './ReadOnlyFlowContext';
import type { FlowNode, EdgeData, ProcessNodeData } from '../../types/flow';

const nodeTypes = {
  source: SourceNode,
  process: ProcessNode,
  sink: SinkNode,
};

const edgeTypes = {
  default: ScrapAwareEdge,
};

interface ReadOnlyCanvasProps {
  nodes: FlowNode[];
  edges: Array<{ id: string; source: string; target: string; data?: EdgeData }>;
  scenarioData: ReadOnlyFlowData;
}

/** Rework overlay rendered as a child of ReactFlow so useViewport() is available */
function ReworkOverlay({ nodes, scenarioData }: { nodes: FlowNode[]; scenarioData: ReadOnlyFlowData }) {
  const { x: vpX, y: vpY, zoom } = useViewport();

  const reworkArrows = useMemo(() => {
    const arrows: Array<{
      id: string;
      sourceX: number;
      sourceY: number;
      targetX: number;
      targetY: number;
      percentage: number;
      tooltip: string;
    }> = [];

    for (const node of nodes) {
      if (node.type !== 'process') continue;
      const data = node.data as ProcessNodeData;
      if (!data.reworkLoops?.length) continue;

      const srcX = node.position.x + 64;
      const srcY = node.position.y;

      for (const loop of data.reworkLoops) {
        const targetNode = nodes.find((n) => n.id === loop.targetNodeId);
        if (!targetNode) continue;

        const tgtX = targetNode.position.x + 64;
        const tgtY = targetNode.position.y;

        const targetName =
          targetNode.type === 'process'
            ? (targetNode.data as ProcessNodeData).name
            : (targetNode.data as { label?: string }).label ?? loop.targetNodeId;

        const reworkAmount = scenarioData.derivedResults?.rework?.reworkSources?.find(
          (rs) => rs.nodeId === node.id && rs.targetNodeId === loop.targetNodeId
        )?.reworkAmount;

        const amountStr = reworkAmount !== undefined ? ` (${reworkAmount.toFixed(1)} units/hr)` : '';

        arrows.push({
          id: `rework-${node.id}-${loop.targetNodeId}`,
          sourceX: srcX,
          sourceY: srcY,
          targetX: tgtX,
          targetY: tgtY,
          percentage: loop.percentage,
          tooltip: `${loop.percentage}% of ${data.name} reworks to ${targetName}${amountStr}`,
        });
      }
    }
    return arrows;
  }, [nodes, scenarioData]);

  if (reworkArrows.length === 0) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 5,
      }}
    >
      <g
        transform={`translate(${vpX},${vpY}) scale(${zoom})`}
        style={{ pointerEvents: 'auto' }}
      >
        {reworkArrows.map((arrow) => (
          <ReworkArrow key={arrow.id} {...arrow} />
        ))}
      </g>
    </svg>
  );
}

function ReadOnlyFlow({ nodes, edges, scenarioData }: ReadOnlyCanvasProps) {
  const hasReworkLoops = nodes.some(
    (n) => n.type === 'process' && (n.data as ProcessNodeData).reworkLoops?.length
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      deleteKeyCode={null}
      panOnDrag={true}
      zoomOnScroll={true}
      fitView
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={20}
        size={1.5}
        color="#e5e7eb"
      />
      <Controls showInteractive={false} />
      {hasReworkLoops && <ReworkOverlay nodes={nodes} scenarioData={scenarioData} />}
    </ReactFlow>
  );
}

export default function ReadOnlyCanvas({ nodes, edges, scenarioData }: ReadOnlyCanvasProps) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReadOnlyFlowContext.Provider value={scenarioData}>
        <ReactFlowProvider>
          <ReadOnlyFlow nodes={nodes} edges={edges} scenarioData={scenarioData} />
        </ReactFlowProvider>
      </ReadOnlyFlowContext.Provider>
    </div>
  );
}
