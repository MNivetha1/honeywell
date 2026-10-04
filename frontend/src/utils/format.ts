export function formatPercent(value?: number, decimals: number = 1): string {
  if (value === undefined || value === null || isNaN(value)) return '0.0%';
  return `${value.toFixed(decimals)}%`;
}

export function formatMs(value?: number): string {
  if (value === undefined || value === null || isNaN(value)) return '0 ms';
  return `${value.toFixed(0)} ms`;
}

export function formatDateTime(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch {
    return isoString;
  }
}
