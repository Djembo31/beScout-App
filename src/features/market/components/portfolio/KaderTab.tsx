'use client';

import React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Save, RotateCcw, Search, ChevronDown, X, ShoppingCart, Shield } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui';
import { PositionBadge, MatchIcon } from '@/components/player';
import { posTintColors } from '@/components/player/positionColors';
import { cn, fmtScout } from '@/lib/utils';
import { getClub } from '@/lib/clubs';
import { FormBars } from '@/components/player';
import SquadPitch from './SquadPitch';
import SquadSummaryStats from './SquadSummaryStats';
import { getPosColor } from './helpers';
import { useKaderState } from './useKaderState';
import type { Player, Pos } from '@/types';
import type { NextFixtureInfo } from '@/lib/services/fixtures';

// ============================================
// STATUS DOT (injury / suspension indicator on photo)
// ============================================

function StatusDot({ status }: { status: string }) {
  if (status === 'fit') return null;
  const bg = status === 'injured' ? 'bg-red-500' : status === 'suspended' ? 'bg-amber-500' : status === 'doubtful' ? 'bg-yellow-400' : null;
  if (!bg) return null;
  return <span className={cn('absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-[#0a0a0a]', bg)} />;
}

// ============================================
// PLAYER ROW — Fantasy-style (Photo + 4 info lines)
// Matches FantasyPlayerRow visual language
// ============================================

function ManagerPlayerRow({ player, scores, nextFixture, isAssigned, inLineupTitle }: {
  player: Player;
  scores: (number | null)[] | undefined;
  nextFixture: NextFixtureInfo | undefined;
  isAssigned: boolean;
  inLineupTitle: string;
}) {
  const t = useTranslations('market');
  const p = player;
  const tint = posTintColors[p.pos];
  const clubData = getClub(p.club);
  const opponentClub = nextFixture ? getClub(nextFixture.opponentShort) : null;
  const formEntries = (scores ?? []).map(s => ({
    score: s ?? 0,
    status: (s != null ? 'played' : 'not_in_squad') as 'played' | 'not_in_squad',
  }));

  return (
    <Link
      href={`/player/${p.id}`}
      className="w-full text-left px-3 py-2.5 transition-colors block border-l-2"
      style={{ borderLeftColor: isAssigned ? posTintColors[p.pos] : `${posTintColors[p.pos]}40` }}
    >
      <div className="flex gap-3">
        {/* Photo with position glow */}
        <div className="shrink-0 relative">
          <div
            className="size-12 rounded-full overflow-hidden border-2"
            style={{
              borderColor: `${tint}99`,
              boxShadow: `0 0 10px ${tint}30, inset 0 0 6px ${tint}15`,
            }}
          >
            {p.imageUrl ? (
              <img
                src={p.imageUrl}
                alt=""
                className="size-full object-cover"
                loading="lazy"
              />
            ) : (
              <div
                className="size-full flex items-center justify-center text-sm font-black text-white/60"
                style={{ backgroundColor: `${tint}22` }}
              >
                {p.first.charAt(0)}{p.last.charAt(0)}
              </div>
            )}
          </div>
          <StatusDot status={p.status} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Line 1: Name + Shirt + Lineup badge + FormBars + L5 */}
          <div className="flex items-center gap-1.5">
            <span className="font-black text-sm text-white truncate">
              {p.last.toUpperCase()}
            </span>
            <span className="font-mono text-xs text-white/30 tabular-nums shrink-0">
              #{p.ticket}
            </span>
            {isAssigned && (
              <span className="shrink-0" title={inLineupTitle}>
                <Shield className="size-3 text-green-500" aria-hidden="true" />
              </span>
            )}
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <FormBars entries={formEntries} />
              <div
                className="size-8 rounded-full flex items-center justify-center border-[1.5px]"
                style={{ backgroundColor: `${tint}33`, borderColor: `${tint}99` }}
              >
                <span className="font-mono font-black text-sm tabular-nums text-white/90">
                  {Math.round(p.perf.l5)}
                </span>
              </div>
            </div>
          </div>

          {/* Line 2: Position + Club */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <PositionBadge pos={p.pos} size="sm" />
            {clubData?.logo && (
              <Image src={clubData.logo} alt="" width={16} height={16}
                className="size-4 shrink-0" aria-hidden="true" />
            )}
            <span className="text-xs text-white/50">{p.club}</span>
          </div>

          {/* Line 3: Next fixture + icon stats */}
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-white/40">
            {nextFixture ? (
              <>
                <span className={nextFixture.isHome ? 'text-green-500' : 'text-sky-300'}>
                  {nextFixture.isHome ? 'H' : 'A'}
                </span>
                {opponentClub?.logo && (
                  <Image src={opponentClub.logo} alt="" width={14} height={14}
                    className="size-3.5 shrink-0" aria-hidden="true" />
                )}
                <span className="text-white/50">{nextFixture.opponentShort}</span>
              </>
            ) : (
              <span className="text-white/30">--</span>
            )}
            <span className="ml-auto flex items-center gap-1.5 font-mono tabular-nums text-white/50 shrink-0">
              <span className="inline-flex items-center gap-0.5">
                <MatchIcon size={10} className="text-white/40" />
                {p.stats.matches}
              </span>
              <span className="inline-flex items-center gap-0.5">
                <span className="text-[13px] leading-none">⚽</span>
                {p.stats.goals}
              </span>
              <span className="inline-flex items-center gap-0.5">
                <span className="text-[13px] leading-none">🅰️</span>
                {p.stats.assists}
              </span>
            </span>
          </div>

          {/* Line 4: Price + SC */}
          <div className="flex items-center gap-2 mt-1 pt-1 border-t border-divider text-[10px] text-white/40">
            <span className="font-mono tabular-nums">
              {fmtScout(p.prices.floor ?? 0)} CR
            </span>
            <span className="text-white/20">|</span>
            <span className="font-mono tabular-nums">
              {p.dpc.owned} SC
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ============================================
// COMPACT PICKER ROW (side panel — same visual but condensed)
// ============================================

function CompactPickerRow({ player, onClick, href }: {
  player: Player;
  onClick?: () => void;
  href?: string;
}) {
  const p = player;
  const tint = posTintColors[p.pos];
  const clubData = getClub(p.club);

  const content = (
    <div className="flex gap-2.5">
      {/* Photo */}
      <div className="shrink-0 relative">
        <div
          className="size-9 rounded-full overflow-hidden border-[1.5px]"
          style={{
            borderColor: `${tint}99`,
            boxShadow: `0 0 8px ${tint}25`,
          }}
        >
          {p.imageUrl ? (
            <img src={p.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <div
              className="size-full flex items-center justify-center text-[10px] font-black text-white/60"
              style={{ backgroundColor: `${tint}22` }}
            >
              {p.first.charAt(0)}{p.last.charAt(0)}
            </div>
          )}
        </div>
        <StatusDot status={p.status} />
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <div className="min-w-0">
          <span className="font-black text-xs text-white truncate block">
            {p.last.toUpperCase()}
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            <PositionBadge pos={p.pos} size="sm" />
            {clubData?.logo && (
              <Image src={clubData.logo} alt="" width={12} height={12}
                className="size-3 shrink-0" aria-hidden="true" />
            )}
            <span className="text-[10px] text-white/40 truncate">{p.club}</span>
          </div>
        </div>
        <div className="ml-auto shrink-0">
          <div
            className="size-7 rounded-full flex items-center justify-center border-[1.5px]"
            style={{ backgroundColor: `${tint}33`, borderColor: `${tint}99` }}
          >
            <span className="font-mono font-black text-xs tabular-nums text-white/90">
              {Math.round(p.perf.l5)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const sharedClass = "w-full px-2.5 py-2 rounded-lg hover:bg-surface-base transition-colors text-left min-h-[44px]";

  if (href) {
    return <Link href={href} className={sharedClass}>{content}</Link>;
  }
  return <button onClick={onClick} className={sharedClass}>{content}</button>;
}

// ============================================
// MAIN COMPONENT
// ============================================

interface ManagerKaderTabProps {
  players: Player[];
  ownedPlayers: Player[];
}

export default function ManagerKaderTab({ players, ownedPlayers }: ManagerKaderTabProps) {
  const t = useTranslations('market');
  const state = useKaderState({ players, ownedPlayers });

  const POS_LABEL: Record<Pos, string> = {
    GK: t('kaderPosGk'),
    DEF: t('kaderPosDef'),
    MID: t('kaderPosMid'),
    ATT: t('kaderPosAtt'),
  };

  // ── Desktop Side Panel (right of pitch) ──
  const sidePanel = (
    <div className="flex flex-col h-full min-h-0">
      {/* Header: Position tabs */}
      <div className="p-3 border-b border-white/10 space-y-2.5 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => { state.setSidePanelPos(null); state.setSidePanelSlot(null); }}
            className={cn('px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors',
              !state.sidePanelPos ? 'bg-gold/15 text-gold' : 'text-white/40 hover:text-white/70'
            )}
          >{t('kaderAllTab')}</button>
          {(['GK', 'DEF', 'MID', 'ATT'] as Pos[]).map(pos => {
            const active = state.sidePanelPos === pos;
            return (
              <button
                key={pos}
                onClick={() => { state.setSidePanelPos(pos); state.setSidePanelSlot(null); }}
                className={cn('px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors',
                  active ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
                )}
                style={active ? { color: getPosColor(pos) } : undefined}
              >{pos}</button>
            );
          })}
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-white/30" aria-hidden="true" />
          <input
            type="text"
            placeholder={t('kaderSearchPlaceholder')}
            aria-label={t('kaderSearchLabel')}
            value={state.pickerSearch}
            onChange={e => state.setPickerSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-gold/40 placeholder:text-white/30"
          />
        </div>
      </div>

      {/* Title */}
      <div className="px-3 pt-2.5 pb-1 shrink-0 flex items-center justify-between">
        <div className="text-xs font-black uppercase text-white/60">
          {state.sidePanelPos ? (
            <>{t('kaderPickTitle', { pos: '' })}<span style={{ color: getPosColor(state.sidePanelPos) }}>{POS_LABEL[state.sidePanelPos]}</span></>
          ) : (
            <>{t('kaderYourSquad', { count: ownedPlayers.length })}</>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {(['perf', 'price', 'name'] as const).map(s => (
            <button
              key={s}
              onClick={() => state.setSortBy(s)}
              className={cn('px-1.5 py-0.5 rounded-full text-[9px] font-bold transition-colors',
                state.sortBy === s ? 'bg-gold/15 text-gold' : 'text-white/30 hover:text-white/60'
              )}
            >{s === 'perf' ? 'L5' : s === 'price' ? t('kaderSortValue') : 'A-Z'}</button>
          ))}
        </div>
      </div>

      {/* Player list — scrollable */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1 min-h-0">
        {state.sidePanelPos ? (
          state.pickerPlayers.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <PositionBadge pos={state.sidePanelPos} size="lg" />
              <div className="text-xs text-white/30 mt-2">
                {ownedPlayers.filter(p => p.pos === state.sidePanelPos).length === 0
                  ? t('kaderNoOwnedPos', { pos: state.sidePanelPos })
                  : t('kaderNoPlayersFound')}
              </div>
              <Link href="/market?tab=kaufen" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold/15 text-gold text-[10px] font-bold rounded-lg hover:bg-gold/25 transition-colors mt-2">
                <ShoppingCart className="size-3" aria-hidden="true" />
                {t('kaderBuyPlayers')}
              </Link>
            </div>
          ) : (
            state.pickerPlayers.map(p => (
              <CompactPickerRow
                key={p.id}
                player={p}
                onClick={() => state.handlePickPlayer(p.id)}
              />
            ))
          )
        ) : (
          state.sortedOwned.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-xs text-white/30 mb-2">{t('kaderNoPlayersYet')}</div>
              <Link href="/market?tab=kaufen" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold/15 text-gold text-[10px] font-bold rounded-lg hover:bg-gold/25 transition-colors">
                <ShoppingCart className="size-3" aria-hidden="true" />
                {t('kaderBuyPlayers')}
              </Link>
            </div>
          ) : (
            state.sortedOwned.map(p => (
              <CompactPickerRow
                key={p.id}
                player={p}
                href={`/player/${p.id}`}
              />
            ))
          )
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Summary Stats */}
      <SquadSummaryStats
        players={Array.from(state.assignedPlayers.values())}
        ownedPlayers={ownedPlayers}
        assignedCount={state.assignedPlayers.size}
        totalSlots={state.formation.slots.length}
      />

      {/* Squad Size + Formation Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center bg-white/5 border border-white/10 rounded-full p-0.5">
          {(['11', '7'] as const).map(size => (
            <button
              key={size}
              onClick={() => state.handleSquadSizeChange(size)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-black transition-colors',
                state.squadSize === size
                  ? 'bg-gold text-black'
                  : 'text-white/50 hover:text-white'
              )}
            >
              {size}er
            </button>
          ))}
        </div>
        <span className="text-white/20">|</span>
        {state.availableFormations.map(f => (
          <button
            key={f.id}
            onClick={() => state.handleFormationChange(f.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-bold border transition-colors',
              state.formationId === f.id
                ? 'bg-gold/15 border-gold/30 text-gold'
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20'
            )}
          >
            {f.name}
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => state.setShowPresets(!state.showPresets)}
              aria-label={t('kaderPresetsLabel')}
              aria-expanded={state.showPresets}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-white/50 hover:text-white transition-colors"
            >
              <Save className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{t('kaderPresetsLabel')}</span>
              <ChevronDown className={cn('size-3 transition-transform', state.showPresets && 'rotate-180')} aria-hidden="true" />
            </button>
            {state.showPresets && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-[#1a1a2e] border border-white/15 rounded-xl shadow-2xl z-50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Name..."
                    aria-label={t('kaderPresetNameLabel')}
                    value={state.presetName}
                    onChange={e => state.setPresetName(e.target.value)}
                    className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-gold/40 placeholder:text-white/30"
                  />
                  <button onClick={state.handleSavePreset} disabled={!state.presetName.trim()} className="px-2 py-1.5 bg-gold/20 text-gold text-xs font-bold rounded-lg disabled:opacity-30">
                    {t('kaderSavePreset')}
                  </button>
                </div>
                {state.presets.length > 0 && <div className="border-t border-white/10 pt-2 space-y-1">
                  {state.presets.map(p => (
                    <div key={p.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                      <button onClick={() => state.handleLoadPreset(p)} className="text-xs text-white/70 hover:text-white text-left flex-1 min-w-0">
                        <div className="font-medium truncate">{p.name}</div>
                        <div className="text-[10px] text-white/30">{p.formationId}</div>
                      </button>
                      <button onClick={() => state.handleDeletePreset(p.name)} aria-label={t('kaderDeletePreset', { name: p.name })} className="text-white/30 hover:text-red-400 p-1"><X className="size-3" aria-hidden="true" /></button>
                    </div>
                  ))}
                </div>}
                {state.presets.length === 0 && <div className="text-[10px] text-white/30 text-center py-2">{t('kaderNoPresets')}</div>}
              </div>
            )}
          </div>
          <button
            onClick={state.handleResetAll}
            aria-label={t('kaderResetLabel')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-white/50 hover:text-white transition-colors"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{t('kaderReset')}</span>
          </button>
        </div>
      </div>

      {/* Desktop: Pitch (left) + Player Panel (right) side by side */}
      <div className="flex gap-4">
        <div className="w-full lg:w-[55%] shrink-0">
          <SquadPitch formation={state.formation} assignments={state.assignedPlayers} onSlotClick={state.handleSlotClick} />
        </div>
        <div className="hidden lg:flex flex-col flex-1 min-w-0 bg-surface-minimal border border-divider rounded-2xl overflow-hidden"
          style={{ maxHeight: 'min(55vh, 500px)' }}>
          {sidePanel}
        </div>
      </div>

      {/* Mobile: Full-Screen Picker */}
      {state.pickerOpen && (
        <div className="fixed inset-0 z-[70] bg-bg-main flex flex-col lg:hidden">
          <div className="shrink-0 bg-bg-main border-b border-white/10">
            <div className="flex items-center gap-3 px-4 pt-3 pb-2">
              <button
                onClick={state.handleClosePicker}
                aria-label={t('kaderClose')}
                className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="size-5 text-white/60" aria-hidden="true" />
              </button>
              <div className="flex-1">
                <h3 className="font-black text-base text-balance">
                  {t('kaderPickPos', { pos: '' })}<span style={{ color: getPosColor(state.pickerOpen.pos) }}>{POS_LABEL[state.pickerOpen.pos]}</span>
                </h3>
                <div className="text-[10px] text-white/40 tabular-nums">{t('kaderAvailableCount', { count: state.pickerPlayers.length })}</div>
              </div>
              <div className="flex items-center gap-0.5">
                {(['perf', 'name'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => state.setSortBy(s === 'perf' ? 'perf' : 'name')}
                    className={cn('px-2 py-1 rounded text-[10px] font-bold transition-colors',
                      state.sortBy === s ? 'bg-gold/15 text-gold' : 'text-white/30'
                    )}
                  >{s === 'perf' ? 'L5' : 'A-Z'}</button>
                ))}
              </div>
            </div>
            <div className="px-4 pb-2.5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-white/30" aria-hidden="true" />
                <input
                  type="text"
                  placeholder={t('kaderSearchPlaceholder')}
                  aria-label={t('kaderSearchLabel')}
                  value={state.pickerSearch}
                  onChange={e => state.setPickerSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/30"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain">
            {state.pickerPlayers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <PositionBadge pos={state.pickerOpen.pos} size="lg" />
                <div className="text-sm text-white/30 mt-3 text-center text-pretty">
                  {ownedPlayers.filter(p => p.pos === state.pickerOpen!.pos).length === 0
                    ? t('kaderNoOwnedPosAlt', { pos: POS_LABEL[state.pickerOpen.pos] })
                    : t('kaderNoPlayersFound')}
                </div>
                <Link
                  href="/market?tab=kaufen"
                  onClick={state.handleClosePicker}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-gold/15 text-gold text-xs font-bold rounded-xl hover:bg-gold/25 transition-colors"
                >
                  <ShoppingCart className="size-3.5" aria-hidden="true" />
                  {t('kaderBuyPlayers')}
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {state.pickerPlayers.map(p => {
                  const tint = posTintColors[p.pos];
                  const clubData = getClub(p.club);
                  const pickerFormEntries = (state.scoresMap?.get(p.id) ?? []).map(s => ({
                    score: s ?? 0,
                    status: (s != null ? 'played' : 'not_in_squad') as 'played' | 'not_in_squad',
                  }));
                  return (
                    <button
                      key={p.id}
                      onClick={() => state.handlePickPlayer(p.id)}
                      className="w-full text-left px-4 py-2.5 active:bg-white/[0.06] transition-colors"
                    >
                      <div className="flex gap-3">
                        {/* Photo */}
                        <div className="shrink-0 relative">
                          <div
                            className="size-12 rounded-full overflow-hidden border-2"
                            style={{
                              borderColor: `${tint}99`,
                              boxShadow: `0 0 10px ${tint}30, inset 0 0 6px ${tint}15`,
                            }}
                          >
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
                            ) : (
                              <div
                                className="size-full flex items-center justify-center text-sm font-black text-white/60"
                                style={{ backgroundColor: `${tint}22` }}
                              >
                                {p.first.charAt(0)}{p.last.charAt(0)}
                              </div>
                            )}
                          </div>
                          <StatusDot status={p.status} />
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-sm text-white truncate">
                              {p.last.toUpperCase()}
                            </span>
                            <span className="font-mono text-xs text-white/30 tabular-nums shrink-0">
                              #{p.ticket}
                            </span>
                            <div className="ml-auto flex items-center gap-2 shrink-0">
                              <FormBars entries={pickerFormEntries} />
                              <div
                                className="size-8 rounded-full flex items-center justify-center border-[1.5px]"
                                style={{ backgroundColor: `${tint}33`, borderColor: `${tint}99` }}
                              >
                                <span className="font-mono font-black text-sm tabular-nums text-white/90">
                                  {Math.round(p.perf.l5)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <PositionBadge pos={p.pos} size="sm" />
                            {clubData?.logo && (
                              <Image src={clubData.logo} alt="" width={16} height={16}
                                className="size-4 shrink-0" aria-hidden="true" />
                            )}
                            <span className="text-xs text-white/50">{p.club}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Below-pitch player list (mobile + small desktop without side panel) */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black uppercase text-balance">{t('kaderAllPlayers', { count: ownedPlayers.length })}</h3>
          <div className="flex items-center gap-1">
            {(['perf', 'price', 'name'] as const).map(s => (
              <button
                key={s}
                onClick={() => state.setSortBy(s)}
                className={cn(
                  'px-2 py-1 rounded-lg text-[10px] font-bold transition-colors',
                  state.sortBy === s ? 'bg-gold/15 text-gold' : 'text-white/40 hover:text-white/70'
                )}
              >
                {s === 'perf' ? 'L5' : s === 'price' ? t('kaderSortValue') : t('kaderSortNameLabel')}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {state.sortedOwned.map(p => (
            <ManagerPlayerRow
              key={p.id}
              player={p}
              scores={state.scoresMap?.get(p.id)}
              nextFixture={state.getNextFixture(p)}
              isAssigned={state.assignedIds.has(p.id)}
              inLineupTitle={t('bestandInLineup')}
            />
          ))}
          {ownedPlayers.length === 0 && (
            <Card className="p-8 text-center">
              <ShoppingCart className="size-10 mx-auto mb-3 text-white/20" aria-hidden="true" />
              <div className="text-white/30 mb-2">{t('kaderNoPlayersYet')}</div>
              <div className="text-sm text-white/50 text-pretty mb-4">{t('kaderEmptyDesc')}</div>
              <Link href="/market?tab=kaufen" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-gold/15 border border-gold/30 text-gold rounded-xl hover:bg-gold/25 transition-colors">
                <ShoppingCart className="size-3.5" aria-hidden="true" />
                {t('kaderBuyPlayers')}
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
