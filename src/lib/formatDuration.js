export function formatMinutes(ms) {
  const m = Math.round(ms / 60000);
  if (m < 1) return '<1 min';
  return `${m} min`;
}

export function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
