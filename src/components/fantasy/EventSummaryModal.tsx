'use client';

import Link from 'next/link';
import { Trophy, Users } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { fmtScout } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { FantasyEvent } from './types';
import type { LeaderboardEntry } from '@/lib/services/scoring';

const RANK_MEDALS: Record<number, string> = { 1: '\uD83E\uDD47', 2: '\uD83E\uDD48', 3: '\uD83E\uDD49' };

const SEEN_PREFIX = 'bescout-event-seen-';

export function isEventSeen(eventId: string): boolean {
  return !!localStorage.getItem(SEEN_PREFIX + eventId);
}

export function markEventSeen(eventId: string): void {
  localStorage.setItem(SEEN_PREFIX + eventId, '1');
}

export default function EventSummaryModal({
  event,
  leaderboard,
  open,
  onClose,
}: {
  event: FantasyEvent;
  leaderboard: LeaderboardEntry[];
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('fantasy');

  const myRank = event.userRank ?? null;
  const myScore = event.userPoints ?? 0;
  const myReward = event.userReward ?? 0;
  const top3 = leaderboard.slice(0, 3);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('summary.title')}
      // TODO(J4 FIX-02): EventSummaryModal zeigt read-only Results (keine Mutation).
      // preventClose={false} bewusst. Sobald Reward-Claim als async Mutation hier
      // eingebaut wird, `preventClose={claiming}` nachruesten.
      preventClose={false}
    >
      <div className="space-y-5 py-2">
        {/* Event name */}
        <div className="text-center">
          <div className="text-xs text-white/40 uppercase mb-1">{event.name}</div>
          <div className="text-4xl mb-2">{myRank && myRank <= 3 ? RANK_MEDALS[myRank] : <Trophy className="size-10 mx-auto text-gold" aria-hidden="true" />}</div>
          <div className="text-2xl font-black">
            {myRank ? `${t('summary.rank')} #${myRank}` : t('summary.played')}
          </div>
        </div>

        {/* Score + Reward */}
        <div className="flex gap-3">
          <div className="flex-1 bg-surface-subtle border border-white/[0.08] rounded-xl p-3 text-center">
            <div className="text-xs text-white/40 uppercase mb-0.5">{t('summary.score')}</div>
            <div className="text-xl font-mono font-black text-white">{myScore}</div>
          </div>
          {myReward > 0 && (
            <div className="flex-1 bg-gold/[0.08] rounded-xl p-3 text-center mvp-crown-glow">
              <div className="text-xs text-gold/60 uppercase mb-0.5">{t('summary.reward')}</div>
              <div className="text-xl font-mono font-black text-gold">{fmtScout(myReward)} CR</div>
            </div>
          )}
        </div>

        {/* Mini-Leaderboard Top 3 */}
        {top3.length > 0 && (
          <div>
            <div className="text-xs font-bold text-white/40 uppercase mb-2">{t('summary.top3')}</div>
            <div className="space-y-1.5">
              {top3.map((entry, i) => (
                <div key={entry.userId} className={`flex items-center gap-3 bg-surface-minimal rounded-xl p-2.5 ${i === 0 ? 'mvp-crown-glow' : ''}`}>
                  <span className="text-lg w-8 text-center">{RANK_MEDALS[i + 1] ?? `#${i + 1}`}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{entry.displayName ?? entry.handle ?? 'Anonym'}</div>
                  </div>
                  <div className="font-mono text-sm font-bold text-white/70">{entry.totalScore}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA — AR-36: neutralisiert, kein Reinvest-Pitch nach Gewinn-Erlebnis.
            "Aufstocken" → "Zum Kader" (neutral, kein Trading-CTA direkt nach Reward). */}
        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={onClose} className="min-h-[44px]">
            {t('summary.close')}
          </Button>
          <Link href="/manager?tab=kader" className="flex-1" onClick={onClose}>
            <Button variant="gold" fullWidth className="gap-1.5 min-h-[44px]">
              <Users className="size-4" aria-hidden="true" />
              {t('summary.buyCta')}
            </Button>
          </Link>
        </div>
      </div>
    </Modal>
  );
}
