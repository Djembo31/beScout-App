'use client';

import { useEffect, useRef, useState } from 'react';

export function useScrollReveal(options?: { threshold?: number; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (options?.delay) {
            setTimeout(() => setRevealed(true), options.delay);
          } else {
            setRevealed(true);
          }
          observer.disconnect();
        }
      },
      { threshold: options?.threshold ?? 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [options?.threshold, options?.delay]);

  return { ref, revealed };
}
