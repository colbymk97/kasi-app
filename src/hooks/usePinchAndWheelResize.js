import { useEffect, useRef } from 'react';

const TAP_MAX_DISTANCE = 10;
const TAP_MAX_DURATION_MS = 300;

export function usePinchAndWheelResize({
  targetRef,
  getSize,
  setSize,
  minSize,
  maxSize,
  onTap,
}) {
  const stateRef = useRef({
    pointers: new Map(),
    startDistance: 0,
    startSize: 0,
    singlePointerStart: null,
  });

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const state = stateRef.current;

    const clamp = (n) => Math.max(minSize, Math.min(maxSize, n));

    const distanceBetween = (a, b) => {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return Math.hypot(dx, dy);
    };

    const onPointerDown = (e) => {
      el.setPointerCapture?.(e.pointerId);
      state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (state.pointers.size === 1) {
        state.singlePointerStart = {
          x: e.clientX,
          y: e.clientY,
          t: performance.now(),
          pointerId: e.pointerId,
        };
      } else {
        state.singlePointerStart = null;
        if (state.pointers.size === 2) {
          const pts = [...state.pointers.values()];
          state.startDistance = distanceBetween(pts[0], pts[1]);
          state.startSize = getSize();
        }
      }
    };

    const onPointerMove = (e) => {
      if (!state.pointers.has(e.pointerId)) return;
      state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (state.singlePointerStart && state.singlePointerStart.pointerId === e.pointerId) {
        const dx = e.clientX - state.singlePointerStart.x;
        const dy = e.clientY - state.singlePointerStart.y;
        if (Math.hypot(dx, dy) > TAP_MAX_DISTANCE) {
          state.singlePointerStart = null;
        }
      }

      if (state.pointers.size >= 2 && state.startDistance > 0) {
        const pts = [...state.pointers.values()].slice(0, 2);
        const dist = distanceBetween(pts[0], pts[1]);
        const ratio = dist / state.startDistance;
        setSize(clamp(state.startSize * ratio));
      }
    };

    const finishPointer = (e) => {
      const had = state.pointers.delete(e.pointerId);
      if (!had) return;

      if (
        state.singlePointerStart &&
        state.singlePointerStart.pointerId === e.pointerId &&
        state.pointers.size === 0
      ) {
        const elapsed = performance.now() - state.singlePointerStart.t;
        if (elapsed <= TAP_MAX_DURATION_MS) {
          onTap && onTap();
        }
        state.singlePointerStart = null;
      }

      if (state.pointers.size < 2) {
        state.startDistance = 0;
      }
    };

    const onPointerUp = (e) => finishPointer(e);
    const onPointerCancel = (e) => finishPointer(e);

    const onWheel = (e) => {
      e.preventDefault();
      const size = getSize();
      const delta = -e.deltaY;
      const factor = e.ctrlKey ? 0.01 : 0.0025;
      setSize(clamp(size + size * delta * factor));
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerCancel);
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerCancel);
      el.removeEventListener('wheel', onWheel);
    };
  }, [targetRef, getSize, setSize, minSize, maxSize, onTap]);
}
