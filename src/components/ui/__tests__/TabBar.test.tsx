import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabBar, TabPanel } from '../TabBar';

vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' '),
}));

describe('TabBar', () => {
  const tabs = [
    { id: 'a', label: 'Tab A' },
    { id: 'b', label: 'Tab B' },
    { id: 'c', label: 'Tab C' },
  ];

  it('renders all tabs', () => {
    render(<TabBar tabs={tabs} activeTab="a" onChange={vi.fn()} />);
    expect(screen.getByText('Tab A')).toBeInTheDocument();
    expect(screen.getByText('Tab B')).toBeInTheDocument();
    expect(screen.getByText('Tab C')).toBeInTheDocument();
  });

  it('marks active tab with aria-selected', () => {
    render(<TabBar tabs={tabs} activeTab="b" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Tab B' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Tab A' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange when tab is clicked', () => {
    const onChange = vi.fn();
    render(<TabBar tabs={tabs} activeTab="a" onChange={onChange} />);
    fireEvent.click(screen.getByText('Tab C'));
    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('renders tablist role', () => {
    render(<TabBar tabs={tabs} activeTab="a" onChange={vi.fn()} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('renders shortLabel on mobile view', () => {
    const tabsWithShort = [
      { id: 'x', label: 'Gameweeks', shortLabel: 'GW' },
    ];
    render(<TabBar tabs={tabsWithShort} activeTab="x" onChange={vi.fn()} />);
    expect(screen.getByText('GW')).toBeInTheDocument();
    expect(screen.getByText('Gameweeks')).toBeInTheDocument();
  });

  it('applies custom accentColor on active tab', () => {
    render(<TabBar tabs={[{ id: 't', label: 'Test' }]} activeTab="t" onChange={vi.fn()} accentColor="#006633" />);
    const tab = screen.getByRole('tab');
    // jsdom normalizes hex to rgb
    expect(tab.style.color).toBe('rgb(0, 102, 51)');
  });
});

describe('TabPanel', () => {
  it('renders children when active', () => {
    render(<TabPanel id="a" activeTab="a"><div>Content A</div></TabPanel>);
    expect(screen.getByText('Content A')).toBeInTheDocument();
  });

  it('renders nothing when not active', () => {
    const { container } = render(<TabPanel id="a" activeTab="b"><div>Content A</div></TabPanel>);
    expect(container.innerHTML).toBe('');
  });

  it('has correct aria attributes', () => {
    render(<TabPanel id="test" activeTab="test"><div>Content</div></TabPanel>);
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('id', 'tabpanel-test');
    expect(panel).toHaveAttribute('aria-labelledby', 'tab-test');
  });
});
