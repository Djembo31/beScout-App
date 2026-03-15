'use client';

import React from 'react';
import Link from 'next/link';
import { Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { useEvents } from '@/lib/queries/events';
import type { DbEvent } from '@/types';

interface FantasyCTAProps {
  holdingQty: number;
}

export default function FantasyCTA({ holdingQty }: FantasyCTAProps) {
  const t = useTranslations('playerDetail');
  const { user } = useUser();
  const { data: events } = useEvents();

  const activeEvent = React.useMemo(() => {
    if (!events) return null;
    return events.find((e: DbEvent) => e.status === 'registering' || e.status === 'late-reg') ?? null;
  }, [events]);

  if (!user || holdingQty <= 0 || !activeEvent) return null;

  return (
    <div className="bg-gradient-to-r from-gold/10 to-amber-500/5 border border-gold/20 rounded-2xl p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-10 rounded-xl bg-gold/15 flex items-center justify-center shrink-0">
          <Zap className="size-5 text-gold" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-white/90 truncate">{activeEvent.name}</div>
          <div className="text-xs text-white/50">{t('fantasyCTASubtitle')}</div>
        </div>
      </div>
      <Link href="/fantasy" className="shrink-0">
        <Button size="sm" className="bg-gradient-to-r from-[#FFE44D] to-[#E6B800] text-black font-bold whitespace-nowrap">
          {t('addToLineup')}
        </Button>
      </Link>
    </div>
  );
}
