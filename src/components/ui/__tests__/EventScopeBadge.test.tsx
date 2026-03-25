import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventTypeBadge } from '../EventScopeBadge';

vi.mock('lucide-react', () => ({
  Globe: () => <span data-testid="globe-icon" />,
  Building2: () => <span data-testid="building-icon" />,
  Gift: () => <span data-testid="gift-icon" />,
  Star: () => <span data-testid="star-icon" />,
  UserPlus: () => <span data-testid="user-icon" />,
}));
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));

describe('EventTypeBadge', () => {
  it('renders "BeScout" for bescout type', () => {
    render(<EventTypeBadge type="bescout" />);
    expect(screen.getByLabelText('BeScout')).toBeInTheDocument();
    expect(screen.getByText('BeScout')).toBeInTheDocument();
  });

  it('renders club name for club type with clubName', () => {
    render(<EventTypeBadge type="club" clubName="Sakaryaspor" />);
    expect(screen.getByLabelText('Sakaryaspor')).toBeInTheDocument();
    expect(screen.getByText('Sakaryaspor')).toBeInTheDocument();
  });

  it('renders fallback "Club Event" for club type without clubName', () => {
    render(<EventTypeBadge type="club" />);
    expect(screen.getByText('Club Event')).toBeInTheDocument();
  });

  it('renders sponsor name for sponsor type', () => {
    render(<EventTypeBadge type="sponsor" sponsorName="Nike" />);
    expect(screen.getByText('Nike')).toBeInTheDocument();
  });

  it('renders "Special" for special type', () => {
    render(<EventTypeBadge type="special" />);
    expect(screen.getByText('Special')).toBeInTheDocument();
    expect(screen.getByTestId('star-icon')).toBeInTheDocument();
  });

  it('renders "Community" for creator type', () => {
    render(<EventTypeBadge type="creator" />);
    expect(screen.getByText('Community')).toBeInTheDocument();
    expect(screen.getByTestId('user-icon')).toBeInTheDocument();
  });

  it('renders club logo when provided', () => {
    render(<EventTypeBadge type="club" clubName="Sakaryaspor" clubLogo="/clubs/sak.png" />);
    const img = screen.getByRole('presentation');
    expect(img).toHaveAttribute('src', '/clubs/sak.png');
  });

  it('renders BeScout icon for bescout type', () => {
    render(<EventTypeBadge type="bescout" />);
    const img = screen.getByRole('presentation');
    expect(img).toHaveAttribute('src', '/icons/bescout_icon_premium.svg');
  });
});
