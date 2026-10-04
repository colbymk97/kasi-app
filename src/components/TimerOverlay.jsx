import { useEffect, useRef } from 'react';
import { useAutoDismiss } from '../hooks/useAutoDismiss.js';

const REVEAL_MS = 4000;

// Runs the session clock without showing it: during practice the screen is
// nothing but the dot. A tap briefly reveals an End button.
export default function TimerOverlay({ endsAt, onComplete, onStop, revealed, onHide }) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let done = false;
    let timeout;
    const check = () => {
      if (done) return;
      const left = endsAt - Date.now();
      if (left <= 0) {
        done = true;
        onCompleteRef.current();
        return;
      }
      clearTimeout(timeout);
      timeout = setTimeout(check, Math.min(left, 60000));
    };
    // Timers can be throttled or paused while the page is hidden, so
    // re-check as soon as it comes back.
    const onVisible = () => document.visibilityState === 'visible' && check();
    check();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      done = true;
      clearTimeout(timeout);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [endsAt]);

  useAutoDismiss(revealed, REVEAL_MS, onHide);

  return (
    <div
      className="fixed z-10 transition-opacity duration-500"
      style={{
        right: 'max(env(safe-area-inset-right), 1rem)',
        bottom: 'max(env(safe-area-inset-bottom), 1rem)',
        opacity: revealed ? 1 : 0,
        pointerEvents: revealed ? 'auto' : 'none',
      }}
    >
      <button
        type="button"
        onClick={onStop}
        tabIndex={revealed ? 0 : -1}
        className="text-white/40 hover:text-white/80 text-xs uppercase tracking-widest px-3 py-2 border border-white/10 rounded"
        aria-label="End session"
      >
        End
      </button>
    </div>
  );
}
