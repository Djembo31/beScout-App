import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import NotificationDropdown from '@/components/layout/NotificationDropdown';

// Real lucide-react + cn render fine in jsdom (SVG components) — mocking them
// via `new Proxy` crashed suite-load. Only the heavy child/service is mocked.
vi.mock('@/components/layout/NotificationPreferencesPanel', () => ({
  default: () => null,
}));
vi.mock('@/lib/services/players', () => ({
  getPlayerById: vi.fn(() => Promise.resolve(null)),
}));

// Slice 300 (S5): replaced the no-op false-green placeholder with a real
// render smoke. The component portals into document.body (set via useEffect) and
// mounts on `open` — both work in jsdom. next-intl is mocked to echo keys, so the
// empty-state copy renders as the raw key `noNew`.
const baseProps = {
  userId: 'user-1',
  onClose: vi.fn(),
  notifications: [],
  loading: false,
  onMarkRead: vi.fn(),
  onMarkAllRead: vi.fn(),
};

describe('NotificationDropdown', () => {
  it('renders the dialog with empty-state when open', async () => {
    renderWithProviders(<NotificationDropdown {...baseProps} open />);
    // Desktop + mobile both render role="dialog" (aria-label = tn('title')).
    const dialogs = await screen.findAllByRole('dialog');
    expect(dialogs.length).toBeGreaterThan(0);
    // Empty notifications → noNew empty-state copy (mocked t echoes the key).
    expect(screen.getAllByText('noNew').length).toBeGreaterThan(0);
  });

  it('renders nothing when closed (mounted=false guard)', () => {
    renderWithProviders(<NotificationDropdown {...baseProps} open={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
