import { useEffect, useRef, useState } from 'react';

export function useCountdown(endsAt, onComplete) {
  const [remaining, setRemaining] = useState(() =>
    endsAt ? Math.max(0, endsAt - Date.now()) : 0
  );
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    completedRef.current = false;
    if (!endsAt) {
      setRemaining(0);
      return;
    }

    let raf = 0;
    const tick = () => {
      const left = Math.max(0, endsAt - Date.now());
      setRemaining(left);
      if (left <= 0) {
        if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current && onCompleteRef.current();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [endsAt]);

  return remaining;
}
