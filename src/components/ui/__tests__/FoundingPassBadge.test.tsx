import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FoundingPassBadge from '../FoundingPassBadge';

vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));

describe('FoundingPassBadge', () => {
  it('shows Free for null tier', () => {
    render(<FoundingPassBadge tier={null} />);
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('shows Fan for fan tier', () => {
    render(<FoundingPassBadge tier="fan" />);
    expect(screen.getByText('Fan')).toBeInTheDocument();
  });

  it('shows Scout for scout tier', () => {
    render(<FoundingPassBadge tier="scout" />);
    expect(screen.getByText('Scout')).toBeInTheDocument();
  });

  it('shows Founder for founder tier', () => {
    render(<FoundingPassBadge tier="founder" />);
    expect(screen.getByText('Founder')).toBeInTheDocument();
  });

  it('shows Pro for pro tier', () => {
    render(<FoundingPassBadge tier="pro" />);
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  it('defaults to Free for undefined', () => {
    render(<FoundingPassBadge tier={undefined} />);
    expect(screen.getByText('Free')).toBeInTheDocument();
  });
});
