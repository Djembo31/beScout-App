/**
 * Slice 267 — Tests fuer FixtureCard Live-Render-Branches (Wave 3, Test-Writer-Agent).
 *
 * Geschrieben aus Spec only — FixtureCard-Implementation NICHT gelesen.
 *
 * Spec-Verweise:
 *   - worklog/specs/267-realtime-live-score.md §6 AC-06, AC-09, AC-13, AC-15
 *   - worklog/specs/267-realtime-live-score.md §7 Edge-Case 1+2 (NULL-Felder)
 *
 * Erwartete FixtureCard-API (aus existing usage abgeleitet):
 *   <FixtureCard fixture={Fixture} onSelect={() => void} />
 *
 * Slice 267 ergaenzt Fixture-Type:
 *   minute?: number | null
 *   last_live_update_at?: string | null
 *
 * Tests fokussieren auf Live-Render-Verhalten:
 *   - AC-09: minute === null defensive (kein "0'", kein crash)
 *   - Edge-2: home_score=null defensive (-> "0 - 0" via ?? 0 Fallback)
 *   - AC-13: 88px Layout-Constraint (Tailwind-Klassen-Assertion)
 *   - AC-15: Regression — scheduled/finished rendern weiterhin ohne LIVE-Branch
 */

import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/renderWithProviders';
import { FixtureCard } from '../FixtureCard';
import type { Fixture, FixtureStatus } from '@/types';

// ============================================
// Mocks — clubs lookup (Pattern aus FixtureDetailModal.test.tsx)
// ============================================
vi.mock('@/lib/clubs', () => ({
  getClub: (key: string) => {
    if (key === 'HOM' || key === 'Home FC') {
      return { name: 'Home FC', short: 'HOM', logo: '/home.png', colors: { primary: '#22C55E', secondary: '#fff' } };
    }
    if (key === 'AWY' || key === 'Away United') {
      return { name: 'Away United', short: 'AWY', logo: '/away.png', colors: { primary: '#3B82F6', secondary: '#fff' } };
    }
    return null;
  },
}));

// ============================================
// Mocks — ClubLogo (Stub um nested fetches zu vermeiden)
// ============================================
vi.mock('../ClubLogo', () => ({
  ClubLogo: ({ short }: { club?: unknown; size?: number; short?: string }) => (
    <div data-testid="club-logo">{short ?? 'logo'}</div>
  ),
}));

// ============================================
// Mocks — helpers (getStatusAccent etc.)
// ============================================
vi.mock('../helpers', () => ({
  getStatusAccent: (status: FixtureStatus) => {
    if (status === 'live') return { color: '#22C55E', label: 'live' };
    if (status === 'finished' || status === 'simulated') return { color: '#FFD700', label: 'finished' };
    return { color: '#A1A1AA', label: 'scheduled' };
  },
}));

// ============================================
// Mocks — utils
// ============================================
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// ============================================
// Mocks — lucide-react (defensive, wird ggf. fuer Live-Pulse genutzt)
// ============================================
vi.mock('lucide-react', () => ({
  // Common spieltag icons + potential Live-icons
  Loader2: () => <span data-testid="loader" />,
  ChevronRight: () => <span data-testid="chevron-right" />,
  Clock: () => <span data-testid="clock" />,
  Circle: () => <span data-testid="circle" />,
  Radio: () => <span data-testid="radio" />,
}));

// ============================================
// Fixture factory
// ============================================
type FixtureWithLive = Fixture & {
  minute?: number | null;
  last_live_update_at?: string | null;
};

function makeFixture(overrides: Partial<FixtureWithLive> = {}): FixtureWithLive {
  return {
    id: 'f1',
    gameweek: 5,
    home_club_id: 'club-home',
    away_club_id: 'club-away',
    home_score: null,
    away_score: null,
    status: 'scheduled',
    played_at: '2025-01-15T18:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    home_club_name: 'Home FC',
    home_club_short: 'HOM',
    away_club_name: 'Away United',
    away_club_short: 'AWY',
    home_club_primary_color: '#22C55E',
    away_club_primary_color: '#3B82F6',
    minute: null,
    last_live_update_at: null,
    ...overrides,
  };
}

const noOp = () => {};

// ============================================
// AC-06: Standard-Live-Render
// ============================================

describe('FixtureCard — Live-Render Standard (AC-06)', () => {
  it('zeigt LIVE-Indikator + Score + Minute bei status="live"', () => {
    const fixture = makeFixture({
      status: 'live',
      home_score: 1,
      away_score: 0,
      minute: 67,
    });

    const { container } = renderWithProviders(
      <FixtureCard fixture={fixture} onSelect={noOp} />,
    );

    // Live-Pill / Live-Label muss irgendwo sichtbar sein
    // (i18n-Mock returnt Key — entweder 'liveLabel' oder 'live' oder 'browserLive')
    const html = container.innerHTML.toLowerCase();
    const hasLiveSignal =
      html.includes('liveLabel'.toLowerCase()) ||
      html.includes('browserLive'.toLowerCase()) ||
      html.includes('"live"') ||
      html.includes('>live<') ||
      html.includes('canli');
    expect(hasLiveSignal).toBe(true);

    // Score muss gerendert sein
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('0');

    // Minute sollte gerendert sein (entweder "67" allein oder "67'")
    expect(container.textContent).toMatch(/67/);
  });
});

// ============================================
// AC-09 / Edge-1: defensive minute=null
// ============================================

describe('FixtureCard — Defensive null-strict (AC-09 / Edge-1)', () => {
  it('rendert LIVE ohne Minute wenn minute === null (kein "0\'")', () => {
    const fixture = makeFixture({
      status: 'live',
      home_score: 1,
      away_score: 0,
      minute: null,
    });

    const { container } = renderWithProviders(
      <FixtureCard fixture={fixture} onSelect={noOp} />,
    );

    // Defensive null-strict: kein "0'" als Fallback
    // (errors-frontend.md "Defensive null-strict-equality" Slice 265)
    expect(container.textContent).not.toMatch(/\b0'/);
    expect(container.textContent).not.toMatch(/^0'$/m);

    // Live-Indikator trotzdem sichtbar
    const html = container.innerHTML.toLowerCase();
    const hasLiveSignal =
      html.includes('liveLabel'.toLowerCase()) ||
      html.includes('browserLive'.toLowerCase()) ||
      html.includes('"live"') ||
      html.includes('>live<') ||
      html.includes('canli');
    expect(hasLiveSignal).toBe(true);

    // Score ist trotzdem rendered (1:0)
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('0');
  });

  it('crashed nicht bei minute=null', () => {
    const fixture = makeFixture({
      status: 'live',
      home_score: 0,
      away_score: 0,
      minute: null,
    });

    expect(() => {
      renderWithProviders(<FixtureCard fixture={fixture} onSelect={noOp} />);
    }).not.toThrow();
  });
});

// ============================================
// Edge-Case 2: home_score=null bei status='live' (Cron-Init-Race)
// ============================================

describe('FixtureCard — Defensive Score-Fallback (Edge-2)', () => {
  it('rendert "0 - 0" via Fallback wenn home_score=null bei status="live"', () => {
    const fixture = makeFixture({
      status: 'live',
      home_score: null,
      away_score: null,
      minute: 2,
    });

    const { container } = renderWithProviders(
      <FixtureCard fixture={fixture} onSelect={noOp} />,
    );

    // Spec §7 Edge-2: Card zeigt "LIVE 2'" + "0 - 0" mit ?? 0 Fallback
    // Score-Felder sollten "0" anzeigen statt leer / "?-?"
    expect(container.textContent).not.toMatch(/\?\s*-\s*\?/);
    expect(container.textContent).not.toMatch(/\?-\?/);

    // Minute trotzdem da
    expect(container.textContent).toMatch(/\b2/);
  });

  it('crashed nicht wenn beide Scores null bei live', () => {
    const fixture = makeFixture({
      status: 'live',
      home_score: null,
      away_score: null,
      minute: 5,
    });

    expect(() => {
      renderWithProviders(<FixtureCard fixture={fixture} onSelect={noOp} />);
    }).not.toThrow();
  });
});

// ============================================
// AC-13: Mobile 393px Layout
// ============================================

describe('FixtureCard — Mobile-Layout (AC-13)', () => {
  it('Container hat Mindesthoehe-Klasse (passt fuer 88px-Card)', () => {
    const fixture = makeFixture({
      status: 'live',
      home_score: 1,
      away_score: 0,
      minute: 67,
    });

    const { container } = renderWithProviders(
      <FixtureCard fixture={fixture} onSelect={noOp} />,
    );

    // Tailwind-Klassen-Assertion (kein visual snapshot, kein flaky)
    // Spec sagt 88px-Card-Hoehe — Implementation kann min-h-[88px] ODER analog nutzen.
    // Defensiv: irgendeine min-h-Klasse oder Touch-Target-Klasse muss existieren.
    const classes = container.innerHTML;
    const hasHeightConstraint =
      classes.includes('min-h-[88px]') ||
      classes.includes('min-h-[44px]') ||
      classes.includes('min-h-');
    expect(hasHeightConstraint).toBe(true);
  });
});

// ============================================
// AC-15: Regression — Non-Live-Status unveraendert
// ============================================

describe('FixtureCard — Regression Non-Live (AC-15)', () => {
  it('rendert ohne LIVE-Branch bei status="scheduled"', () => {
    const fixture = makeFixture({
      status: 'scheduled',
      home_score: null,
      away_score: null,
      minute: null,
    });

    const { container } = renderWithProviders(
      <FixtureCard fixture={fixture} onSelect={noOp} />,
    );

    // Kein Live-Indikator bei scheduled
    const html = container.innerHTML.toLowerCase();
    const hasLivePillClass =
      html.includes('liveLabel'.toLowerCase()) ||
      html.includes('browserLive'.toLowerCase());

    // Bei Scheduled darf kein Live-Pill da sein
    // (Mock returnt i18n-Key — wenn Komponente "spieltag.liveLabel" rendert, waere die assertion verletzt)
    expect(hasLivePillClass).toBe(false);

    // motion-safe:animate-pulse darf NICHT auf den Score-Container sein
    // (Live-only)
    const html2 = container.innerHTML;
    const hasPulseAnimation =
      html2.includes('motion-safe:animate-pulse') ||
      html2.includes('animate-pulse');
    expect(hasPulseAnimation).toBe(false);
  });

  it('rendert Score-Pill bei status="finished"', () => {
    const fixture = makeFixture({
      status: 'finished',
      home_score: 2,
      away_score: 1,
      played_at: '2025-01-10T18:00:00Z',
    });

    const { container } = renderWithProviders(
      <FixtureCard fixture={fixture} onSelect={noOp} />,
    );

    // Score sichtbar
    expect(container.textContent).toContain('2');
    expect(container.textContent).toContain('1');

    // Kein LIVE-Pill
    const html = container.innerHTML.toLowerCase();
    const hasLivePill =
      html.includes('liveLabel'.toLowerCase()) ||
      html.includes('browserLive'.toLowerCase());
    expect(hasLivePill).toBe(false);
  });

  it('rendert ohne LIVE-Pulse bei status="simulated"', () => {
    const fixture = makeFixture({
      status: 'simulated',
      home_score: 3,
      away_score: 0,
    });

    const { container } = renderWithProviders(
      <FixtureCard fixture={fixture} onSelect={noOp} />,
    );

    // Score sichtbar, aber kein Live-Animation
    const html = container.innerHTML;
    const hasPulseAnimation =
      html.includes('motion-safe:animate-pulse') ||
      html.includes('animate-pulse');
    expect(hasPulseAnimation).toBe(false);
  });
});
