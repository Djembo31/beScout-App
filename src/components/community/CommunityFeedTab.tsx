'use client';

import React, { useState, useMemo } from 'react';
import { Trophy, MessageSquare, Vote, FileText, Target, Radio, Megaphone } from 'lucide-react';
import { SearchInput, SortPills, EmptyState, Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import PostCard from '@/components/community/PostCard';
import ResearchCard from '@/components/community/ResearchCard';
import BountyCard from '@/components/community/BountyCard';
import CommunityPollCard from '@/components/community/CommunityPollCard';
import type { PostWithAuthor, ResearchPostWithAuthor, BountyWithCreator, DbClubVote, CommunityPollWithCreator } from '@/types';
import type { SubscriptionTier } from '@/lib/services/clubSubscriptions';
import { useBatchEquippedCosmetics } from '@/lib/queries/cosmetics';
import { useTranslations } from 'next-intl';

// ============================================
// TYPES
// ============================================

type FeedSort = 'new' | 'top' | 'trending';
export type ContentFilter = 'all' | 'posts' | 'rumors' | 'research' | 'bounties' | 'votes' | 'news';

type FeedItem =
  | { type: 'post'; data: PostWithAuthor; date: string }
  | { type: 'research'; data: ResearchPostWithAuthor; date: string }
  | { type: 'bounty'; data: BountyWithCreator; date: string }
  | { type: 'vote'; data: DbClubVote; date: string }
  | { type: 'poll'; data: CommunityPollWithCreator; date: string };

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
  // Content filter
  contentFilter: ContentFilter;
  onContentFilterChange: (f: ContentFilter) => void;
  // Additional data for unified feed
  researchPosts?: ResearchPostWithAuthor[];
  bounties?: BountyWithCreator[];
  clubVotes?: DbClubVote[];
  communityPolls?: CommunityPollWithCreator[];
  // Research handlers
  onUnlockResearch?: (postId: string) => void;
  unlockingResearchId?: string | null;
  onRateResearch?: (postId: string, rating: number) => void;
  ratingResearchId?: string | null;
  // Bounty handlers
  onBountySubmit?: (bountyId: string, title: string, content: string, evaluation?: Record<string, unknown> | null) => void;
  bountySubmitting?: string | null;
  userTier?: string | null;
  // Vote handlers
  userVotedIds?: Set<string>;
  onCastVote?: (voteId: string, optionIndex: number) => void;
  votingId?: string | null;
  // Poll handlers
  userPollVotedIds?: Set<string>;
  onCastPollVote?: (pollId: string, optionIndex: number) => void;
  onCancelPoll?: (pollId: string) => void;
  pollVotingId?: string | null;
}

// ============================================
// INLINE VOTE CARD (compact version)
// ============================================

function InlineFeedVoteCard({ vote, hasVoted, onVote, voting }: {
  vote: DbClubVote;
  hasVoted: boolean;
  onVote?: (voteId: string, optionIndex: number) => void;
  voting?: string | null;
}) {
  const t = useTranslations('community');
  const totalVotes = vote.total_votes;
  const isActive = vote.status === 'active' && new Date(vote.ends_at) > new Date();

  return (
    <Card className="overflow-hidden">
      <div className="p-3 flex items-center justify-between bg-purple-500/[0.06] border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          <Vote className="w-4 h-4 text-purple-400" />
          <span className="font-bold text-sm text-purple-300">{t('clubVote')}</span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold mb-3">{vote.question}</h3>
        <div className="space-y-2 mb-3">
          {(vote.options as { label: string; votes: number }[]).map((option, idx) => {
            const pct = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
            return (
              <button
                key={idx}
                onClick={() => !hasVoted && isActive && onVote?.(vote.id, idx)}
                disabled={hasVoted || !isActive || voting === vote.id}
                className={cn(
                  'w-full p-2.5 rounded-xl border transition-all text-left text-sm relative overflow-hidden min-h-[44px]',
                  hasVoted ? 'bg-surface-minimal border-white/10' : 'bg-surface-minimal border-white/10 hover:bg-white/[0.04]'
                )}
              >
                {hasVoted && <div className="absolute inset-0 bg-purple-500/10" style={{ width: `${pct}%` }} />}
                <div className="relative flex items-center justify-between">
                  <span>{option.label}</span>
                  {hasVoted && <span className="font-mono font-bold text-white/50 text-xs">{pct}%</span>}
                </div>
              </button>
            );
          })}
        </div>
        <div className="text-xs text-white/40">{t('votesCount', { count: totalVotes })}</div>
      </div>
    </Card>
  );
}

// ============================================
// CONTENT FILTER PILLS
// ============================================

const FILTER_OPTIONS: { id: ContentFilter; colorActive: string }[] = [
  { id: 'all', colorActive: 'bg-gold/15 text-gold border-gold/30' },
  { id: 'posts', colorActive: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  { id: 'rumors', colorActive: 'bg-red-500/15 text-red-300 border-red-500/30' },
  { id: 'research', colorActive: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  { id: 'bounties', colorActive: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { id: 'votes', colorActive: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  { id: 'news', colorActive: 'bg-gold/15 text-gold border-gold/30' },
];

// ============================================
// COMMUNITY FEED TAB
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
  contentFilter,
  onContentFilterChange,
  researchPosts = [],
  bounties = [],
  clubVotes = [],
  communityPolls = [],
  onUnlockResearch,
  unlockingResearchId,
  onRateResearch,
  ratingResearchId,
  onBountySubmit,
  bountySubmitting,
  userTier,
  userVotedIds,
  onCastVote,
  votingId,
  userPollVotedIds,
  onCastPollVote,
  onCancelPoll,
  pollVotingId,
}: CommunityFeedTabProps) {
  const t = useTranslations('community');
  const [feedSort, setFeedSort] = useState<FeedSort>('new');
  const [query, setQuery] = useState('');

  // Batch-fetch cosmetics for all post authors
  const postAuthorIds = useMemo(() => Array.from(new Set(posts.map(p => p.user_id))), [posts]);
  const { data: cosmeticsMap } = useBatchEquippedCosmetics(postAuthorIds);

  // ---- Build unified feed items ----
  const feedItems = useMemo((): FeedItem[] => {
    const items: FeedItem[] = [];

    // Posts — filter by content type
    if (contentFilter === 'all' || contentFilter === 'posts' || contentFilter === 'rumors' || contentFilter === 'news') {
      let filteredPosts = posts;

      if (isFollowingTab) {
        filteredPosts = filteredPosts.filter(p => followingIds.has(p.user_id));
      }

      if (contentFilter === 'posts') {
        filteredPosts = filteredPosts.filter(p => p.post_type !== 'club_news' && p.post_type !== 'transfer_rumor');
      } else if (contentFilter === 'rumors') {
        filteredPosts = filteredPosts.filter(p => p.post_type === 'transfer_rumor');
      } else if (contentFilter === 'news') {
        filteredPosts = filteredPosts.filter(p => p.post_type === 'club_news');
      } else {
        // "all" — exclude club_news from default feed
        filteredPosts = filteredPosts.filter(p => p.post_type !== 'club_news');
      }

      filteredPosts.forEach(p => items.push({ type: 'post', data: p, date: p.created_at }));
    }

    // Research
    if (contentFilter === 'all' || contentFilter === 'research') {
      researchPosts.forEach(r => items.push({ type: 'research', data: r, date: r.created_at }));
    }

    // Bounties
    if (contentFilter === 'all' || contentFilter === 'bounties') {
      bounties.forEach(b => items.push({ type: 'bounty', data: b, date: b.created_at }));
    }

    // Votes + Polls
    if (contentFilter === 'all' || contentFilter === 'votes') {
      clubVotes.filter(v => v.status === 'active').forEach(v =>
        items.push({ type: 'vote', data: v, date: v.starts_at })
      );
      communityPolls.filter(p => p.status === 'active').forEach(p =>
        items.push({ type: 'poll', data: p, date: p.created_at })
      );
    }

    return items;
  }, [posts, researchPosts, bounties, clubVotes, communityPolls, contentFilter, isFollowingTab, followingIds]);

  // ---- Search filter ----
  const searchedItems = useMemo(() => {
    if (!query.trim()) return feedItems;
    const q = query.toLowerCase();
    return feedItems.filter(item => {
      switch (item.type) {
        case 'post':
          return item.data.content.toLowerCase().includes(q) ||
            (item.data.player_name && item.data.player_name.toLowerCase().includes(q)) ||
            item.data.author_handle.toLowerCase().includes(q);
        case 'research':
          return item.data.title.toLowerCase().includes(q) ||
            item.data.preview.toLowerCase().includes(q) ||
            item.data.author_handle.toLowerCase().includes(q);
        case 'bounty':
          return item.data.title.toLowerCase().includes(q) ||
            item.data.description.toLowerCase().includes(q);
        case 'vote':
          return item.data.question.toLowerCase().includes(q);
        case 'poll':
          return item.data.question.toLowerCase().includes(q);
        default:
          return true;
      }
    });
  }, [feedItems, query]);

  // ---- Sort ----
  const sortedItems = useMemo(() => {
    const items = [...searchedItems];

    if (feedSort === 'new') {
      items.sort((a, b) => {
        // Pinned posts first
        if (a.type === 'post' && b.type === 'post') {
          if (a.data.is_pinned !== b.data.is_pinned) return a.data.is_pinned ? -1 : 1;
        }
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    } else if (feedSort === 'trending' || feedSort === 'top') {
      // For non-post types, just sort by date
      items.sort((a, b) => {
        if (a.type === 'post' && b.type === 'post') {
          if (a.data.is_pinned !== b.data.is_pinned) return a.data.is_pinned ? -1 : 1;
          return feedSort === 'trending'
            ? trendingScore(b.data) - trendingScore(a.data)
            : (b.data.upvotes - b.data.downvotes) - (a.data.upvotes - a.data.downvotes);
        }
        // Non-post items go after posts in trending/top
        if (a.type === 'post') return -1;
        if (b.type === 'post') return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    }

    return items;
  }, [searchedItems, feedSort]);

  return (
    <div className="space-y-4">
      {/* Content-Type Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => onContentFilterChange(opt.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold transition-all border min-h-[44px] whitespace-nowrap',
              contentFilter === opt.id
                ? opt.colorActive
                : 'bg-surface-minimal text-white/40 border-white/10 hover:text-white/60'
            )}
          >
            {t(`filters.${opt.id}`)}
          </button>
        ))}
      </div>

      {/* Search + Sort */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder={t('feed.searchPlaceholder')} className="flex-1 min-w-[160px]" />
        {(contentFilter === 'all' || contentFilter === 'posts' || contentFilter === 'rumors' || contentFilter === 'news') && (
          <SortPills
            options={[
              { id: 'new', label: t('feed.sortNew') },
              { id: 'trending', label: t('feed.sortTrending') },
              { id: 'top', label: 'Top' },
            ]}
            active={feedSort}
            onChange={(id) => setFeedSort(id as FeedSort)}
          />
        )}
      </div>

      {/* Result Counter */}
      <div className="text-xs text-white/40 px-1">{sortedItems.length} {t('feed.posts')}</div>

      {/* Feed Items */}
      {sortedItems.length === 0 ? (
        isFollowingTab ? (
          <EmptyState icon={<Trophy />} title={t('feed.emptyFollowing')} action={{ label: t('feed.discoverScouts'), onClick: onSwitchToLeaderboard }} />
        ) : query.trim() ? (
          <EmptyState icon={<MessageSquare />} title={`${t('feed.noResults')} "${query}"`} action={{ label: t('feed.clearSearch'), onClick: () => setQuery('') }} />
        ) : contentFilter === 'rumors' ? (
          <EmptyState icon={<Radio />} title={t('feed.emptyRumors')} />
        ) : contentFilter === 'research' ? (
          <EmptyState icon={<FileText />} title={t('feed.emptyResearch')} />
        ) : contentFilter === 'bounties' ? (
          <EmptyState icon={<Target />} title={t('feed.emptyBounties')} />
        ) : contentFilter === 'votes' ? (
          <EmptyState icon={<Vote />} title={t('feed.emptyVotes')} />
        ) : contentFilter === 'news' ? (
          <EmptyState icon={<Megaphone />} title={t('feed.emptyNews')} />
        ) : (
          <EmptyState icon={<MessageSquare />} title={t('feed.noPosts')} action={{ label: t('feed.writeFirst'), onClick: onCreatePost }} />
        )
      ) : (
        <div className="space-y-4">
          {sortedItems.map((item) => {
            switch (item.type) {
              case 'post':
                return (
                  <PostCard
                    key={`post-${item.data.id}`}
                    post={item.data}
                    myVote={myPostVotes.get(item.data.id)}
                    ownedPlayerIds={ownedPlayerIds}
                    onVote={onVote}
                    onDelete={onDelete}
                    isOwn={item.data.user_id === userId}
                    userId={userId}
                    isClubAdmin={isClubAdmin}
                    onAdminDelete={onAdminDelete}
                    onTogglePin={onTogglePin}
                    tipCount={item.data.tip_count ?? 0}
                    tipTotalCents={item.data.tip_total_cents ?? 0}
                    authorSubscriptionTier={subscriptionMap?.get(item.data.user_id)}
                    authorCosmeticTitle={cosmeticsMap?.get(item.data.user_id)?.titleName}
                    authorCosmeticTitleRarity={cosmeticsMap?.get(item.data.user_id)?.titleRarity}
                  />
                );
              case 'research':
                return (
                  <ResearchCard
                    key={`research-${item.data.id}`}
                    post={item.data}
                    onUnlock={onUnlockResearch ?? (() => {})}
                    unlockingId={unlockingResearchId ?? null}
                    onRate={onRateResearch ? (id: string, rating: number) => onRateResearch(id, rating) : () => {}}
                    ratingId={ratingResearchId ?? null}
                    authorScore={undefined}
                  />
                );
              case 'bounty':
                return (
                  <BountyCard
                    key={`bounty-${item.data.id}`}
                    bounty={item.data}
                    userId={userId}
                    onSubmit={onBountySubmit ?? (() => {})}
                    submitting={bountySubmitting ?? null}
                    userTier={userTier}
                  />
                );
              case 'vote':
                return (
                  <InlineFeedVoteCard
                    key={`vote-${item.data.id}`}
                    vote={item.data}
                    hasVoted={userVotedIds?.has(item.data.id) ?? false}
                    onVote={onCastVote}
                    voting={votingId}
                  />
                );
              case 'poll':
                return (
                  <CommunityPollCard
                    key={`poll-${item.data.id}`}
                    poll={item.data}
                    hasVoted={userPollVotedIds?.has(item.data.id) ?? false}
                    isOwn={item.data.created_by === userId}
                    onVote={onCastPollVote ?? (() => {})}
                    onCancel={onCancelPoll ?? (() => {})}
                    voting={pollVotingId ?? null}
                  />
                );
              default:
                return null;
            }
          })}
        </div>
      )}
    </div>
  );
}
