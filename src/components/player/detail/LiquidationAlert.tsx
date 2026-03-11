'use client';

import { useTranslations } from 'next-intl';
import { Flame } from 'lucide-react';
import { fmtScout } from '@/lib/utils';
import type { DbLiquidationEvent } from '@/types';

interface LiquidationAlertProps {
  liquidationEvent: DbLiquidationEvent | null;
}

export default function LiquidationAlert({ liquidationEvent }: LiquidationAlertProps) {
  const t = useTranslations('playerDetail');

  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
      <Flame className="size-6 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <div className="font-black text-red-300">{t('playerLiquidated')}</div>
        <div className="text-sm text-white/60 mt-1 text-pretty">
          {t('liquidationInfo')}
        </div>
        {liquidationEvent && (
          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs">
            {liquidationEvent.fee_per_dpc_cents > 0 ? (
              <>
                <div><span className="text-white/40">{t('pbtColon')}</span> <span className="font-mono font-bold tabular-nums text-green-500">{fmtScout((liquidationEvent.distributed_cents - liquidationEvent.success_fee_cents) / 100)} bCredits</span></div>
                <div><span className="text-white/40">{t('communityBonus')}</span> <span className="font-mono font-bold tabular-nums text-gold">{fmtScout(liquidationEvent.success_fee_cents / 100)} bCredits</span></div>
                <div><span className="text-white/40">{t('totalColon')}</span> <span className="font-mono font-bold tabular-nums text-green-500">{fmtScout(liquidationEvent.distributed_cents / 100)} bCredits</span></div>
              </>
            ) : (
              <div><span className="text-white/40">{t('distributedColon')}</span> <span className="font-mono font-bold tabular-nums text-green-500">{fmtScout(liquidationEvent.distributed_cents / 100)} bCredits</span></div>
            )}
            <div><span className="text-white/40">{t('holderColon')}</span> <span className="font-mono font-bold tabular-nums">{liquidationEvent.holder_count}</span></div>
            <div><span className="text-white/40">{t('dateColon')}</span> <span className="font-mono tabular-nums">{new Date(liquidationEvent.created_at).toLocaleDateString('de-DE')}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
