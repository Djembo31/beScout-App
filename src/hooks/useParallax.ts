'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Parallax scroll effect for hero banners.
 * Returns a ref to attach to the parallax container and the current Y offset.
 *
 * - Uses IntersectionObserver to only track scroll when visible
 * - Uses requestAnimationFrame for smooth 60fps updates
 * - Disabled on mobile (touch devices) for iOS compatibility + perf
 * - Respects prefers-reduced-motion
 */
export function useParallax(factor = 0.35) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const isVisible = useRef(false);
  const rafId = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Skip on mobile (touch-primary devices) — iOS breaks background-attachment: fixed
    // and JS parallax on mobile causes jank
    const isTouchDevice = window.matchMedia('(hover: none)').matches;
    if (isTouchDevice) return;

    // Respect reduced motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible.current = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    observer.observe(el);

    const handleScroll = () => {
      if (!isVisible.current) return;
      if (rafId.current) return; // already scheduled

      rafId.current = requestAnimationFrame(() => {
        rafId.current = 0;
        const rect = el.getBoundingClientRect();
        // How far the element top is from viewport top (positive = below viewport top)
        const scrolled = -rect.top;
        setOffset(Math.round(scrolled * factor));
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [factor]);

  return { containerRef, offset };
}
