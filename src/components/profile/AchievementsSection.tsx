'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Trophy, Star } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { getFeaturedAchievements, getHiddenAchievements } from '@/lib/achievements';
import ScoreProgress from '@/components/profile/ScoreProgress';
import type { DbUserStats } from '@/types';
import type { Dimension } from '@/lib/gamification';

interface AchievementsSectionProps {
  userStats: DbUserStats | null;
  unlockedKeys: Set<string>;
}

const CATEGORY_COLORS: Record<string, string> = {
  trading: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  manager: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
  scout: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
};

const DIMENSIONS: { key: Dimension; scoreKey: keyof DbUserStats }[] = [
  { key: 'trader', scoreKey: 'trading_score' },
  { key: 'manager', scoreKey: 'manager_score' },
  { key: 'analyst', scoreKey: 'scout_score' },
];

export default function AchievementsSection({ userStats, unlockedKeys }: AchievementsSectionProps) {
  const t = useTranslations('profile');

  const featured = useMemo(() => getFeaturedAchievements(), []);
  const hidden = useMemo(() => getHiddenAchievements(), []);
  const totalUnlocked = useMemo(() => {
    const all = [...featured, ...hidden];
    return all.filter(a => unlockedKeys.has(a.key)).length;
  }, [featured, hidden, unlockedKeys]);

  return (
    <div className="space-y-6">
      {/* Rang Progression */}
      <Card className="p-4">
        <h3 className="text-sm font-bold mb-4">{t('rangProgression')}</h3>
        <div className="space-y-3">
          {DIMENSIONS.map(dim => (
            <ScoreProgress
              key={dim.key}
              dimension={dim.key}
              score={(userStats?.[dim.scoreKey] as number) ?? 0}
            />
          ))}
        </div>
      </Card>

      {/* Achievement Progress Summary */}
      <div className="flex items-center gap-2 px-1">
        <Trophy className="size-4 text-gold" />
        <span className="text-sm font-bold">{t('achievementsTitle')}</span>
        <span className="text-xs text-white/40 ml-auto font-mono tabular-nums">
          {t('achievementsProgress', { unlocked: totalUnlocked, total: featured.length + hidden.length })}
        </span>
      </div>

      {/* Featured Achievements Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {featured.map(ach => {
          const unlocked = unlockedKeys.has(ach.key);
          return (
            <div
              key={ach.key}
              className={cn(
                'p-3 rounded-xl border transition-colors',
                unlocked
                  ? `${CATEGORY_COLORS[ach.category]} border`
                  : 'bg-white/[0.02] border-white/[0.06] opacity-50',
              )}
            >
              <div className="text-2xl mb-1.5">{ach.icon}</div>
              <p className={cn('text-xs font-bold', unlocked ? 'text-white' : 'text-white/40')}>
                {ach.label}
              </p>
              <p className="text-[10px] text-white/30 mt-0.5 line-clamp-2">
                {unlocked ? ach.description : t('achievementLocked')}
              </p>
            </div>
          );
        })}
      </div>

      {/* Hidden Achievements — only show unlocked ones */}
      {hidden.some(a => unlockedKeys.has(a.key)) && (
        <>
          <div className="flex items-center gap-2 px-1 mt-4">
            <Star className="size-4 text-white/30" />
            <span className="text-sm font-bold text-white/50">{t('achievementsHidden')}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {hidden.filter(a => unlockedKeys.has(a.key)).map(ach => (
              <div
                key={ach.key}
                className={cn('p-3 rounded-xl border', CATEGORY_COLORS[ach.category])}
              >
                <div className="text-2xl mb-1.5">{ach.icon}</div>
                <p className="text-xs font-bold text-white">{ach.label}</p>
                <p className="text-[10px] text-white/30 mt-0.5 line-clamp-2">{ach.description}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
