'use client';

import React from 'react';
import { Vote, Users, Clock, Coins, Plus } from 'lucide-react';
import { Card, Chip, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatBsd } from '@/lib/services/wallet';
import CommunityPollCard from '@/components/community/CommunityPollCard';
import type { CommunityPollWithCreator, DbClubVote } from '@/types';

// ============================================
// TYPES
// ============================================

interface CommunityVotesTabProps {
  communityPolls: CommunityPollWithCreator[];
  userPollVotedIds: Set<string>;
  clubVotes: DbClubVote[];
  userVotedIdSet: Set<string>;
  userId: string;
  onCastPollVote: (pollId: string, optionIndex: number) => void;
  onCancelPoll: (pollId: string) => void;
  pollVotingId: string | null;
  onCastVote: (voteId: string, optionIndex: number) => void;
  votingId: string | null;
  onCreatePoll: () => void;
}

// ============================================
// COMMUNITY VOTE CARD (Club Votes)
// ============================================

function CommunityVoteCard({ vote, hasVoted, onVote, voting }: {
  vote: DbClubVote;
  hasVoted: boolean;
  onVote: (voteId: string, optionIndex: number) => void;
  voting: string | null;
}) {
  const totalVotes = vote.total_votes;
  const isActive = vote.status === 'active' && new Date(vote.ends_at) > new Date();
  const diffMs = new Date(vote.ends_at).getTime() - Date.now();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const timeLeft = diffMs > 0 ? `${days}d ${hours}h` : 'Beendet';

  return (
    <Card className="overflow-hidden">
      <div className="p-4 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-purple-500/5 border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          <Vote className="w-5 h-5 text-purple-400" />
          <span className="font-bold text-purple-300">Club-Abstimmung</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Clock className="w-3 h-3" />
          <span>{timeLeft}</span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-lg mb-4">{vote.question}</h3>

        <div className="space-y-2 mb-4">
          {(vote.options as { label: string; votes: number }[]).map((option, idx) => {
            const pct = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
            return (
              <button
                key={idx}
                onClick={() => !hasVoted && isActive && onVote(vote.id, idx)}
                disabled={hasVoted || !isActive || voting === vote.id}
                className={cn(
                  'w-full p-3 rounded-xl border transition-all text-left relative overflow-hidden',
                  hasVoted ? 'bg-white/[0.02] border-white/10' : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04] hover:border-white/20'
                )}
              >
                {hasVoted && (
                  <div className="absolute inset-0 bg-purple-500/10" style={{ width: `${pct}%` }} />
                )}
                <div className="relative flex items-center justify-between">
                  <span>{option.label}</span>
                  {hasVoted && <span className="font-mono font-bold text-white/50">{pct}%</span>}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-white/50">
            <Users className="w-4 h-4" />
            <span>{totalVotes} Stimmen</span>
          </div>
          {vote.cost_bsd > 0 && (
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-[#FFD700]" />
              <span className="text-[#FFD700] font-bold">{formatBsd(vote.cost_bsd)} BSD</span>
            </div>
          )}
        </div>
        {hasVoted && (
          <Chip className="mt-2 bg-purple-500/15 text-purple-300 border-purple-500/25">Abgestimmt</Chip>
        )}
      </div>
    </Card>
  );
}

// ============================================
// COMMUNITY VOTES TAB
// ============================================

export default function CommunityVotesTab({
  communityPolls,
  userPollVotedIds,
  clubVotes,
  userVotedIdSet,
  userId,
  onCastPollVote,
  onCancelPoll,
  pollVotingId,
  onCastVote,
  votingId,
  onCreatePoll,
}: CommunityVotesTabProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Vote className="w-5 h-5 text-amber-400" />
          <span className="font-bold">Abstimmungen</span>
        </div>
        <Button variant="gold" size="sm" onClick={onCreatePoll}>
          <Plus className="w-4 h-4" />
          Umfrage erstellen
        </Button>
      </div>

      {/* Community Polls */}
      {communityPolls.length > 0 && (
        <div className="space-y-3">
          {communityPolls.map((poll) => (
            <CommunityPollCard
              key={poll.id}
              poll={poll}
              hasVoted={userPollVotedIds.has(poll.id)}
              isOwn={poll.created_by === userId}
              onVote={onCastPollVote}
              onCancel={onCancelPoll}
              voting={pollVotingId}
            />
          ))}
        </div>
      )}

      {/* Divider if both exist */}
      {communityPolls.length > 0 && clubVotes.length > 0 && (
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-white/30 font-semibold">Club-Abstimmungen</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>
      )}

      {/* Club Votes */}
      {clubVotes.length > 0 && (
        <div className="space-y-3">
          {clubVotes.map((vote) => (
            <CommunityVoteCard
              key={vote.id}
              vote={vote}
              hasVoted={userVotedIdSet.has(vote.id)}
              onVote={onCastVote}
              voting={votingId}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {communityPolls.length === 0 && clubVotes.length === 0 && (
        <Card className="p-12 text-center">
          <Vote className="w-12 h-12 mx-auto mb-4 text-white/20" />
          <div className="text-white/30 mb-2">Noch keine Abstimmungen</div>
          <div className="text-xs text-white/20 mb-4">Erstelle die erste bezahlte Umfrage!</div>
          <Button variant="gold" size="sm" onClick={onCreatePoll}>
            Erste Umfrage erstellen
          </Button>
        </Card>
      )}
    </div>
  );
}
