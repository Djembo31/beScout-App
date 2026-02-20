'use client';

import React from 'react';
import { Users, Clock, Coins, Vote, X } from 'lucide-react';
import { Card, Chip } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatScout } from '@/lib/services/wallet';
import type { CommunityPollWithCreator } from '@/types';

type Props = {
  poll: CommunityPollWithCreator;
  hasVoted: boolean;
  isOwn: boolean;
  onVote: (pollId: string, optionIndex: number) => void;
  onCancel: (pollId: string) => void;
  voting: string | null;
};

export default function CommunityPollCard({ poll, hasVoted, isOwn, onVote, onCancel, voting }: Props) {
  const totalVotes = poll.total_votes;
  const isActive = poll.status === 'active' && new Date(poll.ends_at) > new Date();
  const diffMs = new Date(poll.ends_at).getTime() - Date.now();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const timeLeft = diffMs > 0 ? `${days}d ${hours}h` : 'Beendet';
  const isCancelled = poll.status === 'cancelled';

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-gradient-to-r from-amber-500/10 to-amber-500/5 border-b border-amber-500/20">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-amber-400" />
          <span className="font-bold text-amber-300">Bezahlte Umfrage</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Clock className="w-3 h-3" />
          <span>{isCancelled ? 'Abgebrochen' : timeLeft}</span>
        </div>
      </div>

      <div className="p-4">
        {/* Creator */}
        <div className="flex items-center gap-2 mb-2 text-xs text-white/50">
          <span>von <strong className="text-white/70">{poll.creator_display_name || poll.creator_handle}</strong></span>
        </div>

        {/* Question */}
        <h3 className="font-bold text-lg mb-1">{poll.question}</h3>
        {poll.description && (
          <p className="text-sm text-white/50 mb-3">{poll.description}</p>
        )}

        {/* Options */}
        <div className="space-y-2 mb-4">
          {(poll.options as { label: string; votes: number }[]).map((option, idx) => {
            const pct = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
            return (
              <button
                key={idx}
                onClick={() => !hasVoted && !isOwn && isActive && onVote(poll.id, idx)}
                disabled={hasVoted || isOwn || !isActive || voting === poll.id}
                className={cn(
                  'w-full p-3 rounded-xl border transition-all text-left relative overflow-hidden',
                  hasVoted || isOwn || !isActive
                    ? 'bg-white/[0.02] border-white/10'
                    : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04] hover:border-white/20'
                )}
              >
                {(hasVoted || isOwn) && (
                  <div className="absolute inset-0 bg-amber-500/10" style={{ width: `${pct}%` }} />
                )}
                <div className="relative flex items-center justify-between">
                  <span>{option.label}</span>
                  {(hasVoted || isOwn) && <span className="font-mono font-bold text-white/50">{pct}%</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-white/50">
            <Users className="w-4 h-4" />
            <span>{totalVotes} Stimmen</span>
          </div>
          {poll.cost_bsd > 0 && (
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-[#FFD700]" />
              <span className="text-[#FFD700] font-bold">{formatScout(poll.cost_bsd)} $SCOUT</span>
            </div>
          )}
        </div>

        {/* Status chips */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {isOwn && (
            <Chip className="bg-amber-500/15 text-amber-300 border-amber-500/25">Deine Umfrage</Chip>
          )}
          {hasVoted && (
            <Chip className="bg-amber-500/15 text-amber-300 border-amber-500/25">Abgestimmt</Chip>
          )}
          {isCancelled && (
            <Chip className="bg-red-500/15 text-red-300 border-red-500/25">Abgebrochen</Chip>
          )}
        </div>

        {/* Cancel button for own polls with 0 votes */}
        {isOwn && poll.total_votes === 0 && isActive && (
          <button
            onClick={() => onCancel(poll.id)}
            className="mt-3 flex items-center gap-1.5 text-xs text-red-300 hover:text-red-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Umfrage abbrechen
          </button>
        )}
      </div>
    </Card>
  );
}
