import { describe, expect, it } from 'vitest';
import { isProcessValueValid } from './validation';

describe('isProcessValueValid', () => {
  it('accepts valid process values', () => {
    expect(isProcessValueValid('throughputRate', 1)).toBe(true);
    expect(isProcessValueValid('availableTime', 0)).toBe(true);
    expect(isProcessValueValid('yield', 100)).toBe(true);
    expect(isProcessValueValid('numberOfResources', 1)).toBe(true);
    expect(isProcessValueValid('conversionRatio', 0.5)).toBe(true);
  });

  it('rejects invalid process values', () => {
    expect(isProcessValueValid('throughputRate', 0)).toBe(false);
    expect(isProcessValueValid('availableTime', -1)).toBe(false);
    expect(isProcessValueValid('yield', 0)).toBe(false);
    expect(isProcessValueValid('yield', 150)).toBe(false);
    expect(isProcessValueValid('numberOfResources', 0)).toBe(false);
    expect(isProcessValueValid('conversionRatio', 0)).toBe(false);
  });
});
