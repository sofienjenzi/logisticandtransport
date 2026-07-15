export function euro(v) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
}

export function pct(v) {
  return `${(v * 100).toFixed(1)}%`;
}

export function compact(v) {
  return new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
}

export function number(v) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v);
}

export function decimal(v) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(v);
}

export function formatChartValue(value, format = 'number') {
  if (!Number.isFinite(Number(value))) return String(value ?? '');
  const n = Number(value);
  if (format === 'currency') return euro(n);
  if (format === 'percent') return `${decimal(n)}%`;
  if (format === 'km') return `${number(n)} km`;
  if (format === 'kg') return `${number(n)} kg`;
  if (format === 'hours') return `${decimal(n)} h`;
  if (format === 'minutes') return `${number(n)} min`;
  if (format === 'score') return `${decimal(n)} / 5`;
  return number(n);
}
