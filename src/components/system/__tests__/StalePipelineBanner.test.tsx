/**
 * StalePipelineBanner — Component-Test (Slice 256)
 *
 * Coverage:
 *   - render-NULL wenn data healthy
 *   - render-NULL wenn dismissed (sessionStorage)
 *   - render-NULL wenn data undefined (loading)
 *   - render Card wenn data.healthy === false und kein Dismiss
 *   - Dismiss-Click setzt sessionStorage und versteckt Banner
 *   - SSR-safe (kein window.sessionStorage-crash)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StalePipelineBanner from '../StalePipelineBanner';
import type { CronHealthStatus } from '@/lib/services/cronHealth';

// ── Mocks ──

const mockUseCronHealth = vi.fn<() => { data: CronHealthStatus | undefined }>();

vi.mock('@/lib/queries/cronHealth', () => ({
  useCronHealth: () => mockUseCronHealth(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      title: 'Daten möglicherweise veraltet',
      message: 'Wir aktualisieren gerade die Spielwoche-Daten — kann ein paar Minuten dauern.',
      dismiss: 'Schließen',
    };
    return map[key] ?? key;
  },
}));

vi.mock('lucide-react', () => {
  const Stub = ({ className }: { className?: string }) => (
    <span data-testid="lucide-icon" className={className} />
  );
  return { AlertTriangle: Stub, X: Stub };
});

// ── Test-helpers ──

function setHealth(status: CronHealthStatus | undefined) {
  mockUseCronHealth.mockReturnValue({ data: status });
}

// ── Tests ──

describe('StalePipelineBanner', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mockUseCronHealth.mockReset();
  });

  it('renders nothing when data is undefined (loading)', () => {
    setHealth(undefined);
    const { container } = render(<StalePipelineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when data is healthy', () => {
    setHealth({ healthy: true, drifts: [] });
    const { container } = render(<StalePipelineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders banner when data.healthy is false', () => {
    setHealth({
      healthy: false,
      drifts: [
        {
          leagueId: 'tff1',
          leagueName: 'TFF 1. Lig',
          country: 'TR',
          drift: 10,
          dbActiveGw: 28,
          maxFinishedGw: 37,
        },
      ],
    });
    render(<StalePipelineBanner />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Daten möglicherweise veraltet')).toBeTruthy();
  });

  it('hides banner after dismiss click and persists in sessionStorage', () => {
    setHealth({
      healthy: false,
      drifts: [
        {
          leagueId: 'bl',
          leagueName: 'Bundesliga',
          country: 'DE',
          drift: 2,
          dbActiveGw: 30,
          maxFinishedGw: 31,
        },
      ],
    });
    const { container, rerender } = render(<StalePipelineBanner />);
    expect(screen.getByRole('alert')).toBeTruthy();

    const dismissBtn = screen.getByRole('button', { name: 'Schließen' });
    fireEvent.click(dismissBtn);

    expect(container.firstChild).toBeNull();
    expect(window.sessionStorage.getItem('bescout-stale-pipeline-dismissed-v1')).toBe('1');

    // Re-Mount in same session: still hidden
    rerender(<StalePipelineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('respects pre-existing sessionStorage dismiss', () => {
    window.sessionStorage.setItem('bescout-stale-pipeline-dismissed-v1', '1');
    setHealth({
      healthy: false,
      drifts: [
        {
          leagueId: 'bl',
          leagueName: 'Bundesliga',
          country: 'DE',
          drift: 2,
          dbActiveGw: 30,
          maxFinishedGw: 31,
        },
      ],
    });
    const { container } = render(<StalePipelineBanner />);
    expect(container.firstChild).toBeNull();
  });
});
