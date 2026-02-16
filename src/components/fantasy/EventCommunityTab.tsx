'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  MessageCircle, Send, ArrowUp, ArrowDown,
  Loader2, Clock, Trophy, Play, Sparkles, Trash2,
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useUser } from '@/components/providers/AuthProvider';
import { getPosts, createPost, votePost, deletePost, getUserPostVotes } from '@/lib/services/posts';
import type { PostWithAuthor } from '@/types';
import type { EventStatus } from './types';

// ============================================
// HELPERS
// ============================================

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

function getPhaseInfo(status: EventStatus): { label: string; color: string; icon: React.ReactNode; hint: string } {
  switch (status) {
    case 'registering':
    case 'late-reg':
    case 'upcoming':
      return {
        label: 'Vorschau',
        color: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
        icon: <Clock className="w-3.5 h-3.5" />,
        hint: 'Teile deine Predictions und Lineup-Tipps!',
      };
    case 'running':
      return {
        label: 'Live',
        color: 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20',
        icon: <Play className="w-3.5 h-3.5" />,
        hint: 'Diskutiere die laufenden Performances!',
      };
    case 'ended':
      return {
        label: 'Auswertung',
        color: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
        icon: <Trophy className="w-3.5 h-3.5" />,
        hint: 'Analysiere die Ergebnisse und Spielerbewertungen!',
      };
  }
}

const CATEGORIES = [
  { id: 'Meinung', label: 'Meinung', color: 'bg-amber-500/15 text-amber-300 border-amber-500/20' },
  { id: 'Prediction', label: 'Prediction', color: 'bg-purple-500/15 text-purple-300 border-purple-500/20' },
  { id: 'Analyse', label: 'Analyse', color: 'bg-sky-500/15 text-sky-300 border-sky-500/20' },
];

// ============================================
// COMPONENT
// ============================================

interface EventCommunityTabProps {
  eventId: string;
  eventStatus: EventStatus;
  eventName: string;
  gameweek?: number;
}

export default function EventCommunityTab({ eventId, eventStatus, eventName, gameweek }: EventCommunityTabProps) {
  const { user } = useUser();
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [myVotes, setMyVotes] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Meinung');

  const phase = getPhaseInfo(eventStatus);

  // Load posts for this event
  const loadPosts = useCallback(async () => {
    try {
      const data = await getPosts({ eventId, limit: 100 });
      setPosts(data);
      // Load user votes
      if (user && data.length > 0) {
        const postIds = data.map(p => p.id);
        const votes = await getUserPostVotes(user.id, postIds);
        setMyVotes(votes);
      }
    } catch (err) {
      console.error('[EventCommunity] Load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId, user]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Create post
  const handlePost = async () => {
    if (!user || !content.trim() || posting) return;
    setPosting(true);
    try {
      await createPost(
        user.id,
        null, // no player
        null, // no club name
        content.trim(),
        gameweek ? [`GW${gameweek}`] : [],
        category,
        null, // no clubId
        'general',
        null, // no rumor source
        null, // no rumor club
        eventId
      );
      setContent('');
      await loadPosts();
    } catch (err) {
      console.error('[EventCommunity] Post failed:', err);
    } finally {
      setPosting(false);
    }
  };

  // Vote
  const handleVote = async (postId: string, voteType: number) => {
    if (!user) return;
    try {
      const result = await votePost(user.id, postId, voteType);
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, upvotes: result.upvotes, downvotes: result.downvotes } : p
      ));
      setMyVotes(prev => {
        const next = new Map(prev);
        if (voteType === 0) next.delete(postId);
        else next.set(postId, voteType);
        return next;
      });
    } catch (err) {
      console.error('[EventCommunity] Vote failed:', err);
    }
  };

  // Delete own post
  const handleDelete = async (postId: string) => {
    if (!user) return;
    try {
      await deletePost(user.id, postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      console.error('[EventCommunity] Delete failed:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Phase Banner */}
      <div className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium', phase.color)}>
        {phase.icon}
        <span>{phase.label}</span>
        <span className="text-white/40 ml-1">— {phase.hint}</span>
      </div>

      {/* Compose Box */}
      {user && (
        <Card className="p-3">
          <div className="flex gap-2 mb-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all',
                  category === cat.id ? cat.color : 'text-white/30 border-white/10 hover:border-white/20'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={
                eventStatus === 'ended'
                  ? 'Was denkst du über die Ergebnisse?'
                  : eventStatus === 'running'
                    ? 'Wie laufen die Spieler?'
                    : 'Teile deine Prediction...'
              }
              rows={2}
              className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-[#FFD700]/30"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handlePost();
                }
              }}
            />
            <Button
              variant="gold"
              size="sm"
              onClick={handlePost}
              disabled={!content.trim() || posting}
              className="self-end"
            >
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <div className="text-[10px] text-white/20 mt-1">Enter zum Senden, Shift+Enter für neue Zeile</div>
        </Card>
      )}

      {/* Posts List */}
      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-white/30">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Lade Diskussion...</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle className="w-10 h-10 mx-auto mb-3 text-white/10" />
          <div className="text-sm text-white/30">Noch keine Beiträge</div>
          <div className="text-xs text-white/20 mt-1">Sei der Erste und starte die Diskussion!</div>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map(post => {
            const myVote = myVotes.get(post.id);
            const netScore = post.upvotes - post.downvotes;
            const isOwn = user?.id === post.user_id;
            const catStyle = CATEGORIES.find(c => c.id === post.category);

            return (
              <Card key={post.id} className="p-3">
                <div className="flex gap-2.5">
                  {/* Votes */}
                  <div className="flex flex-col items-center gap-0.5 pt-0.5">
                    <button
                      onClick={() => handleVote(post.id, myVote === 1 ? 0 : 1)}
                      className={cn(
                        'p-1 rounded transition-colors',
                        myVote === 1 ? 'text-[#22C55E] bg-[#22C55E]/10' : 'text-white/20 hover:text-[#22C55E]'
                      )}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <span className={cn(
                      'text-xs font-mono font-bold',
                      netScore > 0 ? 'text-[#22C55E]' : netScore < 0 ? 'text-red-400' : 'text-white/30'
                    )}>
                      {netScore}
                    </span>
                    <button
                      onClick={() => handleVote(post.id, myVote === -1 ? 0 : -1)}
                      className={cn(
                        'p-1 rounded transition-colors',
                        myVote === -1 ? 'text-red-400 bg-red-400/10' : 'text-white/20 hover:text-red-400'
                      )}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link href={`/profile/${post.author_handle}`} className="text-xs font-bold text-white/70 truncate hover:text-[#FFD700] transition-colors">
                        {post.author_display_name ?? post.author_handle}
                      </Link>
                      {post.author_verified && (
                        <Sparkles className="w-3 h-3 text-[#FFD700] shrink-0" />
                      )}
                      {catStyle && (
                        <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold border', catStyle.color)}>
                          {catStyle.label}
                        </span>
                      )}
                      <span className="text-[10px] text-white/20 ml-auto shrink-0">{formatTimeAgo(post.created_at)}</span>
                    </div>
                    <p className="text-sm text-white/80 whitespace-pre-wrap break-words">{post.content}</p>
                    {post.replies_count > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] text-white/30">
                        <MessageCircle className="w-3 h-3" />
                        {post.replies_count} {post.replies_count === 1 ? 'Antwort' : 'Antworten'}
                      </div>
                    )}
                  </div>

                  {/* Delete (own posts) */}
                  {isOwn && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="p-1 text-white/20 hover:text-red-400 transition-colors self-start"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
