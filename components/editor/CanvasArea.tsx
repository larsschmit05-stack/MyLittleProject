'use client';

import 'reactflow/dist/style.css';
import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  Connection,
  NodeMouseHandler,
  EdgeMouseHandler,
} from 'reactflow';
import SourceNode from './nodes/SourceNode';
import ProcessNode from './nodes/ProcessNode';
import SinkNode from './nodes/SinkNode';
import { isValidConnection as checkConnection, validateGraph } from './validation';
import useFlowStore from '../../store/useFlowStore';
import type { FlowNode, FlowNodeType } from '../../types/flow';

const nodeTypes = {
  source: SourceNode,
  process: ProcessNode,
  sink: SinkNode,
};

const SNAP_GRID: [number, number] = [20, 20];

function isFlowNodeType(value: string | undefined): value is FlowNodeType {
  return value === 'source' || value === 'process' || value === 'sink';
}

function FlowCanvas() {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const onConnect = useFlowStore((s) => s.onConnect);
  const addNode = useFlowStore((s) => s.addNode);
  const selectElement = useFlowStore((s) => s.selectElement);
  const clearSelection = useFlowStore((s) => s.clearSelection);

  const { screenToFlowPosition } = useReactFlow();

  const handleIsValidConnection = useCallback(
    (connection: Connection) => checkConnection(connection, nodes, edges),
    [nodes, edges]
  );

  const graphStatus = useMemo(() => validateGraph(nodes, edges), [nodes, edges]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (!isFlowNodeType(node.type)) {
        return;
      }

      selectElement({
        kind: 'node',
        id: node.id,
        nodeType: node.type,
      });
    },
    [selectElement]
  );

  const onEdgeClick: EdgeMouseHandler = useCallback(
    (_event, edge) => {
      selectElement({ kind: 'edge', id: edge.id });
    },
    [selectElement]
  );

  const onPaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

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

      const nodeId = `${nodeType}-${Date.now()}`;
      let newNode: FlowNode;

      if (nodeType === 'process') {
        newNode = {
          id: nodeId,
          type: 'process',
          position: snappedPosition,
          data: { name: 'Process', cycleTime: 60, availableTime: 480, yield: 100, numberOfResources: 1, conversionRatio: 1 },
        };
      } else if (nodeType === 'source') {
        newNode = {
          id: nodeId,
          type: 'source',
          position: snappedPosition,
          data: { label: nodeType.charAt(0).toUpperCase() + nodeType.slice(1) },
        };
      } else if (nodeType === 'sink') {
        newNode = {
          id: nodeId,
          type: 'sink',
          position: snappedPosition,
          data: { label: nodeType.charAt(0).toUpperCase() + nodeType.slice(1) },
        };
      } else {
        return;
      }

      addNode(newNode);
    },
    [screenToFlowPosition, addNode]
  );

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
