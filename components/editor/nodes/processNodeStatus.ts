export function getProcessNodeStatusColor(utilization: number): string {
  if (!isFinite(utilization) || utilization > 0.95) return 'var(--color-bottleneck)';
  if (utilization >= 0.85) return 'var(--color-warning)';
  return 'var(--color-healthy)';
}

export function shouldShowProcessNodeWarning(utilization: number): boolean {
  return !isFinite(utilization) || utilization > 0.95;
}

// ─── Bottleneck Classification ───────────────────────────────────────────────

export interface BottleneckClassification {
  status: 'empty' | 'balanced' | 'elevated' | 'single' | 'multiple';
  bottleneckNodeIds: string[];
  totalBottlenecks: number;
}

const BOTTLENECK_THRESHOLD = 0.95;

function isAtBottleneckThreshold(utilization: number): boolean {
  return !isFinite(utilization) || utilization >= BOTTLENECK_THRESHOLD;
}

export function classifyBottlenecks(
  storeNodes: { id: string; type?: string }[],
  nodeResults: Record<string, { utilization: number }>
): BottleneckClassification {
  // Filter to process nodes that have simulation results
  const processIds = storeNodes
    .filter((n) => n.type === 'process' && nodeResults[n.id] != null)
    .map((n) => n.id);

  if (processIds.length === 0) {
    return { status: 'empty', bottleneckNodeIds: [], totalBottlenecks: 0 };
  }

  // Collect bottleneck IDs in store order (deterministic)
  const bottleneckIds = processIds.filter((id) =>
    isAtBottleneckThreshold(nodeResults[id].utilization)
  );

  if (bottleneckIds.length === 0) {
    // No node hits threshold — determine if truly balanced or just elevated
    const utils = processIds.map((id) => nodeResults[id].utilization);
    const maxUtil = Math.max(...utils);
    const minUtil = Math.min(...utils);
    const spread = maxUtil - minUtil;

    // Balanced: max utilization < 90% OR all nodes within 5% spread (tightly clustered)
    if (maxUtil < 0.90 || spread <= 0.05) {
      return { status: 'balanced', bottleneckNodeIds: [], totalBottlenecks: 0 };
    }
    // Nodes are elevated (e.g. 85%-92%) but none hit the >=95% bottleneck threshold
    return { status: 'elevated', bottleneckNodeIds: [], totalBottlenecks: 0 };
  }

  return {
    status: bottleneckIds.length === 1 ? 'single' : 'multiple',
    bottleneckNodeIds: bottleneckIds,
    totalBottlenecks: bottleneckIds.length,
  };
}

export function getBomBadgeState(
  edges: { id: string; target: string; data?: { isScrap?: boolean } | null }[],
  nodeId: string,
  bomRatios: Record<string, number> | undefined
): { isMerge: boolean; bomComplete: boolean } {
  const incomingReal = edges.filter(e => e.target === nodeId && !e.data?.isScrap);
  const isMerge = incomingReal.length >= 2;
  const bomComplete = isMerge && incomingReal.every(e => (bomRatios?.[e.id] ?? 0) > 0);
  return { isMerge, bomComplete };
}
