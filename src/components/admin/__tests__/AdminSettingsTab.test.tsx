import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import AdminSettingsTab from '../AdminSettingsTab';
import type { ClubWithAdmin } from '@/types';

// ============================================
// Mocks
// ============================================

// Auth
const mockUser = { id: 'admin-1' };
vi.mock('@/components/providers/AuthProvider', () => ({
  useUser: () => ({ user: mockUser }),
}));

// Toast
const mockAddToast = vi.fn();
vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

// Club services
const mockGetActiveGameweek = vi.fn();
const mockSetActiveGameweek = vi.fn();
const mockGetClubFantasySettings = vi.fn();
const mockUpdateClubFantasySettings = vi.fn();
const mockGetClubAdmins = vi.fn();
const mockRemoveClubAdmin = vi.fn();
const mockAddClubAdmin = vi.fn();
const mockUpdateClubBranding = vi.fn();

vi.mock('@/lib/services/club', () => ({
  getActiveGameweek: (...args: unknown[]) => mockGetActiveGameweek(...args),
  setActiveGameweek: (...args: unknown[]) => mockSetActiveGameweek(...args),
  getClubFantasySettings: (...args: unknown[]) => mockGetClubFantasySettings(...args),
  updateClubFantasySettings: (...args: unknown[]) => mockUpdateClubFantasySettings(...args),
  getClubAdmins: (...args: unknown[]) => mockGetClubAdmins(...args),
  removeClubAdmin: (...args: unknown[]) => mockRemoveClubAdmin(...args),
  addClubAdmin: (...args: unknown[]) => mockAddClubAdmin(...args),
  updateClubBranding: (...args: unknown[]) => mockUpdateClubBranding(...args),
}));

// Football data services
const mockIsApiConfigured = vi.fn();
const mockGetMappingStatus = vi.fn();
const mockSyncTeamMapping = vi.fn();
const mockSyncPlayerMapping = vi.fn();
const mockSyncFixtureMapping = vi.fn();
const mockImportGameweek = vi.fn();

vi.mock('@/lib/services/footballData', () => ({
  isApiConfigured: (...args: unknown[]) => mockIsApiConfigured(...args),
  getMappingStatus: (...args: unknown[]) => mockGetMappingStatus(...args),
  syncTeamMapping: (...args: unknown[]) => mockSyncTeamMapping(...args),
  syncPlayerMapping: (...args: unknown[]) => mockSyncPlayerMapping(...args),
  syncFixtureMapping: (...args: unknown[]) => mockSyncFixtureMapping(...args),
  importGameweek: (...args: unknown[]) => mockImportGameweek(...args),
}));

// Admin roles
vi.mock('@/lib/adminRoles', () => ({
  canPerformAction: () => true,
  getRoleBadge: () => ({ labelKey: 'admin', color: 'text-sky-400', bg: 'bg-sky-400/10', border: 'border-sky-400/20' }),
}));

// AddAdminModal — stub
vi.mock('@/components/admin/AddAdminModal', () => ({
  default: () => null,
}));

// UI stubs
vi.mock('@/components/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  Button: ({ children, onClick, disabled, className, ...rest }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} disabled={disabled} className={className} {...rest}>{children}</button>
  ),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// ============================================
// Fixtures
// ============================================

const club = {
  id: 'club-1',
  name: 'Test Club',
  slug: 'test-club',
  logo: '/logo.png',
  league: 'Test League',
  plan: 'Profesyonel',
  is_verified: true,
  primary_color: '#FFD700',
  secondary_color: '#FFFFFF',
  admin_role: 'owner',
} as unknown as ClubWithAdmin;

const mappingStatusFixture = {
  clubsMapped: 10,
  clubsTotal: 20,
  playersMapped: 50,
  playersTotal: 100,
  fixturesMapped: 5,
  fixturesTotal: 10,
};

const fantasySettingsFixture = {
  fantasy_entry_fee_cents: 500,
  fantasy_jurisdiction_preset: 'OTHER' as const,
  fantasy_allow_entry_fees: true,
};

const adminsFixture = [
  { id: 'a1', club_id: 'club-1', user_id: 'admin-1', role: 'owner', created_at: '2024-01-01', handle: 'admin_user', display_name: 'Admin User' },
  { id: 'a2', club_id: 'club-1', user_id: 'admin-2', role: 'editor', created_at: '2024-01-02', handle: 'editor_user', display_name: 'Editor User' },
];

function setupMocksResolved() {
  mockGetActiveGameweek.mockResolvedValue(5);
  mockGetClubFantasySettings.mockResolvedValue(fantasySettingsFixture);
  mockGetClubAdmins.mockResolvedValue(adminsFixture);
  mockIsApiConfigured.mockReturnValue(true);
  mockGetMappingStatus.mockResolvedValue(mappingStatusFixture);
  mockSyncTeamMapping.mockResolvedValue({ matched: 10, unmatched: [], errors: [] });
  mockSyncPlayerMapping.mockResolvedValue({ matched: 50, unmatched: [], errors: [] });
  mockSyncFixtureMapping.mockResolvedValue({ matched: 5, unmatched: [], errors: [] });
  mockImportGameweek.mockResolvedValue({ success: true, fixturesImported: 3, statsImported: 22, scoresSynced: 22, errors: [] });
}

function setupMocksNeverResolve() {
  mockGetActiveGameweek.mockReturnValue(new Promise(() => {}));
  mockGetClubFantasySettings.mockReturnValue(new Promise(() => {}));
  mockGetClubAdmins.mockReturnValue(new Promise(() => {}));
  mockIsApiConfigured.mockReturnValue(false);
}

// ============================================
// Tests
// ============================================

describe('AdminSettingsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- 1. Renders without crash ---
  it('renders without crash', () => {
    setupMocksNeverResolve();
    renderWithProviders(<AdminSettingsTab club={club} />);
    expect(screen.getByText('settings')).toBeInTheDocument();
  });

  // --- 2. Loads active gameweek on mount ---
  it('loads active gameweek on mount', () => {
    setupMocksResolved();
    renderWithProviders(<AdminSettingsTab club={club} />);
    expect(mockGetActiveGameweek).toHaveBeenCalledWith('club-1');
  });

  // --- 3. Shows current gameweek value ---
  it('shows current gameweek value after loading', async () => {
    setupMocksResolved();
    renderWithProviders(<AdminSettingsTab club={club} />);

    await waitFor(() => {
      // The current GW indicator: "• current: GW 5"
      expect(screen.getByText(/current.*GW 5/)).toBeInTheDocument();
    });
  });

  // --- 4. Loads fantasy settings ---
  it('loads fantasy settings on mount', () => {
    setupMocksResolved();
    renderWithProviders(<AdminSettingsTab club={club} />);
    expect(mockGetClubFantasySettings).toHaveBeenCalledWith('club-1');
  });

  // --- 5. API-Football: shows "not configured" when isApiConfigured=false ---
  it('shows not-configured message when API key is missing', async () => {
    setupMocksResolved();
    mockIsApiConfigured.mockReturnValue(false);
    renderWithProviders(<AdminSettingsTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('apiKeyNotConfigured')).toBeInTheDocument();
    });
  });

  // --- 6. API-Football: shows mapping status when configured ---
  it('shows mapping status dashboard when API is configured', async () => {
    setupMocksResolved();
    renderWithProviders(<AdminSettingsTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('10/20')).toBeInTheDocument();
    });
    expect(screen.getByText('50/100')).toBeInTheDocument();
    expect(screen.getByText('5/10')).toBeInTheDocument();
  });

  // --- 7. API-Football: sync teams calls service ---
  it('calls syncTeamMapping when sync teams button is clicked', async () => {
    setupMocksResolved();
    const u = userEvent.setup();
    renderWithProviders(<AdminSettingsTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('10/20')).toBeInTheDocument();
    });

    const syncTeamsBtn = screen.getByText('syncTeams').closest('button')!;
    await u.click(syncTeamsBtn);

    await waitFor(() => {
      expect(mockSyncTeamMapping).toHaveBeenCalledWith('admin-1');
    });
  });

  // --- 8. API-Football: sync players calls service ---
  it('calls syncPlayerMapping when sync players button is clicked', async () => {
    setupMocksResolved();
    const u = userEvent.setup();
    renderWithProviders(<AdminSettingsTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('50/100')).toBeInTheDocument();
    });

    const syncPlayersBtn = screen.getByText('syncPlayers').closest('button')!;
    await u.click(syncPlayersBtn);

    await waitFor(() => {
      expect(mockSyncPlayerMapping).toHaveBeenCalledWith('admin-1');
    });
  });

  // --- 9. Loads club admins list ---
  it('loads club admins on mount', () => {
    setupMocksResolved();
    renderWithProviders(<AdminSettingsTab club={club} />);
    expect(mockGetClubAdmins).toHaveBeenCalledWith('club-1');
  });

  // --- 10. Shows admin entries with roles ---
  it('shows admin entries with role badges', async () => {
    setupMocksResolved();
    renderWithProviders(<AdminSettingsTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });
    expect(screen.getByText('Editor User')).toBeInTheDocument();
    expect(screen.getByText('@admin_user')).toBeInTheDocument();
    expect(screen.getByText('@editor_user')).toBeInTheDocument();
  });

  // --- 11. Shows active gameweek change controls ---
  it('renders gameweek select and set button', async () => {
    setupMocksResolved();
    renderWithProviders(<AdminSettingsTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('activeGameweek')).toBeInTheDocument();
    });

    const gwSelect = screen.getByLabelText('activeGameweekAria');
    expect(gwSelect).toBeInTheDocument();
    expect(screen.getByText('set')).toBeInTheDocument();
  });

  // --- 12. Renders branding section ---
  it('renders branding section with color pickers', async () => {
    setupMocksResolved();
    renderWithProviders(<AdminSettingsTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('branding')).toBeInTheDocument();
    });
    expect(screen.getByText('primaryColor')).toBeInTheDocument();
    expect(screen.getByText('secondaryColor')).toBeInTheDocument();
    expect(screen.getByText('saveBranding')).toBeInTheDocument();
  });

  // --- 13. Fantasy settings toggles render ---
  it('renders fantasy settings section with jurisdiction select', async () => {
    setupMocksResolved();
    renderWithProviders(<AdminSettingsTab club={club} />);

    await waitFor(() => {
      expect(screen.getByText('fantasySettings')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/jurisdiction/)).toBeInTheDocument();
    });
    expect(screen.getByText('saveFantasySettings')).toBeInTheDocument();
  });

  // --- 14. Handles errors gracefully ---
  it('does not crash when services reject', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetActiveGameweek.mockRejectedValue(new Error('Network error'));
    mockGetClubFantasySettings.mockRejectedValue(new Error('Network error'));
    mockGetClubAdmins.mockRejectedValue(new Error('Network error'));
    mockIsApiConfigured.mockReturnValue(false);

    renderWithProviders(<AdminSettingsTab club={club} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    // Component should still render without crashing
    expect(screen.getByText('settings')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});
