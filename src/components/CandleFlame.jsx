import { useEffect, useMemo, useRef, useState } from 'react';
import { makeFractalNoise1D, makeNoise1D } from '../lib/noise.js';

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

// Canvas is CANVAS_SCALE × size on each side; the flame is FLAME_SCALE × size
// tall. Its base sits a little below center so the luminous body of the flame
// — where the eye rests — lands in the middle of the screen.
const CANVAS_SCALE = 2.2;
const FLAME_SCALE = 0.8;
const BASE_FROM_CENTER = 0.42; // in flame heights

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

// Everything is computed per pixel in flame-height units with the origin at
// the base of the flame (top of the wick), y pointing up.
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform vec2 uBase;
uniform float uH;
uniform float uTime;
uniform float uSway;
uniform float uLift;
uniform float uFlick;
uniform float uGust;
uniform float uBright;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + 17.0;
    a *= 0.5;
  }
  return v;
}

vec3 flame(vec2 p) {
  float s = p.y / uLift;
  if (s < -0.25 || s > 1.35 || abs(p.x) > 0.6) return vec3(0.0);
  float sc = clamp(s, 0.0, 1.0);

  // The column leans with the sway, increasingly toward the tip; rising
  // turbulence ripples the upper flame while the base stays anchored.
  float bend = uSway * sc * sc;
  float n1 = fbm(vec2(p.x * 3.5, p.y * 2.6 - uTime * 1.9));
  float n2 = noise(vec2(p.x * 8.0 + 3.0, p.y * 5.5 - uTime * 4.2));
  float turb = (n1 - 0.5) * 0.11 * sc * sc + (n2 - 0.5) * 0.035 * sc * (0.6 + 2.0 * uGust);
  float x = p.x - bend - turb;

  // Teardrop: rounded belly low down, long taper to a point.
  float w = 0.12 * 2.9 * sqrt(sc) * pow(1.0 - sc, 1.35) + 1e-4;
  float e = abs(x) - w;
  if (s < 0.0) e = length(vec2(x, p.y));
  if (s > 1.0) e = length(vec2(x, p.y - uLift));

  // Edges are crisp at the base and dissolve toward the tip.
  float soft = 0.006 + 0.05 * sc * sc;
  float body = 1.0 - smoothstep(-soft, soft, e);
  float r = clamp(abs(x) / w, 0.0, 1.0);

  vec3 orange = vec3(1.0, 0.42, 0.07);
  vec3 yellow = vec3(1.0, 0.74, 0.28);
  vec3 core = vec3(1.0, 0.93, 0.74);

  vec3 col = mix(orange, yellow, 1.0 - smoothstep(0.55, 1.0, r));
  float coreMask = (1.0 - smoothstep(0.1, 0.62, r))
                 * smoothstep(0.1, 0.3, s)
                 * (1.0 - smoothstep(0.4, 0.85, s));
  col = mix(col, core, coreMask);
  // Tip cools to orange and thins out.
  col = mix(col, orange, smoothstep(0.62, 1.0, s) * 0.7);
  float lum = 1.0 - 0.55 * smoothstep(0.55, 1.05, s);

  // Non-luminous zone around the wick: darker and translucent.
  float dark = (1.0 - smoothstep(0.02, 0.24, s)) * (1.0 - smoothstep(0.15, 0.75, r));
  lum *= 1.0 - 0.75 * dark;

  // Blue combustion skirt at the bottom edge.
  float blue = (1.0 - smoothstep(0.0, 0.2, s)) * smoothstep(0.25, 0.95, r);
  col = mix(col, vec3(0.28, 0.45, 1.0), blue);
  lum = mix(lum, 0.55, blue);

  return col * body * lum * 1.45 * uFlick;
}

vec3 wick(vec2 p, out float mask) {
  float wx = 0.012 * smoothstep(-0.05, 0.075, p.y);
  float d = abs(p.x - wx);
  mask = (1.0 - smoothstep(0.006, 0.011, d))
       * smoothstep(-0.13, -0.11, p.y)
       * (1.0 - smoothstep(0.065, 0.08, p.y));
  float ember = smoothstep(0.03, 0.075, p.y);
  return mix(vec3(0.035, 0.022, 0.015), vec3(1.0, 0.3, 0.06) * 0.9, ember);
}

vec3 candle(vec2 p, out float mask) {
  float R = 0.22;
  float top = -0.11;
  float capR = R * 0.17;
  float edge = 0.004;
  float side = 1.0 - smoothstep(R - edge, R + edge, abs(p.x));
  float below = 1.0 - smoothstep(top - edge, top + edge, p.y);
  vec2 q = vec2(p.x / R, (p.y - top) / capR);
  float cap = 1.0 - smoothstep(1.0 - 0.03, 1.0 + 0.03, length(q));
  mask = max(side * below, cap);
  if (mask <= 0.0) return vec3(0.0);

  // Wax is lit from the flame above and glows from within near the top,
  // falling into darkness further down.
  float nx = clamp(p.x / R, -1.0, 1.0);
  float wrap = sqrt(1.0 - nx * nx);
  float fall = exp((min(p.y, top) - top) * 5.0);
  vec3 wax = vec3(0.95, 0.78, 0.58);
  vec3 col = wax * (0.08 + 0.42 * wrap) * fall * 0.7;
  float sss = exp((min(p.y, top) - top) * 14.0) * (0.55 + 0.45 * wrap);
  col += vec3(1.0, 0.55, 0.22) * sss * 0.35;

  // Molten pool and translucent rim on the top face.
  float inPool = 1.0 - smoothstep(0.8, 0.98, length(q));
  float onTop = step(top, p.y) * cap;
  col = mix(col, vec3(1.0, 0.62, 0.3) * 0.42, onTop * inPool);
  float rim = smoothstep(0.8, 0.97, length(q)) * cap;
  col += vec3(1.0, 0.75, 0.45) * rim * 0.28;
  return col;
}

void main() {
  vec2 p = (gl_FragCoord.xy - uBase) / uH;

  vec3 col = vec3(0.0);

  // Wax first (furthest back), then the wick, then light on top.
  float cMask;
  vec3 c = candle(p, cMask);
  col = mix(col, c * uFlick, cMask);

  float wMask;
  vec3 wk = wick(p, wMask);
  col = mix(col, wk, wMask);

  col += flame(p);

  // Glow the flame throws into the dark around it.
  vec2 g = (p - vec2(uSway * 0.3, 0.4)) * vec2(1.0, 0.62);
  float dist = length(g);
  float halo = 0.3 * exp(-dist * 5.5) + 0.07 * exp(-dist * 2.6) * (1.0 - smoothstep(0.5, 0.95, dist));
  col += vec3(1.0, 0.5, 0.15) * halo * uFlick;

  // Fade to pure black well before the canvas edge so it never reads as a box.
  vec2 uv = gl_FragCoord.xy / uRes - 0.5;
  col *= 1.0 - smoothstep(0.3, 0.48, length(uv));

  col = 1.0 - exp(-col * 1.25);
  gl_FragColor = vec4(col * uBright, 1.0);
}
`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(log);
  }
  return sh;
}

function setup(gl) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = {};
  for (const name of ['uRes', 'uBase', 'uH', 'uTime', 'uSway', 'uLift', 'uFlick', 'uGust', 'uBright']) {
    u[name] = gl.getUniformLocation(prog, name);
  }
  return u;
}

// A candle flame rendered per pixel on the GPU: soft luminous body, dark
// zone and blue skirt at the base, a glowing wick, and a wax pillar lit
// from above. Motion is a slow wandering sway with the occasional gust.
export default function CandleFlame({ size, brightness }) {
  const canvasRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const side = Math.round(size * CANVAS_SCALE);

  const live = useRef({ side, size, brightness });
  live.current = { side, size, brightness };

  const motion = useMemo(
    () => ({
      sway: makeFractalNoise1D(11, 3),
      swayFast: makeNoise1D(23),
      lift: makeNoise1D(47),
      flick: makeNoise1D(59),
      shudder: makeNoise1D(71),
      nextGust: null,
      gustStart: -10,
      gustLen: 1,
      gustStrength: 0,
    }),
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) {
      setFailed(true);
      return undefined;
    }

    let u;
    try {
      u = setup(gl);
    } catch {
      setFailed(true);
      return undefined;
    }

    // Everything here is soft light, so rendering above 1.5x DPR costs GPU
    // time without a visible difference.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let raf = 0;
    let lost = false;
    const m = motion;

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (lost) return;
      const t = now / 1000;
      const tt = t * (prefersReducedMotion ? 0.4 : 1);
      const { side: cssSide, size: cssSize, brightness: b } = live.current;

      const px = Math.max(1, Math.round(cssSide * dpr));
      if (canvas.width !== px || canvas.height !== px) {
        canvas.width = px;
        canvas.height = px;
      }
      gl.viewport(0, 0, px, px);

      if (!prefersReducedMotion) {
        if (m.nextGust === null) m.nextGust = t + 4 + Math.random() * 6;
        if (t >= m.nextGust) {
          m.gustStart = t;
          m.gustLen = 0.6 + Math.random() * 0.8;
          m.gustStrength = 0.35 + Math.random() * 0.55;
          m.nextGust = t + 6 + Math.random() * 10;
        }
      }
      const gp = (t - m.gustStart) / m.gustLen;
      const gust = gp > 0 && gp < 1 ? Math.sin(gp * Math.PI) * m.gustStrength : 0;

      const sway =
        0.045 * (0.75 * m.sway(tt * 0.32) + 0.25 * m.swayFast(tt * 1.1 + 7)) +
        0.09 * gust * m.shudder(tt * 6);
      const lift = 1 + 0.025 * m.lift(tt * 0.6) + 0.07 * gust * m.shudder(tt * 8 + 30);
      const flick = 1 - 0.12 * gust + 0.025 * m.flick(tt * 2.3);

      const H = cssSize * FLAME_SCALE * dpr;
      gl.uniform2f(u.uRes, px, px);
      gl.uniform2f(u.uBase, px / 2, px / 2 - BASE_FROM_CENTER * H);
      gl.uniform1f(u.uH, H);
      gl.uniform1f(u.uTime, tt);
      gl.uniform1f(u.uSway, sway);
      gl.uniform1f(u.uLift, lift);
      gl.uniform1f(u.uFlick, flick);
      gl.uniform1f(u.uGust, gust);
      gl.uniform1f(u.uBright, b);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const onLost = (e) => {
      e.preventDefault();
      lost = true;
    };
    const onRestored = () => {
      try {
        u = setup(gl);
        lost = false;
      } catch {
        setFailed(true);
      }
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
    };
  }, [motion]);

  if (failed) {
    // No WebGL: a still, soft flame so the object never disappears.
    const H = size * FLAME_SCALE;
    return (
      <div style={{ width: side, height: side, position: 'relative', opacity: brightness }} aria-hidden>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: side / 2 - H * (1 - BASE_FROM_CENTER),
            width: H * 0.36,
            height: H,
            transform: 'translateX(-50%)',
            borderRadius: '50% 50% 50% 50% / 75% 75% 25% 25%',
            background:
              'radial-gradient(ellipse 50% 45% at 50% 68%, #fff4d6 0%, #ffc04a 45%, #f26a12 80%, rgba(242,106,18,0) 100%)',
            filter: 'blur(1.5px)',
            boxShadow: '0 0 60px 20px rgba(255,130,40,0.25)',
          }}
        />
      </div>
    );
  }

  return <canvas ref={canvasRef} style={{ width: side, height: side, display: 'block' }} aria-hidden />;
}
