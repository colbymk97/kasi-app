import { useRef } from 'react';
import { usePinchAndWheelResize } from '../hooks/usePinchAndWheelResize.js';

export default function Orb({ size, setSize, color, brightness, pulse, onTap, minSize, maxSize }) {
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
      <div className={pulse ? 'kasi-pulse' : ''} style={{ willChange: 'transform' }}>
        <div
          style={{
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: color,
            opacity: brightness,
            borderRadius: '50%',
            willChange: 'transform, opacity',
          }}
        />
      </div>
    </div>
  );
}
