'use client';

import 'reactflow/dist/style.css';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlowProvider,
} from 'reactflow';
import SourceNode from './nodes/SourceNode';
import ProcessNode from './nodes/ProcessNode';
import SinkNode from './nodes/SinkNode';
import ScrapAwareEdge from './edges/ScrapAwareEdge';
import { ReadOnlyFlowContext } from './ReadOnlyFlowContext';
import type { ReadOnlyFlowData } from './ReadOnlyFlowContext';
import type { FlowNode, EdgeData } from '../../types/flow';

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

function ReadOnlyFlow({ nodes, edges }: Omit<ReadOnlyCanvasProps, 'scenarioData'>) {
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
    </ReactFlow>
  );
}

export default function ReadOnlyCanvas({ nodes, edges, scenarioData }: ReadOnlyCanvasProps) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReadOnlyFlowContext.Provider value={scenarioData}>
        <ReactFlowProvider>
          <ReadOnlyFlow nodes={nodes} edges={edges} />
        </ReactFlowProvider>
      </ReadOnlyFlowContext.Provider>
    </div>
  );
}
