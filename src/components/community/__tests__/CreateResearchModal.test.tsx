import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import CreateResearchModal from '../CreateResearchModal';
import type { Pos } from '@/types';

// ============================================
// Mock UI components
// ============================================

vi.mock('@/components/ui', () => ({
  Modal: ({ open, children, title, footer, onClose }: any) =>
    open ? (
      <div data-testid="modal">
        <div data-testid="modal-title">{title}</div>
        <div>{children}</div>
        <div data-testid="modal-footer">{footer}</div>
      </div>
    ) : null,
  Button: ({ children, disabled, loading, onClick, ...props }: any) => (
    <button disabled={disabled || loading} onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

// ============================================
// Mock useDraft
// ============================================

const mockRestoreDraft = vi.fn();
const mockDismissDraft = vi.fn();
const mockClearDraft = vi.fn();
let mockHasDraft = false;

vi.mock('@/lib/hooks/useDraft', () => ({
  useDraft: () => ({
    hasDraft: mockHasDraft,
    restoreDraft: mockRestoreDraft,
    dismissDraft: mockDismissDraft,
    clearDraft: mockClearDraft,
  }),
}));

// ============================================
// Mock ScoutingEvaluationForm
// ============================================

vi.mock('@/components/community/ScoutingEvaluationForm', () => ({
  default: (props: any) => (
    <div data-testid="scouting-evaluation-form">ScoutingEvaluationForm</div>
  ),
}));

// ============================================
// Test data
// ============================================

const PLAYERS = [
  { id: 'pl1', name: 'Max Mustermann', pos: 'MID' as Pos },
  { id: 'pl2', name: 'Hans Keeper', pos: 'GK' as Pos },
];

const onSubmit = vi.fn();
const onClose = vi.fn();

const PROPS = {
  open: true,
  onClose,
  players: PLAYERS,
  onSubmit,
  loading: false,
};

// ============================================
// Tests
// ============================================

describe('CreateResearchModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasDraft = false;
  });

  // ------------------------------------------
  // 1. renders nothing when open=false
  // ------------------------------------------
  it('renders nothing when open=false', () => {
    renderWithProviders(<CreateResearchModal {...PROPS} open={false} />);
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  // ------------------------------------------
  // 2. renders modal when open=true
  // ------------------------------------------
  it('renders modal when open=true', () => {
    renderWithProviders(<CreateResearchModal {...PROPS} />);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  // ------------------------------------------
  // 3. shows title input
  // ------------------------------------------
  it('shows title input', () => {
    renderWithProviders(<CreateResearchModal {...PROPS} />);
    // Label uses t('title') which returns the key 'title'
    expect(screen.getByText('title')).toBeInTheDocument();
    // Character counter shows 0/200
    expect(screen.getByText('0/200')).toBeInTheDocument();
  });

  // ------------------------------------------
  // 4. shows category buttons (5 categories)
  // ------------------------------------------
  it('shows category buttons (5 categories)', () => {
    renderWithProviders(<CreateResearchModal {...PROPS} />);
    // Category label
    expect(screen.getByText('category')).toBeInTheDocument();
    // 5 category buttons (keys from CATEGORY_I18N_KEYS)
    expect(screen.getByText('catPlayerAnalysis')).toBeInTheDocument();
    expect(screen.getByText('catTransferRec')).toBeInTheDocument();
    expect(screen.getByText('catTactics')).toBeInTheDocument();
    expect(screen.getByText('catSeasonPreview')).toBeInTheDocument();
    expect(screen.getByText('catScoutingReport')).toBeInTheDocument();
  });

  // ------------------------------------------
  // 5. clicking category changes active category
  // ------------------------------------------
  it('clicking category changes active category styling', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateResearchModal {...PROPS} />);

    const tacticsBtn = screen.getByText('catTactics');
    await user.click(tacticsBtn);

    // After clicking Taktik, it should have the amber active styling
    expect(tacticsBtn.className).toContain('bg-amber-500/15');
  });

  // ------------------------------------------
  // 6. shows player search input
  // ------------------------------------------
  it('shows player search input', () => {
    renderWithProviders(<CreateResearchModal {...PROPS} />);
    // Default category is Spieler-Analyse (non-scouting), label = 'playerOptional'
    expect(screen.getByText('playerOptional')).toBeInTheDocument();
  });

  // ------------------------------------------
  // 7. player dropdown shows filtered players
  // ------------------------------------------
  it('player dropdown shows filtered players', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateResearchModal {...PROPS} />);

    // The player search input has placeholder 'searchPlayer'
    const playerInput = screen.getByPlaceholderText('searchPlayer');
    await user.click(playerInput);

    // Both players should be visible in dropdown
    expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
    expect(screen.getByText('Hans Keeper')).toBeInTheDocument();

    // Type to filter
    await user.type(playerInput, 'Max');
    expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
    expect(screen.queryByText('Hans Keeper')).not.toBeInTheDocument();
  });

  // ------------------------------------------
  // 8. selecting a player sets playerId
  // ------------------------------------------
  it('selecting a player sets playerId', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateResearchModal {...PROPS} />);

    const playerInput = screen.getByPlaceholderText('searchPlayer');
    await user.click(playerInput);
    await user.click(screen.getByText('Max Mustermann'));

    // After selection, the clear button (✕) should appear with aria-label 'removePlayer'
    expect(screen.getByLabelText('removePlayer')).toBeInTheDocument();
  });

  // ------------------------------------------
  // 9. shows call buttons for non-scouting
  // ------------------------------------------
  it('shows call buttons (Bullish/Bearish/Neutral) for non-scouting', () => {
    renderWithProviders(<CreateResearchModal {...PROPS} />);
    expect(screen.getByText('call')).toBeInTheDocument();
    expect(screen.getByText('Bullish')).toBeInTheDocument();
    expect(screen.getByText('Bearish')).toBeInTheDocument();
    expect(screen.getByText('Neutral')).toBeInTheDocument();
  });

  // ------------------------------------------
  // 10. hides call/horizon for Scouting-Report
  // ------------------------------------------
  it('hides call/horizon for Scouting-Report category', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateResearchModal {...PROPS} />);

    // Initially Spieler-Analyse is selected, call/horizon visible
    expect(screen.getByText('call')).toBeInTheDocument();
    expect(screen.getByText('horizon')).toBeInTheDocument();

    // Switch to Scouting-Report
    await user.click(screen.getByText('catScoutingReport'));

    // Call and horizon labels should be gone
    expect(screen.queryByText('call')).not.toBeInTheDocument();
    expect(screen.queryByText('horizon')).not.toBeInTheDocument();
  });

  // ------------------------------------------
  // 11. shows ScoutingEvaluationForm for Scouting-Report
  // ------------------------------------------
  it('shows ScoutingEvaluationForm for Scouting-Report', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateResearchModal {...PROPS} />);

    // Not visible initially
    expect(screen.queryByTestId('scouting-evaluation-form')).not.toBeInTheDocument();

    // Switch to Scouting-Report
    await user.click(screen.getByText('catScoutingReport'));
    expect(screen.getByTestId('scouting-evaluation-form')).toBeInTheDocument();
  });

  // ------------------------------------------
  // 12. shows price input with default value 10
  // ------------------------------------------
  it('shows price input with default value 10', () => {
    renderWithProviders(<CreateResearchModal {...PROPS} />);
    expect(screen.getByText('price')).toBeInTheDocument();
    const priceInput = screen.getByDisplayValue('10');
    expect(priceInput).toBeInTheDocument();
  });

  // ------------------------------------------
  // 13. shows preview textarea
  // ------------------------------------------
  it('shows preview textarea', () => {
    renderWithProviders(<CreateResearchModal {...PROPS} />);
    expect(screen.getByText('preview')).toBeInTheDocument();
    expect(screen.getByText('0/300')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('previewPlaceholder')).toBeInTheDocument();
  });

  // ------------------------------------------
  // 14. shows content textarea with markdown toolbar
  // ------------------------------------------
  it('shows content textarea with markdown toolbar', () => {
    renderWithProviders(<CreateResearchModal {...PROPS} />);
    expect(screen.getByText('contentBehindPaywall')).toBeInTheDocument();
    // Markdown toolbar buttons
    expect(screen.getByTitle('Bold')).toBeInTheDocument();
    expect(screen.getByTitle('Italic')).toBeInTheDocument();
    expect(screen.getByTitle('Heading')).toBeInTheDocument();
    expect(screen.getByTitle('List')).toBeInTheDocument();
    expect(screen.getByTitle('Code')).toBeInTheDocument();
  });

  // ------------------------------------------
  // 15. submit button disabled when form invalid
  // ------------------------------------------
  it('submit button disabled when form invalid (title too short)', () => {
    renderWithProviders(<CreateResearchModal {...PROPS} />);
    // The publish button uses t('publishResearch') key
    const submitBtn = screen.getByText('publishResearch');
    expect(submitBtn).toBeDisabled();
  });

  // ------------------------------------------
  // 16. submit button enabled when form valid
  // ------------------------------------------
  it('submit button enabled when form valid', async () => {
    renderWithProviders(<CreateResearchModal {...PROPS} />);

    // Fill title (>= 5 chars) — use fireEvent for speed
    fireEvent.change(screen.getByPlaceholderText('titleResearchPlaceholder'), { target: { value: 'Test Research Title' } });
    fireEvent.change(screen.getByPlaceholderText('previewPlaceholder'), { target: { value: 'A preview text' } });
    fireEvent.change(screen.getByPlaceholderText('contentResearchPlaceholder'), { target: { value: 'A'.repeat(50) } });

    // Price already defaults to 10, which is valid (1-100000)
    const submitBtn = screen.getByText('publishResearch');
    expect(submitBtn).not.toBeDisabled();
  });

  // ------------------------------------------
  // 17. submitting calls onSubmit with correct params
  // ------------------------------------------
  it('submitting calls onSubmit with correct params', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateResearchModal {...PROPS} />);

    const contentText = 'This is the content of the research post with enough characters.';
    // Use fireEvent.change for speed (userEvent.type is too slow for long strings)
    fireEvent.change(screen.getByPlaceholderText('titleResearchPlaceholder'), { target: { value: 'My Research' } });
    fireEvent.change(screen.getByPlaceholderText('previewPlaceholder'), { target: { value: 'Preview text' } });
    fireEvent.change(screen.getByPlaceholderText('contentResearchPlaceholder'), { target: { value: contentText } });
    fireEvent.change(screen.getByPlaceholderText('tagsPlaceholder'), { target: { value: 'tag1, tag2, tag3' } });

    // Click submit
    await user.click(screen.getByText('publishResearch'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const call = onSubmit.mock.calls[0][0];
    expect(call.title).toBe('My Research');
    expect(call.preview).toBe('Preview text');
    expect(call.content).toBe(contentText);
    expect(call.tags).toEqual(['tag1', 'tag2', 'tag3']);
    expect(call.category).toBe('Spieler-Analyse');
    expect(call.call).toBe('Bullish');
    expect(call.horizon).toBe('7d');
    expect(call.priceBsd).toBe(10);
    expect(call.playerId).toBeNull();
    expect(call.evaluation).toBeNull();
    expect(call.fixtureId).toBeNull();
  });

  // ------------------------------------------
  // 18. shows validation errors when tried and fields invalid
  // ------------------------------------------
  it('shows validation errors when tried and fields invalid', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateResearchModal {...PROPS} />);

    // Type a short title to trigger validation display (tried || title.length > 0)
    fireEvent.change(screen.getByPlaceholderText('titleResearchPlaceholder'), { target: { value: 'Hi' } });

    // Click submit to set tried=true
    await user.click(screen.getByText('publishResearch'));

    // Validation errors should appear somewhere in the document
    expect(screen.getByText('errorTitle')).toBeInTheDocument();
    expect(screen.getByText('errorPreview')).toBeInTheDocument();
    expect(screen.getByText('errorContent')).toBeInTheDocument();

    // onSubmit should NOT have been called
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // ------------------------------------------
  // Bonus: draft banner shown when hasDraft=true
  // ------------------------------------------
  it('shows draft banner when hasDraft is true', () => {
    mockHasDraft = true;
    renderWithProviders(<CreateResearchModal {...PROPS} />);

    expect(screen.getByText('draftFound')).toBeInTheDocument();
    expect(screen.getByLabelText('draftRestore')).toBeInTheDocument();
    expect(screen.getByLabelText('draftDiscard')).toBeInTheDocument();
  });

  // ------------------------------------------
  // Bonus: horizon buttons visible for non-scouting
  // ------------------------------------------
  it('shows horizon buttons (24h/7d/Season) for non-scouting', () => {
    renderWithProviders(<CreateResearchModal {...PROPS} />);
    expect(screen.getByText('horizon')).toBeInTheDocument();
    expect(screen.getByText('24h')).toBeInTheDocument();
    expect(screen.getByText('7d')).toBeInTheDocument();
    expect(screen.getByText('Season')).toBeInTheDocument();
  });
});
