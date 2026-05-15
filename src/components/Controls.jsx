import { useAutoDismiss } from '../hooks/useAutoDismiss.js';
import { KASINA_PRESETS } from '../lib/colors.js';

const AUTO_DISMISS_MS = 5000;

export default function Controls({
  visible,
  onDismiss,
  color,
  setColor,
  brightness,
  setBrightness,
  pulse,
  setPulse,
  shape,
  setShape,
  timerMinutes,
  setTimerMinutes,
  onStartTimer,
  onOpenHistory,
}) {
  useAutoDismiss(visible, AUTO_DISMISS_MS, onDismiss);

  if (!visible) return null;

  const stop = (e) => e.stopPropagation();

  return (
    <div
      className="fixed inset-0 z-20 flex flex-col justify-end pointer-events-none"
      onPointerDown={stop}
    >
      <div
        className="pointer-events-auto bg-black/85 backdrop-blur-sm border-t border-white/10"
        style={{
          paddingTop: '1rem',
          paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
          paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
          paddingRight: 'max(env(safe-area-inset-right), 1rem)',
        }}
      >
        <div className="max-w-md mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-white/50">Color</span>
            <button
              type="button"
              onClick={onOpenHistory}
              className="text-xs uppercase tracking-widest text-white/50 hover:text-white/80 px-2 py-1"
              aria-label="Open session history"
            >
              History
            </button>
          </div>
          <div className="flex items-center gap-3">
            {KASINA_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setColor(p.value)}
                aria-label={`${p.label} kasina`}
                className="w-9 h-9 rounded-full border"
                style={{
                  background: p.value,
                  borderColor: color === p.value ? '#fff' : 'rgba(255,255,255,0.15)',
                  borderWidth: color === p.value ? 2 : 1,
                }}
              />
            ))}
            <input
              type="color"
              className="kasi-color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              aria-label="Custom color"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase tracking-widest text-white/50">Brightness</span>
              <span className="text-xs text-white/40">{Math.round(brightness * 100)}%</span>
            </div>
            <input
              type="range"
              className="kasi-slider"
              min="0.05"
              max="1"
              step="0.01"
              value={brightness}
              onChange={(e) => setBrightness(parseFloat(e.target.value))}
              aria-label="Brightness"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setShape(shape === 'circle' ? 'square' : 'circle')}
              className="text-xs uppercase tracking-widest px-3 py-2 border border-white/15 rounded text-white/80"
              aria-pressed={shape === 'square'}
            >
              {shape === 'circle' ? 'Circle' : 'Square'}
            </button>
            <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/60">
              <input
                type="checkbox"
                checked={pulse}
                onChange={(e) => setPulse(e.target.checked)}
                className="accent-white"
              />
              Pulse
            </label>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-white/10">
            <input
              type="number"
              min="1"
              max="180"
              value={timerMinutes}
              onChange={(e) => setTimerMinutes(Math.max(1, Math.min(180, parseInt(e.target.value || '1', 10))))}
              className="bg-transparent border border-white/15 rounded px-3 py-2 w-20 text-white text-center"
              aria-label="Timer minutes"
            />
            <span className="text-xs uppercase tracking-widest text-white/50">min</span>
            <button
              type="button"
              onClick={onStartTimer}
              className="ml-auto px-4 py-2 border border-white/30 rounded text-white text-sm uppercase tracking-widest"
            >
              Start
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
