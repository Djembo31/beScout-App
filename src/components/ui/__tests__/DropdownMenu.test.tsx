/**
 * Slice 181 — DropdownMenu wrapper tests.
 *
 * NOTE: useIsMobile relies on window.matchMedia. jsdom polyfill is set up
 * via render-context — wir nutzen hier `forceVariant="desktop"` um den
 * matchMedia-Pfad fuer Tests zu deterministischen Werten zu zwingen.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { createRadixDropdownMenuMock } from '@/test-utils/radix-mocks';

vi.mock('@radix-ui/react-dropdown-menu', () => createRadixDropdownMenuMock());

import { DropdownMenu } from '../DropdownMenu';

beforeAll(() => {
  // jsdom does not implement matchMedia. Stub it so useIsMobile doesn't crash.
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }
});

describe('DropdownMenu (Slice 181 Radix wrapper)', () => {
  it('renders Trigger but NOT content initially (closed)', () => {
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
        <DropdownMenu.Content forceVariant="desktop">
          <DropdownMenu.Item>One</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.queryByText('One')).not.toBeInTheDocument();
  });

  it('opens content after Trigger click and renders items', () => {
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
        <DropdownMenu.Content forceVariant="desktop">
          <DropdownMenu.Label>Aktionen</DropdownMenu.Label>
          <DropdownMenu.Item>Bearbeiten</DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item variant="danger">Loeschen</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    fireEvent.click(screen.getByText('Open'));

    expect(screen.getByText('Aktionen')).toBeInTheDocument();
    expect(screen.getByText('Bearbeiten')).toBeInTheDocument();
    expect(screen.getByText('Loeschen')).toBeInTheDocument();
  });

  it('Item onSelect callback fires on click', () => {
    const onSelect = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
        <DropdownMenu.Content forceVariant="desktop">
          <DropdownMenu.Item onSelect={onSelect}>Klick mich</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    fireEvent.click(screen.getByText('Open'));
    fireEvent.click(screen.getByText('Klick mich'));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('controlled open prop overrides internal state', () => {
    render(
      <DropdownMenu open={true}>
        <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
        <DropdownMenu.Content forceVariant="desktop">
          <DropdownMenu.Item>Visible</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    // open prop = true so content rendered immediately, no click needed
    expect(screen.getByText('Visible')).toBeInTheDocument();
  });

  it('disabled item does not fire onSelect', () => {
    const onSelect = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
        <DropdownMenu.Content forceVariant="desktop">
          <DropdownMenu.Item onSelect={onSelect} disabled>
            Disabled
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    fireEvent.click(screen.getByText('Open'));
    fireEvent.click(screen.getByText('Disabled'));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('mobile variant renders bottom-sheet swipe-handle when forceVariant=mobile', () => {
    render(
      <DropdownMenu open={true}>
        <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
        <DropdownMenu.Content forceVariant="mobile">
          <DropdownMenu.Item>Mobile Item</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    expect(screen.getByText('Mobile Item')).toBeInTheDocument();
    const content = screen.getByTestId('radix-menu-content');
    // Mobile variant uses anim-bottom-sheet class
    expect(content.className).toContain('anim-bottom-sheet');
  });
});
