'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/providers/AuthProvider';

function ContentSkeleton() {
  return (
    <div className="space-y-6 animate-pulse motion-reduce:animate-none">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-surface-subtle rounded-lg" />
        <div className="h-8 w-24 bg-surface-subtle rounded-lg" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-surface-minimal border border-white/10 rounded-2xl" />
        ))}
      </div>
      <div className="h-64 bg-surface-minimal border border-white/10 rounded-2xl" />
      <div className="h-48 bg-surface-minimal border border-white/10 rounded-2xl" />
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, profileLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user) {
      router.replace('/login');
    } else if (!profile) {
      router.replace('/onboarding');
    }
  }, [user, profile, loading, profileLoading, router]);

  // Slice 264 (2026-04-30) — Smoking-Gun #3 Sequential Loading-Cascade fix.
  // Pre-264: `if (loading || profileLoading) return <ContentSkeleton />`
  // blocked the entire page until BOTH user AND profile were loaded. On
  // Mobile-Safari with cold session-restore + slow getAuthState (Slice 263)
  // this stretched to 5-13s of full-page skeleton — what Anil called
  // "Initial Load schrott".
  //
  // Post-264: only block on `loading` (auth-state truly unknown). Once we
  // know `user` exists, render children. Profile-dependent components are
  // already null-safe (audit-verified: `profile?.favorite_club_id ?? null`,
  // `profile?.display_name || user?.email`, etc.) so they handle the
  // profileLoading window gracefully — perceived render is now instant
  // for returning users with cached `user`.

  // (1) Auth-state truly unknown → minimal skeleton (sub-second on cached)
  if (loading) return <ContentSkeleton />;

  // (2) Logged out → skeleton during /login redirect
  if (!user) return <ContentSkeleton />;

  // (3) Logged in but no profile AND not currently loading → skeleton
  // during /onboarding redirect. profileLoading=true falls through to
  // children — components null-safe-handle the in-flight profile state.
  if (!profile && !profileLoading) return <ContentSkeleton />;

  return <>{children}</>;
}
