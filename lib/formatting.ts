export function fmt(n: number): string {
  return isFinite(n) ? n.toFixed(2) : 'N/A';
}

export function fmtPct(n: number): string {
  return isFinite(n) ? (n * 100).toFixed(1) + '%' : 'N/A';
}
