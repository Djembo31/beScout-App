'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, AlertTriangle, Eye, Trophy, Target, Users, Loader2,
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { useTranslations } from 'next-intl';
import { getLineup } from '@/lib/services/lineups';
import type { FantasyEvent } from './types';
import { getStatusStyle } from './helpers';
import { PredictionsTab } from './PredictionsTab';
import dynamic from 'next/dynamic';

const LeaguesSection = dynamic(() => import('./LeaguesSection'), { ssr: false });

type MitmachenTabProps = {
  gameweek: number;
  activeGameweek: number;
  events: FantasyEvent[];
  userId: string;
  onEventClick: (event: FantasyEvent) => void;
};

export function MitmachenTab({
  gameweek,
  activeGameweek,
  events,
  userId,
  onEventClick,
}: MitmachenTabProps) {
  const t = useTranslations('spieltag');
  const tf = useTranslations('fantasy');
  const isUpcoming = gameweek > activeGameweek;
  const joinedEvents = events.filter(e => e.isJoined);

  // Load lineup statuses for joined events
  const [lineupStatuses, setLineupStatuses] = useState<Map<string, { hasLineup: boolean; score: number | null; rank: number | null }>>(new Map());

  useEffect(() => {
    if (!userId || joinedEvents.length === 0) {
      setLineupStatuses(new Map());
      return;
    }
    let cancelled = false;
    const loadStatuses = async () => {
      const statusMap = new Map<string, { hasLineup: boolean; score: number | null; rank: number | null }>();
      for (const evt of joinedEvents) {
        try {
          const lineup = await getLineup(evt.id, userId);
          statusMap.set(evt.id, {
            hasLineup: !!lineup,
            score: lineup?.total_score ?? null,
            rank: lineup?.rank ?? null,
          });
        } catch {
          statusMap.set(evt.id, { hasLineup: false, score: null, rank: null });
        }
      }
      if (!cancelled) setLineupStatuses(statusMap);
    };
    loadStatuses();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, userId]);

  return (
    <div className="space-y-6">
      {/* ── SECTION 1: Meine Aufstellungen ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-gold" />
          <h3 className="font-bold text-sm">{t('myLineups')}</h3>
          {joinedEvents.length > 0 && (
            <span className="text-[10px] text-white/30 font-mono">{joinedEvents.length}</span>
          )}
        </div>

        {joinedEvents.length === 0 ? (
          <Card className="p-6 text-center">
            <Trophy className="w-8 h-8 text-gold/30 mx-auto mb-2" />
            <div className="text-sm text-white/50 font-medium">{tf('mitmachen.noLineups')}</div>
            <div className="text-xs text-white/30 mt-1 max-w-[280px] mx-auto leading-relaxed">{tf('mitmachen.noLineupsCta')}</div>
            <Button variant="gold" size="sm" className="mt-3" onClick={() => { const el = document.querySelector('[data-tab="events"]'); if (el instanceof HTMLElement) el.click(); }}>
              {tf('mitmachen.noLineupsAction')}
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {joinedEvents.map(event => {
              const lineupStatus = lineupStatuses.get(event.id);
              const hasLineup = lineupStatus?.hasLineup ?? false;
              const score = lineupStatus?.score;
              const rank = lineupStatus?.rank;
              const isScored = !!event.scoredAt;
              const sStyle = getStatusStyle(event.status);

              return (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="w-full flex items-center gap-3 p-3 bg-white/[0.03] border border-white/10 rounded-2xl hover:bg-white/[0.06] transition-all text-left active:scale-[0.98]"
                >
                  <div className="flex-shrink-0">
                    {isScored && rank != null ? (
                      <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                        <span className="text-sm font-black text-gold">#{rank}</span>
                      </div>
                    ) : hasLineup ? (
                      <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-orange-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{event.name}</div>
                    <div className="text-[11px] text-white/40">
                      {isScored ? (
                        <span>{score ?? 0} Punkte · Platz {rank ?? '-'} / {event.participants}</span>
                      ) : hasLineup ? (
                        <span className="text-green-500">{tf('mitmachen.lineupSet')}</span>
                      ) : (
                        <span className="text-orange-400">{tf('mitmachen.noLineup')}</span>
                      )}
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${sStyle.bg} ${sStyle.text}`}>
                    {sStyle.pulse && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse motion-reduce:animate-none" />}
                    <span className="text-[9px] font-bold">{sStyle.label}</span>
                  </div>
                  <Eye className="w-4 h-4 text-white/20 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── SECTION 2: Meine Tipps ── */}
      <section>
        <PredictionsTab gameweek={gameweek} userId={userId} />
      </section>

      {/* ── SECTION 3: Meine Ligen (compact) ── */}
      <section>
        <LeaguesSection mode="compact" />
      </section>
    </div>
  );
}
