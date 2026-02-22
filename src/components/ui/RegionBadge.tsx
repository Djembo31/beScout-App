'use client';

import { Globe, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { GeoRegion } from '@/lib/geofencing';

const REGION_STYLES: Record<GeoRegion, { bg: string; text: string }> = {
  turkey:    { bg: 'bg-red-500/15', text: 'text-red-400' },
  eu_strict: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  eu_rest:   { bg: 'bg-sky-500/15', text: 'text-sky-400' },
  global:    { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
};

export function RegionBadge({ region }: { region: string | null | undefined }) {
  const t = useTranslations('geo');

  if (!region) return null;

  const style = REGION_STYLES[region as GeoRegion] ?? REGION_STYLES.global;
  const Icon = region === 'global' ? Globe : MapPin;
  const label = t(`region.${region}` as 'region.turkey' | 'region.eu_strict' | 'region.eu_rest' | 'region.global');

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.text}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}
