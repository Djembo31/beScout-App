'use client';

import { useEffect } from 'react';
import { initPostHog, identifyUser, resetUser } from '@/lib/posthog';
import { useUser } from '@/components/providers/AuthProvider';

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useUser();

  // Initialize PostHog once
  useEffect(() => {
    initPostHog();
  }, []);

  // Identify user when auth state changes
  useEffect(() => {
    if (user && profile) {
      identifyUser(user.id, {
        handle: profile.handle,
        plan: profile.plan,
        level: profile.level,
        language: profile.language,
        favorite_club: profile.favorite_club,
      });
    } else if (!user) {
      resetUser();
    }
  }, [user, profile]);

  return <>{children}</>;
}
