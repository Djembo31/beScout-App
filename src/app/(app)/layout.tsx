'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SideNav, TopBar, BottomNav } from '@/components/layout';
import { AuthGuard } from '@/components/providers/AuthGuard';
import { useUser } from '@/components/providers/AuthProvider';
import { TourProvider } from '@/components/tour/TourProvider';
import { TourOverlay } from '@/components/tour/TourOverlay';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useUser();

  // Activity log — page views
  useEffect(() => {
    if (!user) return;
    import('@/lib/services/activityLog').then(({ logActivity }) => {
      logActivity(user.id, 'page_view', 'navigation', { path: pathname });
    }).catch(err => console.error('[AppLayout] Activity log failed:', err));
  }, [pathname, user]);

  const handleMobileToggle = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const handleMobileClose = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <TourProvider>
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[640px] h-[640px] bg-[#FFD700]/[0.03] rounded-full blur-[140px]" />
        <div className="absolute bottom-0 left-1/4 w-[820px] h-[820px] bg-[#22C55E]/[0.035] rounded-full blur-[160px]" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* App Shell */}
      <div className="relative flex min-h-screen">
        <SideNav mobileOpen={mobileOpen} onMobileClose={handleMobileClose} />
        <div className="flex-1 ml-0 lg:ml-[260px] overflow-x-hidden">
          <TopBar onMobileMenuToggle={handleMobileToggle} />
          <main className="p-4 lg:p-6 pb-safe-nav lg:pb-6">
            {pathname.startsWith('/club/') && !pathname.includes('/admin') ? children : <AuthGuard>{children}</AuthGuard>}
          </main>
        </div>
      </div>

      {/* Bottom Navigation — mobile only */}
      <BottomNav />

      {/* Tour Overlay */}
      <TourOverlay />
    </TourProvider>
  );
}
