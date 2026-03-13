import { describe, it, expect } from 'vitest';
import { formatNumberShort } from './format';

describe('formatNumberShort', () => {
  it('returns N/A for Infinity', () => {
    expect(formatNumberShort(Infinity)).toBe('N/A');
  });

  it('returns N/A for NaN', () => {
    expect(formatNumberShort(NaN)).toBe('N/A');
  });

  it('formats integers below 1000 without decimal', () => {
    expect(formatNumberShort(42)).toBe('42');
    expect(formatNumberShort(0)).toBe('0');
    expect(formatNumberShort(999)).toBe('999');
  });

  it('formats decimals below 1000 with one decimal', () => {
    expect(formatNumberShort(42.5)).toBe('42.5');
    expect(formatNumberShort(42.56)).toBe('42.6');
  });

  it('formats thousands with k suffix', () => {
    expect(formatNumberShort(1000)).toBe('1k');
    expect(formatNumberShort(1250)).toBe('1.3k');
    expect(formatNumberShort(156800)).toBe('156.8k');
    expect(formatNumberShort(999999)).toBe('1000k');
  });

  it('formats millions with m suffix', () => {
    expect(formatNumberShort(1_000_000)).toBe('1m');
    expect(formatNumberShort(1_250_000)).toBe('1.3m');
  });
});
