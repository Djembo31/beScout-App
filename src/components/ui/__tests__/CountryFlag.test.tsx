import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CountryFlag from '../CountryFlag';

vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));

// Mock country-flag-icons
vi.mock('country-flag-icons/react/3x2', () => ({
  DE: (props: Record<string, unknown>) => <svg data-testid="flag-de" {...props} />,
  TR: (props: Record<string, unknown>) => <svg data-testid="flag-tr" {...props} />,
}));
vi.mock('country-flag-icons', () => ({
  hasFlag: (code: string) => ['DE', 'TR'].includes(code),
}));

describe('CountryFlag', () => {
  it('renders SVG flag for known country', () => {
    render(<CountryFlag code="DE" />);
    expect(screen.getByTestId('flag-de')).toBeInTheDocument();
  });

  it('renders SVG flag for TR', () => {
    render(<CountryFlag code="TR" />);
    expect(screen.getByTestId('flag-tr')).toBeInTheDocument();
  });

  it('renders text fallback for unknown country', () => {
    render(<CountryFlag code="XX" />);
    expect(screen.getByText('XX')).toBeInTheDocument();
  });

  it('handles lowercase input', () => {
    render(<CountryFlag code="de" />);
    expect(screen.getByTestId('flag-de')).toBeInTheDocument();
  });

  it('renders text fallback for empty code', () => {
    render(<CountryFlag code="" />);
    // Empty string should show fallback
    const { container } = render(<CountryFlag code="" />);
    expect(container.querySelector('span')).toBeInTheDocument();
  });

  it('applies custom size', () => {
    render(<CountryFlag code="DE" size={24} />);
    const flag = screen.getByTestId('flag-de');
    expect(flag.style.height).toBe('24px');
    expect(flag.style.width).toBe('36px'); // 24 * 1.5
  });
});
