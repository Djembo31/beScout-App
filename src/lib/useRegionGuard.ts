'use client';

import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { isFeatureAllowed, GEOFENCING_ENABLED, type GeoFeature } from '@/lib/geofencing';

/**
 * Region-based feature guard — identical pattern to useDemoGuard.
 * Wraps async actions: if feature is blocked for user's region, shows toast instead.
 */
export function useRegionGuard(feature: GeoFeature) {
  const { profile } = useUser();
  const { addToast } = useToast();
  const t = useTranslations('geo');

  const region = profile?.region ?? null;
  const allowed = isFeatureAllowed(feature, region);

  /** Wraps an async action — shows toast instead of executing if region-blocked */
  const guard = useCallback(
    <T,>(action: () => Promise<T>): (() => Promise<T | undefined>) => {
      return async () => {
        if (!allowed) {
          addToast(t('restricted'), 'info');
          return undefined;
        }
        return action();
      };
    },
    [allowed, addToast, t]
  );

  return { allowed, guard, region, geofencingEnabled: GEOFENCING_ENABLED };
}
