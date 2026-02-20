'use client';

import React, { useState } from 'react';
import { Search, CheckCircle2, Gift, Lock, Crosshair } from 'lucide-react';
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
  const diff = DIFFICULTY_STYLES[mission.difficulty];
  const isCompleted = progress?.status === 'completed';
  const isClaimed = progress?.status === 'claimed';
  const tierLocked = mission.minTier ? isTierBelow(userTier, mission.minTier as FanTier) : false;

  // Build criteria description
  const criteriaItems = buildCriteriaLabels(mission.criteria);

  return (
    <Card className={`p-4 relative overflow-hidden ${isClaimed ? 'opacity-60' : ''}`}>
      {/* Difficulty badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-sky-400" />
          <span className="font-bold text-sm">{mission.title}</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${diff.bg} ${diff.color} ${diff.border} border`}>
          {diff.label}
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
          <Gift className="w-4 h-4 text-[#FFD700]" />
          <span className="font-mono font-bold text-sm text-[#FFD700]">{fmtScout(mission.rewardCents / 100)} $SCOUT</span>
          {mission.minTier && (
            <TierBadge tier={mission.minTier as FanTier} size="sm" />
          )}
        </div>

        {tierLocked ? (
          <div className="flex items-center gap-1 text-xs text-white/30">
            <Lock className="w-3 h-3" />
            <span>{mission.minTier} nötig</span>
          </div>
        ) : isClaimed ? (
          <div className="flex items-center gap-1 text-xs text-[#22C55E]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Abgeschlossen</span>
          </div>
        ) : isCompleted ? (
          <Button
            size="sm"
            onClick={() => onClaim(mission.id)}
            disabled={claiming}
          >
            <Gift className="w-3 h-3" /> Belohnung abholen
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSubmit(mission.id)}
          >
            <Search className="w-3 h-3" /> Spieler einreichen
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

function buildCriteriaLabels(criteria: ScoutMission['criteria']): string[] {
  const labels: string[] = [];
  if (criteria.max_age) labels.push(`Alter ≤ ${criteria.max_age}`);
  if (criteria.position) labels.push(`Position: ${criteria.position}`);
  if (criteria.min_perf_l5) labels.push(`L5 ≥ ${criteria.min_perf_l5}`);
  if (criteria.min_goals) labels.push(`Tore ≥ ${criteria.min_goals}`);
  if (criteria.min_assists) labels.push(`Assists ≥ ${criteria.min_assists}`);
  if (criteria.min_clean_sheets) labels.push(`CS ≥ ${criteria.min_clean_sheets}`);
  if (criteria.max_floor_price_cents) labels.push(`Floor ≤ ${fmtScout(criteria.max_floor_price_cents / 100)} $SCOUT`);
  return labels;
}
