'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SideNav, TopBar, BottomNav } from '@/components/layout';
import { AuthGuard } from '@/components/providers/AuthGuard';
import { useUser } from '@/components/providers/AuthProvider';
import { TourProvider } from '@/components/tour/TourProvider';
import { TourOverlay } from '@/components/tour/TourOverlay';
import { DemoBanner } from '@/components/demo/DemoBanner';

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
      <DemoBanner />

      {/* Background Effects — Stadium Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Stadium photo — blurred base layer */}
        <img src="/stadiums/default.jpg" alt="" className="absolute inset-0 w-full h-full object-cover blur-[50px] scale-110 opacity-[0.15]" />
        {/* Top floodlight — golden wash from above */}
        <div className="absolute top-0 inset-x-0 h-[350px] bg-gradient-to-b from-[#FFD700]/[0.05] via-[#FFD700]/[0.02] to-transparent" />
        {/* Gold ambient blob — top right */}
        <div className="absolute -top-[200px] right-[10%] w-[700px] h-[700px] bg-[#FFD700]/[0.06] rounded-full blur-[160px]" />
        {/* Green ambient blob — bottom left */}
        <div className="absolute -bottom-[200px] left-[15%] w-[800px] h-[800px] bg-[#22C55E]/[0.04] rounded-full blur-[180px]" />
        {/* Subtle purple accent — center */}
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[600px] h-[400px] bg-purple-500/[0.02] rounded-full blur-[200px]" />
        {/* Noise texture — DexScreener-inspired grain */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* App Shell */}
      <div className="relative flex min-h-screen">
        <SideNav mobileOpen={mobileOpen} onMobileClose={handleMobileClose} />
        <div className="flex-1 ml-0 lg:ml-[260px] min-w-0">
          <TopBar onMobileMenuToggle={handleMobileToggle} />
          <main className="p-4 lg:p-6 pb-safe-nav lg:pb-6 overflow-x-hidden">
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
