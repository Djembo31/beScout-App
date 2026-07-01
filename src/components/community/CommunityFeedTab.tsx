'use client';

import React, { useState, useMemo } from 'react';
import { Trophy, MessageSquare, Vote, FileText, Target, Radio, Megaphone, User, Shield, X } from 'lucide-react';
import { SearchInput, SortPills, EmptyState, Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { getClub } from '@/lib/clubs';
import PostCard from '@/components/community/PostCard';
import ResearchCard from '@/components/community/ResearchCard';
import BountyCard from '@/components/community/BountyCard';
import CommunityPollCard from '@/components/community/CommunityPollCard';
import ReportModal from '@/components/community/ReportModal';
import type { PostWithAuthor, ResearchPostWithAuthor, BountyWithCreator, CommunityPollWithCreator } from '@/types';
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
  | { type: 'poll'; data: CommunityPollWithCreator; date: string };

// ── Slice 334: Discovery-Anker (welcher Verein / Spieler steckt im Eintrag) ──
type Anchor = { type: 'club' | 'player'; id: string; label: string };

function itemClubId(item: FeedItem): string | null {
  // Alle Feed-Typen (post/research/bounty/poll) tragen club_id.
  return item.data.club_id ?? null;
}
function itemPlayerId(item: FeedItem): string | null {
  switch (item.type) {
    case 'post': return item.data.player_id ?? null;
    case 'research': return item.data.player_id ?? null;
    case 'bounty': return item.data.player_id ?? null;
    case 'poll': return item.data.player_id ?? null;
  }
}
function itemPlayerName(item: FeedItem): string | null {
  switch (item.type) {
    case 'post': return item.data.player_name ?? null;
    case 'research': return item.data.player_name ?? null;
    case 'bounty': return item.data.player_name ?? null;
    case 'poll': return item.data.player_name ?? null;
  }
}

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
  onVote: (postId: string, voteType: 1 | -1) => void;
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
  // Poll handlers
  userPollVotedIds?: Set<string>;
  onCastPollVote?: (pollId: string, optionIndex: number) => void;
  onCancelPoll?: (pollId: string) => void;
  pollVotingId?: string | null;
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
  communityPolls = [],
  onUnlockResearch,
  unlockingResearchId,
  onRateResearch,
  ratingResearchId,
  onBountySubmit,
  bountySubmitting,
  userTier,
  userPollVotedIds,
  onCastPollVote,
  onCancelPoll,
  pollVotingId,
}: CommunityFeedTabProps) {
  const t = useTranslations('community');
  const [feedSort, setFeedSort] = useState<FeedSort>('new');
  const [query, setQuery] = useState('');
  const [anchor, setAnchor] = useState<Anchor | null>(null); // Slice 334: aktiver Verein/Spieler-Filter
  const [reportTarget, setReportTarget] = useState<{ type: 'post' | 'research'; id: string } | null>(null);

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
      const filtered = isFollowingTab ? researchPosts.filter(r => followingIds.has(r.user_id)) : researchPosts;
      filtered.forEach(r => items.push({ type: 'research', data: r, date: r.created_at }));
    }

    // Bounties
    if (contentFilter === 'all' || contentFilter === 'bounties') {
      const filtered = isFollowingTab ? bounties.filter(b => followingIds.has(b.created_by)) : bounties;
      filtered.forEach(b => items.push({ type: 'bounty', data: b, date: b.created_at }));
    }

    // Polls (community polls — Abstimmungen)
    if (contentFilter === 'all' || contentFilter === 'votes') {
      const filteredPolls = isFollowingTab ? communityPolls.filter(p => followingIds.has(p.created_by)) : communityPolls;
      filteredPolls.filter(p => p.status === 'active').forEach(p =>
        items.push({ type: 'poll', data: p, date: p.created_at })
      );
    }

    return items;
  }, [posts, researchPosts, bounties, communityPolls, contentFilter, isFollowingTab, followingIds]);

  // ---- Search filter (Slice 334: matcht zusätzlich Spieler- + Vereinsname über alle Typen) ----
  const searchedItems = useMemo(() => {
    if (!query.trim()) return feedItems;
    const q = query.toLowerCase();
    const matchesAnchorText = (item: FeedItem) => {
      const pName = itemPlayerName(item);
      if (pName && pName.toLowerCase().includes(q)) return true;
      const cId = itemClubId(item);
      if (cId) {
        const c = getClub(cId);
        if ((c?.name && c.name.toLowerCase().includes(q)) || (c?.short && c.short.toLowerCase().includes(q))) return true;
      }
      return false;
    };
    return feedItems.filter(item => {
      if (matchesAnchorText(item)) return true;
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
        case 'poll':
          return item.data.question.toLowerCase().includes(q);
        default:
          return true;
      }
    });
  }, [feedItems, query]);

  // ---- Anker-Chips (Slice 334) — aus dem PRE-anchor Set (Typ+Following+Suche) abgeleitet,
  //      UNABHÄNGIG vom aktiven Anker → kein §254-Catch-22 (Chips verschwinden nicht nach Auswahl) ----
  const availableAnchors = useMemo(() => {
    const clubs = new Map<string, string>();
    const players = new Map<string, string>();
    for (const item of searchedItems) {
      const cId = itemClubId(item);
      if (cId && !clubs.has(cId)) {
        const c = getClub(cId);
        clubs.set(cId, c?.short ?? c?.name ?? cId);
      }
      const pId = itemPlayerId(item);
      const pName = itemPlayerName(item);
      if (pId && pName && !players.has(pId)) players.set(pId, pName);
    }
    const clubAnchors: Anchor[] = Array.from(clubs, ([id, label]) => ({ type: 'club', id, label }));
    const playerAnchors: Anchor[] = Array.from(players, ([id, label]) => ({ type: 'player', id, label }));
    return [...clubAnchors, ...playerAnchors];
  }, [searchedItems]);

  // ---- Anker-Filter ----
  const anchoredItems = useMemo(() => {
    if (!anchor) return searchedItems;
    return searchedItems.filter(item =>
      anchor.type === 'club' ? itemClubId(item) === anchor.id : itemPlayerId(item) === anchor.id
    );
  }, [searchedItems, anchor]);

  // ---- Sort ----
  const sortedItems = useMemo(() => {
    const items = [...anchoredItems];

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
  }, [anchoredItems, feedSort]);

  return (
    <div className="space-y-4">
      {/* Content-Type Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => onContentFilterChange(opt.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border min-h-[44px] whitespace-nowrap',
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

      {/* Anker-Filter-Chips (Slice 334): Verein + Spieler aus dem Feed, tap → filtern */}
      {availableAnchors.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide items-center">
          {availableAnchors.map(a => {
            const active = anchor?.type === a.type && anchor?.id === a.id;
            return (
              <button
                key={`${a.type}-${a.id}`}
                onClick={() => setAnchor(active ? null : a)}
                aria-pressed={active}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border min-h-[44px] whitespace-nowrap inline-flex items-center gap-1',
                  active ? 'bg-gold/15 text-gold border-gold/30' : 'bg-surface-minimal text-white/40 border-white/10 hover:text-white/60'
                )}
              >
                {a.type === 'player'
                  ? <User className="size-3" aria-hidden="true" />
                  : <Shield className="size-3" aria-hidden="true" />}
                {a.label}
                {active && <X className="size-3" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Result Counter */}
      <div className="text-xs text-white/40 px-1">{sortedItems.length} {t('feed.posts')}</div>

      {/* Feed Items */}
      {sortedItems.length === 0 ? (
        isFollowingTab ? (
          <EmptyState icon={<Trophy />} title={t('feed.emptyFollowing')} action={{ label: t('feed.discoverScouts'), onClick: onSwitchToLeaderboard }} />
        ) : anchor ? (
          <EmptyState icon={<MessageSquare />} title={t('feed.noAnchorResults', { anchor: anchor.label })} action={{ label: t('feed.clearFilter'), onClick: () => setAnchor(null) }} />
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
                    onReport={(postId) => setReportTarget({ type: 'post', id: postId })}
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
                    onReport={(researchId) => setReportTarget({ type: 'research', id: researchId })}
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
      {reportTarget && (
        <ReportModal
          open={true}
          onClose={() => setReportTarget(null)}
          targetType={reportTarget.type}
          targetId={reportTarget.id}
        />
      )}
    </div>
  );
}
