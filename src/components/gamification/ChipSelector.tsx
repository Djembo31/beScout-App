'use client';

import React, { useState, useMemo } from 'react';
import {
  Loader2, Ticket, Crown, Zap, RefreshCw, Sparkles,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { useUserTickets } from '@/lib/queries/tickets';
import { useEventChips, useSeasonChipUsage, useActivateChip, useDeactivateChip } from '@/lib/queries/chips';
import { CHIP_DEFINITIONS, getChipDef } from '@/lib/chips';
import type { ChipType } from '@/types';

// ============================================
// CHIP ICON MAPPING
// ============================================

const CHIP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  crown: Crown,
  zap: Zap,
  'refresh-cw': RefreshCw,
  sparkles: Sparkles,
};

function getChipIcon(iconName: string) {
  return CHIP_ICONS[iconName] ?? Zap;
}

// ============================================
// CHIP SELECTOR
// ============================================

interface ChipSelectorProps {
  eventId: string;
  onChipChange?: () => void;
}

type ChipCardState = 'available' | 'active' | 'used_up' | 'too_expensive' | 'max_reached';

export default function ChipSelector({ eventId, onChipChange }: ChipSelectorProps) {
  const { user } = useUser();
  const userId = user?.id;

  const { data: ticketData, isLoading: ticketsLoading } = useUserTickets(userId);
  const { data: eventChips, isLoading: eventChipsLoading } = useEventChips(eventId);
  const { data: seasonUsage, isLoading: seasonLoading } = useSeasonChipUsage();
  const activateChip = useActivateChip(userId);
  const deactivateChip = useDeactivateChip(userId);

  const [actionError, setActionError] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const ticketBalance = ticketData?.balance ?? 0;

  // Count active chips for this event
  const activeEventChips = useMemo(() => {
    if (!eventChips) return [];
    return eventChips.filter(c => c.is_active);
  }, [eventChips]);

  const activeCount = activeEventChips.length;
  const MAX_ACTIVE_PER_EVENT = 2;

  // Get season usage count per chip type (from JSONB RPC response)
  const seasonUsageMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (seasonUsage) {
      for (const chipType of ['triple_captain', 'synergy_surge', 'second_chance', 'wildcard'] as const) {
        const entry = seasonUsage[chipType];
        if (entry) map[chipType] = entry.used;
      }
    }
    return map;
  }, [seasonUsage]);

  // Determine state for each chip
  const getChipState = (chipType: ChipType): ChipCardState => {
    const def = getChipDef(chipType);
    const isActiveForEvent = activeEventChips.some(c => c.chip_type === chipType);

    if (isActiveForEvent) return 'active';

    const used = seasonUsageMap[chipType] ?? 0;
    if (used >= def.season_limit) return 'used_up';

    if (ticketBalance < def.cost_tickets) return 'too_expensive';

    if (activeCount >= MAX_ACTIVE_PER_EVENT) return 'max_reached';

    return 'available';
  };

  const handleActivate = async (chipType: ChipType) => {
    setActionError(prev => ({ ...prev, [chipType]: '' }));
    setActionLoading(prev => ({ ...prev, [chipType]: true }));
    try {
      await activateChip.mutateAsync({ eventId, chipType });
      onChipChange?.();
    } catch (e: unknown) {
      setActionError(prev => ({
        ...prev,
        [chipType]: e instanceof Error ? e.message : 'Aktivierung fehlgeschlagen',
      }));
    } finally {
      setActionLoading(prev => ({ ...prev, [chipType]: false }));
    }
  };

  const handleDeactivate = async (chipType: ChipType) => {
    setActionError(prev => ({ ...prev, [chipType]: '' }));
    setActionLoading(prev => ({ ...prev, [chipType]: true }));
    try {
      await deactivateChip.mutateAsync({ eventId, chipType });
      onChipChange?.();
    } catch (e: unknown) {
      setActionError(prev => ({
        ...prev,
        [chipType]: e instanceof Error ? e.message : 'Deaktivierung fehlgeschlagen',
      }));
    } finally {
      setActionLoading(prev => ({ ...prev, [chipType]: false }));
    }
  };

  const isLoading = ticketsLoading || eventChipsLoading || seasonLoading;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 bg-surface-subtle rounded animate-pulse motion-reduce:animate-none" />
          <div className="h-4 w-16 bg-surface-subtle rounded animate-pulse motion-reduce:animate-none" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 bg-surface-subtle rounded-2xl animate-pulse motion-reduce:animate-none" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header: Active count + Ticket balance */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-gold" aria-hidden="true" />
          <span className="text-sm font-bold text-white/80">
            <span className="font-mono tabular-nums">{activeCount}/{MAX_ACTIVE_PER_EVENT}</span> Chips aktiv
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-white/50">
          <Ticket className="size-3.5" aria-hidden="true" />
          <span className="font-mono tabular-nums font-bold">{ticketBalance}</span>
        </div>
      </div>

      {/* Chip cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {CHIP_DEFINITIONS.map(def => {
          const state = getChipState(def.type);
          const Icon = getChipIcon(def.icon);
          const used = seasonUsageMap[def.type] ?? 0;
          const loading = actionLoading[def.type] ?? false;
          const error = actionError[def.type] ?? '';
          const isDisabled = state === 'used_up' || state === 'too_expensive' || state === 'max_reached';
          const isActive = state === 'active';

          return (
            <Card
              key={def.type}
              className={cn(
                'p-3 flex flex-col gap-2 transition-colors relative',
                isActive && 'border-gold/40 shadow-[0_0_12px_rgba(255,215,0,0.15)]',
                isDisabled && 'opacity-50',
                !isDisabled && !isActive && 'hover:border-white/20',
              )}
            >
              {/* Icon + Name */}
              <div className="flex items-center gap-2">
                <div className={cn(
                  'size-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  isActive ? 'bg-gold/15' : 'bg-white/[0.06]',
                )}>
                  <Icon className={cn('size-4', isActive ? 'text-gold' : 'text-white/60')} aria-hidden="true" />
                </div>
                <span className={cn(
                  'text-xs font-bold leading-tight line-clamp-2',
                  isActive ? 'text-gold' : 'text-white/80',
                )}>
                  {def.name_de}
                </span>
              </div>

              {/* Cost */}
              <div className="flex items-center gap-1">
                <Ticket className="size-3 text-white/40" aria-hidden="true" />
                <span className={cn(
                  'text-xs font-mono tabular-nums font-bold',
                  state === 'too_expensive' ? 'text-red-400' : 'text-white/50',
                )}>
                  {def.cost_tickets}
                </span>
              </div>

              {/* Season usage */}
              <div className="text-[10px] text-white/40">
                <span className="font-mono tabular-nums">{used}/{def.season_limit}</span>
                {' '}diese Saison
              </div>

              {/* Action button */}
              <div className="mt-auto">
                {isActive ? (
                  <button
                    onClick={() => handleDeactivate(def.type)}
                    disabled={loading}
                    className={cn(
                      'w-full px-2 py-1.5 text-xs font-bold rounded-lg border border-gold/30 text-gold',
                      'hover:bg-gold/10 transition-colors min-h-[32px]',
                      'focus-visible:ring-2 focus-visible:ring-gold/50 outline-none',
                      loading && 'opacity-50 cursor-not-allowed',
                    )}
                    aria-label={`${def.name_de} deaktivieren`}
                  >
                    {loading ? (
                      <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none mx-auto" />
                    ) : (
                      'Deaktivieren'
                    )}
                  </button>
                ) : state === 'used_up' ? (
                  <div className="w-full px-2 py-1.5 text-xs font-bold rounded-lg bg-surface-subtle text-white/30 text-center cursor-not-allowed min-h-[32px] flex items-center justify-center">
                    Aufgebraucht
                  </div>
                ) : (
                  <button
                    onClick={() => handleActivate(def.type)}
                    disabled={isDisabled || loading}
                    className={cn(
                      'w-full px-2 py-1.5 text-xs font-bold rounded-lg transition-colors min-h-[32px]',
                      'focus-visible:ring-2 focus-visible:ring-gold/50 outline-none',
                      isDisabled
                        ? 'bg-surface-subtle text-white/30 cursor-not-allowed'
                        : 'bg-gold/10 text-gold hover:bg-gold/20',
                      loading && 'opacity-50 cursor-not-allowed',
                    )}
                    aria-label={`${def.name_de} aktivieren — ${def.cost_tickets} Tickets`}
                  >
                    {loading ? (
                      <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none mx-auto" />
                    ) : (
                      'Aktivieren'
                    )}
                  </button>
                )}
              </div>

              {/* Inline error */}
              {error && (
                <div className="flex items-start gap-1 mt-1">
                  <AlertCircle className="size-3 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-[10px] text-red-400 leading-tight">{error}</span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
