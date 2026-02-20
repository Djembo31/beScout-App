'use client';

import { Flame } from 'lucide-react';
import { fmtScout } from '@/lib/utils';
import type { DbLiquidationEvent } from '@/types';

interface LiquidationAlertProps {
  liquidationEvent: DbLiquidationEvent | null;
}

export default function LiquidationAlert({ liquidationEvent }: LiquidationAlertProps) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
      <Flame className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
      <div>
        <div className="font-black text-red-300">Dieser Spieler wurde liquidiert</div>
        <div className="text-sm text-white/60 mt-1">
          Alle DPCs wurden gelöscht und die PBT-Balance an Holder ausgeschüttet. Trading ist nicht mehr möglich.
        </div>
        {liquidationEvent && (
          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs">
            <div><span className="text-white/40">Ausgeschüttet:</span> <span className="font-mono font-bold text-[#22C55E]">{fmtScout(liquidationEvent.distributed_cents / 100)} $SCOUT</span></div>
            <div><span className="text-white/40">Success Fee:</span> <span className="font-mono font-bold text-[#FFD700]">{fmtScout(liquidationEvent.success_fee_cents / 100)} $SCOUT</span></div>
            <div><span className="text-white/40">Holder:</span> <span className="font-mono font-bold">{liquidationEvent.holder_count}</span></div>
            <div><span className="text-white/40">Datum:</span> <span className="font-mono">{new Date(liquidationEvent.created_at).toLocaleDateString('de-DE')}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
