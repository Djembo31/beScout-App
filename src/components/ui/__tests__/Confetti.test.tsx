import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Confetti } from '../Confetti';

vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));

describe('Confetti', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('renders nothing when inactive', () => {
    const { container } = render(<Confetti active={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders particles when active', () => {
    const { container } = render(<Confetti active={true} />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('renders 24 particles', () => {
    const { container } = render(<Confetti active={true} />);
    const particles = container.querySelectorAll('.absolute');
    expect(particles.length).toBe(24);
  });

  it('disappears after 3 seconds', () => {
    const { container } = render(<Confetti active={true} />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(3100); });
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();
  });

  it('is pointer-events-none', () => {
    const { container } = render(<Confetti active={true} />);
    const overlay = container.firstElementChild;
    expect(overlay?.className).toContain('pointer-events-none');
  });
});
