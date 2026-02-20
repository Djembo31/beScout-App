import Link from 'next/link';
import {
  Shield,
  Compass,
  Briefcase,
  Zap,
  Activity,
  Users,
  MessageCircle,
  Star,
  Trophy,
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { PlayerDisplay } from '@/components/player/PlayerRow';
import { cn } from '@/lib/utils';
import { formatScout } from '@/lib/services/wallet';
import { getActivityLabel, getRelativeTime } from '@/lib/activityHelpers';
import { useToast } from '@/components/providers/ToastProvider';
import { SectionHeader, FEED_ICON_MAP, renderActivityIcon, getActivityColorLocal } from './helpers';
import dynamic from 'next/dynamic';
import { getFanTier } from '@/types';
import { FEED_ACTION_LABELS } from '@/types';
import { useTranslations } from 'next-intl';
import type { DbClub, DpcHolding, DbTransaction, FeedItem, DbUserStats, Pos } from '@/types';
import type { DpcOfTheWeek } from '@/lib/services/dpcOfTheWeek';
import type { ScoutMission } from '@/lib/services/scoutMissions';
import type { UserScoutMission } from '@/lib/services/scoutMissions';

const MissionBanner = dynamic(() => import('@/components/missions/MissionBanner'), { ssr: false });
const ScoutMissionCard = dynamic(() => import('@/components/missions/ScoutMissionCard'), { ssr: false });
const AirdropScoreCard = dynamic(() => import('@/components/airdrop/AirdropScoreCard'), { ssr: false });

interface MeinStandTabProps {
  uid?: string;
  holdings: DpcHolding[];
  transactions: DbTransaction[];
  followingFeed: FeedItem[];
  followerCount: number;
  followingCount: number;
  followedClubs: DbClub[];
  dpcOfWeek: DpcOfTheWeek | null;
  scoutMissions: ScoutMission[];
  missionProgress: UserScoutMission[];
  userStats: DbUserStats | null;
  onFollowListOpen: (mode: 'followers' | 'following') => void;
}

export default function MeinStandTab({
  uid, holdings, transactions, followingFeed, followerCount, followingCount,
  followedClubs, dpcOfWeek, scoutMissions, missionProgress, userStats, onFollowListOpen,
}: MeinStandTabProps) {
  const t = useTranslations('home');
  const tc = useTranslations('common');
  const { addToast } = useToast();

  return (
    <div className="space-y-5">
      {/* Meine Vereine */}
      {followedClubs.length > 0 && (
        <div>
          <SectionHeader title={t('myClubs')} href="/clubs" />
          <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            {followedClubs.map(club => {
              const color = club.primary_color ?? '#FFD700';
              return (
                <Link
                  key={club.id}
                  href={`/club/${club.slug}`}
                  className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl hover:bg-white/[0.06] hover:border-white/15 transition-all shrink-0"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    {club.logo_url ? (
                      <img src={club.logo_url} alt="" className="w-5 h-5 object-contain" />
                    ) : (
                      <Shield className="w-3.5 h-3.5" style={{ color }} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate max-w-[100px]">{club.name}</div>
                    <div className="text-[10px] text-white/30">{club.league}</div>
                  </div>
                </Link>
              );
            })}
            <Link
              href="/clubs"
              className="flex items-center gap-2 px-3 py-2 bg-[#FFD700]/[0.03] border border-[#FFD700]/10 rounded-xl hover:bg-[#FFD700]/[0.06] transition-all shrink-0"
            >
              <Compass className="w-4 h-4 text-[#FFD700]/60" />
              <span className="text-xs font-medium text-[#FFD700]/60">{t('discover')}</span>
            </Link>
          </div>
        </div>
      )}

      {/* Holdings Top 5 */}
      <div>
        <SectionHeader title={t('myRoster')} href="/market?tab=portfolio" />
        <div className="mt-3 space-y-1.5">
          {holdings.length === 0 ? (
            <Card className="p-6 text-center">
              <Briefcase className="w-10 h-10 mx-auto mb-2 text-white/20" />
              <div className="text-sm font-medium text-white/50">{t('emptyPortfolioTitle')}</div>
              <div className="text-xs text-white/30 mt-1">{t('emptyPortfolioDesc')}</div>
              <Link href="/market?tab=kaufen" className="inline-block mt-3">
                <Button variant="gold" size="sm" className="gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  {t('buyFirstPlayer')}
                </Button>
              </Link>
            </Card>
          ) : (
            holdings.slice(0, 5).map((h) => (
              <PlayerDisplay key={h.id} variant="compact"
                player={{
                  id: h.playerId,
                  first: h.player.split(' ')[0] || '',
                  last: h.player.split(' ').slice(1).join(' ') || '',
                  club: h.club,
                  pos: h.pos,
                  age: h.age,
                  ticket: h.ticket,
                  status: 'fit' as const,
                  contractMonthsLeft: 24,
                  country: '',
                  league: '',
                  isLiquidated: false,
                  imageUrl: h.imageUrl,
                  stats: { matches: h.matches, goals: h.goals, assists: h.assists },
                  perf: { l5: h.perfL5, l15: 0, trend: 'FLAT' as const },
                  prices: { lastTrade: 0, floor: h.floor, change24h: h.change24h },
                  dpc: { supply: 0, float: 0, circulation: 0, onMarket: 0, owned: h.qty },
                  ipo: { status: 'none' as const },
                  listings: [],
                  topOwners: [],
                }}
                holding={{ quantity: h.qty, avgBuyPriceBsd: h.avgBuy }}
                showActions={false}
              />
            ))
          )}
          {holdings.length > 5 && (
            <Link href="/market?tab=portfolio" className="block text-center py-2 text-xs text-[#FFD700] hover:underline">
              {t('viewAllPlayers', { count: holdings.length })}
            </Link>
          )}
        </div>
      </div>

      {/* Aktivität */}
      <div>
        <SectionHeader title={t('activity')} />
        <div className="mt-3 space-y-0.5">
          {transactions.length === 0 ? (
            <Card className="p-6 text-center">
              <Activity className="w-6 h-6 mx-auto mb-2 text-white/15" />
              <div className="text-sm text-white/40">{t('noActivity')}</div>
            </Card>
          ) : (
            transactions.slice(0, 5).map((tx) => {
              const positive = tx.amount > 0;
              return (
                <div key={tx.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors">
                  <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mt-0.5', getActivityColorLocal(tx.type))}>
                    {renderActivityIcon(tx.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium leading-snug">{getActivityLabel(tx)}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn('text-xs font-mono font-bold', positive ? 'text-[#22C55E]' : 'text-white/40')}>
                        {positive ? '+' : ''}{formatScout(tx.amount)} $SCOUT
                      </span>
                      <span className="text-[10px] text-white/25">· {getRelativeTime(tx.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {transactions.length > 5 && (
            <Link href="/profile" className="block text-center py-2 text-xs text-[#FFD700] hover:underline">
              {t('viewAllActivity')}
            </Link>
          )}
        </div>
      </div>

      {/* Following Feed */}
      <div>
        <div className="flex items-center justify-between">
          <SectionHeader title={t('whatYourScoutsDo')} badge={followingFeed.length > 0 ?
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/25">
              <Users className="w-3 h-3 text-sky-400" />
              <span className="text-[10px] font-bold text-sky-300">{followingFeed.length}</span>
            </span> : undefined
          } />
          {(followerCount > 0 || followingCount > 0) && (
            <button
              onClick={() => onFollowListOpen('following')}
              className="text-[10px] font-bold text-[#FFD700]/60 hover:text-[#FFD700] transition-colors"
            >
              {tc('manage')}
            </button>
          )}
        </div>
        {/* Network counts */}
        <div className="flex items-center gap-3 mt-1.5 mb-2">
          <button
            onClick={() => onFollowListOpen('followers')}
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            <span className="font-bold text-white/60">{followerCount}</span> Follower
          </button>
          <span className="text-white/10">·</span>
          <button
            onClick={() => onFollowListOpen('following')}
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            <span className="font-bold text-white/60">{followingCount}</span> Folge ich
          </button>
        </div>
        {followingFeed.length > 0 ? (
          <div className="mt-3 space-y-0.5">
            {followingFeed.slice(0, 8).map(item => {
              const feedIcon = FEED_ICON_MAP[item.action] ?? { Icon: Activity, color: 'text-white/50 bg-white/5' };
              const FIcon = feedIcon.Icon;
              const label = FEED_ACTION_LABELS[item.action] ?? item.action;
              const dName = item.displayName ?? item.handle;
              return (
                <Link key={item.id} href={`/profile/${item.handle}`} className="block">
                  <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors">
                    <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mt-0.5', feedIcon.color)}>
                      <FIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm leading-snug">
                        <span className="font-bold text-white/80">{dName}</span>
                        <span className="text-white/40 ml-1">{label}</span>
                      </div>
                      <div className="text-[10px] text-white/25 mt-0.5">{getRelativeTime(item.createdAt)}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
            <Users className="w-6 h-6 text-white/20 mx-auto mb-2" />
            <div className="text-xs text-white/40">{t('followScoutsHint')}</div>
            <Link href="/community" className="text-xs text-[#FFD700]/70 hover:text-[#FFD700] mt-1 inline-block">
              {t('discoverCommunity')}
            </Link>
          </div>
        )}
      </div>

      {/* DPC der Woche */}
      {dpcOfWeek && (
        <div>
          <SectionHeader title={t('dpcOfTheWeek')} badge={
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFD700]/15 border border-[#FFD700]/25">
              <Trophy className="w-3 h-3 text-[#FFD700]" />
              <span className="text-[10px] font-bold text-[#FFD700]">GW {dpcOfWeek.gameweek}</span>
            </span>
          } />
          <Link href={`/player/${dpcOfWeek.playerId}`} className="block mt-3">
            <div className="relative overflow-hidden rounded-2xl border border-[#FFD700]/30 bg-gradient-to-br from-[#FFD700]/10 via-[#FFD700]/5 to-transparent">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#FFD700]/20 border border-[#FFD700]/30 flex items-center justify-center">
                  <Star className="w-7 h-7 text-[#FFD700]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#FFD700] mb-0.5">{t('bestPlayer')}</div>
                  <div className="font-black text-lg truncate">{dpcOfWeek.playerFirstName} {dpcOfWeek.playerLastName}</div>
                  <div className="text-xs text-white/50">{dpcOfWeek.playerClub} • {dpcOfWeek.holderCount} {t('owners')}</div>
                  <div className="text-[10px] text-[#FFD700]/50 flex items-center gap-1 mt-0.5">
                    <MessageCircle className="w-3 h-3" />
                    {t('whatSayScouts')}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-2xl font-mono font-black text-[#FFD700]">{dpcOfWeek.score}</div>
                  <div className="text-[10px] text-white/40">Punkte</div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Missionen */}
      <MissionBanner />

      {/* Airdrop Score */}
      {uid && <AirdropScoreCard userId={uid} />}

      {/* Scout Missions */}
      {scoutMissions.length > 0 && (
        <div>
          <SectionHeader
            title={t('scoutMissions')}
            badge={
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/25">
                <span className="text-[10px] font-bold text-sky-300">{scoutMissions.length} aktiv</span>
              </span>
            }
          />
          <div className="mt-3 space-y-3">
            {scoutMissions.slice(0, 3).map(m => (
              <ScoutMissionCard
                key={m.id}
                mission={m}
                progress={missionProgress.find(p => p.missionId === m.id)}
                userTier={getFanTier(userStats?.total_score ?? 0)}
                onSubmit={() => addToast('Spieler-Einreichung kommt bald!', 'info')}
                onClaim={() => addToast('Belohnung wird abgeholt...', 'info')}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
