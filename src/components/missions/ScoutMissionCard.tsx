'use client';

import React, { useState } from 'react';
import { Search, CheckCircle2, Gift, Lock, Crosshair } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Card, Button } from '@/components/ui';
import { TierBadge } from '@/components/ui/TierBadge';
import { fmtScout } from '@/lib/utils';
import type { ScoutMission, UserScoutMission } from '@/lib/services/scoutMissions';
import { DIFFICULTY_STYLES } from '@/lib/services/scoutMissions';
import type { FanTier } from '@/types';

type ScoutMissionCardProps = {
  mission: ScoutMission;
  progress?: UserScoutMission;
  userTier: FanTier;
  onSubmit: (missionId: string) => void;
  onClaim: (missionId: string) => void;
  claiming?: boolean;
};

export default function ScoutMissionCard({ mission, progress, userTier, onSubmit, onClaim, claiming }: ScoutMissionCardProps) {
  const tc = useTranslations('community');
  const diff = DIFFICULTY_STYLES[mission.difficulty];
  const isCompleted = progress?.status === 'completed';
  const isClaimed = progress?.status === 'claimed';
  const tierLocked = mission.minTier ? isTierBelow(userTier, mission.minTier as FanTier) : false;

  // Build criteria description
  const criteriaItems = buildCriteriaLabels(mission.criteria, tc);

  return (
    <Card className={cn('p-4 relative overflow-hidden', isClaimed && 'opacity-60')}>
      {/* Difficulty badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Crosshair className="size-4 text-sky-400" />
          <span className="font-bold text-sm">{mission.title}</span>
        </div>
        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', diff.bg, diff.color, diff.border)}>
          {tc(`diff_${mission.difficulty}`)}
        </span>
      </div>

      <p className="text-xs text-white/50 mb-3">{mission.description}</p>

      {/* Criteria pills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {criteriaItems.map((c, i) => (
          <span key={i} className="text-[10px] px-2 py-0.5 bg-white/[0.04] border border-white/10 rounded-full text-white/60">
            {c}
          </span>
        ))}
      </div>

      {/* Reward + Action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="size-4 text-gold" />
          <span className="font-mono font-bold text-sm text-gold">{fmtScout(mission.rewardCents / 100)} CR</span>
          {mission.minTier && (
            <TierBadge tier={mission.minTier as FanTier} size="sm" />
          )}
        </div>

        {tierLocked ? (
          <div className="flex items-center gap-1 text-xs text-white/30">
            <Lock className="size-3" />
            <span>{tc('missionTierRequired', { tier: mission.minTier ?? '' })}</span>
          </div>
        ) : isClaimed ? (
          <div className="flex items-center gap-1 text-xs text-green-500">
            <CheckCircle2 className="size-3.5" />
            <span>{tc('missionCompleted')}</span>
          </div>
        ) : isCompleted ? (
          <Button
            size="sm"
            onClick={() => onClaim(mission.id)}
            disabled={claiming}
          >
            <Gift className="size-3" /> {tc('missionClaimReward')}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSubmit(mission.id)}
          >
            <Search className="size-3" /> {tc('missionSubmitPlayer')}
          </Button>
        )}
      </div>
    </Card>
  );
}

// ============================================
// Helpers
// ============================================

const TIER_ORDER: FanTier[] = ['Rookie', 'Amateur', 'Profi', 'Elite', 'Legende', 'Ikone'];

function isTierBelow(userTier: FanTier, requiredTier: FanTier): boolean {
  return TIER_ORDER.indexOf(userTier) < TIER_ORDER.indexOf(requiredTier);
}

function buildCriteriaLabels(criteria: ScoutMission['criteria'], t: (key: string, values?: Record<string, string | number | Date>) => string): string[] {
  const labels: string[] = [];
  if (criteria.max_age) labels.push(t('criteriaAge', { value: criteria.max_age }));
  if (criteria.position) labels.push(t('criteriaPosition', { value: criteria.position }));
  if (criteria.min_perf_l5) labels.push(t('criteriaL5', { value: criteria.min_perf_l5 }));
  if (criteria.min_goals) labels.push(t('criteriaGoals', { value: criteria.min_goals }));
  if (criteria.min_assists) labels.push(t('criteriaAssists', { value: criteria.min_assists }));
  if (criteria.min_clean_sheets) labels.push(t('criteriaCS', { value: criteria.min_clean_sheets }));
  if (criteria.max_floor_price_cents) labels.push(t('criteriaFloor', { value: `${fmtScout(criteria.max_floor_price_cents / 100)} CR` }));
  return labels;
}
