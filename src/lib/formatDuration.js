export function formatMs(ms) {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

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
