// ─── Bottleneck Classification ───────────────────────────────────────────────

export interface BottleneckClassification {
  status: 'empty' | 'balanced' | 'elevated' | 'single' | 'multiple';
  bottleneckNodeIds: string[];
  totalBottlenecks: number;
}

const BOTTLENECK_THRESHOLD = 0.95;

export function isAtBottleneckThreshold(utilization: number): boolean {
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
