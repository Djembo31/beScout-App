'use client';

import { useRef, useCallback, useEffect } from 'react';

interface UseTiltOptions {
  maxTilt?: number;   // max rotation degrees (default 15)
  scale?: number;     // hover scale (default 1.03)
  speed?: number;     // transition speed in ms (default 400)
}

export function useTilt<T extends HTMLElement = HTMLDivElement>({
  maxTilt = 15,
  scale = 1.03,
  speed = 400,
}: UseTiltOptions = {}) {
  const ref = useRef<T>(null);
  const rafId = useRef<number>(0);

  const applyTransform = useCallback((rotateX: number, rotateY: number, s: number, transition: string) => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${s},${s},${s})`;
    el.style.transition = transition;
  }, []);

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
    });
  }, [maxTilt, scale, applyTransform]);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    applyTransform(0, 0, 1, `transform ${speed}ms ease-out`);
  }, [speed, applyTransform]);

  const onMouseMove = useCallback((e: React.MouseEvent) => handleMove(e.clientX, e.clientY), [handleMove]);
  const onMouseLeave = useCallback(() => reset(), [reset]);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) handleMove(t.clientX, t.clientY);
  }, [handleMove]);
  const onTouchEnd = useCallback(() => reset(), [reset]);

  useEffect(() => {
    return () => cancelAnimationFrame(rafId.current);
  }, []);

  return {
    ref,
    tiltProps: {
      onMouseMove,
      onMouseLeave,
      onTouchMove,
      onTouchEnd,
      style: {
        transform: 'perspective(600px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)',
        transformStyle: 'preserve-3d' as const,
        willChange: 'transform',
      },
    },
  };
}
