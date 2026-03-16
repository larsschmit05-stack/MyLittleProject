'use client';

import 'reactflow/dist/style.css';
import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  ReactFlowProvider,
  Connection,
} from 'reactflow';
import SourceNode from './nodes/SourceNode';
import ProcessNode from './nodes/ProcessNode';
import SinkNode from './nodes/SinkNode';
import ScrapAwareEdge from './edges/ScrapAwareEdge';
import { isValidConnection as checkConnection, validateGraph } from '../../lib/flow/validation';
import useFlowStore from '../../store/useFlowStore';
import { useCanvasInteractions, SNAP_GRID } from './useCanvasInteractions';

const nodeTypes = {
  source: SourceNode,
  process: ProcessNode,
  sink: SinkNode,
};

const edgeTypes = {
  default: ScrapAwareEdge,
};

function FlowCanvas() {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const onConnect = useFlowStore((s) => s.onConnect);

  const {
    onNodeClick,
    onEdgeClick,
    onPaneClick,
    onDragOver,
    onDrop,
  } = useCanvasInteractions();

  const handleIsValidConnection = useCallback(
    (connection: Connection) => checkConnection(connection, nodes, edges),
    [nodes, edges]
  );

  const graphStatus = useMemo(() => validateGraph(nodes, edges), [nodes, edges]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        snapToGrid
        snapGrid={SNAP_GRID}
        fitView
        deleteKeyCode={['Delete', 'Backspace']}
        autoPanOnNodeDrag={false}
        autoPanOnConnect={false}
        isValidConnection={handleIsValidConnection}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color="#e5e7eb"
        />
        <Controls />
        <Panel position="bottom-center">
          <div
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              background: graphStatus.isValid ? 'var(--color-healthy)' : 'var(--color-bg-primary)',
              border: '1px solid',
              borderColor: graphStatus.isValid ? 'var(--color-healthy)' : 'var(--color-border)',
              color: graphStatus.isValid ? '#fff' : 'var(--color-text-secondary)',
              maxWidth: '240px',
            }}
          >
            {nodes.length === 0
              ? 'Drag nodes onto the canvas to begin'
              : graphStatus.isValid
                ? 'Valid model'
                : graphStatus.errors[0]}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default function CanvasArea() {
  return (
    <div style={{ flex: 1, height: '100%' }}>
      <ReactFlowProvider>
        <FlowCanvas />
      </ReactFlowProvider>
    </div>
  );
}
