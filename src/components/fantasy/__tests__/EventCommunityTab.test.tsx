import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import EventCommunityTab from '../EventCommunityTab';

vi.mock('lucide-react', () => {
  const Stub = () => null;
  return { MessageCircle: Stub, Send: Stub, ArrowUp: Stub, ArrowDown: Stub, Loader2: Stub, Clock: Stub, Trophy: Stub, Play: Stub, Sparkles: Stub, Trash2: Stub };
});
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));
vi.mock('@/components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) =>
    <button onClick={onClick} disabled={!!disabled}>{children}</button>,
}));
vi.mock('@/components/providers/AuthProvider', () => {
  const stableUser = { id: 'u1' };
  return { useUser: () => ({ user: stableUser }) };
});

const mockGetPosts = vi.fn();
const mockGetUserPostVotes = vi.fn();
vi.mock('@/lib/services/posts', () => ({
  getPosts: (...args: unknown[]) => mockGetPosts(...args),
  createPost: vi.fn(),
  votePost: vi.fn(),
  deletePost: vi.fn(),
  getUserPostVotes: (...args: unknown[]) => mockGetUserPostVotes(...args),
}));

describe('EventCommunityTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPosts.mockResolvedValue([]);
    mockGetUserPostVotes.mockResolvedValue({});
  });

  it('renders without crashing', () => {
    const { container } = renderWithProviders(
      <EventCommunityTab eventId="e1" eventStatus="registering" eventName="Test Event" />,
    );
    expect(container.innerHTML).not.toBe('');
  });

  it('loads posts on mount', async () => {
    renderWithProviders(
      <EventCommunityTab eventId="e1" eventStatus="registering" eventName="Test Event" />,
    );
    await waitFor(() => {
      expect(mockGetPosts).toHaveBeenCalled();
    });
  });

  it('renders input area for posting', () => {
    const { container } = renderWithProviders(
      <EventCommunityTab eventId="e1" eventStatus="registering" eventName="Test Event" />,
    );
    // Should have input or textarea for posting
    const inputs = container.querySelectorAll('input, textarea');
    expect(inputs.length).toBeGreaterThanOrEqual(1);
  });
});
