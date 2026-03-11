'use client';

import { Loader2, ShieldOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRegionGuard } from '@/lib/useRegionGuard';
import type { GeoFeature } from '@/lib/geofencing';

/**
 * Wraps content that requires a specific geo feature to be allowed.
 * If feature is blocked for the user's tier → shows restriction message.
 * If geofencing is OFF → renders children transparently.
 */
export function GeoGate({
  feature,
  children,
}: {
  feature: GeoFeature;
  children: React.ReactNode;
}) {
  const { allowed, geofencingEnabled, isHydrated } = useRegionGuard(feature);

  if (!geofencingEnabled || allowed) {
    return <>{children}</>;
  }

  // Show skeleton while cookie is being read during hydration
  if (geofencingEnabled && !isHydrated) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin motion-reduce:animate-none text-white/20" aria-hidden="true" />
      </div>
    );
  }

  return <GeoRestricted feature={feature} />;
}

function GeoRestricted({ feature }: { feature: GeoFeature }) {
  const t = useTranslations('geo');

  const featureLabel = t(`feature.${feature}` as `feature.${GeoFeature}`);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center focus-within:ring-1 focus-within:ring-white/10 rounded-2xl" role="status">
      <ShieldOff className="size-12 text-white/20 mb-4" role="img" aria-label={t('featureRestricted')} />
      <h2 className="text-lg font-bold text-white/70 mb-2">
        {t('featureRestricted')}
      </h2>
      <p className="text-sm text-white/40 max-w-sm">
        {t('featureRestrictedDesc', { feature: featureLabel })}
      </p>
    </div>
  );
}
