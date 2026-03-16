export function getProcessNodeStatusColor(utilization: number): string {
  if (!isFinite(utilization) || utilization > 0.95) return 'var(--color-bottleneck)';
  if (utilization >= 0.85) return 'var(--color-warning)';
  return 'var(--color-healthy)';
}

export function shouldShowProcessNodeWarning(utilization: number): boolean {
  return !isFinite(utilization) || utilization > 0.95;
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
