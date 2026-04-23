/**
 * Slice 159 — Tests fuer PostReplies Ferrari-Refactor (3 Mutations).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetReplies = vi.fn();
const mockCreateReply = vi.fn();
const mockDeletePost = vi.fn();
const mockVotePost = vi.fn();
const mockGetUserPostVotes = vi.fn();
const mockLogSilentCatch = vi.fn();

vi.mock('@/lib/services/posts', () => ({
  getReplies: (...a: unknown[]) => mockGetReplies(...a),
  createReply: (...a: unknown[]) => mockCreateReply(...a),
  deletePost: (...a: unknown[]) => mockDeletePost(...a),
  votePost: (...a: unknown[]) => mockVotePost(...a),
  getUserPostVotes: (...a: unknown[]) => mockGetUserPostVotes(...a),
}));

vi.mock('@/lib/observability/silentRejects', () => ({
  logSilentCatch: (tag: string, err: unknown) => mockLogSilentCatch(tag, err),
  logSilentRejects: () => {},
}));

vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'de',
}));

import PostReplies from '../PostReplies';

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 60_000 }, mutations: { retry: false } },
  });
}

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

function makeReply(overrides: Record<string, unknown> = {}) {
  return {
    id: 'reply-1',
    user_id: 'u1',
    author_handle: 'anil',
    author_display_name: 'Anil',
    author_verified: false,
    author_level: 5,
    content: 'Test reply',
    upvotes: 2,
    downvotes: 0,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('PostReplies (Ferrari-Refactor)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetReplies.mockResolvedValue([makeReply()]);
    mockGetUserPostVotes.mockResolvedValue(new Map());
    mockCreateReply.mockResolvedValue(undefined);
    mockDeletePost.mockResolvedValue(undefined);
    mockVotePost.mockResolvedValue({ upvotes: 3, downvotes: 0 });
  });

  it('createReplyMut: handleSubmit calls createReply service', async () => {
    const qc = makeClient();
    const onCountChange = vi.fn();
    render(
      React.createElement(PostReplies, {
        postId: 'p1', userId: 'u1', onRepliesCountChange: onCountChange,
      }),
      { wrapper: wrapperFor(qc) },
    );

    await waitFor(() => expect(mockGetReplies).toHaveBeenCalled());

    const input = screen.getByPlaceholderText('replyPlaceholder') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'My reply' } });

    // Submit via Send-button (last button in form).
    const buttons = screen.getAllByRole('button');
    const sendBtn = buttons[buttons.length - 1];
    await act(async () => {
      fireEvent.click(sendBtn);
    });

    expect(mockCreateReply).toHaveBeenCalledWith('u1', 'p1', 'My reply');
    await waitFor(() => expect(onCountChange).toHaveBeenCalledWith('p1', 1));
  });

  it('voteReplyMut: handleVote calls votePost with voteType', async () => {
    const qc = makeClient();
    render(
      React.createElement(PostReplies, {
        postId: 'p1', userId: 'u2', onRepliesCountChange: vi.fn(),
      }),
      { wrapper: wrapperFor(qc) },
    );

    await waitFor(() => expect(screen.queryByText('Test reply')).toBeTruthy());

    // ArrowUp button is first button in reply's action row.
    const buttons = screen.getAllByRole('button');
    // Skip reason buttons, find ArrowUp (after reply render).
    const upvoteBtn = buttons.find((b) => b.innerHTML.includes('lucide-arrow-up')) ?? buttons[0];
    await act(async () => {
      fireEvent.click(upvoteBtn);
    });

    expect(mockVotePost).toHaveBeenCalledWith('u2', 'reply-1', 1);
  });

  it('errorTag community.replySubmit on create failure', async () => {
    mockCreateReply.mockRejectedValue(new Error('create_failed'));
    const qc = makeClient();
    render(
      React.createElement(PostReplies, {
        postId: 'p1', userId: 'u1', onRepliesCountChange: vi.fn(),
      }),
      { wrapper: wrapperFor(qc) },
    );

    await waitFor(() => expect(mockGetReplies).toHaveBeenCalled());

    const input = screen.getByPlaceholderText('replyPlaceholder') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'My reply' } });
    const buttons = screen.getAllByRole('button');
    const sendBtn = buttons[buttons.length - 1];
    await act(async () => {
      fireEvent.click(sendBtn);
    });

    await waitFor(() =>
      expect(mockLogSilentCatch).toHaveBeenCalledWith('community.replySubmit', expect.any(Error)),
    );
  });

  it('errorTag community.replyDelete on delete failure', async () => {
    mockDeletePost.mockRejectedValue(new Error('delete_failed'));
    const ownReply = makeReply({ id: 'reply-own', user_id: 'u1' });
    mockGetReplies.mockResolvedValue([ownReply]);

    const qc = makeClient();
    render(
      React.createElement(PostReplies, {
        postId: 'p1', userId: 'u1', onRepliesCountChange: vi.fn(),
      }),
      { wrapper: wrapperFor(qc) },
    );

    await waitFor(() => expect(screen.queryByText('Test reply')).toBeTruthy());

    // Click delete trigger (Trash2 label "replyDeleteLabel").
    const deleteLabelBtn = screen.getByText('replyDeleteLabel').closest('button') as HTMLButtonElement;
    fireEvent.click(deleteLabelBtn);

    // Confirm dialog appears — click "replyYes".
    const confirmYesBtn = screen.getByText('replyYes');
    await act(async () => {
      fireEvent.click(confirmYesBtn);
    });

    await waitFor(() =>
      expect(mockLogSilentCatch).toHaveBeenCalledWith('community.replyDelete', expect.any(Error)),
    );
  });

  it('errorTag community.replyVote on vote failure', async () => {
    mockVotePost.mockRejectedValue(new Error('vote_failed'));
    const qc = makeClient();
    render(
      React.createElement(PostReplies, {
        postId: 'p1', userId: 'u2', onRepliesCountChange: vi.fn(),
      }),
      { wrapper: wrapperFor(qc) },
    );

    await waitFor(() => expect(screen.queryByText('Test reply')).toBeTruthy());

    const buttons = screen.getAllByRole('button');
    const upvoteBtn = buttons.find((b) => b.innerHTML.includes('lucide-arrow-up')) ?? buttons[0];
    await act(async () => {
      fireEvent.click(upvoteBtn);
    });

    await waitFor(() =>
      expect(mockLogSilentCatch).toHaveBeenCalledWith('community.replyVote', expect.any(Error)),
    );
  });

  it('vote button disabled during in-flight (per-row via variables.replyId)', async () => {
    mockVotePost.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ upvotes: 3, downvotes: 0 }), 50)),
    );
    const qc = makeClient();
    render(
      React.createElement(PostReplies, {
        postId: 'p1', userId: 'u2', onRepliesCountChange: vi.fn(),
      }),
      { wrapper: wrapperFor(qc) },
    );

    await waitFor(() => expect(screen.queryByText('Test reply')).toBeTruthy());

    const buttons = screen.getAllByRole('button');
    const upvoteBtn = buttons.find((b) => b.innerHTML.includes('lucide-arrow-up')) as HTMLButtonElement;
    act(() => {
      fireEvent.click(upvoteBtn);
    });

    await waitFor(() => expect(upvoteBtn.disabled).toBe(true));
    // Second click no-op during in-flight.
    fireEvent.click(upvoteBtn);
    await waitFor(() => expect(upvoteBtn.disabled).toBe(false));
    expect(mockVotePost).toHaveBeenCalledTimes(1);
  });
});
