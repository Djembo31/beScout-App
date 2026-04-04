'use client';

import React from 'react';
import { Skeleton, SkeletonCard } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import ProfileView from '@/components/profile/ProfileView';

// ============================================
// MAIN PAGE
// ============================================

export default function ProfilePage() {
  const { user, profile, loading } = useUser();

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Hero skeleton */}
        <div className="animate-pulse motion-reduce:animate-none bg-surface-minimal border border-white/10 rounded-2xl h-48 relative">
          <div className="absolute bottom-4 left-4 flex items-end gap-4">
            <Skeleton className="size-20 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
        {/* Tabs + content */}
        <Skeleton className="h-10 rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <SkeletonCard key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (!user || !profile) return null;

  return (
    <ProfileView
      targetUserId={user.id}
      targetProfile={profile}
      isSelf={true}
    />
  );
}
