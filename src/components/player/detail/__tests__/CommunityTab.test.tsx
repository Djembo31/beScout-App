import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import CommunityTab from '../CommunityTab';

vi.mock('lucide-react', () => {
  const Stub = () => null;
  return {
    FileText: Stub, ChevronRight: Stub, Plus: Stub, MessageSquare: Stub,
    ArrowUp: Stub, ArrowDown: Stub, Trash2: Stub, BadgeCheck: Stub,
    Send: Stub, CheckCircle2: Stub, Radio: Stub, Filter: Stub,
  };
});
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));
vi.mock('@/components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    <button onClick={onClick}>{children}</button>,
  Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="modal">{children}</div> : null,
}));
vi.mock('@/components/community/ResearchCard', () => ({
  default: () => <div data-testid="research-card" />,
}));
vi.mock('@/components/community/PostCard', () => ({
  POST_CATEGORIES: [{ id: 'Meinung', labelKey: 'cat_meinung', color: '' }],
  formatTimeAgo: () => '2h',
}));
vi.mock('./SentimentGauge', () => ({ default: () => <div data-testid="sentiment" /> }));
vi.mock('./ScoutConsensus', () => ({ default: () => null }));
vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: () => ({ select: () => ({ data: [], error: null }) }) },
}));

const defaultProps = {
  playerResearch: [],
  playerPosts: [],
  myPostVotes: new Map(),
  trades: [],
  playerId: 'p1',
  playerName: 'Test Player',
  unlockingId: null,
  ratingId: null,
  postLoading: false,
  onUnlock: vi.fn(),
  onRate: vi.fn(),
  onCreatePost: vi.fn(),
  onVotePost: vi.fn(),
  onDeletePost: vi.fn(),
};

describe('CommunityTab', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<CommunityTab {...defaultProps} />);
    expect(container.innerHTML).not.toBe('');
  });

  it('renders content area', () => {
    const { container } = renderWithProviders(<CommunityTab {...defaultProps} />);
    expect(container.innerHTML.length).toBeGreaterThan(50);
  });

  it('renders research cards when research exists', () => {
    const research = [{ id: 'r1', player_id: 'p1', call: 'Bullish' }] as any[];
    renderWithProviders(<CommunityTab {...defaultProps} playerResearch={research} />);
    expect(screen.getAllByTestId('research-card').length).toBeGreaterThanOrEqual(1);
  });
});
