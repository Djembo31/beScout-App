import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ============================================
// Mocks
// ============================================
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

const mockUseUser = vi.fn();
vi.mock('@/components/providers/AuthProvider', () => ({
  useUser: () => mockUseUser(),
}));

import { AuthGuard } from '../AuthGuard';

// ============================================
// Tests
// ============================================
describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows skeleton while loading', () => {
    mockUseUser.mockReturnValue({ user: null, profile: null, loading: true, profileLoading: false });
    const { container } = render(
      <AuthGuard><div data-testid="protected">Secret</div></AuthGuard>,
    );
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows skeleton while profileLoading', () => {
    mockUseUser.mockReturnValue({ user: { id: 'u1' }, profile: null, loading: false, profileLoading: true });
    const { container } = render(
      <AuthGuard><div data-testid="protected">Secret</div></AuthGuard>,
    );
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects to /login when no user', () => {
    mockUseUser.mockReturnValue({ user: null, profile: null, loading: false, profileLoading: false });
    render(<AuthGuard><div>Secret</div></AuthGuard>);
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('redirects to /onboarding when user but no profile', () => {
    mockUseUser.mockReturnValue({ user: { id: 'u1' }, profile: null, loading: false, profileLoading: false });
    render(<AuthGuard><div>Secret</div></AuthGuard>);
    expect(mockReplace).toHaveBeenCalledWith('/onboarding');
  });

  it('renders children when user and profile exist', () => {
    mockUseUser.mockReturnValue({
      user: { id: 'u1' },
      profile: { handle: 'test' },
      loading: false,
      profileLoading: false,
    });
    render(<AuthGuard><div data-testid="protected">Secret</div></AuthGuard>);
    expect(screen.getByTestId('protected')).toBeInTheDocument();
    expect(screen.getByText('Secret')).toBeInTheDocument();
  });

  it('does not redirect while loading', () => {
    mockUseUser.mockReturnValue({ user: null, profile: null, loading: true, profileLoading: false });
    render(<AuthGuard><div>Secret</div></AuthGuard>);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not redirect while profileLoading', () => {
    mockUseUser.mockReturnValue({ user: { id: 'u1' }, profile: null, loading: false, profileLoading: true });
    render(<AuthGuard><div>Secret</div></AuthGuard>);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
