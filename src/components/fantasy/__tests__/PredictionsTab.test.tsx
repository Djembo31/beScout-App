import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { PredictionsTab } from '../PredictionsTab';

// ============================================
// Mock query hooks
// ============================================
const mockUsePredictions = vi.fn();
const mockUsePredictionCount = vi.fn();

vi.mock('@/lib/queries/predictions', () => ({
  usePredictions: (...args: unknown[]) => mockUsePredictions(...args),
  usePredictionCount: (...args: unknown[]) => mockUsePredictionCount(...args),
}));

// Mock child components to isolate unit
vi.mock('../PredictionCard', () => ({
  PredictionCard: ({ prediction }: { prediction: { id: string; status: string } }) => (
    <div data-testid={`prediction-${prediction.id}`} data-status={prediction.status}>
      PredictionCard
    </div>
  ),
}));

vi.mock('../CreatePredictionModal', () => ({
  CreatePredictionModal: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="create-modal">
        <button onClick={onClose}>close</button>
      </div>
    ) : null,
}));

// ============================================
// Fixtures
// ============================================
const PROPS = { gameweek: 5, userId: 'user-1' };

const pendingPrediction = { id: 'p1', status: 'pending' };
const correctPrediction = { id: 'p2', status: 'correct' };
const wrongPrediction = { id: 'p3', status: 'wrong' };

function setupHooks(
  predictions: unknown[] = [],
  count = 0,
  isLoading = false,
) {
  mockUsePredictions.mockReturnValue({ data: predictions, isLoading });
  mockUsePredictionCount.mockReturnValue({ data: count });
}

// ============================================
// Tests
// ============================================
describe('PredictionsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Loading State ---
  it('renders skeleton when loading', () => {
    setupHooks([], 0, true);
    const { container } = renderWithProviders(<PredictionsTab {...PROPS} />);
    // Skeleton components render divs with animate-pulse (from our Skeleton component)
    const skeletons = container.querySelectorAll('.h-12, .h-24');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  // --- Empty State ---
  it('renders empty state when no predictions', () => {
    setupHooks([], 0);
    renderWithProviders(<PredictionsTab {...PROPS} />);
    expect(screen.getByText('empty')).toBeInTheDocument();
    expect(screen.getByText('emptyHint')).toBeInTheDocument();
  });

  // --- Header with count ---
  it('shows count badge as 0/5', () => {
    setupHooks([], 0);
    renderWithProviders(<PredictionsTab {...PROPS} />);
    expect(screen.getByText('0/5')).toBeInTheDocument();
  });

  it('shows count badge as 3/5', () => {
    setupHooks([pendingPrediction], 3);
    renderWithProviders(<PredictionsTab {...PROPS} />);
    expect(screen.getByText('3/5')).toBeInTheDocument();
  });

  // --- Limit Reached ---
  it('disables create button when limit reached (5/5)', () => {
    setupHooks([pendingPrediction], 5);
    renderWithProviders(<PredictionsTab {...PROPS} />);
    const button = screen.getByRole('button', { name: /limitReached/i });
    expect(button).toBeDisabled();
  });

  it('shows red styling on badge when limit reached', () => {
    setupHooks([], 5);
    renderWithProviders(<PredictionsTab {...PROPS} />);
    const badge = screen.getByText('5/5');
    expect(badge.className).toContain('text-red-400');
  });

  // --- Create Button ---
  it('shows create button when under limit', () => {
    setupHooks([], 2);
    renderWithProviders(<PredictionsTab {...PROPS} />);
    const button = screen.getByRole('button', { name: /create/i });
    expect(button).not.toBeDisabled();
  });

  it('opens CreatePredictionModal on click', async () => {
    const user = userEvent.setup();
    setupHooks([], 0);
    renderWithProviders(<PredictionsTab {...PROPS} />);

    expect(screen.queryByTestId('create-modal')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /create/i }));
    expect(screen.getByTestId('create-modal')).toBeInTheDocument();
  });

  it('closes CreatePredictionModal via onClose', async () => {
    const user = userEvent.setup();
    setupHooks([], 0);
    renderWithProviders(<PredictionsTab {...PROPS} />);

    await user.click(screen.getByRole('button', { name: /create/i }));
    expect(screen.getByTestId('create-modal')).toBeInTheDocument();

    await user.click(screen.getByText('close'));
    expect(screen.queryByTestId('create-modal')).not.toBeInTheDocument();
  });

  // --- Pending Predictions ---
  it('renders pending prediction cards', () => {
    setupHooks([pendingPrediction, { id: 'p4', status: 'pending' }], 2);
    renderWithProviders(<PredictionsTab {...PROPS} />);
    expect(screen.getByTestId('prediction-p1')).toBeInTheDocument();
    expect(screen.getByTestId('prediction-p4')).toBeInTheDocument();
  });

  // --- Resolved Section ---
  it('renders resolved section with stats bar', () => {
    setupHooks([correctPrediction, wrongPrediction], 2);
    renderWithProviders(<PredictionsTab {...PROPS} />);

    // Stats bar
    expect(screen.getByText('resolved')).toBeInTheDocument();
    // Correct count and wrong count both 1
    const allOnes = screen.getAllByText('1');
    expect(allOnes.length).toBeGreaterThanOrEqual(2); // correct=1, wrong=1
    // Accuracy: 50%
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('calculates accuracy correctly (2 correct, 1 wrong = 67%)', () => {
    const predictions = [
      { id: 'c1', status: 'correct' },
      { id: 'c2', status: 'correct' },
      { id: 'w1', status: 'wrong' },
    ];
    setupHooks(predictions, 3);
    renderWithProviders(<PredictionsTab {...PROPS} />);
    expect(screen.getByText('67%')).toBeInTheDocument();
  });

  it('shows 0% accuracy when no resolved predictions', () => {
    setupHooks([pendingPrediction], 1);
    renderWithProviders(<PredictionsTab {...PROPS} />);
    // No resolved section at all
    expect(screen.queryByText('resolved')).not.toBeInTheDocument();
  });

  // --- Mixed State ---
  it('renders both pending and resolved sections together', () => {
    setupHooks([pendingPrediction, correctPrediction, wrongPrediction], 3);
    renderWithProviders(<PredictionsTab {...PROPS} />);

    // Pending card
    expect(screen.getByTestId('prediction-p1')).toHaveAttribute('data-status', 'pending');
    // Resolved cards
    expect(screen.getByTestId('prediction-p2')).toHaveAttribute('data-status', 'correct');
    expect(screen.getByTestId('prediction-p3')).toHaveAttribute('data-status', 'wrong');
    // Stats
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  // --- Does not show empty state when predictions exist ---
  it('does not show empty state when predictions exist', () => {
    setupHooks([pendingPrediction], 1);
    renderWithProviders(<PredictionsTab {...PROPS} />);
    expect(screen.queryByText('empty')).not.toBeInTheDocument();
  });

  // --- Hook arguments ---
  it('passes correct args to hooks', () => {
    setupHooks([], 0);
    renderWithProviders(<PredictionsTab gameweek={12} userId="abc-123" />);
    expect(mockUsePredictions).toHaveBeenCalledWith('abc-123', 12);
    expect(mockUsePredictionCount).toHaveBeenCalledWith('abc-123', 12);
  });
});
