import Link from 'next/link';
import {
  Clock,
  Trophy,
  Users,
  MessageCircle,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownRight,
  Rocket,
} from 'lucide-react';
import { PositionBadge } from '@/components/player';
import { PlayerDisplay } from '@/components/player/PlayerRow';
import { fmtBSD } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { getRelativeTime } from '@/lib/activityHelpers';
import { SectionHeader, formatPrize, getTimeUntil } from './helpers';
import { useTranslations } from 'next-intl';
import type { Player, DbEvent, DbOrder } from '@/types';
import type { GlobalTrade } from '@/lib/services/trading';

interface AktuellTabProps {
  nextEvent: DbEvent | null;
  activeIPOs: Player[];
  recentTrades: GlobalTrade[];
  topGainers: Player[];
  topLosers: Player[];
  recentListings: { order: DbOrder; player: Player }[];
}

export default function AktuellTab({
  nextEvent, activeIPOs, recentTrades, topGainers, topLosers, recentListings,
}: AktuellTabProps) {
  const t = useTranslations('home');

  return (
    <div className="space-y-5">

      {/* Nächstes Event */}
      {nextEvent && (
        <div>
          <SectionHeader
            title={t('nextEvent')}
            href="/fantasy"
            badge={
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-400/25">
                <Clock className="w-3 h-3 text-purple-400" />
                <span className="text-[10px] font-bold text-purple-300">
                  {nextEvent.status === 'running' ? getTimeUntil(nextEvent.ends_at) : getTimeUntil(nextEvent.starts_at)}
                </span>
              </span>
            }
          />
          <Link href="/fantasy" className="block mt-3">
            <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-600/10 via-purple-500/5 to-transparent">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="w-4 h-4 text-purple-400" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">{nextEvent.format}</span>
                    </div>
                    <h3 className="text-base md:text-lg font-black">{nextEvent.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {nextEvent.current_entries}/{nextEvent.max_entries ?? '∞'}
                      </span>
                      <span>Eintritt: {nextEvent.entry_fee === 0 ? 'Gratis' : `${fmtBSD(centsToBsd(nextEvent.entry_fee))} BSD`}</span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5" />
                        {t('discussion')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-white/40 mb-0.5">Preisgeld</div>
                    <div className="text-xl md:text-2xl font-black font-mono text-[#FFD700]">
                      {formatPrize(centsToBsd(nextEvent.prize_pool))}
                    </div>
                    <div className="text-[10px] text-white/40">BSD</div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* IPO Banner */}
      {activeIPOs.length > 0 && (
        <Link href={`/player/${activeIPOs[0].id}`} className="block">
          <div className="relative overflow-hidden rounded-2xl border border-[#22C55E]/20 bg-gradient-to-r from-[#22C55E]/[0.08] via-transparent to-[#FFD700]/[0.04]">
            <div className="relative flex items-center justify-between p-4 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-[#22C55E]/15 border border-[#22C55E]/25 shrink-0">
                  <Rocket className="w-5 h-5 text-[#22C55E]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#22C55E]">{t('liveIPO')}</span>
                    <span className="text-[9px] text-white/30 font-bold">{t('onlyForFans')}</span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]" />
                    </span>
                  </div>
                  <div className="font-black text-sm truncate">
                    {activeIPOs.map((p) => `${p.first} ${p.last}`).join(', ')}
                  </div>
                  <div className="text-xs text-white/50 truncate">
                    {activeIPOs[0].club} · {activeIPOs[0].ipo.progress}% {t('sold')}
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono font-black text-[#FFD700] text-lg">{activeIPOs[0].ipo.price}</div>
                <div className="text-[10px] text-white/40">BSD/DPC</div>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Live Trades */}
      {recentTrades.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ArrowRightLeft className="w-3.5 h-3.5 text-[#FFD700]/60" />
            <span className="text-[10px] font-black uppercase tracking-wider text-white/30">{t('recentTrades')}</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            {recentTrades.map(tr => (
              <Link
                key={tr.id}
                href={`/player/${tr.playerId}`}
                className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:bg-white/[0.04] transition-all shrink-0"
              >
                <PositionBadge pos={tr.playerPos} size="sm" />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold truncate max-w-[120px]">{tr.playerName}</div>
                  <div className="text-[10px] text-white/30" title={new Date(tr.executedAt).toLocaleString('de-DE')}>{getRelativeTime(tr.executedAt)}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] font-mono font-bold text-[#FFD700]">{fmtBSD(centsToBsd(tr.price))}</div>
                  <div className="text-[9px] text-white/25 flex items-center gap-1">{tr.quantity}x · {tr.isP2P ? t('p2p') : 'IPO'} <MessageCircle className="w-2.5 h-2.5 text-white/15" /></div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Marktbewegungen */}
      <div>
        <SectionHeader title={t('marketMovements')} href="/market" />
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-bold text-[#22C55E] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {t('winners24h')}
            </div>
            <div className="space-y-2">
              {topGainers.map((p, i) => (
                <PlayerDisplay variant="compact" key={p.id} player={p} rank={i + 1} showSparkline />
              ))}
              {topGainers.length === 0 && (
                <div className="text-sm text-white/30 p-3 text-center rounded-xl bg-white/[0.02]">{t('noWinnersToday')}</div>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <ArrowDownRight className="w-3.5 h-3.5" />
              {t('losers24h')}
            </div>
            <div className="space-y-2">
              {topLosers.map((p, i) => (
                <PlayerDisplay variant="compact" key={p.id} player={p} rank={i + 1} showSparkline />
              ))}
              {topLosers.length === 0 && (
                <div className="text-sm text-white/30 p-3 text-center rounded-xl bg-white/[0.02]">{t('noLosersToday')}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Neue Angebote */}
      {recentListings.length > 0 && (
        <div>
          <SectionHeader title={t('newOffers')} href="/market" />
          <div className="mt-3 space-y-2">
            {recentListings.slice(0, 4).map(({ order, player }) => (
              <Link
                key={order.id}
                href={`/player/${player.id}`}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-[#FFD700]/20 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <PositionBadge pos={player.pos} size="sm" />
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate">{player.first} {player.last}</div>
                    <div className="text-[11px] text-white/40">{player.club} · {order.quantity} DPC</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-[#FFD700] text-sm">{fmtBSD(centsToBsd(order.price))} BSD</div>
                  <div className="text-[10px] text-white/30">{getRelativeTime(order.created_at)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
