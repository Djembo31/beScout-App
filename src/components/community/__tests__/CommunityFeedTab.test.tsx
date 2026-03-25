import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import CommunityFeedTab, { type ContentFilter } from '../CommunityFeedTab';
import type {
  PostWithAuthor,
  ResearchPostWithAuthor,
  BountyWithCreator,
  DbClubVote,
  CommunityPollWithCreator,
} from '@/types';

// ============================================
// Mock child components as stubs
// ============================================

vi.mock('@/components/community/PostCard', () => ({
  default: ({ post }: { post: { id: string } }) => (
    <div data-testid={`post-card-${post.id}`}>PostCard</div>
  ),
}));

vi.mock('@/components/community/ResearchCard', () => ({
  default: ({ post }: { post: { id: string } }) => (
    <div data-testid={`research-card-${post.id}`}>ResearchCard</div>
  ),
}));

vi.mock('@/components/community/BountyCard', () => ({
  default: ({ bounty }: { bounty: { id: string } }) => (
    <div data-testid={`bounty-card-${bounty.id}`}>BountyCard</div>
  ),
}));

vi.mock('@/components/community/CommunityPollCard', () => ({
  default: ({ poll }: { poll: { id: string } }) => (
    <div data-testid={`poll-card-${poll.id}`}>CommunityPollCard</div>
  ),
}));

// ============================================
// Mock UI components
// ============================================

vi.mock('@/components/ui', () => ({
  SearchInput: ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <input
      data-testid="search-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
  SortPills: ({ options, active, onChange }: { options: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) => (
    <div data-testid="sort-pills">
      {options.map((opt) => (
        <button
          key={opt.id}
          data-testid={`sort-${opt.id}`}
          data-active={opt.id === active}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  ),
  EmptyState: ({ title, action }: { title: string; icon?: React.ReactNode; action?: { label: string; onClick: () => void } }) => (
    <div data-testid="empty-state">
      <span>{title}</span>
      {action && <button onClick={action.onClick}>{action.label}</button>}
    </div>
  ),
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
}));

// ============================================
// Mock cosmetics query
// ============================================

vi.mock('@/lib/queries/cosmetics', () => ({
  useBatchEquippedCosmetics: () => ({ data: new Map() }),
}));

// ============================================
// Fixtures
// ============================================

function makePost(overrides: Partial<PostWithAuthor> = {}): PostWithAuthor {
  return {
    id: 'p1',
    user_id: 'u1',
    player_id: null,
    club_name: null,
    club_id: null,
    content: 'Hello world',
    tags: [],
    category: 'Meinung',
    post_type: 'general',
    upvotes: 10,
    downvotes: 2,
    replies_count: 3,
    is_pinned: false,
    is_exclusive: false,
    parent_id: null,
    event_id: null,
    rumor_source: null,
    rumor_club_target: null,
    image_url: null,
    created_at: '2026-01-01T00:00:00Z',
    author_handle: 'user1',
    author_display_name: null,
    author_avatar_url: null,
    author_level: 1,
    author_verified: false,
    author_top_role: null,
    player_name: undefined,
    player_position: undefined,
    tip_count: 0,
    tip_total_cents: 0,
    ...overrides,
  };
}

function makeResearchPost(overrides: Partial<ResearchPostWithAuthor> = {}): ResearchPostWithAuthor {
  return {
    id: 'r1',
    user_id: 'u2',
    player_id: 'pl1',
    club_name: null,
    club_id: null,
    title: 'Research Title',
    preview: 'Research Preview',
    content: 'Research Content',
    tags: [],
    category: 'Analyse',
    call: 'Bullish',
    horizon: '7d',
    price: 100000,
    unlock_count: 5,
    total_earned: 500000,
    ratings_count: 3,
    avg_rating: 4.5,
    price_at_creation: 200000,
    price_at_resolution: null,
    outcome: null,
    price_change_pct: null,
    resolved_at: null,
    evaluation: null,
    fixture_id: null,
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    author_handle: 'analyst1',
    author_display_name: null,
    author_avatar_url: null,
    author_level: 3,
    author_verified: true,
    author_top_role: null,
    player_name: 'Test Player',
    is_unlocked: false,
    is_own: false,
    user_rating: null,
    ...overrides,
  };
}

function makeBounty(overrides: Partial<BountyWithCreator> = {}): BountyWithCreator {
  return {
    id: 'b1',
    club_id: 'c1',
    club_name: 'Test Club',
    created_by: 'u3',
    title: 'Bounty Title',
    description: 'Bounty Description',
    reward_cents: 500000,
    deadline_at: '2026-06-01T00:00:00Z',
    max_submissions: 10,
    player_id: null,
    position: null,
    status: 'open',
    submission_count: 0,
    type: 'general',
    fixture_id: null,
    created_at: '2026-01-03T00:00:00Z',
    updated_at: '2026-01-03T00:00:00Z',
    creator_handle: 'club_admin',
    creator_display_name: null,
    creator_avatar_url: null,
    ...overrides,
  };
}

function makeClubVote(overrides: Partial<DbClubVote> = {}): DbClubVote {
  return {
    id: 'v1',
    club_name: 'Test Club',
    club_id: 'c1',
    question: 'Who is the best player?',
    options: [
      { label: 'Option A', votes: 10 },
      { label: 'Option B', votes: 20 },
    ],
    status: 'active',
    total_votes: 30,
    cost_bsd: 0,
    starts_at: '2026-01-01T00:00:00Z',
    ends_at: '2027-01-01T00:00:00Z',
    created_by: 'u4',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makePoll(overrides: Partial<CommunityPollWithCreator> = {}): CommunityPollWithCreator {
  return {
    id: 'poll1',
    created_by: 'u5',
    question: 'Best formation?',
    description: null,
    options: [
      { label: '4-4-2', votes: 5 },
      { label: '4-3-3', votes: 8 },
    ],
    status: 'active',
    total_votes: 13,
    cost_bsd: 0,
    creator_earned: 0,
    starts_at: '2026-01-01T00:00:00Z',
    ends_at: '2027-01-01T00:00:00Z',
    created_at: '2026-01-04T00:00:00Z',
    creator_handle: 'poll_creator',
    creator_display_name: null,
    creator_avatar_url: null,
    ...overrides,
  };
}

// ============================================
// Default props helper
// ============================================

function defaultProps(overrides: Record<string, unknown> = {}) {
  return {
    posts: [] as PostWithAuthor[],
    myPostVotes: new Map<string, number>(),
    ownedPlayerIds: new Set<string>(),
    followingIds: new Set<string>(),
    userId: 'u1',
    isFollowingTab: false,
    onVote: vi.fn(),
    onDelete: vi.fn(),
    onCreatePost: vi.fn(),
    onSwitchToLeaderboard: vi.fn(),
    contentFilter: 'all' as ContentFilter,
    onContentFilterChange: vi.fn(),
    ...overrides,
  };
}

// ============================================
// Tests
// ============================================

describe('CommunityFeedTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- 1. Filter pills ---
  it('renders 7 content filter pills', () => {
    renderWithProviders(<CommunityFeedTab {...defaultProps()} />);

    const expectedFilters = ['filters.all', 'filters.posts', 'filters.rumors', 'filters.research', 'filters.bounties', 'filters.votes', 'filters.news'];
    for (const key of expectedFilters) {
      expect(screen.getByText(key)).toBeInTheDocument();
    }
  });

  // --- 2. Active filter pill has styling ---
  it('active filter pill has correct styling class', () => {
    renderWithProviders(<CommunityFeedTab {...defaultProps({ contentFilter: 'rumors' })} />);

    const rumorsButton = screen.getByText('filters.rumors');
    // Active pill should have the red color classes
    expect(rumorsButton.className).toContain('bg-red-500/15');
    expect(rumorsButton.className).toContain('text-red-300');

    // Inactive pill should NOT have its active color
    const postsButton = screen.getByText('filters.posts');
    expect(postsButton.className).not.toContain('text-sky-300');
    expect(postsButton.className).toContain('text-white/40');
  });

  // --- 3. Clicking filter calls callback ---
  it('clicking filter pill calls onContentFilterChange', async () => {
    const user = userEvent.setup();
    const onContentFilterChange = vi.fn();
    renderWithProviders(
      <CommunityFeedTab {...defaultProps({ onContentFilterChange })} />,
    );

    await user.click(screen.getByText('filters.research'));
    expect(onContentFilterChange).toHaveBeenCalledWith('research');
  });

  // --- 4. SearchInput ---
  it('renders SearchInput component', () => {
    renderWithProviders(<CommunityFeedTab {...defaultProps()} />);
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  // --- 5. SortPills ---
  it('renders SortPills with new/trending/top', () => {
    renderWithProviders(<CommunityFeedTab {...defaultProps()} />);

    expect(screen.getByTestId('sort-pills')).toBeInTheDocument();
    expect(screen.getByTestId('sort-new')).toBeInTheDocument();
    expect(screen.getByTestId('sort-trending')).toBeInTheDocument();
    expect(screen.getByTestId('sort-top')).toBeInTheDocument();
  });

  // --- 6. Result counter ---
  it('shows result counter with correct count', () => {
    const posts = [makePost({ id: 'p1' }), makePost({ id: 'p2' })];
    renderWithProviders(<CommunityFeedTab {...defaultProps({ posts })} />);

    expect(screen.getByText('2 feed.posts')).toBeInTheDocument();
  });

  // --- 7. Empty state: no posts ---
  it('shows "feed.noPosts" with create action when no posts', () => {
    const onCreatePost = vi.fn();
    renderWithProviders(
      <CommunityFeedTab {...defaultProps({ onCreatePost })} />,
    );

    expect(screen.getByText('feed.noPosts')).toBeInTheDocument();
    expect(screen.getByText('feed.writeFirst')).toBeInTheDocument();
  });

  // --- 8. Empty state: following tab ---
  it('shows "feed.emptyFollowing" on following tab', () => {
    renderWithProviders(
      <CommunityFeedTab {...defaultProps({ isFollowingTab: true })} />,
    );

    expect(screen.getByText('feed.emptyFollowing')).toBeInTheDocument();
  });

  // --- 9. Empty state: rumors filter ---
  it('shows "feed.emptyRumors" for rumors filter', () => {
    renderWithProviders(
      <CommunityFeedTab {...defaultProps({ contentFilter: 'rumors' })} />,
    );

    expect(screen.getByText('feed.emptyRumors')).toBeInTheDocument();
  });

  // --- 10. Empty state: research filter ---
  it('shows "feed.emptyResearch" for research filter', () => {
    renderWithProviders(
      <CommunityFeedTab {...defaultProps({ contentFilter: 'research' })} />,
    );

    expect(screen.getByText('feed.emptyResearch')).toBeInTheDocument();
  });

  // --- 11. Renders PostCard for each post ---
  it('renders PostCard for each post', () => {
    const posts = [
      makePost({ id: 'p1' }),
      makePost({ id: 'p2', content: 'Second post' }),
      makePost({ id: 'p3', content: 'Third post' }),
    ];
    renderWithProviders(<CommunityFeedTab {...defaultProps({ posts })} />);

    expect(screen.getByTestId('post-card-p1')).toBeInTheDocument();
    expect(screen.getByTestId('post-card-p2')).toBeInTheDocument();
    expect(screen.getByTestId('post-card-p3')).toBeInTheDocument();
  });

  // --- 12. Renders ResearchCard for research posts ---
  it('renders ResearchCard for research posts when contentFilter is research', () => {
    const researchPosts = [
      makeResearchPost({ id: 'r1' }),
      makeResearchPost({ id: 'r2', title: 'Second research' }),
    ];
    renderWithProviders(
      <CommunityFeedTab {...defaultProps({ contentFilter: 'research', researchPosts })} />,
    );

    expect(screen.getByTestId('research-card-r1')).toBeInTheDocument();
    expect(screen.getByTestId('research-card-r2')).toBeInTheDocument();
  });

  // --- 13. Renders BountyCard for bounties ---
  it('renders BountyCard for bounties when contentFilter is bounties', () => {
    const bounties = [makeBounty({ id: 'b1' }), makeBounty({ id: 'b2', title: 'Second bounty' })];
    renderWithProviders(
      <CommunityFeedTab {...defaultProps({ contentFilter: 'bounties', bounties })} />,
    );

    expect(screen.getByTestId('bounty-card-b1')).toBeInTheDocument();
    expect(screen.getByTestId('bounty-card-b2')).toBeInTheDocument();
  });

  // --- 14. Excludes club_news from "all" filter ---
  it('excludes club_news from "all" filter', () => {
    const posts = [
      makePost({ id: 'p1', post_type: 'general' }),
      makePost({ id: 'p-news', post_type: 'club_news', content: 'Club news content' }),
    ];
    renderWithProviders(
      <CommunityFeedTab {...defaultProps({ posts, contentFilter: 'all' })} />,
    );

    expect(screen.getByTestId('post-card-p1')).toBeInTheDocument();
    expect(screen.queryByTestId('post-card-p-news')).not.toBeInTheDocument();
  });

  // --- 15. Shows only transfer_rumor posts for "rumors" filter ---
  it('shows only transfer_rumor posts for "rumors" filter', () => {
    const posts = [
      makePost({ id: 'p-general', post_type: 'general' }),
      makePost({ id: 'p-rumor', post_type: 'transfer_rumor', content: 'Rumor content' }),
      makePost({ id: 'p-news', post_type: 'club_news', content: 'News content' }),
    ];
    renderWithProviders(
      <CommunityFeedTab {...defaultProps({ posts, contentFilter: 'rumors' })} />,
    );

    expect(screen.getByTestId('post-card-p-rumor')).toBeInTheDocument();
    expect(screen.queryByTestId('post-card-p-general')).not.toBeInTheDocument();
    expect(screen.queryByTestId('post-card-p-news')).not.toBeInTheDocument();
  });

  // --- 16. Shows only club_news posts for "news" filter ---
  it('shows only club_news posts for "news" filter', () => {
    const posts = [
      makePost({ id: 'p-general', post_type: 'general' }),
      makePost({ id: 'p-rumor', post_type: 'transfer_rumor' }),
      makePost({ id: 'p-news', post_type: 'club_news', content: 'Club news' }),
    ];
    renderWithProviders(
      <CommunityFeedTab {...defaultProps({ posts, contentFilter: 'news' })} />,
    );

    expect(screen.getByTestId('post-card-p-news')).toBeInTheDocument();
    expect(screen.queryByTestId('post-card-p-general')).not.toBeInTheDocument();
    expect(screen.queryByTestId('post-card-p-rumor')).not.toBeInTheDocument();
  });
});
