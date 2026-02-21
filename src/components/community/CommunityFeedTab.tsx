'use client';

import React, { useState, useMemo } from 'react';
import { Trophy, MessageSquare } from 'lucide-react';
import { SearchInput, SortPills, EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils';
import PostCard from '@/components/community/PostCard';
import type { PostWithAuthor } from '@/types';
import type { SubscriptionTier } from '@/lib/services/clubSubscriptions';
import { useTranslations } from 'next-intl';

// ============================================
// TYPES
// ============================================

type FeedSort = 'new' | 'top' | 'trending';
type PostTypeFilter = 'all' | 'transfer_rumor' | 'club_news';

/** Trending score: engagement weighted by recency (half-life ~24h) */
function trendingScore(post: PostWithAuthor): number {
  const engagement = post.upvotes * 2 + post.replies_count * 3;
  const ageHours = (Date.now() - new Date(post.created_at).getTime()) / 3600000;
  return engagement / Math.pow(ageHours + 2, 1.5);
}

interface CommunityFeedTabProps {
  posts: PostWithAuthor[];
  myPostVotes: Map<string, number>;
  ownedPlayerIds: Set<string>;
  followingIds: Set<string>;
  userId: string;
  isFollowingTab: boolean;
  onVote: (postId: string, voteType: number) => void;
  onDelete: (postId: string) => void;
  onCreatePost: () => void;
  onSwitchToLeaderboard: () => void;
  isClubAdmin?: boolean;
  onAdminDelete?: (postId: string) => void;
  onTogglePin?: (postId: string, pinned: boolean) => void;
  subscriptionMap?: Map<string, SubscriptionTier>;
}

// ============================================
// COMMUNITY FEED TAB (simplified)
// ============================================

export default function CommunityFeedTab({
  posts,
  myPostVotes,
  ownedPlayerIds,
  followingIds,
  userId,
  isFollowingTab,
  onVote,
  onDelete,
  onCreatePost,
  onSwitchToLeaderboard,
  isClubAdmin,
  onAdminDelete,
  onTogglePin,
  subscriptionMap,
}: CommunityFeedTabProps) {
  const t = useTranslations('community');
  const [feedSort, setFeedSort] = useState<FeedSort>('new');
  const [query, setQuery] = useState('');
  const [postTypeFilter, setPostTypeFilter] = useState<PostTypeFilter>('all');

  // ---- Filtered/Sorted Posts ----
  const filteredPosts = useMemo(() => {
    let result = posts;

    // Following tab filter
    if (isFollowingTab) {
      result = result.filter(p => followingIds.has(p.user_id));
    }

    // Post type filter
    if (postTypeFilter === 'transfer_rumor') {
      result = result.filter(p => p.post_type === 'transfer_rumor');
    } else if (postTypeFilter === 'club_news') {
      result = result.filter(p => p.post_type === 'club_news');
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
      result = [...result].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    return result;
  }, [posts, isFollowingTab, feedSort, query, followingIds, postTypeFilter]);

  return (
    <div className="space-y-4">
      {/* Single-line filter: Search + Type Pills + Sort */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder={t('feed.searchPlaceholder')} className="flex-1 min-w-[160px]" />
        <div className="flex gap-1">
          {([
            { id: 'all' as PostTypeFilter, label: t('filterAll') },
            { id: 'transfer_rumor' as PostTypeFilter, label: t('rumors') },
            { id: 'club_news' as PostTypeFilter, label: 'News' },
          ]).map(opt => (
            <button
              key={opt.id}
              onClick={() => setPostTypeFilter(opt.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold transition-all border min-h-[36px]',
                postTypeFilter === opt.id
                  ? opt.id === 'transfer_rumor'
                    ? 'bg-red-500/15 text-red-300 border-red-500/30'
                    : 'bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/30'
                  : 'bg-white/[0.02] text-white/40 border-white/10 hover:text-white/60'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <SortPills
          options={[
            { id: 'new', label: t('feed.sortNew') },
            { id: 'trending', label: t('feed.sortTrending') },
            { id: 'top', label: 'Top' },
          ]}
          active={feedSort}
          onChange={(id) => setFeedSort(id as FeedSort)}
        />
      </div>

      {/* Result Counter */}
      <div className="text-xs text-white/40 px-1">{filteredPosts.length} {t('feed.posts')}</div>

      {/* Posts */}
      {filteredPosts.length === 0 ? (
        isFollowingTab ? (
          <EmptyState icon={<Trophy />} title={t('feed.emptyFollowing')} action={{ label: t('feed.discoverScouts'), onClick: onSwitchToLeaderboard }} />
        ) : query.trim() ? (
          <EmptyState icon={<MessageSquare />} title={`${t('feed.noResults')} "${query}"`} action={{ label: t('feed.clearSearch'), onClick: () => setQuery('') }} />
        ) : (
          <EmptyState icon={<MessageSquare />} title={t('feed.noPosts')} action={{ label: t('feed.writeFirst'), onClick: onCreatePost }} />
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
  );
}
