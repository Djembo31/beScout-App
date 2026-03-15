import { useRef, useState, useEffect } from 'react';

/**
 * Returns the `anim-num-up` class for a brief tick animation whenever
 * `value` changes (and is not the initial render).
 *
 * Usage:
 *   const tickClass = useNumTick(someNumber);
 *   <span className={tickClass}>...</span>
 */
export function useNumTick(value: number | null | undefined): string {
  const prevRef = useRef(value);
  const [ticking, setTicking] = useState(false);

  useEffect(() => {
    if (prevRef.current !== value && prevRef.current !== undefined && value !== undefined) {
      setTicking(true);
      const timer = setTimeout(() => setTicking(false), 300);
      return () => clearTimeout(timer);
    }
    prevRef.current = value;
  }, [value]);

  // Update prevRef after effect runs
  useEffect(() => {
    prevRef.current = value;
  });

  return ticking ? 'anim-num-up' : '';
}
