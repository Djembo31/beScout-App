'use client';

import dynamic from 'next/dynamic';

const InstallPrompt = dynamic(
  () => import('@/components/pwa/InstallPrompt').then((m) => ({ default: m.InstallPrompt })),
  { ssr: false, loading: () => null },
);

const CookieConsent = dynamic(
  () => import('@/components/legal/CookieConsent').then((m) => ({ default: m.CookieConsent })),
  { ssr: false, loading: () => null },
);

export function ClientOverlays() {
  return (
    <>
      <InstallPrompt />
      <CookieConsent />
    </>
  );
}
