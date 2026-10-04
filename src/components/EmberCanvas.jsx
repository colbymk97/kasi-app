import { useMemo, useRef } from 'react';
import { useCanvasLoop } from '../hooks/useCanvasLoop.js';
import { makeNoise1D } from '../lib/noise.js';
import { hexToRgb, mixRgb } from '../lib/colors.js';

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

const BREATH_PERIOD = 9; // seconds, close to a slow meditative breath
const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };
const rgba = ({ r, g, b }, a) => `rgba(${r},${g},${b},${a})`;

// A breathing disc of living light in the chosen kasina color: softly
// undulating edge, slow molten shimmer inside, and the occasional spark
// mote drifting through — alive, but never busy.
export default function EmberCanvas({ size, color, brightness }) {
  const canvasRef = useRef(null);
  const side = Math.round(size * 2.2);

  const palette = useMemo(() => {
    const c = hexToRgb(color);
    return {
      core: mixRgb(c, WHITE, 0.85),
      bright: mixRgb(c, WHITE, 0.4),
      mid: c,
      deep: mixRgb(c, BLACK, 0.42),
    };
  }, [color]);

  const state = useMemo(() => {
    const blobs = [];
    for (let i = 0; i < 7; i++) {
      blobs.push({
        nx: makeNoise1D(100 + i * 7),
        ny: makeNoise1D(200 + i * 13),
        nr: makeNoise1D(300 + i * 17),
      });
    }
    const harmonics = [];
    for (let k = 2; k <= 5; k++) {
      harmonics.push({
        k,
        amp: (0.016 / (k - 1) + 0.004) * 0.4,
        speed: (k % 2 ? 1 : -1) * (0.02 + 0.012 * k) * 2 * Math.PI,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return { blobs, harmonics, motes: [], nextMote: null };
  }, []);

  const draw = (ctx, t, dt, w, h) => {
    const R = size / 2;
    const cx = w / 2;
    const cy = h / 2;
    const tt = t * (prefersReducedMotion ? 0.5 : 1);
    const breath = 0.5 - 0.5 * Math.cos(((t % BREATH_PERIOD) / BREATH_PERIOD) * 2 * Math.PI);
    const lum = 0.86 + 0.14 * breath;
    const scale = 0.982 + 0.034 * breath;

    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = brightness;

    // Halo breathes with the body.
    const halo = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, R * (1.9 + 0.3 * breath));
    halo.addColorStop(0, rgba(palette.mid, 0.34 * lum));
    halo.addColorStop(0.45, rgba(palette.mid, 0.13 * lum));
    halo.addColorStop(1, rgba(palette.mid, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // Living edge: a few slow-drifting low harmonics keep the circle
    // organic without ever reading as wobbly.
    ctx.beginPath();
    const STEPS = 96;
    for (let i = 0; i <= STEPS; i++) {
      const a = (i / STEPS) * Math.PI * 2;
      let r = 1;
      for (const hm of state.harmonics) {
        r += hm.amp * Math.sin(hm.k * a + hm.phase + tt * hm.speed);
      }
      const x = Math.cos(a) * R * r;
      const y = Math.sin(a) * R * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    const body = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    body.addColorStop(0, rgba(palette.core, 0.92 + 0.08 * breath));
    body.addColorStop(0.24, rgba(palette.bright, 0.96));
    body.addColorStop(0.62, rgba(palette.mid, 0.96));
    body.addColorStop(1, rgba(palette.deep, 0.92));
    ctx.fillStyle = body;
    ctx.fill();
    ctx.clip();

    // Molten shimmer: soft pockets of brighter light drifting inside.
    ctx.globalCompositeOperation = 'lighter';
    state.blobs.forEach((bl, i) => {
      const bx = bl.nx(tt * 0.06 + i * 11) * R * 0.55;
      const by = bl.ny(tt * 0.055 + i * 17) * R * 0.55;
      const br = R * (0.34 + 0.16 * bl.nr(tt * 0.05));
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      g.addColorStop(0, rgba(palette.bright, 0.085 * lum));
      g.addColorStop(1, rgba(palette.bright, 0));
      ctx.fillStyle = g;
      ctx.fillRect(bx - br, by - br, br * 2, br * 2);
    });
    ctx.globalCompositeOperation = 'source-over';

    // Spark motes: rare, tiny, and slow — a quiet reward for sustained
    // attention rather than a spectacle.
    if (!prefersReducedMotion) {
      if (state.nextMote === null) state.nextMote = t + 3 + Math.random() * 5;
      if (t >= state.nextMote && state.motes.length < 2) {
        const a = Math.random() * Math.PI * 2;
        const d = R * (0.1 + Math.random() * 0.3);
        state.motes.push({
          x: Math.cos(a) * d,
          y: Math.sin(a) * d,
          vx: (Math.random() - 0.5) * R * 0.03,
          vy: -R * (0.03 + Math.random() * 0.03),
          born: t,
          life: 4.5 + Math.random() * 2,
        });
        state.nextMote = t + 6 + Math.random() * 8;
      }
      state.motes = state.motes.filter((m) => t - m.born < m.life);
      for (const m of state.motes) {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        const u = (t - m.born) / m.life;
        const alpha = Math.sin(u * Math.PI) * 0.6;
        const mr = R * 0.05;
        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, mr);
        g.addColorStop(0, rgba(palette.core, alpha));
        g.addColorStop(1, rgba(palette.core, 0));
        ctx.fillStyle = g;
        ctx.fillRect(m.x - mr, m.y - mr, mr * 2, mr * 2);
      }
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  };

  useCanvasLoop(canvasRef, side, side, draw);

  return <canvas ref={canvasRef} style={{ width: side, height: side, display: 'block' }} aria-hidden />;
}
