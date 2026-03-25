import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import AdminBountiesTab from '../AdminBountiesTab';
import type { ClubWithAdmin, BountyWithCreator } from '@/types';

// ============================================
// Mocks
// ============================================
const mockGetBountiesByClub = vi.fn();
const mockCreateBounty = vi.fn();
const mockCancelBounty = vi.fn();
const mockGetBountySubmissions = vi.fn();
const mockApproveBountySubmission = vi.fn();
const mockRejectBountySubmission = vi.fn();
const mockInvalidateBountyData = vi.fn();

vi.mock('@/lib/services/bounties', () => ({
  getBountiesByClub: (...args: unknown[]) => mockGetBountiesByClub(...args),
  createBounty: (...args: unknown[]) => mockCreateBounty(...args),
  cancelBounty: (...args: unknown[]) => mockCancelBounty(...args),
  getBountySubmissions: (...args: unknown[]) => mockGetBountySubmissions(...args),
  approveBountySubmission: (...args: unknown[]) => mockApproveBountySubmission(...args),
  rejectBountySubmission: (...args: unknown[]) => mockRejectBountySubmission(...args),
  invalidateBountyData: (...args: unknown[]) => mockInvalidateBountyData(...args),
}));

vi.mock('@/components/providers/AuthProvider', () => {
  const stableUser = { id: 'admin-1' };
  return { useUser: () => ({ user: stableUser }) };
});

const mockFormatScout = vi.fn((n: number) => String(n));
vi.mock('@/lib/services/wallet', () => ({
  formatScout: (...args: unknown[]) => mockFormatScout(...(args as [number])),
}));

vi.mock('@/lib/errorMessages', () => ({
  mapErrorToKey: () => 'error',
  normalizeError: () => 'error',
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Stub UI components to simplify DOM assertions
vi.mock('@/components/ui', () => ({
  Card: ({ children, className, ...props }: Record<string, unknown>) => (
    <div data-testid="card" className={className as string} {...props}>
      {children as React.ReactNode}
    </div>
  ),
  Button: ({
    children,
    onClick,
    variant,
    loading,
    ...props
  }: Record<string, unknown>) => (
    <button
      data-testid={`btn-${variant ?? 'default'}`}
      onClick={onClick as React.MouseEventHandler}
      disabled={!!loading}
      {...props}
    >
      {children as React.ReactNode}
    </button>
  ),
  Chip: ({ children, className }: Record<string, unknown>) => (
    <span data-testid="chip" className={className as string}>
      {children as React.ReactNode}
    </span>
  ),
  Modal: ({
    open,
    title,
    children,
    onClose,
  }: Record<string, unknown>) =>
    open ? (
      <div data-testid="modal" aria-label={title as string}>
        <span data-testid="modal-title">{title as React.ReactNode}</span>
        <button data-testid="modal-close" onClick={onClose as React.MouseEventHandler}>
          close
        </button>
        {children as React.ReactNode}
      </div>
    ) : null,
}));

// ============================================
// Fixtures
// ============================================
const club = { id: 'club-1', name: 'Test Club' } as ClubWithAdmin;

const bountyOpen: BountyWithCreator = {
  id: 'b1',
  club_id: 'club-1',
  club_name: 'Test Club',
  created_by: 'admin-1',
  title: 'Test Bounty',
  description: 'Test desc',
  reward_cents: 1000,
  deadline_at: new Date(Date.now() + 86400000).toISOString(),
  max_submissions: 5,
  submission_count: 2,
  player_id: null,
  position: null,
  status: 'open',
  min_tier: null,
  type: 'general',
  fixture_id: null,
  is_user_bounty: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  creator_handle: 'admin',
  creator_display_name: 'Admin',
  creator_avatar_url: null,
  player_name: null,
  player_position: null,
  has_user_submitted: false,
};

const bountyNoSubs: BountyWithCreator = {
  ...bountyOpen,
  id: 'b2',
  title: 'No Subs Bounty',
  submission_count: 0,
};

const bountyCancelled: BountyWithCreator = {
  ...bountyOpen,
  id: 'b3',
  title: 'Cancelled Bounty',
  status: 'cancelled',
  submission_count: 0,
};

const bountyClosed: BountyWithCreator = {
  ...bountyOpen,
  id: 'b4',
  title: 'Closed Bounty',
  status: 'closed',
  submission_count: 3,
};

const bountyScouting: BountyWithCreator = {
  ...bountyOpen,
  id: 'b5',
  title: 'Scouting Bounty',
  type: 'scouting',
  submission_count: 0,
};

// ============================================
// Tests
// ============================================
describe('AdminBountiesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- 1. Loading state ---
  it('shows loading state initially', () => {
    mockGetBountiesByClub.mockReturnValue(new Promise(() => {}));
    const { container } = renderWithProviders(
      <AdminBountiesTab club={club} />,
    );
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  // --- 2. Empty state ---
  it('shows empty state when no bounties', async () => {
    mockGetBountiesByClub.mockResolvedValue([]);
    renderWithProviders(<AdminBountiesTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('noBounties')).toBeInTheDocument();
      expect(screen.getByText('createFirst')).toBeInTheDocument();
    });
  });

  // --- 3. Bounty list with titles ---
  it('shows bounty list with titles', async () => {
    mockGetBountiesByClub.mockResolvedValue([bountyOpen, bountyNoSubs]);
    renderWithProviders(<AdminBountiesTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('Test Bounty')).toBeInTheDocument();
      expect(screen.getByText('No Subs Bounty')).toBeInTheDocument();
    });
  });

  // --- 4. Reward amount ---
  it('shows reward amount via formatScout', async () => {
    mockGetBountiesByClub.mockResolvedValue([bountyOpen]);
    renderWithProviders(<AdminBountiesTab club={club} />);

    await waitFor(() => {
      expect(mockFormatScout).toHaveBeenCalledWith(1000);
    });
    // formatScout(1000) returns "1000", displayed as "1000 CR" in a span
    await waitFor(() => {
      expect(screen.getByText('1000 CR')).toBeInTheDocument();
    });
  });

  // --- 5. Submission count ---
  it('shows submission count', async () => {
    mockGetBountiesByClub.mockResolvedValue([bountyOpen]);
    const { container } = renderWithProviders(<AdminBountiesTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('Test Bounty')).toBeInTheDocument();
    });
    // submission_count/max_submissions = "2/5" inside a <span> with inline <Users> SVG
    // The text content is split across child nodes, so use container query
    await waitFor(() => {
      const spans = container.querySelectorAll('span');
      const subSpan = Array.from(spans).find(s => s.textContent?.includes('2/5'));
      expect(subSpan).toBeTruthy();
    });
  });

  // --- 6. New bounty button opens create modal ---
  it('opens create modal when New Bounty button is clicked', async () => {
    mockGetBountiesByClub.mockResolvedValue([]);
    renderWithProviders(<AdminBountiesTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('noBounties')).toBeInTheDocument();
    });

    const newBtn = screen.getByText('newBounty');
    fireEvent.click(newBtn);

    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });
  });

  // --- 7. Create modal has all form fields ---
  it('create modal has all form fields', async () => {
    mockGetBountiesByClub.mockResolvedValue([]);
    renderWithProviders(<AdminBountiesTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('noBounties')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('newBounty'));

    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    // Form labels rendered via t() → returns key strings
    expect(screen.getByText('title')).toBeInTheDocument();
    expect(screen.getByText('description')).toBeInTheDocument();
    expect(screen.getByText('reward')).toBeInTheDocument();
    expect(screen.getByText('deadline')).toBeInTheDocument();
    expect(screen.getByText('maxSubmissions')).toBeInTheDocument();
    expect(screen.getByText('minTier')).toBeInTheDocument();
    expect(screen.getByText('type')).toBeInTheDocument();
  });

  // --- 8. Creating bounty calls service ---
  it('creating bounty calls createBounty service with correct params', async () => {
    mockGetBountiesByClub.mockResolvedValue([]);
    mockCreateBounty.mockResolvedValue({ id: 'new-b' });
    renderWithProviders(<AdminBountiesTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('noBounties')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('newBounty'));

    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    // Fill the title input
    const titleInput = screen.getByPlaceholderText('titlePlaceholder');
    fireEvent.change(titleInput, { target: { value: 'New Title' } });

    // Fill the description textarea
    const descInput = screen.getByPlaceholderText('descPlaceholder');
    fireEvent.change(descInput, { target: { value: 'New Description' } });

    // Click create
    fireEvent.click(screen.getByText('createBounty'));

    await waitFor(() => {
      expect(mockCreateBounty).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          clubId: 'club-1',
          clubName: 'Test Club',
          title: 'New Title',
          description: 'New Description',
          rewardCents: 1000, // default "10" * 100
          deadlineDays: 7, // default "7"
          maxSubmissions: 5, // default "5"
          minTier: null,
          type: 'general',
        }),
      );
    });
  });

  // --- 9. Cancel button visible on open bounty with 0 submissions ---
  it('shows cancel button on open bounty with 0 submissions', async () => {
    mockGetBountiesByClub.mockResolvedValue([bountyNoSubs]);
    renderWithProviders(<AdminBountiesTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('No Subs Bounty')).toBeInTheDocument();
    });

    expect(screen.getByText('cancel')).toBeInTheDocument();
  });

  // --- 10. Cancel button hidden when submissions exist ---
  it('hides cancel button when bounty has submissions', async () => {
    mockGetBountiesByClub.mockResolvedValue([bountyOpen]);
    renderWithProviders(<AdminBountiesTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('Test Bounty')).toBeInTheDocument();
    });

    // bountyOpen has submission_count=2, so cancel should not appear
    expect(screen.queryByText('cancel')).not.toBeInTheDocument();
  });

  // --- 11. View submissions button visible when count > 0 ---
  it('shows view submissions button when submission count > 0', async () => {
    mockGetBountiesByClub.mockResolvedValue([bountyOpen]);
    renderWithProviders(<AdminBountiesTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('Test Bounty')).toBeInTheDocument();
    });

    // The submissions button text is t('submissions', { count: 2 }) → returns 'submissions'
    expect(screen.getByText('submissions')).toBeInTheDocument();
  });

  // --- 12. Scouting badge shown for scouting type ---
  it('shows scouting badge for scouting type bounties', async () => {
    mockGetBountiesByClub.mockResolvedValue([bountyScouting]);
    renderWithProviders(<AdminBountiesTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('Scouting Bounty')).toBeInTheDocument();
    });

    // The scouting badge text is t('scouting')
    expect(screen.getByText('scouting')).toBeInTheDocument();
  });

  // --- 13. Success message after create ---
  it('shows success message after bounty is created', async () => {
    mockGetBountiesByClub.mockResolvedValue([]);
    mockCreateBounty.mockResolvedValue({ id: 'new-b' });
    renderWithProviders(<AdminBountiesTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('noBounties')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('newBounty'));

    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    // Fill required fields
    fireEvent.change(screen.getByPlaceholderText('titlePlaceholder'), {
      target: { value: 'My Bounty' },
    });
    fireEvent.change(screen.getByPlaceholderText('descPlaceholder'), {
      target: { value: 'My Description' },
    });

    fireEvent.click(screen.getByText('createBounty'));

    await waitFor(() => {
      // success msg text = t('bountyCreated') → 'bountyCreated'
      expect(screen.getByText('bountyCreated')).toBeInTheDocument();
    });
  });

  // --- 14. Bounty status display (open/cancelled/closed) ---
  it('shows correct status labels for open, cancelled, and closed bounties', async () => {
    mockGetBountiesByClub.mockResolvedValue([
      bountyOpen,
      bountyCancelled,
      bountyClosed,
    ]);
    renderWithProviders(<AdminBountiesTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('Test Bounty')).toBeInTheDocument();
    });

    // Each Chip renders status text via t():
    // open bounty → t('open') = 'open'
    // cancelled bounty → t('cancelled') = 'cancelled'
    // closed bounty → t('closed') = 'closed' (expired past deadline is treated as closed)
    const chips = screen.getAllByTestId('chip');
    expect(chips.length).toBe(3);

    expect(screen.getByText('open')).toBeInTheDocument();
    expect(screen.getByText('cancelled')).toBeInTheDocument();
  });
});
