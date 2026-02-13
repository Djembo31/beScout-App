'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/providers/AuthProvider';

function ContentSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-white/[0.04] rounded-lg" />
        <div className="h-8 w-24 bg-white/[0.04] rounded-lg" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-white/[0.02] border border-white/10 rounded-2xl" />
        ))}
      </div>
      <div className="h-64 bg-white/[0.02] border border-white/10 rounded-2xl" />
      <div className="h-48 bg-white/[0.02] border border-white/10 rounded-2xl" />
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
    } else if (!profile) {
      router.replace('/onboarding');
    }
  }, [user, profile, loading, router]);

  // Show skeleton in content area (SideNav + TopBar already visible)
  if (loading) return <ContentSkeleton />;

  if (!user || !profile) return null;

  return <>{children}</>;
}
