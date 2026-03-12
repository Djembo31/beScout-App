# Scout Report Profile — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild Profile page as an auto-generated "Scout Report" with Radar Chart hero, dynamic strength labels, and dimension-based tabs (Manager/Trader/Analyst/Timeline).

**Architecture:** ScoutCard hero with SVG radar chart + 4 dimension tabs. ProfileView orchestrates data loading (11 parallel queries), determines strongest dimension for tab order + auto-label, passes data down to tab components. All logic pure functions (testable), all display components dumb (receive props).

**Tech Stack:** React 18, TypeScript strict, Tailwind CSS, next-intl, TanStack React Query v5, next/dynamic for tab code splitting, SVG for radar chart (no library).

**Design Doc:** `docs/plans/2026-03-11-scout-report-profile-design.md`

---

### Task 1: Types + i18n Foundation

**Files:**
- Modify: `src/types/index.ts`
- Modify: `messages/de.json`
- Modify: `messages/tr.json`

**Step 1: Update ProfileTab type**

In `src/types/index.ts`, change:
```typescript
// FROM:
export type ProfileTab = 'overview' | 'squad' | 'stats' | 'activity';
// TO:
export type ProfileTab = 'manager' | 'trader' | 'analyst' | 'timeline';
```

**Step 2: Add i18n keys to de.json**

Add to `profile` namespace in `messages/de.json`:
```json
"tabManager": "Manager",
"tabTrader": "Trader",
"tabAnalyst": "Analyst",
"tabTimeline": "Timeline",
"strengthFantasyStratege": "Fantasy-Stratege",
"strengthTaktischerInvestor": "Taktischer Investor",
"strengthMarktkenner": "Marktkenner",
"strengthTreffsichererAnalyst": "Treffsicherer Analyst",
"strengthAllrounder": "Allrounder",
"strengthAufsteiger": "Aufsteiger",
"badgeHitRate": "{rate}% Hit Rate",
"badgeTopManager": "Top {pct}% Manager",
"badgeStreak": "{days}-Tage Streak",
"badgeClubAbo": "{tier} @{club}",
"badgeFoundingPass": "Founding {tier}",
"badgePortfolioPnl": "Portfolio +{pct}%",
"badgeFollowers": "{count}+ Follower",
"scoreProgress": "Noch {points} bis {rang}",
"managerScore": "Manager Score",
"traderScore": "Trader Score",
"analystScore": "Analyst Score",
"seasonBilanz": "Season-Bilanz",
"eventsPlayed": "Events",
"bestRank": "Best",
"avgRank": "Avg Rank",
"totalEarned": "Earned",
"podiums": "Podiums",
"recentEvents": "Letzte Events",
"allEvents": "Alle anzeigen",
"clubFanRanks": "Club Fan-Ränge",
"portfolioOverview": "Portfolio",
"dpcCount": "DPCs",
"tradingVolume": "Volume",
"winRate": "Win Rate",
"topHoldings": "Top Holdings",
"fullSquad": "Ganzes Squad →",
"recentTrades": "Letzte Trades",
"allTrades": "Alle anzeigen",
"dpcMastery": "DPC Mastery",
"trackRecord": "Track Record",
"hitRate": "Hit Rate",
"verifiedAnalyst": "Verified Analyst",
"trackRecordProgress": "Track Record wird ab 5 Calls sichtbar.",
"trackRecordRemaining": "Noch {remaining} Calls bis zur Bewertung.",
"researchPosts": "Research Posts",
"allResearch": "Alle anzeigen",
"predictionStats": "Predictions",
"accuracy": "Accuracy",
"bestStreakLabel": "Best Streak",
"totalPredictions": "Total",
"bountyBilanz": "Bounties",
"submitted": "Eingereicht",
"approved": "Approved",
"contentEarnings": "Content Earnings",
"expertBadges": "Expert Badges",
"badgesUnlocked": "{count}/{total} freigeschaltet",
"timelineTitle": "Timeline",
"timelineEmpty": "Noch keine Aktivität.",
"today": "Heute",
"yesterday": "Gestern",
"managerEmpty": "Noch kein Event gespielt.",
"managerEmptyDesc": "Fantasy-Events starten jeden Spieltag.",
"managerEmptyPublic": "Noch keine Fantasy-Teilnahmen.",
"traderEmpty": "Noch keine DPCs im Portfolio.",
"traderEmptyDesc": "Entdecke Spieler auf dem Marktplatz.",
"traderEmptyPublic": "Noch keine DPCs im Portfolio.",
"analystEmpty": "Noch keine Analysen veröffentlicht.",
"analystEmptyDesc": "Teile deine Einschätzung zu Spielern.",
"analystEmptyPublic": "Noch keine Analysen.",
"goToEvents": "Zu den Events",
"goToMarket": "Zum Markt",
"writeResearch": "Research schreiben"
```

**Step 3: Add i18n keys to tr.json**

Same structure, Turkish translations:
```json
"tabManager": "Menajer",
"tabTrader": "Trader",
"tabAnalyst": "Analist",
"tabTimeline": "Zaman Çizelgesi",
"strengthFantasyStratege": "Fantezi Stratejisti",
"strengthTaktischerInvestor": "Taktik Yatırımcı",
"strengthMarktkenner": "Piyasa Uzmanı",
"strengthTreffsichererAnalyst": "İsabetli Analist",
"strengthAllrounder": "Çok Yönlü",
"strengthAufsteiger": "Yükselen Yetenek",
"badgeHitRate": "%{rate} İsabet Oranı",
"badgeTopManager": "En İyi %{pct} Menajer",
"badgeStreak": "{days} Gün Seri",
"badgeClubAbo": "{tier} @{club}",
"badgeFoundingPass": "Kurucu {tier}",
"badgePortfolioPnl": "Portföy +%{pct}",
"badgeFollowers": "{count}+ Takipçi",
"scoreProgress": "{rang} için {points} puan kaldı",
"managerScore": "Menajer Puanı",
"traderScore": "Trader Puanı",
"analystScore": "Analist Puanı",
"seasonBilanz": "Sezon Özeti",
"eventsPlayed": "Etkinlik",
"bestRank": "En İyi",
"avgRank": "Ort. Sıra",
"totalEarned": "Kazanılan",
"podiums": "Podyum",
"recentEvents": "Son Etkinlikler",
"allEvents": "Tümünü göster",
"clubFanRanks": "Kulüp Fan Sıralaması",
"portfolioOverview": "Portföy",
"dpcCount": "DPC",
"tradingVolume": "Hacim",
"winRate": "Kazanma Oranı",
"topHoldings": "En İyi Varlıklar",
"fullSquad": "Tüm Kadro →",
"recentTrades": "Son İşlemler",
"allTrades": "Tümünü göster",
"dpcMastery": "DPC Ustalık",
"trackRecord": "Sicil",
"hitRate": "İsabet Oranı",
"verifiedAnalyst": "Doğrulanmış Analist",
"trackRecordProgress": "Sicil 5 çağrıdan sonra görünür olacak.",
"trackRecordRemaining": "Değerlendirme için {remaining} çağrı daha.",
"researchPosts": "Araştırma Yazıları",
"allResearch": "Tümünü göster",
"predictionStats": "Tahminler",
"accuracy": "Doğruluk",
"bestStreakLabel": "En İyi Seri",
"totalPredictions": "Toplam",
"bountyBilanz": "Ödüller",
"submitted": "Gönderilen",
"approved": "Onaylanan",
"contentEarnings": "İçerik Kazançları",
"expertBadges": "Uzman Rozetleri",
"badgesUnlocked": "{count}/{total} açıldı",
"timelineTitle": "Zaman Çizelgesi",
"timelineEmpty": "Henüz aktivite yok.",
"today": "Bugün",
"yesterday": "Dün",
"managerEmpty": "Henüz etkinlik oynanmadı.",
"managerEmptyDesc": "Fantezi etkinlikleri her maç günü başlar.",
"managerEmptyPublic": "Henüz fantezi katılımı yok.",
"traderEmpty": "Portföyde henüz DPC yok.",
"traderEmptyDesc": "Pazar yerinde oyuncuları keşfet.",
"traderEmptyPublic": "Portföyde henüz DPC yok.",
"analystEmpty": "Henüz analiz yayınlanmadı.",
"analystEmptyDesc": "Oyuncular hakkındaki değerlendirmeni paylaş.",
"analystEmptyPublic": "Henüz analiz yok.",
"goToEvents": "Etkinliklere git",
"goToMarket": "Pazara git",
"writeResearch": "Araştırma yaz"
```

**Step 4: Verify build**

Run: `npx next build`
Expected: Build passes (type error on ProfileTab usages expected — they reference old tab IDs. That's fine, we'll fix them in Task 10.)

Note: Build may fail because ProfileView.tsx still references old tab IDs. If so, temporarily comment out the tab references in ProfileView.tsx to unblock. We'll rewrite it fully in Task 10.

**Step 5: Commit**

```bash
git add src/types/index.ts messages/de.json messages/tr.json
git commit -m "feat(profile): scout report types + i18n foundation"
```

---

### Task 2: RadarChart Component

**Files:**
- Create: `src/components/profile/RadarChart.tsx`

**Step 1: Implement RadarChart**

Pure SVG component, no external dependencies. 3 axes (Manager/Trader/Analyst), filled polygon.

```typescript
'use client';

import React from 'react';
import type { Dimension } from '@/lib/gamification';

interface RadarChartProps {
  scores: { manager: number; trader: number; analyst: number };
  /** Max score for normalization (default 3000) */
  max?: number;
  /** Size in pixels (default 180) */
  size?: number;
  className?: string;
}

// Axes at 270° (top), 30° (bottom-right), 150° (bottom-left)
const AXES: { dim: Dimension; angle: number }[] = [
  { dim: 'manager', angle: 270 },
  { dim: 'trader', angle: 30 },
  { dim: 'analyst', angle: 150 },
];

const DIM_COLORS: Record<Dimension, string> = {
  manager: '#c084fc',  // purple-400
  trader: '#38bdf8',   // sky-400
  analyst: '#34d399',  // emerald-400
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export default function RadarChart({ scores, max = 3000, size = 180, className }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 24; // padding for labels

  // Normalize scores to 0-1 (cap at 1)
  const normalized = {
    manager: Math.min(scores.manager / max, 1),
    trader: Math.min(scores.trader / max, 1),
    analyst: Math.min(scores.analyst / max, 1),
  };

  // Grid rings (25%, 50%, 75%, 100%)
  const rings = [0.25, 0.5, 0.75, 1];

  // Data polygon points
  const dataPoints = AXES.map(({ dim, angle }) => {
    const r = normalized[dim] * radius;
    return polarToCartesian(cx, cy, r, angle);
  });
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';

  // Label positions (slightly outside the chart)
  const labelRadius = radius + 18;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role="img"
      aria-label="Scout Score Radar Chart"
    >
      {/* Grid rings */}
      {rings.map((pct) => {
        const ringPoints = AXES.map(({ angle }) => polarToCartesian(cx, cy, radius * pct, angle));
        const ringPath = ringPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';
        return <path key={pct} d={ringPath} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />;
      })}

      {/* Axis lines */}
      {AXES.map(({ dim, angle }) => {
        const end = polarToCartesian(cx, cy, radius, angle);
        return <line key={dim} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />;
      })}

      {/* Data polygon */}
      <path d={dataPath} fill="rgba(255,215,0,0.15)" stroke="#FFD700" strokeWidth={2} strokeLinejoin="round" />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={AXES[i].dim} cx={p.x} cy={p.y} r={3} fill={DIM_COLORS[AXES[i].dim]} />
      ))}

      {/* Axis labels */}
      {AXES.map(({ dim, angle }) => {
        const pos = polarToCartesian(cx, cy, labelRadius, angle);
        return (
          <text
            key={dim}
            x={pos.x}
            y={pos.y}
            fill={DIM_COLORS[dim]}
            fontSize={11}
            fontWeight={700}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {dim === 'manager' ? 'MGR' : dim === 'trader' ? 'TRD' : 'ANL'}
          </text>
        );
      })}
    </svg>
  );
}
```

**Step 2: Verify build**

Run: `npx next build`
Expected: PASS (component not imported anywhere yet, but must compile)

**Step 3: Commit**

```bash
git add src/components/profile/RadarChart.tsx
git commit -m "feat(profile): SVG radar chart component for scout card"
```

---

### Task 3: ScoreProgress Component

**Files:**
- Create: `src/components/profile/ScoreProgress.tsx`

**Step 1: Implement ScoreProgress**

Reusable component showing dimension score + rank badge + progress bar. Used 3x (once per dimension tab).

```typescript
'use client';

import React from 'react';
import { getRang, getDimensionColor, getDimensionBgColor } from '@/lib/gamification';
import type { Dimension } from '@/lib/gamification';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface ScoreProgressProps {
  dimension: Dimension;
  score: number;
  className?: string;
}

export default function ScoreProgress({ dimension, score, className }: ScoreProgressProps) {
  const t = useTranslations('profile');
  const tg = useTranslations('gamification');
  const rang = getRang(score);
  const nextRang = rang.maxScore ? getRang(rang.maxScore + 1) : null;
  const progressPct = rang.maxScore
    ? ((score - rang.minScore) / (rang.maxScore - rang.minScore)) * 100
    : 100;
  const pointsToNext = rang.maxScore ? rang.maxScore - score + 1 : 0;

  const dimColor = getDimensionColor(dimension);
  const dimBg = getDimensionBgColor(dimension);

  const labelKey = dimension === 'manager' ? 'managerScore'
    : dimension === 'trader' ? 'traderScore'
    : 'analystScore';

  return (
    <div className={cn('p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className={cn('text-xs font-bold', dimColor)}>{t(labelKey)}</span>
        <span className={cn('text-xs font-mono font-bold px-2 py-0.5 rounded-lg', dimBg, dimColor)}>
          {score.toLocaleString('de-DE')}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden mb-2">
        <div
          className={cn('h-full rounded-full transition-all', rang.bgColor)}
          style={{ width: `${Math.min(progressPct, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className={cn('text-[11px] font-bold', rang.color)}>
          {tg(`rang.${rang.i18nKey}`)}
        </span>
        {nextRang && (
          <span className="text-[11px] text-white/30">
            {t('scoreProgress', { points: pointsToNext.toLocaleString('de-DE'), rang: tg(`rang.${nextRang.i18nKey}`) })}
          </span>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npx next build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/profile/ScoreProgress.tsx
git commit -m "feat(profile): score progress component for dimension tabs"
```

---

### Task 4: StrengthLabel + AutoBadges Utilities

**Files:**
- Create: `src/lib/scoutReport.ts`
- Create: `__tests__/lib/scoutReport.test.ts`

**Step 1: Write tests**

```typescript
import { describe, it, expect } from 'vitest';
import { getStrengthLabel, getAutoBadges } from '@/lib/scoutReport';

describe('getStrengthLabel', () => {
  it('returns fantasy-stratege when manager is dominant', () => {
    expect(getStrengthLabel({ manager_score: 2000, trading_score: 1000, scout_score: 800 }))
      .toBe('strengthFantasyStratege');
  });

  it('returns marktkenner when trader is dominant', () => {
    expect(getStrengthLabel({ manager_score: 800, trading_score: 2000, scout_score: 900 }))
      .toBe('strengthMarktkenner');
  });

  it('returns treffsicherer-analyst when analyst is dominant', () => {
    expect(getStrengthLabel({ manager_score: 800, trading_score: 900, scout_score: 2000 }))
      .toBe('strengthTreffsichererAnalyst');
  });

  it('returns taktischer-investor when manager and trader are both high', () => {
    expect(getStrengthLabel({ manager_score: 2000, trading_score: 1900, scout_score: 800 }))
      .toBe('strengthTaktischerInvestor');
  });

  it('returns allrounder when scores are balanced', () => {
    expect(getStrengthLabel({ manager_score: 1500, trading_score: 1400, scout_score: 1450 }))
      .toBe('strengthAllrounder');
  });

  it('returns aufsteiger when all scores are low', () => {
    expect(getStrengthLabel({ manager_score: 200, trading_score: 300, scout_score: 250 }))
      .toBe('strengthAufsteiger');
  });
});

describe('getAutoBadges', () => {
  it('returns max 3 badges', () => {
    const badges = getAutoBadges({
      trackRecord: { hitRate: 80, totalCalls: 10, correctCalls: 8, incorrectCalls: 2, pendingCalls: 0 },
      avgFantasyRank: 3,
      totalFantasyParticipants: 100,
      currentStreak: 50,
      clubSubscription: { tier: 'gold', clubName: 'Sakaryaspor' },
      foundingPassTier: 'scout',
      portfolioPnlPct: 40,
      followersCount: 200,
      isSelf: false,
    });
    expect(badges.length).toBeLessThanOrEqual(3);
  });

  it('excludes portfolio badge for public profiles', () => {
    const badges = getAutoBadges({
      portfolioPnlPct: 50,
      isSelf: false,
    });
    expect(badges.find(b => b.type === 'portfolioPnl')).toBeUndefined();
  });

  it('includes portfolio badge for self', () => {
    const badges = getAutoBadges({
      portfolioPnlPct: 50,
      isSelf: true,
    });
    expect(badges.find(b => b.type === 'portfolioPnl')).toBeDefined();
  });
});

describe('getStrongestDimension', () => {
  it('returns manager when manager_score is highest', () => {
    const { getStrongestDimension } = require('@/lib/scoutReport');
    expect(getStrongestDimension({ manager_score: 2000, trading_score: 1000, scout_score: 800 }))
      .toBe('manager');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/lib/scoutReport.test.ts`
Expected: FAIL (module not found)

**Step 3: Implement scoutReport.ts**

```typescript
import type { DimensionScores, Dimension } from '@/lib/gamification';

// ============================================
// STRENGTH LABEL
// ============================================

// Note: DbUserStats uses scout_score (not analyst_score)
type ScoreInput = { manager_score: number; trading_score: number; scout_score: number };

export function getStrongestDimension(scores: ScoreInput): Dimension {
  const { manager_score, trading_score, scout_score } = scores;
  if (manager_score >= trading_score && manager_score >= scout_score) return 'manager';
  if (trading_score >= manager_score && trading_score >= scout_score) return 'trader';
  return 'analyst';
}

export function getDimensionTabOrder(scores: ScoreInput): Dimension[] {
  const dims: { dim: Dimension; score: number }[] = [
    { dim: 'manager', score: scores.manager_score },
    { dim: 'trader', score: scores.trading_score },
    { dim: 'analyst', score: scores.scout_score },
  ];
  dims.sort((a, b) => b.score - a.score);
  return dims.map(d => d.dim);
}

export function getStrengthLabel(scores: ScoreInput): string {
  const { manager_score, trading_score, scout_score } = scores;
  const max = Math.max(manager_score, trading_score, scout_score);
  const sorted = [manager_score, trading_score, scout_score].sort((a, b) => b - a);
  const allLow = max < 400;
  const variance = (sorted[0] - sorted[2]) / Math.max(sorted[0], 1);

  if (allLow) return 'strengthAufsteiger';
  if (variance < 0.15) return 'strengthAllrounder';

  // Check top two closeness (for combo labels)
  const top2Diff = (sorted[0] - sorted[1]) / Math.max(sorted[0], 1);

  if (top2Diff < 0.10) {
    // Two dimensions are close — check which combo
    if (manager_score >= trading_score && manager_score >= scout_score && trading_score >= scout_score) {
      return 'strengthTaktischerInvestor'; // Manager + Trader
    }
    // For other combos, just pick the dominant one
  }

  // Single dominant dimension
  if (manager_score === max) return 'strengthFantasyStratege';
  if (trading_score === max) return 'strengthMarktkenner';
  return 'strengthTreffsichererAnalyst';
}

// ============================================
// AUTO-BADGES
// ============================================

export type BadgeType = 'hitRate' | 'topManager' | 'streak' | 'clubAbo' | 'foundingPass' | 'portfolioPnl' | 'followers';

export interface AutoBadge {
  type: BadgeType;
  labelKey: string;
  params: Record<string, string | number>;
}

interface BadgeInput {
  trackRecord?: { hitRate: number; totalCalls: number } | null;
  avgFantasyRank?: number;
  totalFantasyParticipants?: number;
  currentStreak?: number;
  clubSubscription?: { tier: string; clubName: string } | null;
  foundingPassTier?: string | null;
  portfolioPnlPct?: number;
  followersCount?: number;
  isSelf: boolean;
}

export function getAutoBadges(input: BadgeInput): AutoBadge[] {
  const candidates: (AutoBadge & { priority: number })[] = [];

  // Priority 1: Track Record
  if (input.trackRecord && input.trackRecord.totalCalls >= 5 && input.trackRecord.hitRate >= 60) {
    candidates.push({
      priority: 1,
      type: 'hitRate',
      labelKey: 'badgeHitRate',
      params: { rate: Math.round(input.trackRecord.hitRate) },
    });
  }

  // Priority 2: Manager Percentile
  if (input.avgFantasyRank && input.totalFantasyParticipants && input.totalFantasyParticipants > 0) {
    const pct = Math.round((input.avgFantasyRank / input.totalFantasyParticipants) * 100);
    if (pct <= 10) {
      candidates.push({
        priority: 2,
        type: 'topManager',
        labelKey: 'badgeTopManager',
        params: { pct },
      });
    }
  }

  // Priority 3: Streak
  if (input.currentStreak && input.currentStreak >= 30) {
    candidates.push({
      priority: 3,
      type: 'streak',
      labelKey: 'badgeStreak',
      params: { days: input.currentStreak },
    });
  }

  // Priority 4: Club Subscription
  if (input.clubSubscription) {
    candidates.push({
      priority: 4,
      type: 'clubAbo',
      labelKey: 'badgeClubAbo',
      params: { tier: input.clubSubscription.tier, club: input.clubSubscription.clubName },
    });
  }

  // Priority 5: Founding Pass
  if (input.foundingPassTier) {
    candidates.push({
      priority: 5,
      type: 'foundingPass',
      labelKey: 'badgeFoundingPass',
      params: { tier: input.foundingPassTier },
    });
  }

  // Priority 6: Portfolio PnL (self only)
  if (input.isSelf && input.portfolioPnlPct && input.portfolioPnlPct > 20) {
    candidates.push({
      priority: 6,
      type: 'portfolioPnl',
      labelKey: 'badgePortfolioPnl',
      params: { pct: Math.round(input.portfolioPnlPct) },
    });
  }

  // Priority 7: Followers
  if (input.followersCount && input.followersCount >= 100) {
    candidates.push({
      priority: 7,
      type: 'followers',
      labelKey: 'badgeFollowers',
      params: { count: input.followersCount },
    });
  }

  candidates.sort((a, b) => a.priority - b.priority);
  return candidates.slice(0, 3).map(({ priority: _, ...badge }) => badge);
}
```

**Step 4: Run tests**

Run: `npx vitest run __tests__/lib/scoutReport.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/scoutReport.ts __tests__/lib/scoutReport.test.ts
git commit -m "feat(profile): strength label + auto-badge logic with tests"
```

---

### Task 5: ScoutCard Component

**Files:**
- Create: `src/components/profile/ScoutCard.tsx`

**Step 1: Implement ScoutCard**

The hero component. Combines avatar, radar chart, strength label, auto-badges, stats ribbon, action buttons.

```typescript
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { User, Settings, UserPlus, UserMinus, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { getGesamtRang } from '@/lib/gamification';
import { getStrengthLabel, getAutoBadges } from '@/lib/scoutReport';
import type { AutoBadge } from '@/lib/scoutReport';
import RadarChart from './RadarChart';
import { useTranslations } from 'next-intl';
import type { Profile, DbUserStats, AuthorTrackRecord } from '@/types';

interface ScoutCardProps {
  profile: Profile;
  userStats: DbUserStats | null;
  trackRecord: AuthorTrackRecord | null;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isSelf: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
  followLoading: boolean;
  currentStreak: number;
  clubSubscription: { tier: string; clubName: string } | null;
  foundingPassTier: string | null;
  portfolioPnlPct: number;
  className?: string;
}

export default function ScoutCard({
  profile,
  userStats,
  trackRecord,
  followersCount,
  followingCount,
  isFollowing,
  isSelf,
  onFollow,
  onUnfollow,
  followLoading,
  currentStreak,
  clubSubscription,
  foundingPassTier,
  portfolioPnlPct,
  className,
}: ScoutCardProps) {
  const t = useTranslations('profile');
  const tg = useTranslations('gamification');
  const [bioExpanded, setBioExpanded] = useState(false);

  const scores = {
    manager_score: userStats?.manager_score ?? 0,
    trading_score: userStats?.trading_score ?? 0,
    scout_score: userStats?.scout_score ?? 0,
  };

  const gesamtRang = getGesamtRang({
    trader_score: scores.trading_score,
    manager_score: scores.manager_score,
    analyst_score: scores.scout_score,
  });

  const strengthLabel = getStrengthLabel(scores);

  const badges: AutoBadge[] = getAutoBadges({
    trackRecord: trackRecord ? { hitRate: trackRecord.hitRate, totalCalls: trackRecord.totalCalls } : null,
    avgFantasyRank: userStats?.avg_rank,
    totalFantasyParticipants: 100, // TODO: get from leaderboard count
    currentStreak,
    clubSubscription,
    foundingPassTier,
    portfolioPnlPct,
    followersCount,
    isSelf,
  });

  const displayName = profile.display_name || profile.handle;
  const bio = profile.bio;
  const bioLong = bio && bio.length > 100;

  return (
    <Card className={cn('p-5', className)}>
      {/* Row 1: Avatar + Name + Level */}
      <div className="flex items-center gap-3 mb-3">
        <div className="size-12 rounded-2xl bg-gold/10 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="size-6 text-white/50" aria-hidden="true" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-black text-lg truncate">{displayName}</span>
            <span className="text-[11px] font-mono text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
              Lv.{profile.level}
            </span>
          </div>
          <div className="text-[13px] text-white/40">@{profile.handle}</div>
        </div>
      </div>

      {/* Strength Label */}
      <div className={cn('text-sm font-bold mb-4', gesamtRang.color)}>
        {t(strengthLabel)}
      </div>

      {/* Bio (expandable) */}
      {bio && (
        <div className="mb-4">
          <p className={cn('text-[13px] text-white/50 leading-relaxed', !bioExpanded && bioLong && 'line-clamp-2')}>
            {bio}
          </p>
          {bioLong && (
            <button
              onClick={() => setBioExpanded(!bioExpanded)}
              className="text-[11px] text-gold hover:text-gold/80 mt-1 transition-colors"
            >
              {bioExpanded ? (
                <><ChevronUp className="inline size-3" /> {t('lessBio')}</>
              ) : (
                <><ChevronDown className="inline size-3" /> {t('moreBio')}</>
              )}
            </button>
          )}
        </div>
      )}

      {/* Radar Chart */}
      <div className="flex justify-center mb-3">
        <RadarChart
          scores={{
            manager: scores.manager_score,
            trader: scores.trading_score,
            analyst: scores.scout_score,
          }}
        />
      </div>

      {/* Gesamt-Rang */}
      <div className="text-center mb-4">
        <span className={cn('text-sm font-black', gesamtRang.color)}>
          {tg(`rang.${gesamtRang.i18nKey}`)}
        </span>
        {userStats?.rank && (
          <span className="text-[11px] text-white/30 ml-2">
            #{userStats.rank.toLocaleString('de-DE')}
          </span>
        )}
      </div>

      {/* Auto-Badges (max 3) */}
      {badges.length > 0 && (
        <div className="flex gap-2 justify-center mb-4">
          {badges.map((badge) => (
            <div
              key={badge.type}
              className="px-2.5 py-1.5 rounded-lg bg-gold/[0.08] border border-gold/20 text-[11px] font-bold text-gold"
            >
              {t(badge.labelKey, badge.params)}
            </div>
          ))}
        </div>
      )}

      {/* Stats Ribbon */}
      <div className="flex items-center justify-center gap-4 text-[11px] text-white/40 mb-4">
        <span><strong className="text-white/60 font-mono">{followersCount}</strong> Follower</span>
        <span className="text-white/10">·</span>
        <span><strong className="text-white/60 font-mono">{userStats?.trades_count ?? 0}</strong> Trades</span>
        <span className="text-white/10">·</span>
        <span><strong className="text-white/60 font-mono">{userStats?.events_count ?? 0}</strong> Events</span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {isSelf ? (
          <Link href="/profile/settings" className="flex-1">
            <Button variant="outline" size="sm" fullWidth>
              <Settings className="size-4" aria-hidden="true" />
              {t('settingsLabel')}
            </Button>
          </Link>
        ) : (
          <Button
            variant={isFollowing ? 'outline' : 'gold'}
            size="sm"
            className="flex-1"
            onClick={isFollowing ? onUnfollow : onFollow}
            loading={followLoading}
          >
            {isFollowing ? (
              <><UserMinus className="size-4" aria-hidden="true" /> {t('unfollow')}</>
            ) : (
              <><UserPlus className="size-4" aria-hidden="true" /> {t('follow')}</>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}
```

**Step 2: Verify build**

Run: `npx next build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/profile/ScoutCard.tsx
git commit -m "feat(profile): scout card hero component with radar chart"
```

---

### Task 6: ManagerTab Component

**Files:**
- Create: `src/components/profile/ManagerTab.tsx`

**Step 1: Implement ManagerTab**

Fantasy-focused tab: score progress, season summary, recent events, club fan ranks.

Props:
```typescript
interface ManagerTabProps {
  userId: string;
  userStats: DbUserStats | null;
  fantasyResults: UserFantasyResult[];
  isSelf: boolean;
}
```

Sections:
1. `ScoreProgress` with `dimension="manager"` and `score={userStats.manager_score}`
2. Season Summary card: 4 stats (Events, Best Rank, Avg Rank, Earned) + podium counts
3. Recent 5 events: compact rows with score, rank (medal if top 3), reward
4. Club Fan Ranks: from `fan_ranking` table (query via service, needs hook or server query — use `useQuery` inline with direct Supabase call, following existing patterns)

Empty state for no fantasy participation with CTA (self) or plain text (public).

Use existing services: `UserFantasyResult` from props (already loaded by parent).
Fan ranks: use inline `useQuery` with supabase query on `fan_ranking` table.

Reference: `src/components/profile/ProfileStatsTab.tsx` for how fantasy results are currently rendered. Follow same pattern but in a standalone tab.

Full implementation: build Card sections with `useTranslations('profile')`, use `formatScout()` for bCredit amounts, `fmtScout()` for compact display. Medal emojis for rank 1/2/3.

**Step 2: Verify build**

Run: `npx next build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/profile/ManagerTab.tsx
git commit -m "feat(profile): manager tab with fantasy season summary"
```

---

### Task 7: TraderTab Component

**Files:**
- Create: `src/components/profile/TraderTab.tsx`

**Step 1: Implement TraderTab**

Portfolio-focused tab: score progress, portfolio overview, top holdings with mastery, recent trades, mastery summary.

Props:
```typescript
interface TraderTabProps {
  userId: string;
  userStats: DbUserStats | null;
  holdings: HoldingRow[];
  recentTrades: UserTradeWithPlayer[];
  isSelf: boolean;
}
```

Sections:
1. `ScoreProgress` with `dimension="trader"` and `score={userStats.trading_score}`
2. Portfolio Overview: 6-stat grid (Value, PnL self-only, DPCs, Trades, Volume, Win Rate)
3. Top 5 Holdings: `PlayerIdentity` + quantity + value + mastery stars. Link to `/player/[id]`. "Ganzes Squad" link.
4. Recent 5 Trades: BUY/SELL badge + player name + quantity + price + relative time
5. DPC Mastery Summary: grouped by level (Legende: X, Meister: Y, etc.)

Reuse `PlayerIdentity` from `@/components/player`. Use `useUserMasteryAll(userId)` for mastery data. Use `centsToBsd` + `fmtScout` for price formatting.

Reference: `ProfileSquadTab.tsx` for holdings rendering pattern, `holdingRowToPlayer()` conversion.

HoldingRow type: import from `ProfileOverviewTab` (where it's currently exported) — or better, move to types/index.ts in this task.

**Step 2: Verify build**

Run: `npx next build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/profile/TraderTab.tsx
git commit -m "feat(profile): trader tab with portfolio and mastery"
```

---

### Task 8: AnalystTab Component

**Files:**
- Create: `src/components/profile/AnalystTab.tsx`

**Step 1: Implement AnalystTab**

Research-focused tab: score progress, track record, research posts, predictions, bounties, content earnings (self), expert badges.

Props:
```typescript
interface AnalystTabProps {
  userId: string;
  userStats: DbUserStats | null;
  trackRecord: AuthorTrackRecord | null;
  myResearch: ResearchPostWithAuthor[];
  isSelf: boolean;
  transactions?: DbTransaction[];
}
```

Sections:
1. `ScoreProgress` with `dimension="analyst"` and `score={userStats.scout_score}`
2. Track Record Card: if >= 5 calls → large hit rate %, correct/wrong/pending, "Verified Analyst" badge. If < 5 calls → progress bar X/5.
3. Research Posts (5): call direction icon (▲/▼/●), player, horizon, title, rating, unlocks, earnings (self only)
4. `PredictionStatsCard` (dynamic import, existing component)
5. Bounty Summary: submitted/approved counts, earnings (self only). Use inline query.
6. Content Earnings Breakdown (self only): horizontal bars (research/bounty/poll/tips), from transactions grouped by type
7. Expert Badges: 6-badge grid, earned colored, locked grayed with progress %

Reference: `ProfileStatsTab.tsx` for track record rendering, expert badges pattern, earnings breakdown calculation.

**Step 2: Verify build**

Run: `npx next build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/profile/AnalystTab.tsx
git commit -m "feat(profile): analyst tab with track record and research"
```

---

### Task 9: TimelineTab Component

**Files:**
- Create: `src/components/profile/TimelineTab.tsx`

**Step 1: Implement TimelineTab**

Chronological feed mixing all dimensions. Day-grouped, filterable.

Props:
```typescript
interface TimelineTabProps {
  transactions: DbTransaction[];
  userId: string;
  isSelf: boolean;
}
```

Key behavior:
- Group transactions by day (Heute/Gestern/absolute date)
- Filter chips: Alle | Trades | Fantasy | Research | Rewards (same filter types as old ActivityTab)
- Each event: type-colored icon + description + amount (green if positive)
- Load more pagination via `getTransactions(userId, PAGE_SIZE, offset)`
- Use `getActivityIcon()`, `getActivityColor()`, `getActivityLabelKey()` from activityHelpers
- Use `getRelativeTime()` for within-day timestamps

Day grouping logic:
```typescript
function groupByDay(txs: DbTransaction[], locale: string): Map<string, DbTransaction[]> {
  // today/yesterday labels, then 'DD. MMMM' format
}
```

ARIA: radiogroup for filters, proper focus states, min-h-[44px] touch targets.

Reference: `ProfileActivityTab.tsx` for existing filter pattern + rendering.

**Step 2: Verify build**

Run: `npx next build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/profile/TimelineTab.tsx
git commit -m "feat(profile): timeline tab with day-grouped activity feed"
```

---

### Task 10: ProfileView Rewrite

**Files:**
- Modify: `src/components/profile/ProfileView.tsx` (complete rewrite)
- Modify: `src/app/(app)/profile/page.tsx` (may need prop adjustments)

**Step 1: Rewrite ProfileView**

This is the orchestrator. It:
1. Loads all data via `Promise.allSettled()` (same 11 queries as before)
2. Determines strongest dimension via `getStrongestDimension()`
3. Orders tabs via `getDimensionTabOrder()`
4. Renders ScoutCard (always visible) + TabBar + TabPanels
5. Tab-gated queries: each tab's data only loads when active

Key structure:
```typescript
'use client';

import dynamic from 'next/dynamic';
import { TabBar, TabPanel } from '@/components/ui/TabBar';
import ScoutCard from './ScoutCard';
import { getDimensionTabOrder, getStrongestDimension } from '@/lib/scoutReport';

const ManagerTab = dynamic(() => import('./ManagerTab'));
const TraderTab = dynamic(() => import('./TraderTab'));
const AnalystTab = dynamic(() => import('./AnalystTab'));
const TimelineTab = dynamic(() => import('./TimelineTab'));

// Props same as current: targetUserId, targetProfile, isSelf
// State: same data loading pattern (Promise.allSettled)
// Tab state: useState<ProfileTab> initialized to strongest dimension
```

Tab definitions built dynamically from `getDimensionTabOrder()`:
```typescript
const dimOrder = getDimensionTabOrder(scores);
const tabs = [
  ...dimOrder.map(dim => ({
    id: dim,
    label: t(`tab${dim.charAt(0).toUpperCase() + dim.slice(1)}`),
  })),
  { id: 'timeline' as const, label: t('tabTimeline') },
];
```

Default tab = `dimOrder[0]` (strongest dimension).

Sidebar: keep for desktop (Wallet, Airdrop, Referral) — same as current.

Loading state: skeleton similar to current.

**Step 2: Update profile/page.tsx if needed**

Check if props changed. Currently passes `targetUserId`, `targetProfile`, `isSelf` — should stay the same.

**Step 3: Update profile/[handle]/page.tsx if needed**

Same check. Should be compatible.

**Step 4: Verify build**

Run: `npx next build`
Expected: PASS with 0 errors

**Step 5: Commit**

```bash
git add src/components/profile/ProfileView.tsx src/app/\(app\)/profile/page.tsx src/app/\(app\)/profile/\[handle\]/page.tsx
git commit -m "feat(profile): wire scout report — radar chart hero + dimension tabs"
```

---

### Task 11: Cleanup + Build Verification

**Files:**
- Delete or archive: `src/components/profile/ProfileOverviewTab.tsx` (if no longer imported)
- Delete or archive: `src/components/profile/ProfileSquadTab.tsx` (merged into TraderTab)
- Delete or archive: `src/components/profile/ProfileStatsTab.tsx` (split into dimension tabs)
- Delete or archive: `src/components/profile/ProfileActivityTab.tsx` (replaced by TimelineTab)
- Keep: `src/components/profile/ProfilePortfolioTab.tsx` (if still imported elsewhere — check first)
- Modify: `src/types/index.ts` — move `HoldingRow` type here if still in ProfileOverviewTab

**Step 1: Remove dead imports and old tab files**

Check each file for remaining imports. Remove files only if no other component imports them.

```bash
# Check for remaining imports
grep -r "ProfileOverviewTab" src/
grep -r "ProfileSquadTab" src/
grep -r "ProfileStatsTab" src/
grep -r "ProfileActivityTab" src/
```

Delete files that have zero remaining imports.

**Step 2: Move HoldingRow type to types/index.ts**

If `HoldingRow` was exported from `ProfileOverviewTab`, move it to `src/types/index.ts` and update all imports.

**Step 3: Font compliance scan**

```bash
grep -rn "text-\[9px\]\|text-\[10px\]" src/components/profile/
```

Fix any violations to `text-[11px]` minimum.

**Step 4: Full build verification**

Run: `npx next build`
Expected: PASS with 0 errors, 0 type errors

**Step 5: Run existing tests**

Run: `npx vitest run`
Expected: All existing tests pass + new scoutReport tests pass

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor(profile): remove old tab components, cleanup imports"
```

**Step 7: Push**

```bash
git push
```

---

## Execution Notes

### Component Dependency Order
```
Task 1: Types + i18n (foundation, no deps)
Task 2: RadarChart (standalone SVG, no deps)
Task 3: ScoreProgress (depends on gamification.ts)
Task 4: scoutReport.ts (pure logic, no deps)
Task 5: ScoutCard (depends on Task 2 + 4)
Task 6: ManagerTab (depends on Task 3)
Task 7: TraderTab (depends on Task 3)
Task 8: AnalystTab (depends on Task 3)
Task 9: TimelineTab (standalone)
Task 10: ProfileView (depends on Task 5-9)
Task 11: Cleanup (depends on Task 10)
```

### Parallelizable Tasks
- Tasks 2, 3, 4 can run in parallel (no deps on each other)
- Tasks 6, 7, 8, 9 can run in parallel (no deps on each other)
- Task 5 must wait for Tasks 2 + 4
- Task 10 must wait for Tasks 5-9
- Task 11 must be last

### Data Loading Strategy
ProfileView loads ALL data upfront via `Promise.allSettled()` (same as current).
Tab components receive data as props — no additional queries needed except:
- `useUserMasteryAll(userId)` in TraderTab (React Query hook, tab-gated)
- `fan_ranking` query in ManagerTab (inline useQuery, tab-gated)
- `PredictionStatsCard` in AnalystTab (self-contained, already has its own hook)

### Key Files Reference
| File | Purpose |
|------|---------|
| `src/lib/gamification.ts` | getRang, getDimensionColor, getGesamtRang, SCORE_ROAD |
| `src/lib/scoutReport.ts` | NEW: getStrengthLabel, getAutoBadges, getDimensionTabOrder |
| `src/lib/activityHelpers.ts` | getActivityIcon, getActivityColor, getRelativeTime |
| `src/lib/services/wallet.ts` | getHoldings, getTransactions, formatScout |
| `src/lib/services/social.ts` | getUserStats, getUserAchievements |
| `src/lib/services/trading.ts` | getUserTrades |
| `src/lib/services/lineups.ts` | getUserFantasyHistory |
| `src/lib/services/research.ts` | getResearchPosts, getAuthorTrackRecord |
| `src/lib/services/predictions.ts` | getPredictionStats (via PredictionStatsCard) |
| `src/components/ui/TabBar.tsx` | TabBar + TabPanel |
| `src/components/player/index.tsx` | PlayerIdentity, PlayerPhoto |
