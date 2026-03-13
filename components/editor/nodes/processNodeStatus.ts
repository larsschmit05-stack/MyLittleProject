export function getProcessNodeStatusColor(utilization: number): string {
  if (!isFinite(utilization) || utilization > 0.95) return 'var(--color-bottleneck)';
  if (utilization >= 0.85) return 'var(--color-warning)';
  return 'var(--color-healthy)';
}

export function shouldShowProcessNodeWarning(utilization: number): boolean {
  return !isFinite(utilization) || utilization > 0.95;
}
