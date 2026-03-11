'use client';

import { useToast } from '@/components/providers/ToastProvider';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import {
  isFeatureAllowedForTier,
  GEOFENCING_ENABLED,
  type GeoFeature,
  type GeoTier,
} from '@/lib/geofencing';

/** Read geo tier from middleware cookie */
function getGeoTierFromCookie(): GeoTier | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/bescout-geo-tier=(\w+)/);
  return (match?.[1] as GeoTier) ?? null;
}

/**
 * Tier-based feature guard.
 * Reads geo tier from middleware cookie (set via x-vercel-ip-country).
 * If geofencing is OFF or tier is unknown → allowed.
 */
export function useRegionGuard(feature: GeoFeature) {
  const { addToast } = useToast();
  const t = useTranslations('geo');

  const [tier, setTier] = useState<GeoTier | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setTier(getGeoTierFromCookie());
    setIsHydrated(true);
  }, []);

  const allowed = isFeatureAllowedForTier(feature, tier);

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

  return { allowed, guard, tier, isHydrated, geofencingEnabled: GEOFENCING_ENABLED };
}
