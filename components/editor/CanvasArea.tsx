'use client';

import 'reactflow/dist/style.css';
import { useCallback, useState, useRef } from 'react';
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
import { useTouchpadNavigation } from './useTouchpadNavigation';

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
  const containerRef = useRef<HTMLDivElement>(null);

  // Enable touchpad navigation
  useTouchpadNavigation(containerRef);

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
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
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
        panOnDrag={true}
        panOnScroll={true}
        selectionOnDrag={false}
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
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: hasErrors ? 600 : 500,
              background: graphStatus?.isValid ? 'var(--color-healthy)' : 'var(--color-bg-primary)',
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: graphStatus?.isValid ? 'var(--color-healthy)' : hasErrors ? 'var(--color-bottleneck)' : 'var(--color-border)',
              color: graphStatus?.isValid ? '#fff' : hasErrors ? 'var(--color-bottleneck)' : 'var(--color-text-secondary)',
              maxWidth: '360px',
              cursor: hasErrors ? 'pointer' : 'default',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s ease',
              boxShadow: hasErrors ? '0 2px 8px rgba(239, 68, 68, 0.15)' : 'none',
              transform: hasErrors ? 'scale(1)' : 'scale(1)',
            }}
            onMouseEnter={(e) => hasErrors && (e.currentTarget.style.transform = 'scale(1.02)')}
            onMouseLeave={(e) => hasErrors && (e.currentTarget.style.transform = 'scale(1)')}
          >
            <div>{badgeText}</div>
            {hasErrors && (
              <div style={{ fontSize: '10px', fontWeight: 500, color: 'currentColor', opacity: 0.85 }}>
                click to see details
              </div>
            )}
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
