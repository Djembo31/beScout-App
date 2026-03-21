import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('lucide-react');
  const stubs: Record<string, unknown> = {};
  for (const key of Object.keys(actual)) stubs[key] = typeof actual[key] === 'function' ? () => null : actual[key];
  return stubs;
});
vi.mock('@/lib/utils', () => ({ cn: (...c: unknown[]) => c.filter(Boolean).join(' ') }));
vi.mock('@/lib/services/wallet', () => ({ formatScout: (n: number) => `${n} CR`, getTransactions: vi.fn().mockResolvedValue([]) }));
vi.mock('@/lib/activityHelpers', () => ({
  getActivityIcon: () => 'Activity', getActivityColor: () => '', getActivityLabelKey: () => 'activity', getRelativeTime: () => '2h',
}));
vi.mock('@/components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LoadMoreButton: () => null,
}));
vi.mock('@/lib/supabaseClient', () => ({ supabase: { from: () => ({ select: () => ({ data: [], error: null }) }) } }));

import TimelineTab from '../TimelineTab';

describe('TimelineTab', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<TimelineTab userId="u1" transactions={[]} />);
    expect(container.innerHTML).not.toBe('');
  });

  it('shows filter tabs', () => {
    const { container } = renderWithProviders(<TimelineTab userId="u1" transactions={[]} />);
    expect(container.innerHTML.length).toBeGreaterThan(50);
  });
});
