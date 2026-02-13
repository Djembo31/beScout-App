'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowUp, ArrowDown, Trash2, Loader2, Send, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getReplies, createReply, deletePost, votePost, getUserPostVotes } from '@/lib/services/posts';
import type { PostWithAuthor } from '@/types';

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

type Props = {
  postId: string;
  userId: string;
  onRepliesCountChange: (postId: string, delta: number) => void;
};

export default function PostReplies({ postId, userId, onRepliesCountChange }: Props) {
  const [replies, setReplies] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myVotes, setMyVotes] = useState<Map<string, number>>(new Map());

  const loadReplies = useCallback(async () => {
    try {
      const data = await getReplies(postId);
      setReplies(data);
      if (data.length > 0) {
        const votes = await getUserPostVotes(userId, data.map(r => r.id));
        setMyVotes(votes);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [postId, userId]);

  useEffect(() => {
    loadReplies();
  }, [loadReplies]);

  const handleSubmit = async () => {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await createReply(userId, postId, replyText.trim());
      setReplyText('');
      onRepliesCountChange(postId, 1);
      await loadReplies();
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (replyId: string) => {
    try {
      await deletePost(userId, replyId);
      setReplies(prev => prev.filter(r => r.id !== replyId));
      onRepliesCountChange(postId, -1);
    } catch {
      // silently fail
    }
  };

  const handleVote = async (replyId: string, voteType: number) => {
    try {
      const result = await votePost(userId, replyId, voteType);
      setReplies(prev => prev.map(r =>
        r.id === replyId ? { ...r, upvotes: result.upvotes, downvotes: result.downvotes } : r
      ));
      setMyVotes(prev => {
        const next = new Map(prev);
        if (voteType === 0) next.delete(replyId);
        else next.set(replyId, voteType);
        return next;
      });
    } catch {
      // silently fail
    }
  };

  return (
    <div className="ml-10 border-t border-white/[0.06] pt-3 mt-2">
      {loading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="w-4 h-4 animate-spin text-white/30" />
        </div>
      ) : (
        <>
          {replies.length > 0 && (
            <div className="space-y-3 mb-3">
              {replies.map(reply => {
                const netScore = reply.upvotes - reply.downvotes;
                const myVote = myVotes.get(reply.id);
                const isOwn = reply.user_id === userId;

                return (
                  <div key={reply.id} className="group">
                    {/* Author line */}
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-xs">{reply.author_display_name || reply.author_handle}</span>
                      {reply.author_verified && <BadgeCheck className="w-3 h-3 text-[#FFD700]" />}
                      <span className="text-[10px] text-white/30 px-1 py-0.5 bg-white/5 rounded">Lv{reply.author_level}</span>
                      <span className="text-[10px] text-white/30">{formatTimeAgo(reply.created_at)}</span>
                    </div>

                    {/* Reply text */}
                    <p className="text-sm text-white/70 leading-relaxed mb-1">{reply.content}</p>

                    {/* Actions */}
                    <div className="flex items-center gap-3 text-xs text-white/40">
                      <button
                        onClick={() => handleVote(reply.id, myVote === 1 ? 0 : 1)}
                        className={cn(
                          'flex items-center gap-0.5 transition-colors',
                          myVote === 1 ? 'text-[#22C55E]' : 'hover:text-[#22C55E]'
                        )}
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <span className={cn(
                        'font-mono text-[11px]',
                        netScore > 0 ? 'text-[#22C55E]' : netScore < 0 ? 'text-red-300' : 'text-white/30'
                      )}>
                        {netScore}
                      </span>
                      <button
                        onClick={() => handleVote(reply.id, myVote === -1 ? 0 : -1)}
                        className={cn(
                          'flex items-center gap-0.5 transition-colors',
                          myVote === -1 ? 'text-red-300' : 'hover:text-red-300'
                        )}
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      {isOwn && (
                        <button
                          onClick={() => handleDelete(reply.id)}
                          className="flex items-center gap-0.5 hover:text-red-300 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Löschen</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reply form */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value.slice(0, 300))}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder="Antwort schreiben..."
              className="flex-1 px-3 py-1.5 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40"
            />
            <button
              onClick={handleSubmit}
              disabled={!replyText.trim() || submitting}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                replyText.trim() ? 'text-[#FFD700] hover:bg-[#FFD700]/10' : 'text-white/20'
              )}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
