'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FileText, ChevronRight, Plus, MessageSquare, ArrowUp, ArrowDown, Trash2, BadgeCheck, Send, CheckCircle2 } from 'lucide-react';
import { Card, Button, Modal } from '@/components/ui';
import { PositionBadge } from '@/components/player';
import { cn } from '@/lib/utils';
import ResearchCard from '@/components/community/ResearchCard';
import { POST_CATEGORIES, formatTimeAgo } from '@/components/community/PostCard';
import SentimentGauge from './SentimentGauge';
import type { ResearchPostWithAuthor, PostWithAuthor, DbTrade } from '@/types';

interface CommunityTabProps {
  playerResearch: ResearchPostWithAuthor[];
  playerPosts: PostWithAuthor[];
  myPostVotes: Map<string, number>;
  trades: DbTrade[];
  userId?: string;
  playerId: string;
  playerName: string;
  unlockingId: string | null;
  ratingId: string | null;
  postLoading: boolean;
  onUnlock: (id: string) => void;
  onRate: (id: string, rating: number) => void;
  onCreatePost: (content: string, tags: string[], category: string, postType?: 'player_take' | 'transfer_rumor', rumorSource?: string, rumorClubTarget?: string) => void;
  onVotePost: (postId: string, voteType: number) => void;
  onDeletePost: (postId: string) => void;
}

// Rumor categories for transfer rumors
const RUMOR_CATEGORIES = [
  { id: 'Gerücht', label: 'Gerücht', color: 'bg-red-500/15 text-red-300 border-red-500/20' },
  { id: 'Insider', label: 'Insider', color: 'bg-purple-500/15 text-purple-300 border-purple-500/20' },
  { id: 'Quelle', label: 'Quelle', color: 'bg-amber-500/15 text-amber-300 border-amber-500/20' },
];

export default function CommunityTab({
  playerResearch, playerPosts, myPostVotes, trades, userId, playerId, playerName,
  unlockingId, ratingId, postLoading,
  onUnlock, onRate, onCreatePost, onVotePost, onDeletePost,
}: CommunityTabProps) {
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateRumor, setShowCreateRumor] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postCategory, setPostCategory] = useState('Meinung');
  const [postTags, setPostTags] = useState('');
  const [rumorContent, setRumorContent] = useState('');
  const [rumorSource, setRumorSource] = useState('');
  const [rumorClubTarget, setRumorClubTarget] = useState('');
  const [rumorCategory, setRumorCategory] = useState('Gerücht');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Split posts by type
  const takes = playerPosts.filter(p => p.post_type !== 'transfer_rumor');
  const rumors = playerPosts.filter(p => p.post_type === 'transfer_rumor');

  // Sentiment from trades
  const recentTrades = trades.filter(t => {
    const diff = Date.now() - new Date(t.executed_at).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  });

  const handleSubmitPost = () => {
    if (!postContent.trim()) return;
    const tags = postTags.split(',').map(t => t.trim()).filter(Boolean);
    onCreatePost(postContent.trim(), tags, postCategory, 'player_take');
    setPostContent(''); setPostTags(''); setPostCategory('Meinung');
    setShowCreatePost(false);
  };

  const handleSubmitRumor = () => {
    if (!rumorContent.trim()) return;
    onCreatePost(rumorContent.trim(), ['Transfer', playerName.split(' ').pop() ?? ''].filter(Boolean), rumorCategory, 'transfer_rumor', rumorSource || undefined, rumorClubTarget || undefined);
    setRumorContent(''); setRumorSource(''); setRumorClubTarget(''); setRumorCategory('Gerücht');
    setShowCreateRumor(false);
  };

  const sharePost = async (post: PostWithAuthor) => {
    const url = `${window.location.origin}/player/${playerId}`;
    const text = `${post.author_display_name || post.author_handle}: "${post.content.slice(0, 80)}…"`;
    if (navigator.share) {
      try { await navigator.share({ title: 'BeScout', text, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(`${text} — ${url}`);
      setCopiedId(post.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Mini PostCard for player page (compact version)
  const renderPost = (post: PostWithAuthor) => {
    const myVote = myPostVotes.get(post.id);
    const netScore = post.upvotes - post.downvotes;
    const isOwn = post.user_id === userId;
    const isRumor = post.post_type === 'transfer_rumor';
    const copied = copiedId === post.id;

    return (
      <Card key={post.id} className={cn('p-3', isRumor && 'border-red-500/20 bg-red-500/[0.02]')}>
        <div className="flex gap-2.5">
          {/* Votes */}
          <div className="flex flex-col items-center gap-0.5">
            <button onClick={() => onVotePost(post.id, myVote === 1 ? 0 : 1)}
              className={cn('p-1 rounded transition-colors', myVote === 1 ? 'bg-[#22C55E]/20 text-[#22C55E]' : 'text-white/30 hover:text-[#22C55E]')}>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <span className={cn('font-mono text-xs font-bold', netScore > 10 ? 'text-[#22C55E]' : netScore < 0 ? 'text-red-300' : 'text-white/50')}>{netScore}</span>
            <button onClick={() => onVotePost(post.id, myVote === -1 ? 0 : -1)}
              className={cn('p-1 rounded transition-colors', myVote === -1 ? 'bg-red-500/20 text-red-300' : 'text-white/30 hover:text-red-300')}>
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="font-bold text-xs">{post.author_display_name || post.author_handle}</span>
              {post.author_verified && <BadgeCheck className="w-3 h-3 text-[#FFD700]" />}
              <span className="text-[9px] text-white/30 px-1 py-0.5 bg-white/5 rounded">Lv{post.author_level}</span>
              <span className="text-[10px] text-white/40">{formatTimeAgo(post.created_at)}</span>
            </div>

            {/* Category/Type Badge */}
            {isRumor ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border mb-1.5 bg-red-500/15 text-red-300 border-red-500/20">
                {post.rumor_source ? `📡 ${post.rumor_source}` : '📡 Gerücht'}
              </span>
            ) : post.category ? (
              <span className={cn(
                'inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border mb-1.5',
                POST_CATEGORIES.find(c => c.id === post.category)?.color ?? 'bg-white/5 text-white/50 border-white/10'
              )}>
                {post.category}
              </span>
            ) : null}

            {/* Rumor target club */}
            {isRumor && post.rumor_club_target && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border mb-1.5 ml-1 bg-amber-500/15 text-amber-300 border-amber-500/20">
                → {post.rumor_club_target}
              </span>
            )}

            <p className="text-sm text-white/80 leading-relaxed mb-1.5">{post.content}</p>

            {post.tags.length > 0 && (
              <div className="flex gap-1 mb-1.5 flex-wrap">
                {post.tags.map(tag => (
                  <span key={tag} className="px-1 py-0.5 rounded text-[9px] bg-white/5 text-white/40">#{tag}</span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 text-[10px] text-white/40">
              <span className="flex items-center gap-0.5">
                <MessageSquare className="w-3 h-3" /> {post.replies_count}
              </span>
              <button onClick={() => sharePost(post)} className={cn('flex items-center gap-0.5', copied ? 'text-[#22C55E]' : 'hover:text-white')}>
                {copied ? <CheckCircle2 className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                {copied ? 'Kopiert!' : 'Teilen'}
              </button>
              {isOwn && (
                <button onClick={() => onDeletePost(post.id)} className="flex items-center gap-0.5 hover:text-red-300">
                  <Trash2 className="w-3 h-3" /> Löschen
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Sentiment Gauge */}
      <Card className="p-4 md:p-6">
        <h3 className="font-black text-lg mb-4">Community-Stimmung</h3>
        <div className="flex justify-center">
          <SentimentGauge buyCount={recentTrades.length} sellCount={recentTrades.filter(t => t.seller_id !== null).length} />
        </div>
        <div className="text-center mt-2 text-xs text-white/40">
          Basiert auf {recentTrades.length} Trades der letzten 7 Tage
        </div>
      </Card>

      {/* Player Takes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-white/50" />
            Aussagen zu {playerName}
          </h3>
          {userId && (
            <Button variant="outline" onClick={() => setShowCreatePost(true)} className="text-xs gap-1">
              <Plus className="w-3 h-3" /> Posten
            </Button>
          )}
        </div>

        {takes.length === 0 ? (
          <Card className="p-6 text-center">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-white/20" />
            <div className="text-white/50 text-sm mb-2">Noch keine Aussagen</div>
            {userId && (
              <Button variant="gold" onClick={() => setShowCreatePost(true)} className="text-xs">
                Erste Meinung teilen
              </Button>
            )}
          </Card>
        ) : (
          takes.map(renderPost)
        )}
      </div>

      {/* Transfer Rumors */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-lg flex items-center gap-2">
            📡 Gerüchteküche
          </h3>
          {userId && (
            <Button variant="outline" onClick={() => setShowCreateRumor(true)} className="text-xs gap-1">
              <Plus className="w-3 h-3" /> Gerücht
            </Button>
          )}
        </div>

        {rumors.length === 0 ? (
          <Card className="p-6 text-center border-red-500/10">
            <div className="text-2xl mb-2">📡</div>
            <div className="text-white/50 text-sm mb-2">Keine Transfergerüchte</div>
            {userId && (
              <Button variant="outline" onClick={() => setShowCreateRumor(true)} className="text-xs">
                Gerücht teilen
              </Button>
            )}
          </Card>
        ) : (
          rumors.map(renderPost)
        )}
      </div>

      {/* Research Posts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-white/50" />
            Research-Berichte
          </h3>
          <Link href="/community" className="text-xs text-[#FFD700] flex items-center gap-1 hover:underline">
            Alle anzeigen <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {playerResearch.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-white/20" />
            <div className="text-white/50 text-sm">Noch keine Research-Berichte</div>
          </Card>
        ) : (
          playerResearch.map(post => (
            <ResearchCard
              key={post.id}
              post={post}
              onUnlock={(id) => onUnlock(id)}
              unlockingId={unlockingId}
              onRate={(id, rating) => onRate(id, rating)}
              ratingId={ratingId}
            />
          ))
        )}
      </div>

      {/* Create Player Take Modal */}
      <Modal open={showCreatePost} title={`Aussage zu ${playerName}`} onClose={() => setShowCreatePost(false)}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/50 font-semibold mb-1.5 block">Kategorie</label>
            <div className="flex gap-1.5 flex-wrap">
              {POST_CATEGORIES.map(cat => (
                <button key={cat.id} type="button" onClick={() => setPostCategory(cat.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                    postCategory === cat.id ? cat.color : 'text-white/50 bg-white/5 border-white/10 hover:bg-white/10'
                  )}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 font-semibold mb-1.5 flex justify-between">
              <span>Deine Meinung</span>
              <span className={cn('font-mono', postContent.length > 400 ? 'text-amber-400' : 'text-white/30')}>{postContent.length}/500</span>
            </label>
            <textarea value={postContent} onChange={e => setPostContent(e.target.value.slice(0, 500))} rows={4}
              placeholder={`Was denkst du über ${playerName}?`}
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40 resize-none" />
          </div>
          <div>
            <label className="text-xs text-white/50 font-semibold mb-1.5 block">Tags (kommagetrennt)</label>
            <input type="text" value={postTags} onChange={e => setPostTags(e.target.value)}
              placeholder="z.B. Form, Value, Tactics"
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40" />
          </div>
          <Button variant="gold" fullWidth loading={postLoading} onClick={handleSubmitPost}>Posten</Button>
        </div>
      </Modal>

      {/* Create Transfer Rumor Modal */}
      <Modal open={showCreateRumor} title={`Gerücht zu ${playerName}`} onClose={() => setShowCreateRumor(false)}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/50 font-semibold mb-1.5 block">Art</label>
            <div className="flex gap-1.5 flex-wrap">
              {RUMOR_CATEGORIES.map(cat => (
                <button key={cat.id} type="button" onClick={() => setRumorCategory(cat.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                    rumorCategory === cat.id ? cat.color : 'text-white/50 bg-white/5 border-white/10 hover:bg-white/10'
                  )}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 font-semibold mb-1.5 block">Ziel-Club (optional)</label>
            <input type="text" value={rumorClubTarget} onChange={e => setRumorClubTarget(e.target.value)}
              placeholder="z.B. Galatasaray, Fenerbahçe"
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40" />
          </div>
          <div>
            <label className="text-xs text-white/50 font-semibold mb-1.5 block">Quelle (optional)</label>
            <input type="text" value={rumorSource} onChange={e => setRumorSource(e.target.value)}
              placeholder="z.B. Fanatik, Sabah, Twitter"
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40" />
          </div>
          <div>
            <label className="text-xs text-white/50 font-semibold mb-1.5 flex justify-between">
              <span>Gerücht</span>
              <span className={cn('font-mono', rumorContent.length > 400 ? 'text-amber-400' : 'text-white/30')}>{rumorContent.length}/500</span>
            </label>
            <textarea value={rumorContent} onChange={e => setRumorContent(e.target.value.slice(0, 500))} rows={4}
              placeholder={`Was hast du über ${playerName} gehört?`}
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40 resize-none" />
          </div>
          <Button variant="gold" fullWidth loading={postLoading} onClick={handleSubmitRumor}>Gerücht posten</Button>
        </div>
      </Modal>
    </div>
  );
}
