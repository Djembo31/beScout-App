'use client';

import React from 'react';
import Image from 'next/image';
import {
  Trophy, CheckCircle2, Play, Flag, Heart, Lock, Plus, Edit3, Eye,
} from 'lucide-react';
import { Card, Button, Chip } from '@/components/ui';
import type { FantasyEvent } from './types';
import { getStatusStyle, getTypeStyle, getTierStyle, formatCountdown } from './helpers';

export const EventCard = ({
  event,
  onView,
  onToggleInterest,
}: {
  event: FantasyEvent;
  onView: () => void;
  onToggleInterest: () => void;
}) => {
  const statusStyle = getStatusStyle(event.status);
  const typeStyle = getTypeStyle(event.type);
  const TypeIcon = typeStyle.icon;
  const tierStyle = getTierStyle(event.eventTier);
  const isArena = event.eventTier === 'arena';

  return (
    <Card className={`p-4 hover:border-white/20 transition-all ${event.isJoined ? 'border-[#22C55E]/30 bg-[#22C55E]/[0.02]' : isArena ? 'border-amber-500/20 bg-amber-500/[0.02]' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${typeStyle.bg}`}>
            <TypeIcon className={`w-4 h-4 ${typeStyle.color}`} />
          </div>
          {event.status === 'ended' && event.scoredAt ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500 text-white">
              <Trophy className="w-3 h-3" />
              <span className="text-[10px] font-bold">Ausgewertet</span>
            </div>
          ) : event.status === 'ended' ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/20 text-white/60">
              <Flag className="w-3 h-3" />
              <span className="text-[10px] font-bold">Beendet</span>
            </div>
          ) : event.isJoined ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#22C55E] text-white">
              <CheckCircle2 className="w-3 h-3" />
              <span className="text-[10px] font-bold">Nimmt teil</span>
            </div>
          ) : (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${statusStyle.bg} ${statusStyle.text}`}>
              {statusStyle.pulse && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              <span className="text-[10px] font-bold">{statusStyle.label}</span>
            </div>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleInterest(); }}
          className={`p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-all ${event.isInterested ? 'bg-pink-500/20 text-pink-400' : 'hover:bg-white/10 text-white/30'}`}
        >
          <Heart className={`w-4 h-4 ${event.isInterested ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Logo */}
      {(event.clubLogo || event.sponsorLogo) && (
        <div className="flex items-center gap-2 mb-3">
          {event.clubLogo && (
            <div className="relative w-8 h-8">
              <Image src={event.clubLogo} alt="" fill className="object-contain" />
            </div>
          )}
          {event.sponsorLogo && (
            <div className="relative w-16 h-6">
              <Image src={event.sponsorLogo} alt="" fill className="object-contain" />
            </div>
          )}
        </div>
      )}

      {/* Title */}
      <h3 className="font-bold mb-1 line-clamp-1">{event.name}</h3>
      <p className="text-xs text-white/50 line-clamp-2 mb-3">{event.description}</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 bg-white/[0.03] rounded-lg">
          <div className={`font-mono font-bold text-sm ${event.buyIn === 0 ? 'text-[#22C55E]' : 'text-[#FFD700]'}`}>
            {event.buyIn === 0 ? 'Kostenlos' : event.buyIn}
          </div>
          <div className="text-[9px] text-white/40">Teilnahme</div>
        </div>
        <div className="text-center p-2 bg-white/[0.03] rounded-lg">
          <div className="font-mono font-bold text-sm text-purple-400">{event.prizePool >= 1000 ? `${(event.prizePool / 1000).toFixed(0)}K` : event.prizePool}</div>
          <div className="text-[9px] text-white/40">Prize</div>
        </div>
        <div className="text-center p-2 bg-white/[0.03] rounded-lg">
          <div className="font-mono font-bold text-sm">{event.participants}</div>
          <div className="text-[9px] text-white/40">Spieler</div>
        </div>
      </div>

      {/* Timer + Arena Badge */}
      <div className="flex items-center justify-between text-xs text-white/50 mb-3">
        <div className="flex items-center gap-2">
          <span>{event.format} • {event.mode === 'league' ? 'Liga' : 'Turnier'}</span>
          {isArena && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 border border-amber-500/25 text-amber-400">
              <tierStyle.icon className="w-3 h-3" />
              {tierStyle.pointsLabel}
            </span>
          )}
          {event.minSubscriptionTier && (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${
              event.minSubscriptionTier === 'gold' ? 'bg-[#FFD700]/15 border-[#FFD700]/25 text-[#FFD700]' :
              event.minSubscriptionTier === 'silber' ? 'bg-white/10 border-white/20 text-gray-300' :
              'bg-orange-500/15 border-orange-500/25 text-orange-300'
            }`}>
              <Lock className="w-2.5 h-2.5" />
              {event.minSubscriptionTier === 'gold' ? 'Gold' : event.minSubscriptionTier === 'silber' ? 'Silber' : 'Bronze'}+
            </span>
          )}
        </div>
        <span>{event.status === 'ended' ? 'Beendet' : formatCountdown(event.lockTime)}</span>
      </div>

      {/* User Status */}
      {event.isJoined && event.userRank && (
        <div className="p-2 bg-[#22C55E]/10 rounded-lg mb-3 flex items-center justify-between">
          <span className="text-xs text-[#22C55E]">Dein Rang</span>
          <span className="font-mono font-bold text-[#22C55E]">#{event.userRank}</span>
        </div>
      )}

      {/* Action */}
      <Button
        variant={event.isJoined ? 'outline' : 'gold'}
        fullWidth
        size="sm"
        onClick={onView}
      >
        {event.isJoined && event.status === 'ended' ? (
          <><Eye className="w-4 h-4" /> Ergebnisse</>
        ) : event.isJoined && event.status === 'running' ? (
          <><Lock className="w-4 h-4" /> Nimmt teil</>
        ) : event.isJoined ? (
          <><Edit3 className="w-4 h-4" /> Aufstellung</>
        ) : event.status === 'ended' ? (
          <><Eye className="w-4 h-4" /> Ergebnisse</>
        ) : event.status === 'running' ? (
          <><Play className="w-4 h-4" /> Läuft</>
        ) : (
          <><Plus className="w-4 h-4" /> {event.buyIn === 0 ? 'Beitreten' : `${event.buyIn} BSD`}</>
        )}
      </Button>
    </Card>
  );
};
