import { useCallback } from 'react';
import { useReactFlow, NodeMouseHandler, EdgeMouseHandler } from 'reactflow';
import useFlowStore from '../../store/useFlowStore';
import type { FlowNode, FlowNodeType } from '../../types/flow';

export const SNAP_GRID: [number, number] = [20, 20];

export function isFlowNodeType(value: string | undefined): value is FlowNodeType {
  return value === 'source' || value === 'process' || value === 'sink';
}

export function useCanvasInteractions() {
  const addNode = useFlowStore((s) => s.addNode);
  const selectElement = useFlowStore((s) => s.selectElement);
  const clearSelection = useFlowStore((s) => s.clearSelection);
  const { screenToFlowPosition } = useReactFlow();

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
          data: { name: 'Process', throughputRate: 1, availableTime: 8, yield: 100, availabilityRate: 100, performanceEfficiency: 100, qualityRate: 100, numberOfResources: 1, conversionRatio: 1 },
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

  return {
    onNodeClick,
    onEdgeClick,
    onPaneClick,
    onDragOver,
    onDrop,
  };
}