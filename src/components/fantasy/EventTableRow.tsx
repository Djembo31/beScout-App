'use client';

import React from 'react';
import Image from 'next/image';
import { CheckCircle2, Heart } from 'lucide-react';
import { Button } from '@/components/ui';
import type { FantasyEvent } from './types';
import { getStatusStyle, getTypeStyle, formatCountdown } from './helpers';

export const EventTableRow = ({
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

  return (
    <tr
      onClick={onView}
      className={`border-b border-white/5 cursor-pointer transition-all hover:bg-white/[0.02] ${event.isJoined ? 'bg-[#22C55E]/[0.02]' : ''}`}
    >
      {/* Status */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          {statusStyle.pulse && <div className={`w-2 h-2 rounded-full ${statusStyle.bg} animate-pulse`} />}
          <span className={`text-xs font-medium ${statusStyle.text.replace('text-white', 'text-' + statusStyle.bg.split('-')[1])}`}>
            {event.status === 'ended' ? 'Beendet' : event.status === 'running' ? 'Läuft' : event.status === 'late-reg' ? 'Late Reg' : formatCountdown(event.lockTime)}
          </span>
        </div>
      </td>

      {/* Type */}
      <td className="py-3 px-3">
        <div className={`w-6 h-6 rounded flex items-center justify-center ${typeStyle.bg}`}>
          {React.createElement(typeStyle.icon, { className: `w-3 h-3 ${typeStyle.color}` })}
        </div>
      </td>

      {/* Teilnahme */}
      <td className="py-3 px-3 text-right">
        <span className={`font-mono text-sm ${event.buyIn === 0 ? 'text-[#22C55E]' : 'text-white'}`}>
          {event.buyIn === 0 ? 'Kostenlos' : event.buyIn}
        </span>
      </td>

      {/* Name */}
      <td className="py-3 px-3">
        <div className="flex items-center gap-2">
          {event.clubLogo && (
            <div className="relative w-5 h-5 flex-shrink-0">
              <Image src={event.clubLogo} alt="" fill className="object-contain" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-medium truncate ${typeStyle.color}`}>{event.name}</span>
              {event.isJoined && <CheckCircle2 className="w-3 h-3 text-[#22C55E] flex-shrink-0" />}
            </div>
          </div>
        </div>
      </td>

      {/* Prize */}
      <td className="py-3 px-3 text-right">
        <span className="font-mono text-sm text-purple-400">
          {event.prizePool >= 1000 ? `${(event.prizePool / 1000).toFixed(0)}K` : event.prizePool}
        </span>
      </td>

      {/* Participants */}
      <td className="py-3 px-3 text-center">
        {event.participants}{event.maxParticipants ? `/${event.maxParticipants}` : ''}
      </td>

      {/* Interest */}
      <td className="py-3 px-2">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleInterest(); }}
          className={`p-1 rounded transition-all ${event.isInterested ? 'text-pink-400' : 'text-white/20 hover:text-white/40'}`}
        >
          <Heart className={`w-4 h-4 ${event.isInterested ? 'fill-current' : ''}`} />
        </button>
      </td>

      {/* Action */}
      <td className="py-3 px-3">
        <Button variant={event.isJoined ? 'outline' : 'gold'} size="sm" onClick={(e) => { e.stopPropagation(); onView(); }}>
          {event.isJoined && event.status === 'ended' ? 'Ergebnisse' : event.isJoined && event.status === 'running' ? 'Nimmt teil' : event.isJoined ? 'Lineup' : event.status === 'ended' ? 'Ergebnisse' : event.status === 'running' ? 'Läuft' : 'Join'}
        </Button>
      </td>
    </tr>
  );
};
