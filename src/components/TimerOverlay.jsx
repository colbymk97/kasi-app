import { useCountdown } from '../hooks/useCountdown.js';
import { formatMs } from '../lib/formatDuration.js';

export default function TimerOverlay({ endsAt, onComplete, onStop }) {
  const remaining = useCountdown(endsAt, onComplete);

  return (
    <>
      <div
        className="fixed left-0 right-0 z-10 flex justify-center pointer-events-none"
        style={{ top: 'max(env(safe-area-inset-top), 1rem)' }}
      >
        <span className="text-white/60 text-sm tabular-nums tracking-widest">
          {formatMs(remaining)}
        </span>
      </div>
      <div
        className="fixed z-10"
        style={{
          right: 'max(env(safe-area-inset-right), 1rem)',
          bottom: 'max(env(safe-area-inset-bottom), 1rem)',
        }}
      >
        <button
          type="button"
          onClick={onStop}
          className="text-white/40 hover:text-white/80 text-xs uppercase tracking-widest px-3 py-2 border border-white/10 rounded pointer-events-auto"
          aria-label="Stop session"
        >
          Stop
        </button>
      </div>
    </>
  );
}
