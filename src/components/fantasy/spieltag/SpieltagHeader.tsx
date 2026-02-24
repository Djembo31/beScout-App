'use client';

import React from 'react';
import {
  ChevronLeft, ChevronRight, CheckCircle2, Clock, Play, ArrowRight, Loader2,
} from 'lucide-react';

type Props = {
  gameweek: number;
  isCurrentGw: boolean;
  isPast: boolean;
  gwStatus: 'open' | 'simulated' | 'empty';
  simulatedCount: number;
  fixtureCount: number;
  totalGoals: number;
  eventCount: number;
  isAdmin: boolean;
  simulating: boolean;
  apiAvailable: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSimulate: () => void;
  onAdvance: () => void;
};

export function SpieltagHeader({
  gameweek, isCurrentGw, isPast, gwStatus, simulatedCount, fixtureCount,
  totalGoals, eventCount, isAdmin, simulating, apiAvailable,
  onPrev, onNext, onSimulate, onAdvance,
}: Props) {
  const isActive = isCurrentGw && gwStatus === 'open';
  const isFinished = gwStatus === 'simulated';

  // Color scheme
  const numberColor = isActive
    ? 'text-[#FFD700]'
    : isFinished
    ? 'text-[#22C55E]'
    : 'text-white/30';

  const numberShadow = isActive
    ? '0 0 20px rgba(255,215,0,0.4), 0 0 40px rgba(255,215,0,0.15)'
    : isFinished
    ? '0 0 12px rgba(34,197,94,0.3)'
    : 'none';

  const bgGradient = isActive
    ? 'from-[#FFD700]/[0.06] via-transparent to-transparent'
    : isFinished
    ? 'from-[#22C55E]/[0.04] via-transparent to-transparent'
    : 'from-white/[0.02] via-transparent to-transparent';

  const progressPct = Math.round((gameweek / 38) * 100);
  const progressColor = isActive ? 'bg-[#FFD700]' : isFinished ? 'bg-[#22C55E]' : 'bg-white/20';

  return (
    <div className={`relative rounded-2xl border border-white/[0.08] overflow-hidden bg-gradient-to-br ${bgGradient}`}>
      {/* Nav row */}
      <div className="flex items-center justify-between px-3 pt-3">
        <button
          onClick={onPrev}
          disabled={gameweek <= 1}
          className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] disabled:opacity-20 transition-all active:scale-[0.95]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {isActive ? (
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-[#FFD700] bg-[#FFD700]/10 border border-[#FFD700]/20 animate-pulse">
            Aktuell
          </span>
        ) : isFinished ? (
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/20">
            Beendet
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white/30 bg-white/[0.04] border border-white/[0.06]">
            {isPast ? 'Vergangen' : 'Kommend'}
          </span>
        )}

        <button
          onClick={onNext}
          disabled={gameweek >= 38}
          className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] disabled:opacity-20 transition-all active:scale-[0.95]"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Big GW Number */}
      <div className="text-center py-3">
        <div className="flex items-baseline justify-center gap-1.5">
          <span
            className={`text-3xl md:text-5xl font-black tabular-nums ${numberColor}`}
            style={{ textShadow: numberShadow }}
          >
            {String(gameweek).padStart(2, '0')}
          </span>
          <span className="text-xs md:text-sm text-white/20 font-medium">von 38</span>
        </div>

        {/* Status line */}
        <div className="flex items-center justify-center gap-1.5 mt-1.5 text-xs">
          {isFinished ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
              <span className="text-[#22C55E] font-semibold">Beendet</span>
              {totalGoals > 0 && <span className="text-white/30">· {totalGoals} Tore · {fixtureCount} Spiele</span>}
            </>
          ) : isActive ? (
            <>
              <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              <span className="text-[#22C55E] font-bold">Offen</span>
              <span className="text-white/30">· {eventCount} Events · {fixtureCount} Spiele</span>
            </>
          ) : isPast ? (
            <>
              <Clock className="w-3.5 h-3.5 text-white/30" />
              <span className="text-white/30">
                {simulatedCount > 0 ? `${simulatedCount}/${fixtureCount} simuliert` : 'Vergangener Spieltag'}
              </span>
            </>
          ) : (
            <>
              <Clock className="w-3.5 h-3.5 text-white/20" />
              <span className="text-white/20">Kommender Spieltag</span>
            </>
          )}
        </div>
      </div>

      {/* Admin actions */}
      {isAdmin && isActive && eventCount > 0 && (
        <div className="flex justify-center pb-3 px-4">
          <button
            onClick={onSimulate}
            disabled={simulating}
            className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-xl text-sm font-bold text-[#FFD700] hover:bg-[#FFD700]/20 disabled:opacity-50 transition-all active:scale-[0.97]"
          >
            {simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {simulating ? 'Wird gestartet...' : apiAvailable ? 'Daten importieren' : 'Spieltag starten'}
          </button>
        </div>
      )}
      {isAdmin && isFinished && isCurrentGw && (
        <div className="flex justify-center pb-3 px-4">
          <button
            onClick={onAdvance}
            className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-xl text-sm font-bold text-[#22C55E] hover:bg-[#22C55E]/20 transition-all active:scale-[0.97]"
          >
            <ArrowRight className="w-4 h-4" />
            Nächster Spieltag
          </button>
        </div>
      )}

      {/* Progress bar */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between text-[10px] text-white/20 mb-1">
          <span>Saison-Fortschritt</span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
