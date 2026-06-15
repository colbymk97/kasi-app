import { useEffect, useRef } from 'react';
import { usePinchAndWheelResize } from '../hooks/usePinchAndWheelResize.js';

// A single "drift" channel: smoothly travels toward an arbitrary random
// target over a random interval, then picks a new one. Smoothstep easing
// keeps the motion continuous (no jitter) while remaining non-repeating.
// An optional `spike` lets the channel occasionally jump to an extreme
// target — the random gusts and gutters that give a flame its life.
function makeChannel({ min, max, minDur, maxDur, spike }) {
  const rand = (a, b) => a + Math.random() * (b - a);
  let value = (min + max) / 2;
  let start = value;
  let target = rand(min, max);
  let elapsed = 0;
  let duration = rand(minDur, maxDur);
  return (dt) => {
    elapsed += dt;
    let k = elapsed / duration;
    if (k >= 1) {
      start = target;
      if (spike && Math.random() < spike.chance) {
        target = rand(spike.min, spike.max);
      } else {
        target = rand(min, max);
      }
      elapsed = 0;
      duration = rand(minDur, maxDur);
      k = 0;
    }
    const s = k * k * (3 - 2 * k); // smoothstep
    value = start + (target - start) * s;
    return value;
  };
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function Flame({ size, brightness, pulse }) {
  const swayRef = useRef(null);
  const tipRef = useRef(null);
  const glowRef = useRef(null);
  const brightnessRef = useRef(brightness);
  brightnessRef.current = brightness;

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;

    // Slow body motion, plus fast small flicker layered on top (octaves).
    const sway = makeChannel({ min: -5, max: 5, minDur: 0.6, maxDur: 1.8, spike: { chance: 0.12, min: -11, max: 11 } });
    const swayJitter = makeChannel({ min: -2.2, max: 2.2, minDur: 0.08, maxDur: 0.22 });
    const tipSway = makeChannel({ min: -7, max: 7, minDur: 0.25, maxDur: 0.7, spike: { chance: 0.1, min: -14, max: 14 } });
    const bodyHeight = makeChannel({ min: 0.9, max: 1.14, minDur: 0.4, maxDur: 1.1, spike: { chance: 0.08, min: 0.76, max: 0.84 } });
    const flickHeight = makeChannel({ min: -0.05, max: 0.05, minDur: 0.05, maxDur: 0.15 });
    const bodyWidth = makeChannel({ min: 0.95, max: 1.06, minDur: 0.5, maxDur: 1.3 });
    const bright = makeChannel({ min: 0.82, max: 1.0, minDur: 0.05, maxDur: 0.18, spike: { chance: 0.06, min: 0.48, max: 0.64 } });

    let raf;
    let last = performance.now();
    const tick = (now) => {
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.05) dt = 0.05; // clamp after tab inactivity

      const scaleY = bodyHeight(dt) + flickHeight(dt);
      // A taller flame narrows slightly — a loose nod to volume conservation.
      const scaleX = bodyWidth(dt) - 0.45 * (scaleY - 1);
      const deg = sway(dt) + swayJitter(dt);
      const tip = tipSway(dt);
      const b = bright(dt);

      if (swayRef.current) {
        swayRef.current.style.transform = `skewX(${deg}deg) scale(${scaleX}, ${scaleY})`;
      }
      if (tipRef.current) {
        tipRef.current.style.transform = `skewX(${tip}deg)`;
      }
      if (glowRef.current) {
        glowRef.current.style.opacity = String(brightnessRef.current * b);
        const blur = 14 + 16 * b;
        glowRef.current.style.filter = `drop-shadow(0 0 ${blur}px rgba(255,150,50,${0.35 + 0.35 * b}))`;
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={pulse ? 'kasi-pulse' : ''}
      style={{
        width: `${size * 0.62}px`,
        height: `${size}px`,
        willChange: 'transform',
      }}
    >
      <div
        ref={swayRef}
        style={{
          width: '100%',
          height: '100%',
          transformOrigin: '50% 100%',
          willChange: 'transform',
        }}
      >
        <div
          ref={glowRef}
          style={{
            width: '100%',
            height: '100%',
            opacity: brightness,
            filter: 'drop-shadow(0 0 22px rgba(255,150,50,0.55))',
            willChange: 'opacity, filter',
          }}
        >
          <div
            ref={tipRef}
            style={{
              width: '100%',
              height: '100%',
              transformOrigin: '50% 100%',
              willChange: 'transform',
            }}
          >
            <svg
              viewBox="0 0 100 150"
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden
            >
              <defs>
                <linearGradient id="kasiFlameBody" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#1e40af" />
                  <stop offset="12%" stopColor="#3b82f6" />
                  <stop offset="28%" stopColor="#f97316" />
                  <stop offset="55%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#fff7d6" />
                </linearGradient>
                <radialGradient id="kasiFlameCore" cx="50%" cy="70%" r="55%">
                  <stop offset="0%" stopColor="#fffdf5" stopOpacity="0.95" />
                  <stop offset="45%" stopColor="#fde68a" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
                </radialGradient>
              </defs>
              <path
                d="M50 4 C 60 34 82 56 74 96 C 69 122 60 138 50 142 C 40 138 31 122 26 96 C 18 56 40 34 50 4 Z"
                fill="url(#kasiFlameBody)"
              />
              <ellipse cx="50" cy="104" rx="15" ry="30" fill="url(#kasiFlameCore)" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Orb({
  size,
  setSize,
  color,
  brightness,
  pulse,
  shape,
  onTap,
  minSize,
  maxSize,
}) {
  const targetRef = useRef(null);
  const sizeRef = useRef(size);
  sizeRef.current = size;

  usePinchAndWheelResize({
    targetRef,
    getSize: () => sizeRef.current,
    setSize,
    minSize,
    maxSize,
    onTap,
  });

  return (
    <div
      ref={targetRef}
      className="fixed inset-0 flex items-center justify-center touch-none"
      style={{ touchAction: 'none' }}
    >
      {shape === 'flame' ? (
        <Flame size={size} brightness={brightness} pulse={pulse} />
      ) : (
        <div
          className={pulse ? 'kasi-pulse' : ''}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: color,
            opacity: brightness,
            borderRadius: shape === 'square' ? '12%' : '50%',
            transition: 'border-radius 250ms ease',
            willChange: 'transform, opacity',
          }}
        />
      )}
    </div>
  );
}
