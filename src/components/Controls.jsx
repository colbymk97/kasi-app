import { useEffect, useState } from 'react';
import { useAutoDismiss } from '../hooks/useAutoDismiss.js';
import { KASINA_PRESETS } from '../lib/colors.js';

const AUTO_DISMISS_MS = 5000;
const IOS_HINT_KEY = 'kasi:hint:ios-install:dismissed';

const MIN_MINUTES = 1;
const MAX_MINUTES = 180;

const SHAPE_OPTIONS = [
  { id: 'circle', label: 'Circle' },
  { id: 'square', label: 'Square' },
  { id: 'flame', label: 'Flame' },
  { id: 'ember', label: 'Ember' },
];

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
  fullscreen,
}) {
  useAutoDismiss(visible, AUTO_DISMISS_MS, onDismiss);
  const [minutesText, setMinutesText] = useState(String(timerMinutes));
  useEffect(() => {
    setMinutesText(String(timerMinutes));
  }, [timerMinutes]);
  const [iosHintDismissed, setIosHintDismissed] = useState(() => {
    try {
      return localStorage.getItem(IOS_HINT_KEY) === '1';
    } catch {
      return false;
    }
  });

  if (!visible) return null;

  const stop = (e) => e.stopPropagation();

  const dismissIosHint = () => {
    try {
      localStorage.setItem(IOS_HINT_KEY, '1');
    } catch {
      /* ignore */
    }
    setIosHintDismissed(true);
  };

  const showFullscreenButton =
    fullscreen && fullscreen.isSupported && !fullscreen.isStandalone;
  const showIosHint =
    fullscreen &&
    !fullscreen.isStandalone &&
    !fullscreen.isSupported &&
    fullscreen.isIOS &&
    !iosHintDismissed;

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

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {SHAPE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setShape(opt.id)}
                  className="text-xs uppercase tracking-widest px-3 py-2 border rounded"
                  style={{
                    borderColor: shape === opt.id ? '#fff' : 'rgba(255,255,255,0.15)',
                    color: shape === opt.id ? '#fff' : 'rgba(255,255,255,0.6)',
                  }}
                  aria-pressed={shape === opt.id}
                >
                  {opt.label}
                </button>
              ))}
            </div>
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

          {showFullscreenButton && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs uppercase tracking-widest text-white/50">View</span>
              <button
                type="button"
                onClick={() => fullscreen.toggle()}
                className="text-xs uppercase tracking-widest px-3 py-2 border border-white/15 rounded text-white/80"
                aria-pressed={fullscreen.isFullscreen}
              >
                {fullscreen.isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              </button>
            </div>
          )}

          {showIosHint && (
            <div className="flex items-start gap-3 text-xs text-white/55 border border-white/10 rounded p-3">
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                aria-hidden
                className="mt-0.5 shrink-0 fill-none stroke-white/55"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3v12" />
                <path d="M8 7l4-4 4 4" />
                <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
              </svg>
              <span className="flex-1 leading-snug">
                For full-screen on iPhone, tap Share then{' '}
                <span className="text-white/80">Add to Home Screen</span>.
              </span>
              <button
                type="button"
                onClick={dismissIosHint}
                className="text-white/40 hover:text-white/80 uppercase tracking-widest"
                aria-label="Dismiss hint"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2 border-t border-white/10">
            <input
              type="number"
              inputMode="numeric"
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              value={minutesText}
              onChange={(e) => {
                const next = e.target.value;
                setMinutesText(next);
                const parsed = parseInt(next, 10);
                if (!Number.isNaN(parsed)) {
                  setTimerMinutes(Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, parsed)));
                }
              }}
              onBlur={() => {
                const parsed = parseInt(minutesText, 10);
                const clamped = Number.isNaN(parsed)
                  ? MIN_MINUTES
                  : Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, parsed));
                setTimerMinutes(clamped);
                setMinutesText(String(clamped));
              }}
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
