// ============================================
// Retention Engine — Stage-based user journey
// ============================================

import type { DbUserStats } from '@/types';

export type RetentionStage =
  | 'new'         // Day 0-1: First session magic
  | 'building'    // Day 2-7: Building the habit
  | 'deepening'   // Day 8-30: Deepening engagement
  | 'evangelist'  // Day 31-90: Creating evangelists
  | 'sustained';  // Day 90+: Sustaining engagement

export type OnboardingAction =
  | 'buy_first_dpc'
  | 'set_first_lineup'
  | 'complete_daily_challenge'
  | 'write_first_post'
  | 'follow_club';

export interface OnboardingProgress {
  action: OnboardingAction;
  completed: boolean;
  labelDe: string;
  labelTr: string;
  rewardLabelDe: string;
  rewardLabelTr: string;
  href: string;
}

export interface RetentionContext {
  stage: RetentionStage;
  daysSinceJoin: number;
  onboarding: OnboardingProgress[] | null; // only for 'new' + 'building'
  streakMilestone: StreakMilestone | null;  // if user just hit a milestone
  suggestedAction: SuggestedAction | null; // stage-specific CTA
}

export interface StreakMilestone {
  days: number;
  labelDe: string;
  labelTr: string;
  benefitDe: string;
  benefitTr: string;
  icon: string;
}

export interface SuggestedAction {
  key: string;
  labelDe: string;
  labelTr: string;
  href: string;
}

// ─── Streak milestones ────────────────────────
const STREAK_MILESTONES: StreakMilestone[] = [
  {
    days: 7,
    labelDe: '7-Tage-Serie!',
    labelTr: '7 günlük seri!',
    benefitDe: '+5% Fantasy-Bonus freigeschaltet',
    benefitTr: '+%5 fantezi bonusu açıldı',
    icon: '🔥',
  },
  {
    days: 14,
    labelDe: '14-Tage-Serie!',
    labelTr: '14 günlük seri!',
    benefitDe: '+10% Elo-Gewinn freigeschaltet',
    benefitTr: '+%10 Elo kazanımı açıldı',
    icon: '⚡',
  },
  {
    days: 30,
    labelDe: '30-Tage-Serie!',
    labelTr: '30 günlük seri!',
    benefitDe: '1 gratis Mystery Box pro Woche',
    benefitTr: 'Haftada 1 ücretsiz gizemli kutu',
    icon: '🎁',
  },
  {
    days: 60,
    labelDe: '60-Tage-Serie!',
    labelTr: '60 günlük seri!',
    benefitDe: '+15% Fantasy-Bonus + Sichtbarkeits-Boost',
    benefitTr: '+%15 fantezi bonusu + görünürlük artışı',
    icon: '💎',
  },
  {
    days: 90,
    labelDe: '90-Tage-Serie!',
    labelTr: '90 günlük seri!',
    benefitDe: 'Alle Boni + exklusiver "Loyalist" Titel',
    benefitTr: 'Tüm bonuslar + özel "Sadık Fan" unvanı',
    icon: '👑',
  },
];

// ─── Stage detection ─────────────────────────
export function getRetentionStage(daysSinceJoin: number): RetentionStage {
  if (daysSinceJoin <= 1) return 'new';
  if (daysSinceJoin <= 7) return 'building';
  if (daysSinceJoin <= 30) return 'deepening';
  if (daysSinceJoin <= 90) return 'evangelist';
  return 'sustained';
}

/** Days since user profile was created */
export function getDaysSinceJoin(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / 86_400_000);
}

// ─── Onboarding checklist ────────────────────
export function getOnboardingProgress(stats: {
  holdingsCount: number;
  eventsJoined: number;
  challengesCompleted: number;
  postsCount: number;
  followedClubs: number;
}): OnboardingProgress[] {
  return [
    {
      action: 'buy_first_dpc',
      completed: stats.holdingsCount > 0,
      labelDe: 'Kaufe deine erste Scout Card',
      labelTr: 'İlk Scout Card\'ını satın al',
      rewardLabelDe: '+1.000 CR',
      rewardLabelTr: '+1.000 CR',
      href: '/market?tab=kaufen',
    },
    {
      action: 'set_first_lineup',
      completed: stats.eventsJoined > 0,
      labelDe: 'Stelle dein erstes Fantasy-Lineup auf',
      labelTr: 'İlk fantezi kadronuzu kurun',
      rewardLabelDe: 'Achievement: Erster Event',
      rewardLabelTr: 'Başarı: İlk Etkinlik',
      href: '/fantasy',
    },
    {
      action: 'complete_daily_challenge',
      completed: stats.challengesCompleted > 0,
      labelDe: 'Beantworte die Daily Challenge',
      labelTr: 'Günlük meydan okumayı yanıtla',
      rewardLabelDe: '+10 Tickets',
      rewardLabelTr: '+10 Bilet',
      href: '/',
    },
    {
      action: 'write_first_post',
      completed: stats.postsCount > 0,
      labelDe: 'Schreibe deinen ersten Beitrag',
      labelTr: 'İlk gönderini yaz',
      rewardLabelDe: '+3 Tickets',
      rewardLabelTr: '+3 Bilet',
      href: '/community',
    },
    {
      action: 'follow_club',
      completed: stats.followedClubs > 0,
      labelDe: 'Folge einem Club',
      labelTr: 'Bir kulübü takip et',
      rewardLabelDe: 'Fan-Rang aktiviert',
      rewardLabelTr: 'Fan rütbesi aktif',
      href: '/clubs',
    },
  ];
}

// ─── Streak milestone check ──────────────────
export function getStreakMilestone(streakDays: number): StreakMilestone | null {
  // Return the milestone if user is exactly at a milestone day
  return STREAK_MILESTONES.find((m) => m.days === streakDays) ?? null;
}

/** Get the next upcoming milestone */
export function getNextStreakMilestone(streakDays: number): StreakMilestone | null {
  return STREAK_MILESTONES.find((m) => m.days > streakDays) ?? null;
}

// ─── Stage-specific suggested actions ────────
export function getSuggestedAction(
  stage: RetentionStage,
  stats: DbUserStats | null,
): SuggestedAction | null {
  switch (stage) {
    case 'new':
      return {
        key: 'explore_market',
        labelDe: 'Entdecke den Scout Card Marktplatz',
        labelTr: 'Scout Card pazarını keşfet',
        href: '/market',
      };
    case 'building':
      return {
        key: 'join_fantasy',
        labelDe: 'Melde dich fuer ein Fantasy-Event an',
        labelTr: 'Bir fantezi etkinliğine katıl',
        href: '/fantasy',
      };
    case 'deepening': {
      const hasLowScore = (stats?.scout_score ?? 0) < 100;
      if (hasLowScore) {
        return {
          key: 'write_research',
          labelDe: 'Schreibe deine erste Analyse',
          labelTr: 'İlk analizini yaz',
          href: '/community',
        };
      }
      return {
        key: 'check_scoreroad',
        labelDe: 'Pruefe deinen ScoreRoad-Fortschritt',
        labelTr: 'ScoreRoad ilerlemeni kontrol et',
        href: '/profile',
      };
    }
    case 'evangelist':
      return {
        key: 'invite_friends',
        labelDe: 'Lade Freunde ein und verdiene 500 CR',
        labelTr: 'Arkadaşlarını davet et ve 500 CR kazan',
        href: '/profile/settings',
      };
    case 'sustained':
      return null; // Sustained users know what they're doing
  }
}

// ─── Full context builder ────────────────────
export function getRetentionContext(params: {
  createdAt: string;
  streakDays: number;
  userStats: DbUserStats | null;
  holdingsCount: number;
  eventsJoined: number;
  challengesCompleted: number;
  postsCount: number;
  followedClubs: number;
}): RetentionContext {
  const daysSinceJoin = getDaysSinceJoin(params.createdAt);
  const stage = getRetentionStage(daysSinceJoin);

  const onboarding =
    stage === 'new' || stage === 'building'
      ? getOnboardingProgress({
          holdingsCount: params.holdingsCount,
          eventsJoined: params.eventsJoined,
          challengesCompleted: params.challengesCompleted,
          postsCount: params.postsCount,
          followedClubs: params.followedClubs,
        })
      : null;

  return {
    stage,
    daysSinceJoin,
    onboarding,
    streakMilestone: getStreakMilestone(params.streakDays),
    suggestedAction: getSuggestedAction(stage, params.userStats),
  };
}
