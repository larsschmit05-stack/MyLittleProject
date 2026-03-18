import { describe, it, expect } from 'vitest';
import { fmt, fmtPct } from '../formatting';

describe('fmt', () => {
  it('formats a finite number to 2 decimal places', () => {
    expect(fmt(42)).toBe('42.00');
  });

  it('returns "N/A" for Infinity', () => {
    expect(fmt(Infinity)).toBe('N/A');
  });

  it('returns "N/A" for -Infinity', () => {
    expect(fmt(-Infinity)).toBe('N/A');
  });

  it('returns "N/A" for NaN', () => {
    expect(fmt(NaN)).toBe('N/A');
  });
});

describe('fmtPct', () => {
  it('formats 0.85 as "85.0%"', () => {
    expect(fmtPct(0.85)).toBe('85.0%');
  });

  it('formats 1.0 as "100.0%"', () => {
    expect(fmtPct(1.0)).toBe('100.0%');
  });

  it('returns "N/A" for Infinity', () => {
    expect(fmtPct(Infinity)).toBe('N/A');
  });

  it('returns "N/A" for NaN', () => {
    expect(fmtPct(NaN)).toBe('N/A');
  });
});
