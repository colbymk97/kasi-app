import { useEffect, useRef } from 'react';

// Drives a DPR-scaled canvas with requestAnimationFrame.
// draw(ctx, t, dt, width, height) receives seconds since page load, so
// animation phase stays continuous across canvas resizes.
export function useCanvasLoop(canvasRef, width, height, draw) {
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    let raf;
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      drawRef.current(ctx, now / 1000, dt, width, height);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [canvasRef, width, height]);
}
