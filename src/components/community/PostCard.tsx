'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowUp, ArrowDown, MessageSquare, Send,
  MoreHorizontal, Target, Briefcase, BadgeCheck, CheckCircle2,
  Pin, Trash2, Lock,
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CosmeticTitle } from '@/components/ui';
import { PositionBadge } from '@/components/player';
import { cn } from '@/lib/utils';
import PostReplies from '@/components/community/PostReplies';
import TipButton from '@/components/community/TipButton';
import SubscriptionBadge from '@/components/ui/SubscriptionBadge';
import type { SubscriptionTier } from '@/lib/services/clubSubscriptions';
import type { PostWithAuthor, CosmeticRarity } from '@/types';

// ============================================
// HELPERS
// ============================================

export function formatTimeAgo(dateStr: string, nowLabel = 'just now', dateLocale = 'de-DE'): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return nowLabel;
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString(dateLocale);
}

// ============================================
// CONSTANTS
// ============================================

export const POST_CATEGORIES: { id: string; label: string; color: string }[] = [
  { id: 'Analyse', label: 'Analyse', color: 'bg-sky-500/15 text-sky-300 border-sky-500/20' },
  { id: 'Prediction', label: 'Prediction', color: 'bg-purple-500/15 text-purple-300 border-purple-500/20' },
  { id: 'Meinung', label: 'Meinung', color: 'bg-amber-500/15 text-amber-300 border-amber-500/20' },
  { id: 'News', label: 'News', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' },
];

// ============================================
// TYPES
// ============================================

interface PostCardProps {
  post: PostWithAuthor;
  myVote: number | undefined;
  ownedPlayerIds: Set<string>;
  onVote: (postId: string, voteType: number) => void;
  onDelete: (postId: string) => void;
  isOwn: boolean;
  userId: string;
  isClubAdmin?: boolean;
  onAdminDelete?: (postId: string) => void;
  onTogglePin?: (postId: string, pinned: boolean) => void;
  tipCount?: number;
  tipTotalCents?: number;
  isLockedExclusive?: boolean;
  authorSubscriptionTier?: SubscriptionTier;
  authorCosmeticTitle?: string | null;
  authorCosmeticTitleRarity?: CosmeticRarity;
}

// ============================================
// POST CARD
// ============================================

export default function PostCard({
  post,
  myVote,
  ownedPlayerIds,
  onVote,
  onDelete,
  isOwn,
  userId,
  isClubAdmin,
  onAdminDelete,
  onTogglePin,
  tipCount = 0,
  tipTotalCents = 0,
  isLockedExclusive = false,
  authorSubscriptionTier,
  authorCosmeticTitle,
  authorCosmeticTitleRarity,
}: PostCardProps) {
  const tc = useTranslations('community');
  const locale = useLocale();
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'de-DE';
  const netScore = post.upvotes - post.downvotes;
  const isOwnedPlayer = post.player_id ? ownedPlayerIds.has(post.player_id) : false;
  const [showMenu, setShowMenu] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [repliesCount, setRepliesCount] = useState(post.replies_count);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<'own' | 'admin' | null>(null);

  return (
    <Card className={cn(
      'p-3 md:p-4 hover:border-white/20 transition-colors',
      isOwnedPlayer && 'border-gold/20 bg-gold/[0.02]',
      post.post_type === 'club_news' && 'border-gold/30 bg-gold/[0.03]',
    )}>
      <div className="flex gap-2 md:gap-3">
        {/* Vote Buttons */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            onClick={() => onVote(post.id, myVote === 1 ? 0 : 1)}
            aria-label={myVote === 1 ? tc('removeUpvote') : tc('upvoteLabel')}
            className={cn(
              'p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors',
              myVote === 1 ? 'bg-green-500/20 text-green-500' : 'text-white/30 hover:text-green-500 hover:bg-white/5'
            )}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <span
            className={cn(
              'font-mono font-bold text-sm',
              netScore > 20 ? 'text-green-500' : netScore < 0 ? 'text-red-300' : 'text-white/50'
            )}
            aria-label={`Score: ${netScore}`}
          >
            {netScore}
          </span>
          <button
            onClick={() => onVote(post.id, myVote === -1 ? 0 : -1)}
            aria-label={myVote === -1 ? tc('removeDownvote') : tc('downvoteLabel')}
            className={cn(
              'p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors',
              myVote === -1 ? 'bg-red-500/20 text-red-300' : 'text-white/30 hover:text-red-300 hover:bg-white/5'
            )}
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Author Row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
              <Link href={`/profile/${post.author_handle}`} className="font-bold text-sm hover:text-gold transition-colors">{post.author_display_name || post.author_handle}</Link>
              {authorCosmeticTitle && (
                <CosmeticTitle title={authorCosmeticTitle} rarity={authorCosmeticTitleRarity} />
              )}
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
              {post.author_verified && <BadgeCheck className="w-3.5 h-3.5 text-gold" />}
              {authorSubscriptionTier && <SubscriptionBadge tier={authorSubscriptionTier} size="sm" />}
              {post.post_type === 'club_news' && (
                <span className="text-[10px] bg-gold/15 text-gold px-1.5 py-0.5 rounded-full border border-gold/20 font-semibold">
                  {tc('officialLabel')}
                </span>
              )}
              <span className="text-[10px] text-white/30 px-1.5 py-0.5 bg-white/5 rounded">Lv{post.author_level}</span>
              {post.is_pinned && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gold/10 text-gold border border-gold/20">
                  <Pin className="w-2.5 h-2.5" />
                  {tc('pinnedLabel')}
                </span>
              )}
              <span className="text-xs text-white/40">{formatTimeAgo(post.created_at, tc('timeJust'), dateLocale)}</span>
            </div>
            {(isOwn || isClubAdmin) && (
              <div className="relative">
                <button onClick={() => setShowMenu(!showMenu)} aria-label={tc('postOptionsLabel')} aria-expanded={showMenu} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-white/10 rounded-lg text-white/30 hover:text-white">
                  <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-8 bg-surface-popover border border-white/10 rounded-xl shadow-xl z-10 py-1 min-w-[160px]">
                    {isClubAdmin && onTogglePin && (
                      <button
                        onClick={() => { onTogglePin(post.id, !post.is_pinned); setShowMenu(false); }}
                        className="w-full px-3 py-2 text-left text-sm text-white/70 hover:bg-white/5 flex items-center gap-2"
                      >
                        <Pin className="w-3.5 h-3.5" />
                        {post.is_pinned ? tc('unpinAction') : tc('pinAction')}
                      </button>
                    )}
                    {isOwn && (
                      <button
                        onClick={() => { setConfirmDelete('own'); setShowMenu(false); }}
                        className="w-full px-3 py-2 text-left text-sm text-red-300 hover:bg-white/5 flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {tc('deleteAction')}
                      </button>
                    )}
                    {isClubAdmin && !isOwn && onAdminDelete && (
                      <button
                        onClick={() => { setConfirmDelete('admin'); setShowMenu(false); }}
                        className="w-full px-3 py-2 text-left text-sm text-red-300 hover:bg-white/5 flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {tc('adminDeleteAction')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Delete Confirmation */}
          {confirmDelete && (
            <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <span className="text-xs text-red-300 flex-1">{tc('deleteConfirmMsg')}</span>
              <button
                onClick={() => {
                  if (confirmDelete === 'admin' && onAdminDelete) onAdminDelete(post.id);
                  else onDelete(post.id);
                  setConfirmDelete(null);
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
              >
                {tc('deleteConfirmYes')}
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/5 text-white/50 hover:bg-white/10 transition-colors"
              >
                {tc('cancelAction')}
              </button>
            </div>
          )}

          {/* Category + PostType Badges (top-level posts only) */}
          {!post.parent_id && (post.category || (post.post_type && post.post_type !== 'general')) && (
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              {post.category && (
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border',
                  POST_CATEGORIES.find(c => c.id === post.category)?.color ?? 'bg-white/5 text-white/50 border-white/10'
                )}>
                  {post.category}
                </span>
              )}
              {post.post_type === 'player_take' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border bg-gold/10 text-gold border-gold/20">
                  {tc('playerTakeLabel')}
                </span>
              )}
              {post.post_type === 'transfer_rumor' && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-semibold border bg-red-500/15 text-red-300 border-red-500/20">
                  {tc('transferRumorLabel')}
                </span>
              )}
              {post.post_type === 'club_news' && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-semibold border bg-gold/10 text-gold border-gold/20">
                  {tc('clubNewsLabel')}
                </span>
              )}
            </div>
          )}

          {/* Player Tag */}
          {post.player_id && post.player_name && (
            <Link href={`/player/${post.player_id}`}>
              <div className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs mb-2 hover:opacity-80 transition-opacity',
                isOwnedPlayer
                  ? 'bg-gold/15 text-gold border border-gold/20'
                  : 'bg-white/5 text-white/70'
              )}>
                <Target className="w-3 h-3" />
                {post.player_name}
                {post.player_position && <PositionBadge pos={post.player_position} size="sm" />}
                {isOwnedPlayer && <Briefcase className="w-3 h-3 ml-1" />}
              </div>
            </Link>
          )}

          {/* Post Text */}
          {isLockedExclusive ? (
            <div className="relative mb-2">
              <p className="text-sm text-white/80 leading-relaxed blur-sm select-none" aria-hidden>
                {tc('subscriberContent')}
              </p>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
                  <Lock className="w-3.5 h-3.5" />
                  {tc('subscriberExclusive')}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/80 leading-relaxed mb-2">{post.content}</p>
          )}
          {/* Exclusive badge */}
          {post.is_exclusive && !isLockedExclusive && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 mb-2">
              <Lock className="w-2.5 h-2.5" />
              {tc('exclusiveTag')}
            </span>
          )}

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              {post.tags.map((tag) => (
                <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-white/40">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 text-xs text-white/40">
            <button
              onClick={() => setShowReplies(!showReplies)}
              className={cn(
                'flex items-center gap-1 transition-colors',
                showReplies ? 'text-gold' : 'hover:text-white'
              )}
            >
              <MessageSquare className="w-3 h-3" />
              {repliesCount}
            </button>
            {!isOwn && (
              <TipButton
                contentType="post"
                contentId={post.id}
                authorId={post.user_id}
                userId={userId}
                tipCount={tipCount}
                tipTotalCents={tipTotalCents}
              />
            )}
            <button className={cn('flex items-center gap-1 transition-colors', copied ? 'text-green-500' : 'hover:text-white')}
              onClick={async () => {
                const url = `${window.location.origin}/community?post=${post.id}`;
                const text = `${post.author_display_name || post.author_handle}: "${post.content.slice(0, 80)}…"`;
                if (navigator.share) {
                  try { await navigator.share({ title: 'BeScout Post', text, url }); } catch {}
                } else {
                  await navigator.clipboard.writeText(`${text} — ${url}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 3000);
                }
              }}>
              {copied ? <CheckCircle2 className="w-3 h-3" /> : <Send className="w-3 h-3" />}
              {copied ? tc('copiedLabel') : tc('shareLabel')}
            </button>
          </div>

          {/* Replies */}
          {showReplies && (
            <PostReplies
              postId={post.id}
              userId={userId}
              onRepliesCountChange={(_, delta) => setRepliesCount(c => c + delta)}
            />
          )}
        </div>
      </div>
    </Card>
  );
}
