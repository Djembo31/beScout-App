import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('lucide-react', () => ({
  Clock: () => <span data-testid="clock-icon" />,
}));
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' '),
}));

import { Countdown } from '../Countdown';

describe('Countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when target date is in the past', () => {
    const past = new Date(Date.now() - 10000).toISOString();
    const { container } = render(<Countdown targetDate={past} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders days+hours for > 1 day', () => {
    const future = new Date(Date.now() + 2 * 86400000 + 3 * 3600000).toISOString();
    render(<Countdown targetDate={future} />);
    expect(screen.getByText('2d 3h')).toBeInTheDocument();
  });

  it('renders hours+minutes for > 1 hour', () => {
    const future = new Date(Date.now() + 5 * 3600000 + 30 * 60000).toISOString();
    render(<Countdown targetDate={future} />);
    expect(screen.getByText('5h 30m')).toBeInTheDocument();
  });

  it('renders minutes+seconds for < 1 hour', () => {
    const future = new Date(Date.now() + 15 * 60000 + 30000).toISOString();
    render(<Countdown targetDate={future} />);
    expect(screen.getByText('15m 30s')).toBeInTheDocument();
  });

  it('calls onExpired when countdown reaches zero', () => {
    const onExpired = vi.fn();
    const future = new Date(Date.now() + 2000).toISOString();
    render(<Countdown targetDate={future} onExpired={onExpired} />);

    act(() => { vi.advanceTimersByTime(3000); });
    expect(onExpired).toHaveBeenCalled();
  });

  it('shows clock icon', () => {
    const future = new Date(Date.now() + 60000).toISOString();
    render(<Countdown targetDate={future} />);
    expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
  });
});
