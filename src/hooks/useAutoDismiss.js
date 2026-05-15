import { useEffect, useRef } from 'react';

export function useAutoDismiss(active, delayMs, onDismiss) {
  const timerRef = useRef(null);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!active) return;

    const arm = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onDismissRef.current && onDismissRef.current();
      }, delayMs);
    };

    arm();

    const reset = () => arm();
    window.addEventListener('pointerdown', reset);
    window.addEventListener('pointermove', reset);
    window.addEventListener('keydown', reset);
    window.addEventListener('wheel', reset, { passive: true });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('pointerdown', reset);
      window.removeEventListener('pointermove', reset);
      window.removeEventListener('keydown', reset);
      window.removeEventListener('wheel', reset);
    };
  }, [active, delayMs]);
}
