'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Zap, Flame, Star, ChevronDown, ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { PositionBadge } from '@/components/player';
import { PlayerDisplay } from '@/components/player/PlayerRow';
import { fmtBSD, cn } from '@/lib/utils';
import type { Player, Pos } from '@/types';
import type { IpoDisplayData } from '@/components/player/PlayerRow';
import type { TrendingPlayer } from '@/lib/services/trading';
import type { ClubLookup } from '@/lib/clubs';

// ============================================
// TYPES
// ============================================

export type IPOClubGroup = {
  clubName: string;
  clubData: ClubLookup | null;
  items: { player: Player; ipo: IpoDisplayData }[];
  avgL5: number;
  maxProgress: number;
  posCounts: Record<Pos, number>;
};

interface KaufenIPOSectionProps {
  clubGroups: IPOClubGroup[];
  suggestions: { player: Player; ipo: IpoDisplayData }[];
  trending: TrendingPlayer[];
  watchlist: Record<string, boolean>;
  onWatch: (id: string) => void;
  buyingId: string | null;
  followedClubNames: Set<string>;
  enrichLoading: boolean;
  /** 'grid' = card view (original), 'list' = club accordion */
  view: 'grid' | 'list';
  /** Flat filtered IPO list for card grid view */
  filteredIPOs: { player: Player; ipo: IpoDisplayData }[];
}

// ============================================
// CONSTANTS
// ============================================

const POS_ORDER: Record<Pos, number> = { GK: 0, DEF: 1, MID: 2, ATT: 3 };
const POS_LABELS: Record<Pos, string> = { GK: 'Torwart', DEF: 'Abwehr', MID: 'Mittelfeld', ATT: 'Angriff' };

const posChipColors: Record<Pos, { bg: string; text: string }> = {
  GK: { bg: 'bg-emerald-500/20', text: 'text-emerald-300' },
  DEF: { bg: 'bg-amber-500/20', text: 'text-amber-300' },
  MID: { bg: 'bg-sky-500/20', text: 'text-sky-300' },
  ATT: { bg: 'bg-rose-500/20', text: 'text-rose-300' },
};

// ============================================
// COMPONENT
// ============================================

export default function KaufenIPOSection({
  clubGroups,
  suggestions,
  trending,
  watchlist,
  onWatch,
  buyingId,
  followedClubNames,
  enrichLoading,
  view,
  filteredIPOs,
}: KaufenIPOSectionProps) {

  // Auto-expand: followed clubs by default, otherwise first club
  const [expandedIPOClubs, setExpandedIPOClubs] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const g of clubGroups) {
      if (followedClubNames.has(g.clubName)) initial.add(g.clubName);
    }
    if (initial.size === 0 && clubGroups.length > 0) initial.add(clubGroups[0].clubName);
    return initial;
  });

  const toggleClubExpand = (clubName: string) => {
    setExpandedIPOClubs(prev => {
      const next = new Set(prev);
      next.has(clubName) ? next.delete(clubName) : next.add(clubName);
      return next;
    });
  };

  const allExpanded = clubGroups.length > 0 && clubGroups.every(g => expandedIPOClubs.has(g.clubName));

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedIPOClubs(new Set());
    } else {
      setExpandedIPOClubs(new Set(clubGroups.map(g => g.clubName)));
    }
  };

  const totalLiveCount = useMemo(
    () => clubGroups.reduce((sum, g) => sum + g.items.length, 0),
    [clubGroups]
  );

  // Group players by position within an expanded club
  const getPositionGroups = (items: { player: Player; ipo: IpoDisplayData }[]) => {
    const groups = new Map<Pos, { player: Player; ipo: IpoDisplayData }[]>();
    for (const item of items) {
      const arr = groups.get(item.player.pos) ?? [];
      arr.push(item);
      groups.set(item.player.pos, arr);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => POS_ORDER[a] - POS_ORDER[b]);
  };

  const isGrid = view === 'grid';

  return (
    <div className="space-y-4">
      {/* ── A. Empfehlungen-Strip ── */}
      {suggestions.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="w-3.5 h-3.5 text-[#FFD700]" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[#FFD700]/80">Empfehlungen</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-2">
            {suggestions.map(({ player: p, ipo }) => {
              const l5 = p.perf.l5;
              const l5Color = l5 >= 65 ? 'text-emerald-300' : l5 >= 45 ? 'text-amber-300' : l5 > 0 ? 'text-red-300' : 'text-white/50';
              return (
                <Link
                  key={p.id}
                  href={`/player/${p.id}`}
                  className="flex-shrink-0 w-[140px] bg-white/[0.03] border border-white/[0.08] rounded-xl p-2.5 hover:bg-white/[0.06] transition-all group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <PositionBadge pos={p.pos} size="sm" />
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onWatch(p.id); }}
                      className={cn('p-0.5 rounded transition-colors', watchlist[p.id] ? 'text-[#FFD700]' : 'text-white/20 hover:text-white/40')}
                    >
                      <Star className="w-3 h-3" fill={watchlist[p.id] ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  <div className="font-bold text-xs truncate group-hover:text-[#FFD700] transition-colors">
                    {p.first} {p.last}
                  </div>
                  <div className="text-[10px] text-white/40 truncate">
                    {p.club}
                    {p.ticket > 0 && <span className="font-mono text-white/25"> #{p.ticket}</span>}
                    {p.age > 0 && <> · {p.age}J.</>}
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className={cn('font-mono font-bold text-xs', l5Color)}>L5: {l5}</span>
                    <span className="font-mono font-bold text-xs text-[#FFD700]">{fmtBSD(ipo.price)}</span>
                  </div>
                  {/* Mini progress bar */}
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <div className="flex-1 h-1 bg-black/30 rounded-full overflow-hidden">
                      <div className="h-full bg-[#22C55E] rounded-full" style={{ width: `${ipo.progress}%` }} />
                    </div>
                    <span className="text-[9px] font-mono text-white/30">{ipo.progress.toFixed(0)}%</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── B. Trending Strip ── */}
      {trending.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-3">
          <div className="flex items-center gap-1.5 shrink-0">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-400/80">Trending</span>
          </div>
          {trending.map(t => {
            const up = t.change24h >= 0;
            return (
              <Link key={t.playerId} href={`/player/${t.playerId}`}
                className="flex items-center gap-2.5 px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.06] transition-all shrink-0"
              >
                <PositionBadge pos={t.position} size="sm" />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{t.firstName} {t.lastName}</div>
                  <div className="text-[10px] text-white/40 flex items-center gap-1">{t.tradeCount} Trades · <MessageSquare className="w-2.5 h-2.5 text-white/20" /></div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-mono font-bold text-[#FFD700]">{fmtBSD(t.floorPrice)}</div>
                  <div className={`text-[10px] font-mono ${up ? 'text-[#22C55E]' : 'text-red-300'}`}>
                    {up ? '+' : ''}{t.change24h.toFixed(1)}%
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── C. Club Sales Header ── */}
      {(filteredIPOs.length > 0 || clubGroups.length > 0 || enrichLoading) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#22C55E]" />
            <span className="text-sm font-black uppercase tracking-wider">Club Sales (IPO)</span>
            <span className="px-1.5 py-0.5 bg-[#22C55E]/20 text-[#22C55E] text-[10px] font-bold rounded-full">
              {totalLiveCount} Live
            </span>
          </div>
          {!isGrid && clubGroups.length > 1 && (
            <button
              onClick={toggleAll}
              className="text-[11px] text-white/40 hover:text-white/70 transition-colors"
            >
              {allExpanded ? 'Alle zuklappen' : 'Alle aufklappen'}
            </button>
          )}
        </div>
      )}

      {/* ── D. Card Grid (view=grid) OR Club Accordion (view=list) ── */}
      {enrichLoading && filteredIPOs.length === 0 && clubGroups.length === 0 ? (
        <div className={isGrid
          ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3'
          : 'space-y-2'
        }>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={cn(
              'animate-pulse bg-white/[0.02] border border-white/10 rounded-2xl',
              isGrid ? 'h-[170px]' : 'h-[56px]'
            )} />
          ))}
        </div>
      ) : isGrid ? (
        /* ── Card Grid (original view) ── */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredIPOs.map(({ player: p, ipo }) => (
            <PlayerDisplay key={p.id} variant="card" player={p}
              ipoData={ipo}
              isWatchlisted={watchlist[p.id]} onWatch={() => onWatch(p.id)} />
          ))}
        </div>
      ) : (
        /* ── Club Accordion (new list view) ── */
        <div className="space-y-1.5">
          {clubGroups.map(({ clubName, clubData, items, avgL5, posCounts }) => {
            const isExpanded = expandedIPOClubs.has(clubName);
            const primaryColor = clubData?.colors.primary ?? '#666';
            const posGroups = isExpanded ? getPositionGroups(items) : [];

            return (
              <div key={clubName} className="border border-white/[0.06] rounded-2xl overflow-hidden">
                {/* Collapsed club header */}
                <button
                  onClick={() => toggleClubExpand(clubName)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-all"
                  style={{ borderLeft: `3px solid ${primaryColor}` }}
                >
                  {clubData?.logo ? (
                    <img src={clubData.logo} alt={clubName} className="w-5 h-5 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full shrink-0 border border-white/10" style={{ backgroundColor: primaryColor }} />
                  )}
                  <span className="font-bold text-sm">{clubName}</span>
                  {clubData && <span className="text-[10px] font-mono text-white/30">{clubData.short}</span>}

                  {/* Position count chips */}
                  <div className="hidden sm:flex items-center gap-1 ml-1">
                    {(['GK', 'DEF', 'MID', 'ATT'] as Pos[]).map(pos => {
                      const count = posCounts[pos] ?? 0;
                      if (count === 0) return null;
                      const c = posChipColors[pos];
                      return (
                        <span key={pos} className={cn('px-1 py-0.5 rounded text-[9px] font-bold', c.bg, c.text)}>
                          {pos}{count}
                        </span>
                      );
                    })}
                  </div>

                  <span className="text-xs text-white/40 ml-auto mr-1">{items.length} IPOs</span>
                  <span className="text-[10px] text-white/30 mr-2 hidden sm:inline">
                    {'\u00D8'} L5: {avgL5}
                  </span>
                  {isExpanded
                    ? <ChevronDown className="w-4 h-4 text-white/30" />
                    : <ChevronRight className="w-4 h-4 text-white/30" />
                  }
                </button>

                {/* Expanded: compact rows grouped by position */}
                {isExpanded && (
                  <div className="border-t border-white/[0.06]">
                    <div className="p-1.5 space-y-0.5">
                      {posGroups.map(([pos, posItems]) => (
                        <div key={pos}>
                          {/* Position sub-header */}
                          <div className="flex items-center gap-2 px-3 py-1">
                            <div className="h-px flex-1 bg-white/5" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-white/25">
                              {POS_LABELS[pos]} ({posItems.length})
                            </span>
                            <div className="h-px flex-1 bg-white/5" />
                          </div>
                          {posItems.map(({ player, ipo }) => (
                            <PlayerDisplay
                              key={player.id}
                              variant="compact"
                              player={player}
                              ipoData={ipo}
                              isWatchlisted={watchlist[player.id]}
                              onWatch={() => onWatch(player.id)}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {filteredIPOs.length === 0 && clubGroups.length === 0 && !enrichLoading && (
        <Card className="p-12 text-center">
          <Zap className="w-12 h-12 mx-auto mb-4 text-white/20" />
          <div className="text-white/30 mb-2">Keine aktiven Club Sales</div>
          <div className="text-sm text-white/50">Aktuell sind keine IPOs verfügbar.</div>
        </Card>
      )}
    </div>
  );
}
