import { describe, expect, it } from 'vitest';
import {
  getProcessNodeStatusColor,
  shouldShowProcessNodeWarning,
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
