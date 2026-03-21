import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import FollowBtn from '../FollowBtn';

vi.mock('lucide-react', () => {
  const Stub = () => null;
  return { UserCheck: Stub, X: Stub, UserPlus: Stub };
});
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));

describe('FollowBtn', () => {
  it('shows follow text when not followed', () => {
    renderWithProviders(<FollowBtn isFollowed={false} onToggle={vi.fn()} />);
    expect(screen.getByText('follow')).toBeInTheDocument();
  });

  it('shows following state when followed', () => {
    renderWithProviders(<FollowBtn isFollowed={true} onToggle={vi.fn()} />);
    expect(screen.getByText('followingState')).toBeInTheDocument();
  });

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn();
    renderWithProviders(<FollowBtn isFollowed={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByText('follow'));
    expect(onToggle).toHaveBeenCalled();
  });
});
