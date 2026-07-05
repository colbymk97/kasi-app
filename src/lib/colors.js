export const KASINA_PRESETS = [
  { id: 'blue', label: 'Blue', value: '#3a6ea5' },
  { id: 'red', label: 'Red', value: '#c43a3a' },
  { id: 'white', label: 'White', value: '#f5f5f5' },
  { id: 'yellow', label: 'Yellow', value: '#f0c419' },
];

export const DEFAULT_COLOR = KASINA_PRESETS[0].value;

export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return { r: 245, g: 245, b: 245 };
  let s = m[1];
  if (s.length === 3) s = s.replace(/./g, (c) => c + c);
  const n = parseInt(s, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function mixRgb(a, b, t) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}
