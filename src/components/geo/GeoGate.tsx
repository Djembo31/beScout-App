'use client';

import { ShieldOff } from 'lucide-react';
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
  const { allowed, geofencingEnabled } = useRegionGuard(feature);

  if (!geofencingEnabled || allowed) {
    return <>{children}</>;
  }

  return <GeoRestricted feature={feature} />;
}

function GeoRestricted({ feature }: { feature: GeoFeature }) {
  const t = useTranslations('geo');

  const FEATURE_LABELS: Record<GeoFeature, string> = {
    dpc_trading: t('feature.dpcTrading'),
    free_fantasy: t('feature.freeFantasy'),
    paid_fantasy: t('feature.paidFantasy'),
    scout_reports: t('feature.scoutReports'),
    paid_research: t('feature.paidResearch'),
    content: t('feature.content'),
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center" role="status">
      <ShieldOff className="size-12 text-white/20 mb-4" aria-hidden="true" />
      <h2 className="text-lg font-bold text-white/70 mb-2">
        {t('featureRestricted')}
      </h2>
      <p className="text-sm text-white/40 max-w-sm">
        {t('featureRestrictedDesc', { feature: FEATURE_LABELS[feature] ?? feature })}
      </p>
    </div>
  );
}
