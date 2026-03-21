import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CookieConsent } from '../CookieConsent';

vi.mock('next-intl', () => {
  const t = (key: string) => key;
  t.rich = (key: string) => key;
  return {
    useTranslations: () => t,
    useLocale: () => 'de',
  };
});
vi.mock('@/components/ui', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

describe('CookieConsent', () => {
  beforeEach(() => {
    try { localStorage.clear(); } catch { /* jsdom */ }
  });

  it('shows banner when no consent stored', () => {
    render(<CookieConsent />);
    expect(screen.getByText('cookieAccept')).toBeInTheDocument();
    expect(screen.getByText('cookieEssential')).toBeInTheDocument();
  });

  it('hides banner when consent already stored', () => {
    localStorage.setItem('bescout-cookie-consent', 'accepted');
    const { container } = render(<CookieConsent />);
    expect(container.innerHTML).toBe('');
  });

  it('stores "accepted" and hides on accept click', () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByText('cookieAccept'));
    expect(localStorage.getItem('bescout-cookie-consent')).toBe('accepted');
  });

  it('stores "essential" on essential-only click', () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByText('cookieEssential'));
    expect(localStorage.getItem('bescout-cookie-consent')).toBe('essential');
  });
});
