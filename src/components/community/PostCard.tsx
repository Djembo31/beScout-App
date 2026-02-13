'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowUp, ArrowDown, MessageSquare, Send, Bookmark,
  MoreHorizontal, Target, Briefcase, BadgeCheck, CheckCircle2,
  Pin, Trash2,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { PositionBadge } from '@/components/player';
import { cn } from '@/lib/utils';
import PostReplies from '@/components/community/PostReplies';
import type { PostWithAuthor } from '@/types';

// ============================================
// HELPERS
// ============================================

export function formatTimeAgo(dateStr: string): string {
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
}: PostCardProps) {
  const netScore = post.upvotes - post.downvotes;
  const isOwnedPlayer = post.player_id ? ownedPlayerIds.has(post.player_id) : false;
  const [showMenu, setShowMenu] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [repliesCount, setRepliesCount] = useState(post.replies_count);
  const [copied, setCopied] = useState(false);

  return (
    <Card className={cn('p-4 hover:border-white/20 transition-all', isOwnedPlayer && 'border-[#FFD700]/20 bg-[#FFD700]/[0.02]')}>
      <div className="flex gap-3">
        {/* Vote Buttons */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => onVote(post.id, myVote === 1 ? 0 : 1)}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              myVote === 1 ? 'bg-[#22C55E]/20 text-[#22C55E]' : 'text-white/30 hover:text-[#22C55E] hover:bg-white/5'
            )}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <span className={cn(
            'font-mono font-bold text-sm',
            netScore > 20 ? 'text-[#22C55E]' : netScore < 0 ? 'text-red-300' : 'text-white/50'
          )}>
            {netScore}
          </span>
          <button
            onClick={() => onVote(post.id, myVote === -1 ? 0 : -1)}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
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
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm">{post.author_display_name || post.author_handle}</span>
              {post.author_verified && <BadgeCheck className="w-3.5 h-3.5 text-[#FFD700]" />}
              <span className="text-[10px] text-white/30 px-1.5 py-0.5 bg-white/5 rounded">Lv{post.author_level}</span>
              {post.is_pinned && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20">
                  <Pin className="w-2.5 h-2.5" />
                  Gepinnt
                </span>
              )}
              <span className="text-xs text-white/40">{formatTimeAgo(post.created_at)}</span>
            </div>
            {(isOwn || isClubAdmin) && (
              <div className="relative">
                <button onClick={() => setShowMenu(!showMenu)} className="p-1 hover:bg-white/10 rounded-lg text-white/30 hover:text-white">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-8 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-10 py-1 min-w-[160px]">
                    {isClubAdmin && onTogglePin && (
                      <button
                        onClick={() => { onTogglePin(post.id, !post.is_pinned); setShowMenu(false); }}
                        className="w-full px-3 py-2 text-left text-sm text-white/70 hover:bg-white/5 flex items-center gap-2"
                      >
                        <Pin className="w-3.5 h-3.5" />
                        {post.is_pinned ? 'Lösen' : 'Anpinnen'}
                      </button>
                    )}
                    {isOwn && (
                      <button
                        onClick={() => { onDelete(post.id); setShowMenu(false); }}
                        className="w-full px-3 py-2 text-left text-sm text-red-300 hover:bg-white/5 flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Löschen
                      </button>
                    )}
                    {isClubAdmin && !isOwn && onAdminDelete && (
                      <button
                        onClick={() => { onAdminDelete(post.id); setShowMenu(false); }}
                        className="w-full px-3 py-2 text-left text-sm text-red-300 hover:bg-white/5 flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Admin: Löschen
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Category Badge (top-level posts only) */}
          {!post.parent_id && post.category && (
            <span className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border mb-2',
              POST_CATEGORIES.find(c => c.id === post.category)?.color ?? 'bg-white/5 text-white/50 border-white/10'
            )}>
              {post.category}
            </span>
          )}

          {/* Player Tag */}
          {post.player_id && post.player_name && (
            <Link href={`/player/${post.player_id}`}>
              <div className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs mb-2 hover:opacity-80 transition-opacity',
                isOwnedPlayer
                  ? 'bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/20'
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
          <p className="text-sm text-white/80 leading-relaxed mb-2">{post.content}</p>

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
                showReplies ? 'text-[#FFD700]' : 'hover:text-white'
              )}
            >
              <MessageSquare className="w-3 h-3" />
              {repliesCount}
            </button>
            <button className={cn('flex items-center gap-1 transition-colors', copied ? 'text-[#22C55E]' : 'hover:text-white')}
              onClick={async () => {
                const url = `${window.location.origin}/community`;
                const text = `${post.author_display_name || post.author_handle}: "${post.content.slice(0, 80)}…"`;
                if (navigator.share) {
                  try { await navigator.share({ title: 'BeScout Post', text, url }); } catch {}
                } else {
                  await navigator.clipboard.writeText(`${text} — ${url}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}>
              {copied ? <CheckCircle2 className="w-3 h-3" /> : <Send className="w-3 h-3" />}
              {copied ? 'Kopiert!' : 'Teilen'}
            </button>
            <button className="flex items-center gap-1 hover:text-white transition-colors">
              <Bookmark className="w-3 h-3" />
              Speichern
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
