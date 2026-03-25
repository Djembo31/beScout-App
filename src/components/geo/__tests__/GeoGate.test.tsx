import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GeoGate } from '../GeoGate';

vi.mock('lucide-react', () => ({
  Loader2: () => <span data-testid="loader" />,
  ShieldOff: () => <span data-testid="shield-off" />,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

const mockUseRegionGuard = vi.fn();
vi.mock('@/lib/useRegionGuard', () => ({
  useRegionGuard: () => mockUseRegionGuard(),
}));

describe('GeoGate', () => {
  it('renders children when feature is allowed', () => {
    mockUseRegionGuard.mockReturnValue({ allowed: true, geofencingEnabled: true, isHydrated: true });
    render(<GeoGate feature="dpc_trading"><div data-testid="content">Trading</div></GeoGate>);
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('renders children when geofencing is disabled', () => {
    mockUseRegionGuard.mockReturnValue({ allowed: false, geofencingEnabled: false, isHydrated: true });
    render(<GeoGate feature="dpc_trading"><div data-testid="content">Trading</div></GeoGate>);
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('shows loader during hydration', () => {
    mockUseRegionGuard.mockReturnValue({ allowed: false, geofencingEnabled: true, isHydrated: false });
    render(<GeoGate feature="dpc_trading"><div>Trading</div></GeoGate>);
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('shows restriction message when blocked', () => {
    mockUseRegionGuard.mockReturnValue({ allowed: false, geofencingEnabled: true, isHydrated: true });
    render(<GeoGate feature="dpc_trading"><div>Trading</div></GeoGate>);
    expect(screen.getByText('featureRestricted')).toBeInTheDocument();
    expect(screen.getByTestId('shield-off')).toBeInTheDocument();
  });

  it('does not render children when blocked', () => {
    mockUseRegionGuard.mockReturnValue({ allowed: false, geofencingEnabled: true, isHydrated: true });
    render(<GeoGate feature="dpc_trading"><div data-testid="content">Trading</div></GeoGate>);
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });
});
