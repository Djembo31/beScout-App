import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { InstallPrompt } from '../InstallPrompt';

vi.mock('lucide-react', () => ({
  Download: () => <span data-testid="download-icon" />,
  X: () => <span data-testid="x-icon" />,
}));

describe('InstallPrompt', () => {
  beforeEach(() => {
    // Clear localStorage
    try { localStorage.clear(); } catch { /* jsdom */ }
    // Mock matchMedia for standalone check
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
  });

  it('renders nothing by default (no beforeinstallprompt fired)', () => {
    const { container } = renderWithProviders(<InstallPrompt />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when in standalone mode', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    const { container } = renderWithProviders(<InstallPrompt />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when previously dismissed', () => {
    localStorage.setItem('bescout-install-dismissed', '1');
    const { container } = renderWithProviders(<InstallPrompt />);
    expect(container.innerHTML).toBe('');
  });
});
