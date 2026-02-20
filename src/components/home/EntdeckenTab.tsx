import Link from 'next/link';
import {
  Zap,
  MessageCircle,
  ChevronRight,
  ArrowRightLeft,
  Activity,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { PlayerIdentity, PlayerKPIs } from '@/components/player';
import { fmtScout, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { getRelativeTime } from '@/lib/activityHelpers';
import { SectionHeader } from './helpers';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import type { Player, LeaderboardUser, PostWithAuthor } from '@/types';
import type { TopTrader } from '@/lib/services/trading';

const AirdropScoreCard = dynamic(() => import('@/components/airdrop/AirdropScoreCard'), { ssr: false });
const ReferralCard = dynamic(() => import('@/components/airdrop/ReferralCard'), { ssr: false });

interface EntdeckenTabProps {
  uid?: string;
  bargains: { player: Player; floor: number; valueRatio: number }[];
  communityPosts: PostWithAuthor[];
  topScouts: LeaderboardUser[];
  topTraders: TopTrader[];
}

export default function EntdeckenTab({
  uid, bargains, communityPosts, topScouts, topTraders,
}: EntdeckenTabProps) {
  const t = useTranslations('home');
  const tg = useTranslations('gamification');

  return (
    <div className="space-y-5">

      {/* Unter Wert / Bargains */}
      {bargains.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3.5 h-3.5 text-[#22C55E]/60" />
            <span className="text-[10px] font-black uppercase tracking-wider text-white/30">{t('undervalued')}</span>
            <span className="text-[9px] text-white/20 ml-auto">{t('highPerfLowPrice')}</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            {bargains.map(({ player: p }) => (
              <Link
                key={p.id}
                href={`/player/${p.id}`}
                className="flex items-center gap-2.5 px-3 py-2.5 bg-[#22C55E]/[0.03] border border-[#22C55E]/10 rounded-xl hover:bg-[#22C55E]/[0.06] transition-all shrink-0 min-w-[220px]"
              >
                <PlayerIdentity player={p} size="sm" showMeta={false} showStatus={false} />
                <div className="shrink-0 ml-auto">
                  <PlayerKPIs player={p} context="market" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Community Highlights */}
      {communityPosts.length > 0 && (
        <div>
          <SectionHeader title={t('communityHighlights')} href="/community" />
          <div className="mt-3 space-y-2">
            {communityPosts.slice(0, 3).map(post => (
              <Link key={post.id} href={`/profile/${post.author_handle}`} className="block">
                <Card className="p-3 hover:bg-white/[0.04] transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFD700]/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-[10px] font-black shrink-0">
                      {(post.author_display_name || post.author_handle || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold">{post.author_display_name || post.author_handle}</span>
                        {post.category && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/5 text-white/40 border border-white/10">{post.category}</span>
                        )}
                        <span className="text-[10px] text-white/25 ml-auto shrink-0">{getRelativeTime(post.created_at)}</span>
                      </div>
                      <div className="text-xs text-white/60 line-clamp-2">{post.content}</div>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/30">
                        <span>&#9650; {post.upvotes}</span>
                        {post.replies_count > 0 && <span>{post.replies_count} {t('replies')}</span>}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
            <Link href="/community" className="block mt-3 text-center">
              <div className="py-2.5 px-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-[#FFD700]/20 transition-all text-xs font-bold text-[#FFD700]/70 hover:text-[#FFD700] flex items-center justify-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" />
                {t('viewAllPosts')}
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Top Scouts */}
      {topScouts.length > 0 && (
        <div>
          <SectionHeader title={t('topScouts')} href="/community" />
          <div className="mt-3 space-y-1.5">
            {topScouts.slice(0, 5).map((s, i) => {
              const isMe = s.userId === uid;
              return (
                <Link key={s.userId} href={`/profile/${s.handle}`} className={cn(
                  'flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/[0.04] transition-colors',
                  isMe && 'bg-[#FFD700]/[0.06] border border-[#FFD700]/15'
                )}>
                  <span className={cn(
                    'w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black',
                    i === 0 ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'bg-white/5 text-white/50'
                  )}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold truncate">{s.displayName || s.handle}</span>
                      {(() => {
                        const best = [
                          { label: tg('dimension.trader'), score: s.tradingScore, cls: 'text-sky-300 bg-sky-500/15 border-sky-500/20' },
                          { label: tg('dimension.manager'), score: s.managerScore, cls: 'text-purple-300 bg-purple-500/15 border-purple-500/20' },
                          { label: tg('dimension.analyst'), score: s.scoutScore, cls: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/20' },
                        ].reduce((a, b) => a.score >= b.score ? a : b);
                        if (best.score < 100) return null;
                        return (
                          <span className={cn('px-1 py-0.5 rounded text-[9px] font-bold border', best.cls)}>
                            {best.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <span className="text-xs font-mono text-[#FFD700]">{s.totalScore}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Trader */}
      {topTraders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-[#22C55E]" />
              <span className="text-base md:text-lg font-black uppercase tracking-wide">{t('topTraders')}</span>
            </div>
            <span className="text-[10px] text-white/20">{t('sevenDays')}</span>
          </div>
          <div className="space-y-1.5">
            {topTraders.map((td, i) => {
              const isMe = td.userId === uid;
              return (
                <Link key={td.userId} href={`/profile/${td.handle}`} className={cn(
                  'flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/[0.04] transition-colors',
                  isMe && 'bg-[#22C55E]/[0.06] border border-[#22C55E]/15'
                )}>
                  <span className={cn(
                    'w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black',
                    i === 0 ? 'bg-[#22C55E]/20 text-[#22C55E]' : 'bg-white/5 text-white/50'
                  )}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{td.displayName || td.handle}</div>
                    <div className="text-[10px] text-white/30">{td.tradeCount} {t('trades')}</div>
                  </div>
                  <span className="text-xs font-mono text-[#22C55E]">{fmtScout(centsToBsd(td.totalVolume))}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Airdrop Score */}
      {uid && <AirdropScoreCard userId={uid} compact />}

      {/* Referral */}
      {uid && <ReferralCard userId={uid} />}
    </div>
  );
}
