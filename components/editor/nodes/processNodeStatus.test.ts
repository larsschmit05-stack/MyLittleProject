import { describe, expect, it } from 'vitest';
import {
  getProcessNodeStatusColor,
  shouldShowProcessNodeWarning,
  getBomBadgeState,
} from './processNodeStatus';

describe('processNodeStatus', () => {
  it('uses green below 85% utilization', () => {
    expect(getProcessNodeStatusColor(0)).toBe('var(--color-healthy)');
    expect(getProcessNodeStatusColor(0.849)).toBe('var(--color-healthy)');
  });

  it('uses orange from 85% through 95% utilization', () => {
    expect(getProcessNodeStatusColor(0.85)).toBe('var(--color-warning)');
    expect(getProcessNodeStatusColor(0.95)).toBe('var(--color-warning)');
  });

  it('uses red above 95% utilization', () => {
    expect(getProcessNodeStatusColor(0.951)).toBe('var(--color-bottleneck)');
    expect(getProcessNodeStatusColor(Number.POSITIVE_INFINITY)).toBe('var(--color-bottleneck)');
  });

  it('shows a warning indicator above 95% utilization', () => {
    expect(shouldShowProcessNodeWarning(0.95)).toBe(false);
    expect(shouldShowProcessNodeWarning(0.951)).toBe(true);
    expect(shouldShowProcessNodeWarning(Number.POSITIVE_INFINITY)).toBe(true);
  });
});

describe('getBomBadgeState', () => {
  const makeEdge = (id: string, target: string, isScrap?: boolean) => ({
    id,
    target,
    data: isScrap ? { isScrap: true } : undefined,
  });

  it('0 incoming edges → not a merge node', () => {
    const { isMerge, bomComplete } = getBomBadgeState([], 'n1', undefined);
    expect(isMerge).toBe(false);
    expect(bomComplete).toBe(false);
  });

  it('1 incoming real edge → not a merge node', () => {
    const edges = [makeEdge('e1', 'n1')];
    const { isMerge } = getBomBadgeState(edges, 'n1', undefined);
    expect(isMerge).toBe(false);
  });

  it('2 incoming real edges, no bomRatios → isMerge true, bomComplete false', () => {
    const edges = [makeEdge('e1', 'n1'), makeEdge('e2', 'n1')];
    const { isMerge, bomComplete } = getBomBadgeState(edges, 'n1', undefined);
    expect(isMerge).toBe(true);
    expect(bomComplete).toBe(false);
  });

  it('2 incoming real edges, one ratio missing → bomComplete false', () => {
    const edges = [makeEdge('e1', 'n1'), makeEdge('e2', 'n1')];
    const { isMerge, bomComplete } = getBomBadgeState(edges, 'n1', { e1: 2 });
    expect(isMerge).toBe(true);
    expect(bomComplete).toBe(false);
  });

  it('2 incoming real edges, all ratios > 0 → bomComplete true', () => {
    const edges = [makeEdge('e1', 'n1'), makeEdge('e2', 'n1')];
    const { isMerge, bomComplete } = getBomBadgeState(edges, 'n1', { e1: 2, e2: 1 });
    expect(isMerge).toBe(true);
    expect(bomComplete).toBe(true);
  });

  it('scrap edges are not counted as incoming real edges', () => {
    const edges = [makeEdge('e1', 'n1'), makeEdge('es', 'n1', true)];
    const { isMerge } = getBomBadgeState(edges, 'n1', undefined);
    expect(isMerge).toBe(false);
  });
});
