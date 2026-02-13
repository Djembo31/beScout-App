'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
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
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#FFD700]" />
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
