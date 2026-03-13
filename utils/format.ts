export function formatNumberShort(n: number): string {
  if (!isFinite(n)) return 'N/A';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm';
  if (abs >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toFixed(1).replace(/\.0$/, '');
}
