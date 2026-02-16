'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Lock, Unlock, Target, BadgeCheck, Clock, Star, CheckCircle, XCircle } from 'lucide-react';
import { Card, Button, Chip } from '@/components/ui';
import { PositionBadge } from '@/components/player';
import { cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { fmtBSD } from '@/lib/utils';
import { getLevelTier } from '@/types';
import type { ResearchPostWithAuthor } from '@/types';

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Jetzt';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('de-DE');
}

const callColor: Record<string, string> = {
  Bullish: 'bg-[#22C55E]/20 text-[#22C55E]',
  Bearish: 'bg-red-500/20 text-red-300',
  Neutral: 'bg-white/10 text-white/60',
};

const categoryColor: Record<string, string> = {
  'Spieler-Analyse': 'bg-sky-500/15 text-sky-300 border-sky-500/20',
  'Transfer-Empfehlung': 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  'Taktik': 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  'Saisonvorschau': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  'Scouting-Report': 'bg-rose-500/15 text-rose-300 border-rose-500/20',
};

type Props = {
  post: ResearchPostWithAuthor;
  onUnlock: (id: string) => void;
  unlockingId: string | null;
  onRate: (id: string, rating: number) => void;
  ratingId: string | null;
};

function StarRating({
  avgRating,
  ratingsCount,
  userRating,
  interactive,
  loading,
  onRate,
}: {
  avgRating: number;
  ratingsCount: number;
  userRating: number | null;
  interactive: boolean;
  loading: boolean;
  onRate: (rating: number) => void;
}) {
  const [hoverStar, setHoverStar] = useState(0);
  const displayRating = hoverStar || userRating || 0;

  return (
    <div className="flex items-center gap-1.5">
      <div
        className="flex items-center gap-0.5"
        onMouseLeave={() => interactive && setHoverStar(0)}
      >
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            disabled={!interactive || loading}
            onClick={() => interactive && onRate(star)}
            onMouseEnter={() => interactive && setHoverStar(star)}
            className={cn(
              'transition-all',
              interactive
                ? 'cursor-pointer hover:scale-110'
                : 'cursor-default'
            )}
          >
            <Star
              className={cn(
                'w-3.5 h-3.5 transition-colors',
                interactive && star <= displayRating
                  ? 'text-[#FFD700] fill-[#FFD700]'
                  : !interactive && star <= Math.round(avgRating)
                  ? 'text-[#FFD700]/60 fill-[#FFD700]/60'
                  : 'text-white/20'
              )}
            />
          </button>
        ))}
      </div>
      {ratingsCount > 0 && (
        <span className="text-[10px] text-white/40 font-mono">
          {avgRating.toFixed(1)} ({ratingsCount})
        </span>
      )}
    </div>
  );
}

export default function ResearchCard({ post, onUnlock, unlockingId, onRate, ratingId }: Props) {
  const [confirmUnlock, setConfirmUnlock] = useState(false);
  const canSeeContent = post.is_own || post.is_unlocked;
  const tier = getLevelTier(post.author_level);
  const priceBsd = centsToBsd(post.price);
  const canRate = post.is_unlocked && !post.is_own;

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {/* Category Badge */}
          {post.category && (
            <span className={cn('px-2 py-0.5 rounded text-[10px] font-semibold border',
              categoryColor[post.category] ?? 'bg-white/5 text-white/50 border-white/10'
            )}>{post.category}</span>
          )}
          {/* Player Tag */}
          {post.player_id && post.player_name && (
            <Link href={`/player/${post.player_id}`}>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-white/5 text-white/70 hover:opacity-80 transition-opacity">
                <Target className="w-3 h-3" />
                {post.player_name}
                {post.player_position && <PositionBadge pos={post.player_position} size="sm" />}
              </span>
            </Link>
          )}
          {/* Call Badge */}
          <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold', callColor[post.call] ?? callColor.Neutral)}>
            {post.call}
          </span>
          {/* Horizon Chip */}
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-white/40 border border-white/10">
            {post.horizon}
          </span>
          {/* Outcome Badge */}
          {post.outcome === 'correct' && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/25">
              <CheckCircle className="w-3 h-3" />
              {post.price_change_pct !== null && `${post.price_change_pct > 0 ? '+' : ''}${post.price_change_pct}%`}
            </span>
          )}
          {post.outcome === 'incorrect' && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/25">
              <XCircle className="w-3 h-3" />
              {post.price_change_pct !== null && `${post.price_change_pct > 0 ? '+' : ''}${post.price_change_pct}%`}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-base leading-snug mb-2">{post.title}</h3>

        {/* Author Row */}
        <div className="flex items-center gap-2 text-xs text-white/50 mb-3">
          <Link href={`/profile/${post.author_handle}`} className="font-medium text-white/70 hover:text-[#FFD700] transition-colors">
            {post.author_display_name || post.author_handle}
          </Link>
          {post.author_top_role && (
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[9px] font-bold border',
              post.author_top_role === 'Trader' ? 'text-sky-300 bg-sky-500/15 border-sky-500/20' :
              post.author_top_role === 'Manager' ? 'text-purple-300 bg-purple-500/15 border-purple-500/20' :
              'text-emerald-300 bg-emerald-500/15 border-emerald-500/20'
            )}>
              {post.author_top_role}
            </span>
          )}
          {post.author_verified && <BadgeCheck className="w-3.5 h-3.5 text-[#FFD700]" />}
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold border bg-white/5 border-white/10', tier.color)}>
            Lv{post.author_level}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTimeAgo(post.created_at)}
          </span>
        </div>

        {/* Preview (always visible) */}
        <p className="text-sm text-white/60 leading-relaxed">{post.preview}</p>
      </div>

      {/* Content Area */}
      {canSeeContent ? (
        <div className="px-4 pb-4">
          <div className="border-t border-white/10 pt-3">
            <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{post.content}</p>
          </div>
        </div>
      ) : (
        <div className="relative px-4 pb-4">
          {/* Blurred placeholder */}
          <div className="h-24 overflow-hidden relative">
            <p className="text-sm text-white/30 leading-relaxed blur-sm select-none">
              {post.preview} {post.preview} {post.preview}
            </p>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/60 to-[#0a0a0a]" />
          </div>
          {/* Unlock button */}
          <div className="flex flex-col items-center gap-2 -mt-2">
            {!confirmUnlock ? (
              <div className="flex flex-col items-center gap-1">
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => setConfirmUnlock(true)}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Freischalten für {fmtBSD(priceBsd)} BSD
                </Button>
                {post.unlock_count > 0 && (
                  <span className="text-[10px] text-white/30">{post.unlock_count} {post.unlock_count === 1 ? 'Leser' : 'Leser'}</span>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-[#FFD700]/5 border border-[#FFD700]/15">
                <span className="text-xs text-white/60">{fmtBSD(priceBsd)} BSD werden von deinem Wallet abgezogen</span>
                <div className="flex gap-2">
                  <Button
                    variant="gold"
                    size="sm"
                    loading={unlockingId === post.id}
                    onClick={() => { onUnlock(post.id); setConfirmUnlock(false); }}
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    Ja, freischalten
                  </Button>
                  <button
                    onClick={() => setConfirmUnlock(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-white/50 hover:bg-white/10 transition-colors"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          {post.tags.map(tag => (
            <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-white/40">
              #{tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-white/40">
          <StarRating
            avgRating={post.avg_rating}
            ratingsCount={post.ratings_count}
            userRating={post.user_rating}
            interactive={canRate}
            loading={ratingId === post.id}
            onRate={(rating) => onRate(post.id, rating)}
          />
          <span className="flex items-center gap-1">
            <Unlock className="w-3 h-3" />
            {post.unlock_count}
          </span>
          <span className="font-mono text-[#FFD700] font-bold">{fmtBSD(priceBsd)} BSD</span>
        </div>
      </div>
    </Card>
  );
}
