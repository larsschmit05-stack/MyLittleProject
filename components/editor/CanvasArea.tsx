'use client';

import 'reactflow/dist/style.css';
import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Connection,
} from 'reactflow';
import SourceNode from './nodes/SourceNode';
import ProcessNode from './nodes/ProcessNode';
import SinkNode from './nodes/SinkNode';
import { isValidConnection as checkConnection, validateGraph } from './validation';

const nodeTypes = {
  source: SourceNode,
  process: ProcessNode,
  sink: SinkNode,
};

const SNAP_GRID: [number, number] = [20, 20];

function FlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((currentEdges) => {
        if (!checkConnection(connection, nodes, currentEdges)) {
          return currentEdges;
        }

        return addEdge(connection, currentEdges);
      });
    },
    [nodes, setEdges]
  );

  const handleIsValidConnection = useCallback(
    (connection: Connection) => checkConnection(connection, nodes, edges),
    [nodes, edges]
  );

  const graphStatus = useMemo(() => validateGraph(nodes, edges), [nodes, edges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData('application/reactflow');
      if (!nodeType) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const snappedPosition = {
        x: Math.round(position.x / SNAP_GRID[0]) * SNAP_GRID[0],
        y: Math.round(position.y / SNAP_GRID[1]) * SNAP_GRID[1],
      };

      const newNode = {
        id: `${nodeType}-${Date.now()}`,
        type: nodeType,
        position: snappedPosition,
        data: { label: nodeType.charAt(0).toUpperCase() + nodeType.slice(1) },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
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
        <Panel position="bottom-left">
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
