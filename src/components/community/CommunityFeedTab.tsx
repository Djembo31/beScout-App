'use client';

import React, { useState, useMemo } from 'react';
import { Trophy, Vote, BadgeCheck, Plus, MessageSquare } from 'lucide-react';
import { Card, Button, SearchInput, SortPills, EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils';
import PostCard, { POST_CATEGORIES } from '@/components/community/PostCard';
import type { PostWithAuthor, DbClubVote, LeaderboardUser } from '@/types';
import type { SubscriptionTier } from '@/lib/services/clubSubscriptions';

// ============================================
// TYPES
// ============================================

type FeedSort = 'new' | 'top' | 'trending';

/** Trending score: engagement weighted by recency (half-life ~24h) */
function trendingScore(post: PostWithAuthor): number {
  const engagement = post.upvotes * 2 + post.replies_count * 3;
  const ageHours = (Date.now() - new Date(post.created_at).getTime()) / 3600000;
  return engagement / Math.pow(ageHours + 2, 1.5);
}

type PostTypeFilter = 'all' | 'general' | 'transfer_rumor' | 'club_news';

interface CommunityFeedTabProps {
  posts: PostWithAuthor[];
  myPostVotes: Map<string, number>;
  ownedPlayerIds: Set<string>;
  followingIds: Set<string>;
  leaderboard: LeaderboardUser[];
  clubVotes: DbClubVote[];
  userId: string;
  isFollowingTab: boolean;
  onVote: (postId: string, voteType: number) => void;
  onDelete: (postId: string) => void;
  onCreatePost: () => void;
  onSwitchToLeaderboard: () => void;
  onSwitchToVotes?: () => void;
  isClubAdmin?: boolean;
  onAdminDelete?: (postId: string) => void;
  onTogglePin?: (postId: string, pinned: boolean) => void;
  subscriptionMap?: Map<string, SubscriptionTier>;
}

// ============================================
// COMMUNITY FEED TAB
// ============================================

export default function CommunityFeedTab({
  posts,
  myPostVotes,
  ownedPlayerIds,
  followingIds,
  leaderboard,
  clubVotes,
  userId,
  isFollowingTab,
  onVote,
  onDelete,
  onCreatePost,
  onSwitchToLeaderboard,
  onSwitchToVotes,
  isClubAdmin,
  onAdminDelete,
  onTogglePin,
  subscriptionMap,
}: CommunityFeedTabProps) {
  const [feedSort, setFeedSort] = useState<FeedSort>('new');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [postTypeFilter, setPostTypeFilter] = useState<PostTypeFilter>('all');

  // ---- Filtered/Sorted Posts ----
  const filteredPosts = useMemo(() => {
    let result = posts;

    // Following tab filter
    if (isFollowingTab) {
      result = result.filter(p => followingIds.has(p.user_id));
    }

    // Post type filter (All / Posts / Gerüchte / Club-News)
    if (postTypeFilter === 'general') {
      result = result.filter(p => p.post_type !== 'transfer_rumor' && p.post_type !== 'club_news');
    } else if (postTypeFilter === 'transfer_rumor') {
      result = result.filter(p => p.post_type === 'transfer_rumor');
    } else if (postTypeFilter === 'club_news') {
      result = result.filter(p => p.post_type === 'club_news');
    }

    // Category filter
    if (categoryFilter) {
      result = result.filter(p => p.category === categoryFilter);
    }

    // Search
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(p =>
        p.content.toLowerCase().includes(q) ||
        (p.player_name && p.player_name.toLowerCase().includes(q)) ||
        p.author_handle.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    // Sort: pinned always first, then by selected sort
    if (feedSort === 'trending') {
      result = [...result].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return trendingScore(b) - trendingScore(a);
      });
    } else if (feedSort === 'top') {
      result = [...result].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
      });
    } else {
      // 'new': pinned first (already from DB), then by created_at
      result = [...result].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    return result;
  }, [posts, isFollowingTab, feedSort, query, followingIds, categoryFilter, postTypeFilter]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Feed */}
      <div className="lg:col-span-2 space-y-4">
        {/* Search + Sort */}
        <div className="flex items-center gap-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Suche Posts, Spieler, Tags..." className="flex-1" />
          <SortPills
            options={[
              { id: 'new', label: 'Neu' },
              { id: 'trending', label: 'Beliebt' },
              { id: 'top', label: 'Top' },
            ]}
            active={feedSort}
            onChange={(id) => setFeedSort(id as FeedSort)}
          />
        </div>

        {/* Post Type Filter (All / Posts / Gerüchte) */}
        <div className="flex gap-1.5">
          {([
            { id: 'all' as PostTypeFilter, label: 'Alle' },
            { id: 'general' as PostTypeFilter, label: 'Posts' },
            { id: 'transfer_rumor' as PostTypeFilter, label: 'Gerüchte' },
            { id: 'club_news' as PostTypeFilter, label: 'Club-News' },
          ]).map(opt => (
            <button
              key={opt.id}
              onClick={() => setPostTypeFilter(opt.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                postTypeFilter === opt.id
                  ? opt.id === 'transfer_rumor'
                    ? 'bg-red-500/15 text-red-300 border-red-500/30'
                    : opt.id === 'club_news'
                      ? 'bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/30'
                      : 'bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/30'
                  : 'bg-white/[0.02] text-white/40 border-white/10 hover:text-white/60'
              )}
            >
              {opt.id === 'transfer_rumor' && '📡 '}{opt.label}
            </button>
          ))}
        </div>

        {/* Category Filter Pills */}
        <div className="flex gap-1 flex-wrap">
          {POST_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(prev => prev === cat.id ? null : cat.id)}
              className={cn(
                'px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                categoryFilter === cat.id
                  ? cat.color
                  : 'text-white/40 bg-white/[0.02] border-white/[0.06] hover:bg-white/5 hover:text-white/60'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Result Counter */}
        <div className="text-xs text-white/40 px-1">{filteredPosts.length} Beiträge</div>

        {/* Posts */}
        {filteredPosts.length === 0 ? (
          isFollowingTab ? (
            <EmptyState icon={<Trophy />} title="Folge Scouts um deren Posts hier zu sehen" action={{ label: 'Top Scouts entdecken', onClick: onSwitchToLeaderboard }} />
          ) : query.trim() ? (
            <EmptyState icon={<MessageSquare />} title={`Keine Ergebnisse für "${query}"`} action={{ label: 'Suche löschen', onClick: () => setQuery('') }} />
          ) : (
            <EmptyState icon={<MessageSquare />} title="Noch keine Posts" action={{ label: 'Ersten Post schreiben', onClick: onCreatePost }} />
          )
        ) : (
          <div className="space-y-3">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                myVote={myPostVotes.get(post.id)}
                ownedPlayerIds={ownedPlayerIds}
                onVote={onVote}
                onDelete={onDelete}
                isOwn={post.user_id === userId}
                userId={userId}
                isClubAdmin={isClubAdmin}
                onAdminDelete={onAdminDelete}
                onTogglePin={onTogglePin}
                tipCount={post.tip_count ?? 0}
                tipTotalCents={post.tip_total_cents ?? 0}
                authorSubscriptionTier={subscriptionMap?.get(post.user_id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Top Scouts Mini */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#FFD700]" />
              <span className="font-bold text-sm">Top Scouts</span>
            </div>
            <button onClick={onSwitchToLeaderboard} className="text-xs text-[#FFD700] hover:underline">Alle</button>
          </div>
          <div className="space-y-2">
            {leaderboard.slice(0, 5).map((u, i) => (
              <div key={u.userId} className="flex items-center gap-3 py-1.5">
                <span className={cn(
                  'w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black',
                  i === 0 ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'bg-white/5 text-white/50'
                )}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate flex items-center gap-1">
                    {u.displayName || u.handle}
                    {u.verified && <BadgeCheck className="w-3 h-3 text-[#FFD700]" />}
                  </div>
                </div>
                <span className="text-xs font-mono text-[#FFD700]">{u.totalScore}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Active Votes Mini */}
        {clubVotes.filter(v => v.status === 'active').length > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Vote className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-sm">Laufende Votes</span>
              </div>
              <button onClick={onSwitchToVotes} className="text-xs text-purple-400 hover:underline">Alle</button>
            </div>
            <div className="space-y-2">
              {clubVotes.filter(v => v.status === 'active').slice(0, 3).map(v => (
                <button
                  key={v.id}
                  onClick={onSwitchToVotes}
                  className="w-full text-left p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                >
                  <div className="text-sm font-medium line-clamp-1">{v.question}</div>
                  <div className="text-[10px] text-white/40 mt-0.5">{v.total_votes} Stimmen</div>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
