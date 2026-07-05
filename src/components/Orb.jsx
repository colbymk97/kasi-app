import { useRef } from 'react';
import { usePinchAndWheelResize } from '../hooks/usePinchAndWheelResize.js';
import FlameCanvas from './FlameCanvas.jsx';
import EmberCanvas from './EmberCanvas.jsx';

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

  let object;
  if (shape === 'flame') {
    object = <FlameCanvas size={size} brightness={brightness} />;
  } else if (shape === 'ember') {
    object = <EmberCanvas size={size} color={color} brightness={brightness} />;
  } else {
    object = (
      <div
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
    );
  }

  return (
    <div
      ref={targetRef}
      className="fixed inset-0 flex items-center justify-center touch-none"
      style={{ touchAction: 'none' }}
    >
      <div className={pulse ? 'kasi-pulse' : ''} style={{ willChange: 'transform' }}>
        {object}
      </div>
    </div>
  );
}
