import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ============================================
// Mocks
// ============================================
const stableUser = { id: 'u1' };
const stableProfile = { handle: 'test', plan: 'free', level: 1, language: 'de', favorite_club: 'c1' };
const mockUseUser = vi.fn();
vi.mock('@/components/providers/AuthProvider', () => ({
  useUser: () => mockUseUser(),
}));

const mockInitPostHog = vi.fn();
const mockIdentifyUser = vi.fn();
const mockResetUser = vi.fn();
vi.mock('@/lib/posthog', () => ({
  initPostHog: () => mockInitPostHog(),
  identifyUser: (...args: unknown[]) => mockIdentifyUser(...args),
  resetUser: () => mockResetUser(),
}));

import AnalyticsProvider from '../AnalyticsProvider';

// ============================================
// Tests
// ============================================
describe('AnalyticsProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockInitPostHog.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children', () => {
    mockUseUser.mockReturnValue({ user: null, profile: null });
    render(
      <AnalyticsProvider><div data-testid="child">Hi</div></AnalyticsProvider>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('identifies user when user and profile exist', () => {
    mockUseUser.mockReturnValue({ user: stableUser, profile: stableProfile });
    render(<AnalyticsProvider><div /></AnalyticsProvider>);

    expect(mockIdentifyUser).toHaveBeenCalledWith('u1', {
      handle: 'test',
      plan: 'free',
      level: 1,
      language: 'de',
      favorite_club: 'c1',
    });
  });

  it('resets user when no user', () => {
    mockUseUser.mockReturnValue({ user: null, profile: null });
    render(<AnalyticsProvider><div /></AnalyticsProvider>);
    expect(mockResetUser).toHaveBeenCalled();
  });

  it('does not identify when user exists but profile is null', () => {
    mockUseUser.mockReturnValue({ user: stableUser, profile: null });
    render(<AnalyticsProvider><div /></AnalyticsProvider>);
    expect(mockIdentifyUser).not.toHaveBeenCalled();
  });
});
