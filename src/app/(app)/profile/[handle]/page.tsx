'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton, SkeletonCard } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { getProfileByHandle } from '@/lib/services/profiles';
import ProfileView from '@/components/profile/ProfileView';
import type { Profile } from '@/types';

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile: ownProfile } = useUser();
  const handle = typeof params.handle === 'string' ? params.handle : '';

  const [targetProfile, setTargetProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!handle) return;

    // If viewing own profile, redirect to /profile
    if (ownProfile && ownProfile.handle === handle.toLowerCase()) {
      router.replace('/profile');
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const profile = await getProfileByHandle(handle);
        if (!cancelled) {
          if (!profile) {
            setNotFound(true);
          } else {
            setTargetProfile(profile);
          }
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [handle, ownProfile, router]);

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="animate-pulse bg-white/[0.02] border border-white/10 rounded-2xl h-48 relative">
          <div className="absolute bottom-4 left-4 flex items-end gap-4">
            <Skeleton className="w-20 h-20 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
        <Skeleton className="h-10 rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <SkeletonCard key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (notFound || !targetProfile) {
    return (
      <div className="max-w-[1400px] mx-auto text-center py-20">
        <div className="text-4xl font-black mb-4 text-white/20">404</div>
        <div className="text-white/50 mb-4">Profil @{handle} nicht gefunden.</div>
        <button
          onClick={() => router.push('/profile')}
          className="text-[#FFD700] hover:underline text-sm"
        >
          Zurück zum eigenen Profil
        </button>
      </div>
    );
  }

  const isSelf = !!(user && user.id === targetProfile.id);

  return (
    <ProfileView
      targetUserId={targetProfile.id}
      targetProfile={targetProfile}
      isSelf={isSelf}
    />
  );
}
