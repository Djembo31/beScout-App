'use client';

import { useRef, useCallback, useEffect } from 'react';

interface UseTiltOptions {
  maxTilt?: number;   // max rotation degrees (default 15)
  scale?: number;     // hover scale (default 1.03)
  speed?: number;     // transition speed in ms (default 400)
  yOffset?: number;   // additional rotateY degrees (for card flip)
  perspective?: boolean; // include perspective() in transform (default true)
}

export function useTilt<T extends HTMLElement = HTMLDivElement>({
  maxTilt = 15,
  scale = 1.03,
  speed = 400,
  yOffset = 0,
  perspective = true,
}: UseTiltOptions = {}) {
  const ref = useRef<T>(null);
  const rafId = useRef<number>(0);
  const yOffsetRef = useRef(yOffset);

  // Keep ref in sync for use in callbacks without re-creating them
  yOffsetRef.current = yOffset;

  const buildTransform = useCallback((rotateX: number, rotateY: number, s: number) => {
    const totalY = rotateY + yOffsetRef.current;
    const p = perspective ? 'perspective(600px) ' : '';
    return `${p}rotateX(${rotateX}deg) rotateY(${totalY}deg) scale3d(${s},${s},${s})`;
  }, [perspective]);

  const applyTransform = useCallback((rotateX: number, rotateY: number, s: number, transition: string) => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = buildTransform(rotateX, rotateY, s);
    el.style.transition = transition;
  }, [buildTransform]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rY = ((x - centerX) / centerX) * maxTilt;
      const rX = ((centerY - y) / centerY) * maxTilt;
      applyTransform(rX, rY, scale, 'transform 100ms ease-out');
      // CSS vars for foil shimmer follow
      el.style.setProperty('--tilt-x', (x / rect.width).toFixed(3));
      el.style.setProperty('--tilt-y', (y / rect.height).toFixed(3));
    });
  }, [maxTilt, scale, applyTransform]);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    applyTransform(0, 0, 1, `transform ${speed}ms ease-out`);
    const el = ref.current;
    if (el) {
      el.style.setProperty('--tilt-x', '0.5');
      el.style.setProperty('--tilt-y', '0.5');
    }
  }, [speed, applyTransform]);

  // Smooth transition when yOffset changes (card flip)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = 'transform 600ms ease-in-out';
    el.style.transform = buildTransform(0, 0, 1);
  }, [yOffset, buildTransform]);

  const promoteLayer = useCallback(() => {
    const el = ref.current;
    if (el) el.style.willChange = 'transform';
  }, []);
  const demoteLayer = useCallback(() => {
    const el = ref.current;
    if (el) el.style.willChange = 'auto';
  }, []);

  // Gyroscope tilt for mobile devices
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(hover: hover)').matches) return;

    let promoted = false;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const beta = e.beta;
      const gamma = e.gamma;
      if (beta == null || gamma == null) return;

      if (!promoted) { promoted = true; promoteLayer(); }

      // Assume phone held at ~60° from horizontal
      const rX = Math.max(-maxTilt, Math.min(maxTilt, ((beta - 60) / 30) * maxTilt));
      const rY = Math.max(-maxTilt, Math.min(maxTilt, (gamma / 30) * maxTilt));

      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        applyTransform(rX, rY, 1, 'transform 200ms ease-out');
      });
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      if (promoted) demoteLayer();
    };
  }, [maxTilt, applyTransform, promoteLayer, demoteLayer]);

  const onMouseMove = useCallback((e: React.MouseEvent) => handleMove(e.clientX, e.clientY), [handleMove]);
  const onMouseEnter = useCallback(() => promoteLayer(), [promoteLayer]);
  const onMouseLeave = useCallback(() => { reset(); demoteLayer(); }, [reset, demoteLayer]);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) { promoteLayer(); handleMove(t.clientX, t.clientY); }
  }, [handleMove, promoteLayer]);
  const onTouchEnd = useCallback(() => { reset(); demoteLayer(); }, [reset, demoteLayer]);

  useEffect(() => {
    return () => cancelAnimationFrame(rafId.current);
  }, []);

  return {
    ref,
    tiltProps: {
      onMouseMove,
      onMouseEnter,
      onMouseLeave,
      onTouchMove,
      onTouchEnd,
      'data-tilt': 'true',
      style: {
        transform: buildTransform(0, 0, 1),
        transformStyle: 'preserve-3d' as const,
        '--tilt-x': '0.5',
        '--tilt-y': '0.5',
      } as React.CSSProperties,
    },
  };
}
