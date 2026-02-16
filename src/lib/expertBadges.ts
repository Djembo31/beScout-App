import type { DbUserStats } from '@/types';

export type ExpertBadge = {
  key: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  earned: boolean;
  progress: number; // 0-100
};

export function getExpertBadges(stats: DbUserStats): ExpertBadge[] {
  return [
    {
      key: 'trading_expert',
      label: 'Trading-Experte',
      description: 'Trading Score von mindestens 500 erreichen',
      icon: 'TrendingUp',
      color: 'text-sky-300',
      bgColor: 'bg-sky-500/15 border-sky-500/20',
      earned: stats.trading_score >= 500,
      progress: Math.min(100, Math.round((stats.trading_score / 500) * 100)),
    },
    {
      key: 'fantasy_pro',
      label: 'Fantasy-Profi',
      description: 'Manager Score von mindestens 500 erreichen',
      icon: 'Trophy',
      color: 'text-purple-300',
      bgColor: 'bg-purple-500/15 border-purple-500/20',
      earned: stats.manager_score >= 500,
      progress: Math.min(100, Math.round((stats.manager_score / 500) * 100)),
    },
    {
      key: 'star_scout',
      label: 'Star Scout',
      description: 'Scout Score von mindestens 500 erreichen',
      icon: 'Search',
      color: 'text-emerald-300',
      bgColor: 'bg-emerald-500/15 border-emerald-500/20',
      earned: stats.scout_score >= 500,
      progress: Math.min(100, Math.round((stats.scout_score / 500) * 100)),
    },
    {
      key: 'top_10',
      label: 'Top 10',
      description: 'Unter die Top 10 im Leaderboard kommen',
      icon: 'Award',
      color: 'text-[#FFD700]',
      bgColor: 'bg-[#FFD700]/15 border-[#FFD700]/20',
      earned: stats.rank > 0 && stats.rank <= 10,
      progress: stats.rank > 0 ? Math.min(100, Math.round(Math.max(0, (1 - (stats.rank - 1) / 30)) * 100)) : 0,
    },
    {
      key: 'community_voice',
      label: 'Community Voice',
      description: 'Mindestens 20 Follower gewinnen',
      icon: 'Users',
      color: 'text-rose-300',
      bgColor: 'bg-rose-500/15 border-rose-500/20',
      earned: stats.followers_count >= 20,
      progress: Math.min(100, Math.round((stats.followers_count / 20) * 100)),
    },
    {
      key: 'rising_star',
      label: 'Aufsteiger',
      description: 'Total Score ≥ 300 und Rang ≤ 30 erreichen',
      icon: 'Zap',
      color: 'text-amber-300',
      bgColor: 'bg-amber-500/15 border-amber-500/20',
      earned: stats.total_score >= 300 && stats.rank > 0 && stats.rank <= 30,
      progress: Math.min(100, Math.round((stats.total_score / 300) * 100)),
    },
  ];
}
