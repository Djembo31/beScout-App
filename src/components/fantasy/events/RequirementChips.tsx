'use client';

import React from 'react';
import { Lock, TrendingUp, Layers, Wallet, Users, Building2, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FantasyEvent } from '../types';

type RequirementChipsProps = {
  event: FantasyEvent;
  /** 'chips' = icon + text label, 'icons' = icon only (compact) */
  variant?: 'chips' | 'icons';
  /** Max items to show before "+N" overflow */
  max?: number;
};

type ReqItem = {
  icon: typeof Lock;
  label: string;
  color: string;
};

function getRequirements(event: FantasyEvent): ReqItem[] {
  const items: ReqItem[] = [];

  if (event.minSubscriptionTier) {
    const tierLabel = event.minSubscriptionTier === 'gold' ? 'Gold+' :
      event.minSubscriptionTier === 'silber' ? 'Silber+' : 'Bronze+';
    items.push({ icon: Lock, label: tierLabel, color: event.minSubscriptionTier === 'gold' ? 'text-gold' : event.minSubscriptionTier === 'silber' ? 'text-gray-300' : 'text-orange-300' });
  }

  if (event.requirements.minScoutLevel) {
    items.push({ icon: TrendingUp, label: `Level ${event.requirements.minScoutLevel}+`, color: 'text-purple-400' });
  }

  if (event.requirements.dpcPerSlot) {
    items.push({ icon: Layers, label: `Min ${event.requirements.dpcPerSlot} DPC/Slot`, color: 'text-sky-400' });
  }

  if (event.requirements.minDpc) {
    items.push({ icon: Wallet, label: `Min ${event.requirements.minDpc} DPC`, color: 'text-sky-400' });
  }

  if (event.requirements.specificClub) {
    items.push({ icon: Building2, label: event.requirements.specificClub, color: 'text-green-400' });
  }

  if (event.requirements.minClubPlayers) {
    items.push({ icon: Users, label: `Min ${event.requirements.minClubPlayers} Club`, color: 'text-green-400' });
  }

  if (event.leagueId && event.leagueName) {
    items.push({ icon: Globe, label: event.leagueName, color: 'text-amber-400' });
  }

  return items;
}

export function RequirementChips({ event, variant = 'chips', max = 4 }: RequirementChipsProps) {
  const items = getRequirements(event);
  if (items.length === 0) return null;

  const visible = items.slice(0, max);
  const overflow = items.length - max;

  if (variant === 'icons') {
    return (
      <div className="flex items-center gap-1">
        {visible.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={i}
              className={cn('size-4 flex items-center justify-center', item.color)}
              title={item.label}
            >
              <Icon className="size-3" aria-hidden="true" />
            </div>
          );
        })}
        {overflow > 0 && (
          <span className="text-xs text-white/30 font-mono">+{overflow}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {visible.map((item, i) => {
        const Icon = item.icon;
        return (
          <span
            key={i}
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs',
              'bg-white/[0.06] border border-white/[0.08]',
              item.color
            )}
          >
            <Icon className="size-3" aria-hidden="true" />
            {item.label}
          </span>
        );
      })}
      {overflow > 0 && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs bg-white/[0.04] text-white/30 font-mono">
          +{overflow}
        </span>
      )}
    </div>
  );
}

/** Check if event has any requirements — used for "Offen fuer alle" filter */
export function hasRequirements(event: FantasyEvent): boolean {
  const r = event.requirements;
  return !!(
    event.minSubscriptionTier ||
    r.dpcPerSlot || r.minDpc || r.minClubPlayers ||
    r.minScoutLevel || r.specificClub ||
    event.leagueId
  );
}
