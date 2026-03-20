import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminUsersTab } from '../AdminUsersTab';

// ============================================
// Mocks
// ============================================

const mockGetAllUsers = vi.fn();
const mockAdjustWallet = vi.fn();

vi.mock('@/lib/services/platformAdmin', () => ({
  getAllUsers: (...args: unknown[]) => mockGetAllUsers(...args),
  adjustWallet: (...args: unknown[]) => mockAdjustWallet(...args),
}));

vi.mock('@/lib/services/players', () => ({
  centsToBsd: vi.fn((n: number) => n / 100),
}));

vi.mock('@/lib/services/profiles', () => ({
  updateProfile: vi.fn(),
}));

vi.mock('@/lib/utils', () => ({
  fmtScout: vi.fn((n: number) => String(n)),
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/lib/geofencing', () => ({
  GEOFENCING_ENABLED: false,
  GEO_REGIONS: [],
}));

const mockAddToast = vi.fn();
vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('@/components/ui/RegionBadge', () => ({
  RegionBadge: ({ region }: { region: string | null }) => (
    <span data-testid="region-badge">{region ?? 'none'}</span>
  ),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('@/components/ui', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  Modal: ({ open, onClose, title, children }: {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
  }) =>
    open ? (
      <div data-testid="modal" data-title={title}>
        <button data-testid="modal-close" onClick={onClose}>close</button>
        <div data-testid="modal-title">{title}</div>
        {children}
      </div>
    ) : null,
}));

// ============================================
// Fixtures
// ============================================

const mockUsers = [
  {
    id: 'u1',
    handle: 'testuser',
    displayName: 'Test User',
    balance: 100000,
    holdingsCount: 5,
    tradesCount: 10,
    createdAt: '2025-01-01',
    region: null,
  },
  {
    id: 'u2',
    handle: 'anotheruser',
    displayName: null,
    balance: 250000,
    holdingsCount: 12,
    tradesCount: 30,
    createdAt: '2025-02-01',
    region: null,
  },
];

const DEFAULT_PROPS = { adminId: 'admin-1', role: 'admin' as const };

// ============================================
// Helpers
// ============================================

/**
 * Render the component and wait for the initial load to complete.
 * The component has a 300ms debounce setTimeout, but since we use real timers
 * and the mock resolves immediately, waitFor will naturally poll until users appear.
 */
async function renderAndLoad(
  props: Partial<{ adminId: string; role: 'admin' | 'viewer' | 'superadmin' }> = {},
) {
  const user = userEvent.setup();
  renderWithProviders(
    <AdminUsersTab {...DEFAULT_PROPS} {...props} />,
  );

  // Wait for users to appear (300ms debounce + immediate mock resolve)
  await waitFor(() => {
    expect(screen.getByText('@testuser')).toBeInTheDocument();
  }, { timeout: 2000 });

  return { user };
}

// ============================================
// Tests
// ============================================

describe('AdminUsersTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllUsers.mockResolvedValue(mockUsers);
    mockAdjustWallet.mockResolvedValue({ success: true, new_balance: 200000 });
  });

  // ------------------------------------------
  // 1. Loading state
  // ------------------------------------------
  it('shows loading spinner initially', () => {
    renderWithProviders(<AdminUsersTab {...DEFAULT_PROPS} />);

    // Before the debounce fires, loading state is true — Loader2 renders with animate-spin
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  // ------------------------------------------
  // 2. Users loaded — table rows appear
  // ------------------------------------------
  it('renders user rows after loading', async () => {
    await renderAndLoad();

    expect(screen.getByText('@testuser')).toBeInTheDocument();
    expect(screen.getByText('@anotheruser')).toBeInTheDocument();
  });

  // ------------------------------------------
  // 3. Search input renders with placeholder
  // ------------------------------------------
  it('renders search input with placeholder', () => {
    renderWithProviders(<AdminUsersTab {...DEFAULT_PROPS} />);

    const input = screen.getByPlaceholderText('searchUsersPlaceholder');
    expect(input).toBeInTheDocument();
  });

  // ------------------------------------------
  // 4. Search triggers new load after debounce
  // ------------------------------------------
  it('triggers new load when search changes', async () => {
    const { user } = await renderAndLoad();
    mockGetAllUsers.mockClear();

    const input = screen.getByPlaceholderText('searchUsersPlaceholder');
    await user.type(input, 'test');

    // Wait for debounce to fire and getAllUsers to be called with search term
    await waitFor(() => {
      const calls = mockGetAllUsers.mock.calls;
      const hasSearchCall = calls.some(
        (call: unknown[]) => call[2] === 'test',
      );
      expect(hasSearchCall).toBe(true);
    }, { timeout: 3000 });
  });

  // ------------------------------------------
  // 5. User handle shows as link to /profile/{handle}
  // ------------------------------------------
  it('renders handle as link to profile', async () => {
    await renderAndLoad();

    const link = screen.getByText('@testuser').closest('a');
    expect(link).toHaveAttribute('href', '/profile/testuser');
  });

  // ------------------------------------------
  // 6. User balance shows formatted
  // ------------------------------------------
  it('shows formatted balance for each user', async () => {
    await renderAndLoad();

    // centsToBsd(100000) = 1000, fmtScout(1000) = "1000"
    expect(screen.getByText('1000')).toBeInTheDocument();
    // centsToBsd(250000) = 2500, fmtScout(2500) = "2500"
    expect(screen.getByText('2500')).toBeInTheDocument();
  });

  // ------------------------------------------
  // 7. Correction button visible when role is admin
  // ------------------------------------------
  it('shows correction button when role is admin', async () => {
    await renderAndLoad({ role: 'admin' });

    const correctionButtons = screen.getAllByText('correction');
    expect(correctionButtons).toHaveLength(mockUsers.length);
  });

  // ------------------------------------------
  // 8. Correction button hidden when role is viewer
  // ------------------------------------------
  it('hides correction button when role is viewer', async () => {
    await renderAndLoad({ role: 'viewer' });

    expect(screen.queryByText('correction')).not.toBeInTheDocument();
  });

  // ------------------------------------------
  // 9. Opens adjust modal on correction click
  // ------------------------------------------
  it('opens adjust modal when correction button is clicked', async () => {
    const { user } = await renderAndLoad();

    const correctionButtons = screen.getAllByText('correction');
    await user.click(correctionButtons[0]);

    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  // ------------------------------------------
  // 10. Adjust modal shows balance, amount input, reason input
  // ------------------------------------------
  it('shows current balance and inputs in adjust modal', async () => {
    const { user } = await renderAndLoad();

    await user.click(screen.getAllByText('correction')[0]);

    // Modal title contains the translation key
    expect(screen.getByTestId('modal-title')).toHaveTextContent('walletCorrection');

    // Current balance label
    expect(screen.getByText('currentBalance')).toBeInTheDocument();

    // Amount and reason inputs by their label
    expect(screen.getByLabelText('amountLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('reasonLabel')).toBeInTheDocument();
  });

  // ------------------------------------------
  // 11. Adjust submit calls adjustWallet with correct args
  // ------------------------------------------
  it('calls adjustWallet with correct arguments on submit', async () => {
    const { user } = await renderAndLoad();

    // Open modal for first user
    await user.click(screen.getAllByText('correction')[0]);

    // Fill amount (50 = 5000 cents)
    await user.type(screen.getByLabelText('amountLabel'), '50');

    // Fill reason
    await user.type(screen.getByLabelText('reasonLabel'), 'bonus');

    // Submit
    await user.click(screen.getByText('adjustWallet'));

    await waitFor(() => {
      expect(mockAdjustWallet).toHaveBeenCalledWith('admin-1', 'u1', 5000, 'bonus');
    });
  });

  // ------------------------------------------
  // 12. Adjust success shows toast and closes modal
  // ------------------------------------------
  it('shows success toast and closes modal on successful adjust', async () => {
    const { user } = await renderAndLoad();

    await user.click(screen.getAllByText('correction')[0]);

    await user.type(screen.getByLabelText('amountLabel'), '10');
    await user.type(screen.getByLabelText('reasonLabel'), 'correction');

    await user.click(screen.getByText('adjustWallet'));

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith(
        'walletAdjusted',
        'success',
      );
    });

    // Modal should be closed after success
    await waitFor(() => {
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });
  });

  // ------------------------------------------
  // 13. Adjust error shows error toast
  // ------------------------------------------
  it('shows error toast when adjustWallet returns error', async () => {
    mockAdjustWallet.mockResolvedValue({ success: false, error: 'Insufficient funds' });

    const { user } = await renderAndLoad();

    await user.click(screen.getAllByText('correction')[0]);
    await user.type(screen.getByLabelText('amountLabel'), '10');
    await user.type(screen.getByLabelText('reasonLabel'), 'test');
    await user.click(screen.getByText('adjustWallet'));

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith('Insufficient funds', 'error');
    });
  });

  // ------------------------------------------
  // 14. Adjust exception shows error toast
  // ------------------------------------------
  it('shows error toast when adjustWallet throws', async () => {
    mockAdjustWallet.mockRejectedValue(new Error('Network error'));

    const { user } = await renderAndLoad();

    await user.click(screen.getAllByText('correction')[0]);
    await user.type(screen.getByLabelText('amountLabel'), '10');
    await user.type(screen.getByLabelText('reasonLabel'), 'test');
    await user.click(screen.getByText('adjustWallet'));

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith('Network error', 'error');
    });
  });

  // ------------------------------------------
  // 15. Submit button disabled when amount or reason empty
  // ------------------------------------------
  it('disables submit button when amount or reason is empty', async () => {
    const { user } = await renderAndLoad();

    await user.click(screen.getAllByText('correction')[0]);

    // Both empty — button disabled
    const submitButton = screen.getByText('adjustWallet');
    expect(submitButton).toBeDisabled();

    // Only amount filled — still disabled (reason empty)
    await user.type(screen.getByLabelText('amountLabel'), '10');
    expect(submitButton).toBeDisabled();

    // Fill reason too — now enabled
    await user.type(screen.getByLabelText('reasonLabel'), 'test');
    expect(submitButton).not.toBeDisabled();
  });

  // ------------------------------------------
  // Bonus: displays displayName when present
  // ------------------------------------------
  it('shows displayName next to handle when present', async () => {
    await renderAndLoad();

    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  // ------------------------------------------
  // Bonus: superadmin also sees correction button
  // ------------------------------------------
  it('shows correction button for superadmin role', async () => {
    await renderAndLoad({ role: 'superadmin' });

    const correctionButtons = screen.getAllByText('correction');
    expect(correctionButtons).toHaveLength(mockUsers.length);
  });
});
