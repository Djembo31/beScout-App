'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Global keyboard shortcuts.
 * G+H=Home, G+M=Market, G+F=Fantasy, G+C=Community, G+P=Profile.
 * ?=Shortcuts overlay.
 */
export function useKeyboardShortcuts(onShowShortcuts: () => void) {
  const router = useRouter();
  const pendingG = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPending = useCallback(() => {
    pendingG.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Ignore if user is typing in an input/textarea/contenteditable
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      // ? key → show shortcuts
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onShowShortcuts();
        clearPending();
        return;
      }

      // Escape → close modals (handled by modals themselves, but clear pending G)
      if (e.key === 'Escape') {
        clearPending();
        return;
      }

      // G-sequence: first press G, then within 800ms press destination key
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (pendingG.current) {
          // Double-G cancels the sequence
          clearPending();
          return;
        }
        pendingG.current = true;
        timerRef.current = setTimeout(clearPending, 800);
        return;
      }

      if (pendingG.current) {
        clearPending();
        const routes: Record<string, string> = {
          h: '/',
          m: '/market',
          f: '/fantasy',
          c: '/community',
          p: '/profile',
        };
        const route = routes[e.key.toLowerCase()];
        if (route) {
          e.preventDefault();
          router.push(route);
        }
      }
    }

    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [router, onShowShortcuts, clearPending]);
}
