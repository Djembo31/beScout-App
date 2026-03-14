'use client';

import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { SideNav, TopBar, BottomNav } from '@/components/layout';
import { BackgroundEffects } from '@/components/layout/BackgroundEffects';
import { AuthGuard } from '@/components/providers/AuthGuard';
import { useUser } from '@/components/providers/AuthProvider';
import { TourProvider } from '@/components/tour/TourProvider';
import { TourOverlay } from '@/components/tour/TourOverlay';
import { DemoBanner } from '@/components/demo/DemoBanner';
import { claimWelcomeBonus } from '@/lib/services/welcomeBonus';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';

const ShortcutsModal = lazy(() => import('@/components/help/ShortcutsModal'));

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useUser();
  const logTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Activity log — debounced so it runs after render, not blocking navigation
  useEffect(() => {
    if (!user) return;
    if (logTimer.current) clearTimeout(logTimer.current);
    logTimer.current = setTimeout(() => {
      import('@/lib/services/activityLog').then(({ logActivity }) => {
        logActivity(user.id, 'page_view', 'navigation', { path: pathname });
      }).catch(err => console.error('[AppLayout] Activity log failed:', err));
    }, 1000);
    return () => {
      if (logTimer.current) clearTimeout(logTimer.current);
    };
  }, [pathname, user]);

  // Welcome bonus — idempotent (PK constraint), safe to call on every auth
  const bonusClaimed = useRef(false);
  useEffect(() => {
    if (!user || bonusClaimed.current) return;
    bonusClaimed.current = true;
    claimWelcomeBonus().catch(err => console.error('[AppLayout] Welcome bonus claim failed:', err));
  }, [user]);

  const handleMobileToggle = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const handleMobileClose = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const handleShowShortcuts = useCallback(() => setShortcutsOpen(true), []);
  useKeyboardShortcuts(handleShowShortcuts);

  return (
    <TourProvider>
      <DemoBanner />

      {/* Background Effects — Stadium Atmosphere (memo'd, renders once) */}
      <BackgroundEffects />

      {/* Skip to content — keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-gold focus:text-black focus:font-bold focus:rounded-xl focus:text-sm"
      >
        Skip to content
      </a>

      {/* App Shell */}
      <div className="relative flex min-h-screen">
        <SideNav mobileOpen={mobileOpen} onMobileClose={handleMobileClose} />
        <div className="flex-1 ml-0 lg:ml-[260px] min-w-0">
          <TopBar onMobileMenuToggle={handleMobileToggle} />
          <main id="main-content" className="p-4 lg:p-6 pb-safe-nav lg:pb-6 overflow-x-hidden">
            {pathname.startsWith('/club/') && !pathname.includes('/admin') ? children : <AuthGuard>{children}</AuthGuard>}
          </main>
        </div>
      </div>

      {/* Bottom Navigation — mobile only */}
      <BottomNav />

      {/* Tour Overlay */}
      <TourOverlay />

      {/* Keyboard Shortcuts Modal */}
      {shortcutsOpen && (
        <Suspense fallback={null}>
          <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
        </Suspense>
      )}
    </TourProvider>
  );
}
