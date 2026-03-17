'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import useFlowStore from '../store/useFlowStore';
import type { ProcessNodeData, SourceNodeData, FlowResult } from '../types/flow';

export type SnapshotNodeType = 'process' | 'source';

export interface PanelSnapshot {
  nodeId: string;
  nodeType: SnapshotNodeType;
  nodeData: ProcessNodeData | SourceNodeData;
  derivedResults: FlowResult;
}

export function useFloatingPanel() {
  const [isFloating, setIsFloating] = useState(false);
  const [snapshot, setSnapshot] = useState<PanelSnapshot | null>(null);
  const snapshotRef = useRef<PanelSnapshot | null>(null);

  const selectedElement = useFlowStore((s) => s.selectedElement);
  const nodes = useFlowStore((s) => s.nodes);
  const derivedResults = useFlowStore((s) => s.derivedResults);
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const updateSourceNodeData = useFlowStore((s) => s.updateSourceNodeData);
  const updateSavedModel = useFlowStore((s) => s.updateSavedModel);
  const clearSelection = useFlowStore((s) => s.clearSelection);

  // Keep ref in sync with snapshot state
  useEffect(() => { snapshotRef.current = snapshot; }, [snapshot]);

  // Helper: restore a node from a snapshot (avoids duplication)
  const restoreFromSnapshot = useCallback((snap: PanelSnapshot) => {
    const node = nodes.find((n) => n.id === snap.nodeId);
    if (!node || node.type !== snap.nodeType) return;
    if (JSON.stringify(node.data) === JSON.stringify(snap.nodeData)) return;

    if (snap.nodeType === 'process') {
      updateNodeData(snap.nodeId, { ...(snap.nodeData as ProcessNodeData) });
    } else {
      updateSourceNodeData(snap.nodeId, { ...(snap.nodeData as SourceNodeData) });
    }
  }, [nodes, updateNodeData, updateSourceNodeData]);

  // Get current node data for dirty comparison
  const currentNodeData = useMemo(() => {
    if (!snapshot) return null;
    const node = nodes.find((n) => n.id === snapshot.nodeId);
    if (!node || node.type !== snapshot.nodeType) return null;
    return node.data as ProcessNodeData | SourceNodeData;
  }, [nodes, snapshot]);

  const isDirty = useMemo(() => {
    if (!snapshot || !currentNodeData) return false;
    return JSON.stringify(currentNodeData) !== JSON.stringify(snapshot.nodeData);
  }, [snapshot, currentNodeData]);

  const resetToSnapshot = useCallback(() => {
    if (!snapshot) return;
    if (snapshot.nodeType === 'process') {
      updateNodeData(snapshot.nodeId, { ...(snapshot.nodeData as ProcessNodeData) });
    } else {
      updateSourceNodeData(snapshot.nodeId, { ...(snapshot.nodeData as SourceNodeData) });
    }
  }, [snapshot, updateNodeData, updateSourceNodeData]);

  const closeFloating = useCallback(() => {
    if (snapshot && isDirty) {
      restoreFromSnapshot(snapshot);
    }
    setIsFloating(false);
    setSnapshot(null);
    clearSelection();
  }, [snapshot, isDirty, restoreFromSnapshot, clearSelection]);

  const saveAndClose = useCallback(async () => {
    await updateSavedModel();
    setIsFloating(false);
    setSnapshot(null);
  }, [updateSavedModel]);

  // Auto-open/close/switch floating panel based on selection
  // Reads snapshot from ref to avoid re-triggering on every store update
  useEffect(() => {
    const isEditableNode =
      selectedElement?.kind === 'node' &&
      (selectedElement.nodeType === 'process' || selectedElement.nodeType === 'source');

    // No editable node selected → restore + close if was floating
    if (!isEditableNode) {
      const snap = snapshotRef.current;
      if (isFloating && snap) {
        restoreFromSnapshot(snap);
      }
      if (isFloating) {
        setIsFloating(false);
        setSnapshot(null);
      }
      return;
    }

    const snap = snapshotRef.current;

    // Already floating for this same node → no-op
    if (isFloating && snap && selectedElement.id === snap.nodeId) return;

    // Floating for a different node → restore old, then snapshot new
    if (isFloating && snap && selectedElement.id !== snap.nodeId) {
      restoreFromSnapshot(snap);
    }

    // Snapshot the newly selected node and open
    const node = nodes.find((n) => n.id === selectedElement.id);
    const nodeType = selectedElement.nodeType as SnapshotNodeType;
    if (!node || node.type !== nodeType) {
      setIsFloating(false);
      setSnapshot(null);
      return;
    }

    setSnapshot({
      nodeId: selectedElement.id,
      nodeType,
      nodeData: JSON.parse(JSON.stringify(node.data)),
      derivedResults: derivedResults
        ? JSON.parse(JSON.stringify(derivedResults))
        : { systemThroughput: 0, bottleneckNodeId: null, nodeResults: {} },
    });
    setIsFloating(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElement]);

  return {
    isFloating,
    snapshot,
    isDirty,
    closeFloating,
    resetToSnapshot,
    saveAndClose,
  };
}
