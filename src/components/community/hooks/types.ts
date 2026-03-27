import type { ContentFilter } from '@/components/community/CommunityFeedTab';
import type { PostType } from '@/types';

export type CommunityState = {
  clubId: string | null;
  clubName: string | null;
  isClubAdmin: boolean;
  clubScope: 'all' | 'myclub';
  feedMode: 'all' | 'following';
  contentFilter: ContentFilter;
  createPostOpen: boolean;
  createResearchOpen: boolean;
  followListMode: 'followers' | 'following' | null;
  defaultPostType: PostType;
  createBountyOpen: boolean;
  postLoading: boolean;
  researchLoading: boolean;
  bountySubmitting: string | null;
  bountyCreating: boolean;
  unlockingResearchId: string | null;
  ratingResearchId: string | null;
  votingId: string | null;
  pollVotingId: string | null;
};

export type CommunityAction =
  | { type: 'SET_CLUB'; clubId: string | null; clubName: string | null }
  | { type: 'SET_CLUB_ADMIN'; value: boolean }
  | { type: 'SET_CLUB_SCOPE'; value: 'all' | 'myclub' }
  | { type: 'SET_FEED_MODE'; value: 'all' | 'following' }
  | { type: 'SET_CONTENT_FILTER'; value: ContentFilter }
  | { type: 'SET_CREATE_POST_OPEN'; value: boolean }
  | { type: 'SET_CREATE_RESEARCH_OPEN'; value: boolean }
  | { type: 'SET_FOLLOW_LIST_MODE'; value: 'followers' | 'following' | null }
  | { type: 'SET_DEFAULT_POST_TYPE'; value: PostType }
  | { type: 'SET_CREATE_BOUNTY_OPEN'; value: boolean }
  | { type: 'SET_POST_LOADING'; value: boolean }
  | { type: 'SET_RESEARCH_LOADING'; value: boolean }
  | { type: 'SET_BOUNTY_SUBMITTING'; value: string | null }
  | { type: 'SET_BOUNTY_CREATING'; value: boolean }
  | { type: 'SET_UNLOCKING_RESEARCH'; value: string | null }
  | { type: 'SET_RATING_RESEARCH'; value: string | null }
  | { type: 'SET_VOTING_ID'; value: string | null }
  | { type: 'SET_POLL_VOTING_ID'; value: string | null };
