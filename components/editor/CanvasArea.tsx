'use client';

import 'reactflow/dist/style.css';
import { useCallback, useState } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  ReactFlowProvider,
  Connection,
  useReactFlow,
} from 'reactflow';
import SourceNode from './nodes/SourceNode';
import ProcessNode from './nodes/ProcessNode';
import SinkNode from './nodes/SinkNode';
import ScrapAwareEdge from './edges/ScrapAwareEdge';
import ValidationModal from './ValidationModal';
import { isValidConnection as checkConnection } from '../../lib/flow/validation';
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
  const graphStatus = useFlowStore((s) => s.validationResult);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const reactFlowInstance = useReactFlow();

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

  const handleGoToNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const nodeType = node.type as 'source' | 'process' | 'sink';
    useFlowStore.getState().selectElement({ kind: 'node', id: nodeId, nodeType });
    reactFlowInstance.fitView({ nodes: [{ id: nodeId }], maxZoom: 1.5, duration: 300 });
    setShowValidationModal(false);
  }, [nodes, reactFlowInstance]);

  const detailCount = graphStatus?.errorDetails?.length ?? 0;
  const hasErrors = graphStatus && !graphStatus.isValid && detailCount > 0;

  const badgeText = nodes.length === 0
    ? 'Drag nodes onto the canvas to begin'
    : graphStatus?.isValid
      ? 'Valid model'
      : detailCount > 1
        ? `${detailCount} validation errors`
        : graphStatus?.errors[0] ?? 'Drag nodes onto the canvas to begin';

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
            role={hasErrors ? 'button' : undefined}
            tabIndex={hasErrors ? 0 : undefined}
            onClick={hasErrors ? () => setShowValidationModal(true) : undefined}
            onKeyDown={hasErrors ? (e) => { if (e.key === 'Enter') setShowValidationModal(true); } : undefined}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              background: graphStatus?.isValid ? 'var(--color-healthy)' : 'var(--color-bg-primary)',
              border: '1px solid',
              borderColor: graphStatus?.isValid ? 'var(--color-healthy)' : hasErrors ? 'var(--color-bottleneck)' : 'var(--color-border)',
              color: graphStatus?.isValid ? '#fff' : hasErrors ? 'var(--color-bottleneck)' : 'var(--color-text-secondary)',
              maxWidth: '360px',
              cursor: hasErrors ? 'pointer' : 'default',
            }}
          >
            {badgeText}
          </div>
        </Panel>
      </ReactFlow>
      {showValidationModal && graphStatus && !graphStatus.isValid && (
        <ValidationModal
          errorDetails={graphStatus.errorDetails}
          onClose={() => setShowValidationModal(false)}
          onGoToNode={handleGoToNode}
        />
      )}
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
