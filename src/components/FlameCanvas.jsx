import { useMemo, useRef } from 'react';
import { useCanvasLoop } from '../hooks/useCanvasLoop.js';
import { makeFractalNoise1D, makeNoise1D } from '../lib/noise.js';

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

// Teardrop half-width profile along the flame, 0 = base, 1 = tip.
// A single smooth curve: rounded belly low down, sides that bow out
// and then sweep into the tip without corners.
function widthProfile(s) {
  return Math.pow(Math.sin(Math.PI * (0.2 + 0.8 * s)), 1.25);
}

// Traces a closed flame outline around a spine bending toward (tipX, tipY).
function traceFlame(ctx, tipX, tipY, halfWidth, edgeWobble) {
  const N = 36;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const inv = 1 - s;
    const px = 2 * inv * s * (tipX * 0.22) + s * s * tipX;
    const py = 2 * inv * s * (tipY * 0.5) + s * s * tipY;
    const hw = halfWidth * widthProfile(s) * edgeWobble(s);
    pts.push([px, py, hw]);
  }
  ctx.beginPath();
  ctx.moveTo(pts[0][0] - pts[0][2], pts[0][1]);
  for (let i = 1; i <= N; i++) ctx.lineTo(pts[i][0] - pts[i][2], pts[i][1]);
  for (let i = N; i >= 0; i--) ctx.lineTo(pts[i][0] + pts[i][2], pts[i][1]);
  ctx.quadraticCurveTo(0, pts[0][2] * 0.9, pts[0][0] - pts[0][2], pts[0][1]);
  ctx.closePath();
}

export default function FlameCanvas({ size, brightness }) {
  const canvasRef = useRef(null);
  const width = Math.round(size * 1.9);
  const height = Math.round(size * 1.9);

  const state = useMemo(
    () => ({
      sway: makeFractalNoise1D(11, 3),
      swayFast: makeNoise1D(23),
      lick: makeNoise1D(37),
      lift: makeNoise1D(47),
      edgeL: makeNoise1D(51),
      edgeR: makeNoise1D(67),
      nextGust: null,
      gustStart: -10,
      gustLen: 1,
      gustStrength: 0,
    }),
    []
  );

  const draw = (ctx, t, dt, w, h) => {
    const s = state;
    const tt = t * (prefersReducedMotion ? 0.45 : 1);

    // Occasional brief "gusts" break the loop feel: the flame leans,
    // quivers and dims a touch, then settles again.
    if (!prefersReducedMotion) {
      if (s.nextGust === null) s.nextGust = t + 2 + Math.random() * 4;
      if (t >= s.nextGust) {
        s.gustStart = t;
        s.gustLen = 0.45 + Math.random() * 0.55;
        s.gustStrength = 0.4 + Math.random() * 0.6;
        s.nextGust = t + 3.5 + Math.random() * 6.5;
      }
    }
    const gp = (t - s.gustStart) / s.gustLen;
    const gust = gp > 0 && gp < 1 ? Math.sin(gp * Math.PI) * s.gustStrength : 0;

    const H = size * 0.96;
    const W = size * 0.27;
    const bx = w / 2;
    const by = h / 2 + H * 0.5;

    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = brightness;

    const tipX =
      W *
      (0.38 + 0.85 * gust) *
      (0.7 * s.sway(tt * 0.5) + 0.3 * s.swayFast(tt * (1.6 + 2.5 * gust) + 7));
    const tipY =
      -H * (0.95 + 0.04 * s.lift(tt * 0.7) + 0.11 * gust * s.swayFast(tt * 6 + 40));

    const breath = 0.5 + 0.5 * Math.sin(t * ((2 * Math.PI) / 7.3));
    const glow = (0.86 + 0.14 * breath) * (1 - 0.22 * gust);

    // Ambient halo — the pool of light the flame casts.
    const hx = bx + tipX * 0.3;
    const hy = by - H * 0.42;
    const halo = ctx.createRadialGradient(hx, hy, 0, hx, hy, size * (0.92 + 0.06 * breath));
    halo.addColorStop(0, `rgba(255,150,45,${0.3 * glow})`);
    halo.addColorStop(0.4, `rgba(255,115,25,${0.13 * glow})`);
    halo.addColorStop(1, 'rgba(255,100,15,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(bx, by);

    // Flame body.
    traceFlame(
      ctx,
      tipX,
      tipY,
      W,
      (p) => 1 + 0.05 * s.edgeL(p * 2.6 + tt * 1.8) + 0.07 * gust * s.edgeR(p * 5 + tt * 8)
    );
    const body = ctx.createLinearGradient(0, W * 0.35, 0, tipY);
    body.addColorStop(0, '#1d3fae');
    body.addColorStop(0.08, '#3f6fe8');
    body.addColorStop(0.18, '#f2620e');
    body.addColorStop(0.42, '#fdba2d');
    body.addColorStop(0.72, '#ffd968');
    body.addColorStop(1, '#ffefb5');
    ctx.fillStyle = body;
    ctx.fill();
    ctx.clip();

    // Soft inner luminance: stacked glows along the spine. They sway a
    // little more than the body, which reads as an inner tongue without
    // any hard edges.
    const lickOff = W * 0.4 * s.lick(tt * 2.1);
    const glows = [
      { p: 0.22, r: W * 1.05, a: 0.9, c: '255,250,228' },
      { p: 0.45, r: W * 0.8, a: 0.55, c: '255,241,190' },
      { p: 0.66, r: W * 0.55, a: 0.4, c: '255,236,180' },
    ];
    for (const gl of glows) {
      const inv = 1 - gl.p;
      let gx = 2 * inv * gl.p * (tipX * 0.22) + gl.p * gl.p * tipX;
      const gy = 2 * inv * gl.p * (tipY * 0.5) + gl.p * gl.p * tipY;
      gx += lickOff * Math.pow(gl.p, 1.5);
      const gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gl.r);
      gg.addColorStop(0, `rgba(${gl.c},${gl.a})`);
      gg.addColorStop(1, `rgba(${gl.c},0)`);
      ctx.fillStyle = gg;
      ctx.fillRect(gx - gl.r, gy - gl.r, gl.r * 2, gl.r * 2);
    }

    // Blue combustion zone hugging the base.
    ctx.translate(0, -H * 0.04);
    ctx.scale(1, 0.42);
    const base = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.7);
    base.addColorStop(0, 'rgba(90,150,255,0.8)');
    base.addColorStop(0.55, 'rgba(60,110,240,0.32)');
    base.addColorStop(1, 'rgba(60,110,240,0)');
    ctx.fillStyle = base;
    ctx.fillRect(-W, -W, W * 2, W * 2);

    ctx.restore();
    ctx.globalAlpha = 1;
  };

  useCanvasLoop(canvasRef, width, height, draw);

  return <canvas ref={canvasRef} style={{ width, height, display: 'block' }} aria-hidden />;
}
