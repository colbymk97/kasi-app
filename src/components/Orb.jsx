import { useRef } from 'react';
import { usePinchAndWheelResize } from '../hooks/usePinchAndWheelResize.js';

function Flame({ size, brightness, pulse }) {
  return (
    <div
      className={pulse ? 'kasi-pulse' : ''}
      style={{
        width: `${size * 0.62}px`,
        height: `${size}px`,
        opacity: brightness,
        willChange: 'transform, opacity',
      }}
    >
      <div
        className="kasi-flame-flicker"
        style={{
          width: '100%',
          height: '100%',
          filter: 'drop-shadow(0 0 24px rgba(255,140,40,0.55))',
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
