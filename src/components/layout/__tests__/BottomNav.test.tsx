import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { BottomNav } from '../BottomNav';

// ============================================
// Mocks
// ============================================
vi.mock('lucide-react', () => {
  const Stub = ({ className }: { className?: string }) => <span className={className} />;
  return { Home: Stub, Trophy: Stub, Briefcase: Stub, Building2: Stub, Compass: Stub };
});

vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' '),
}));

vi.mock('@/components/providers/ClubProvider', () => ({
  useClub: () => ({ activeClub: { slug: 'sakaryaspor', name: 'Sakaryaspor' } }),
}));

// ============================================
// Tests
// ============================================
describe('BottomNav', () => {
  it('renders 5 navigation links', () => {
    renderWithProviders(<BottomNav />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBe(5);
  });

  it('renders nav element', () => {
    renderWithProviders(<BottomNav />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('links to correct paths', () => {
    renderWithProviders(<BottomNav />);
    const links = screen.getAllByRole('link');
    const hrefs = links.map(l => l.getAttribute('href'));
    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/fantasy');
    expect(hrefs).toContain('/market');
    expect(hrefs).toContain('/club/sakaryaspor');
    expect(hrefs).toContain('/community');
  });

  it('shows label text for each tab', () => {
    renderWithProviders(<BottomNav />);
    // useTranslations returns key
    expect(screen.getByText('navHome')).toBeInTheDocument();
    expect(screen.getByText('navSpieltag')).toBeInTheDocument();
    expect(screen.getByText('navMarkt')).toBeInTheDocument();
    expect(screen.getByText('navClub')).toBeInTheDocument();
    expect(screen.getByText('navCommunity')).toBeInTheDocument();
  });
});
