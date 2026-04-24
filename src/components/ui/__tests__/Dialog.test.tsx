/**
 * Slice 181 — Dialog wrapper tests.
 *
 * Strategy: mock @radix-ui/react-dialog via createRadixDialogMock helper.
 * Mocks rendern children inline + reichen Callbacks durch — kein Portal,
 * kein FocusScope (jsdom kann das nicht).
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { createRadixDialogMock } from '@/test-utils/radix-mocks';

vi.mock('@radix-ui/react-dialog', () => createRadixDialogMock());
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

import { Dialog } from '../Dialog';

describe('Dialog (Slice 181 Radix wrapper)', () => {
  it('renders title + body when open', () => {
    render(
      <Dialog open={true} title="Hello" onClose={vi.fn()}>
        <div>Body content</div>
      </Dialog>,
    );

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('does not render anything when open=false', () => {
    render(
      <Dialog open={false} title="Hidden" onClose={vi.fn()}>
        <div>Hidden body</div>
      </Dialog>,
    );

    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    expect(screen.queryByText('Hidden body')).not.toBeInTheDocument();
  });

  it('renders subtitle as Description when provided', () => {
    render(
      <Dialog open={true} title="T" subtitle="S" onClose={vi.fn()}>
        <div>x</div>
      </Dialog>,
    );

    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('renders sticky footer when provided', () => {
    render(
      <Dialog
        open={true}
        title="T"
        onClose={vi.fn()}
        footer={<button>Footer Button</button>}
      >
        <div>Body</div>
      </Dialog>,
    );

    expect(screen.getByText('Footer Button')).toBeInTheDocument();
  });

  it('calls onClose when X-Button is clicked (preventClose=false)', () => {
    const onClose = vi.fn();
    render(
      <Dialog open={true} title="T" onClose={onClose}>
        <div>x</div>
      </Dialog>,
    );

    // X-Button has aria-label="closeLabel" (mocked translation)
    const closeBtn = screen.getByLabelText('closeLabel');
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose when X-Button clicked with preventClose=true', () => {
    const onClose = vi.fn();
    render(
      <Dialog open={true} title="T" onClose={onClose} preventClose={true}>
        <div>x</div>
      </Dialog>,
    );

    const closeBtn = screen.getByLabelText('closeLabel') as HTMLButtonElement;
    expect(closeBtn.disabled).toBe(true);
    fireEvent.click(closeBtn);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('size variants apply different max-width classes', () => {
    const { rerender } = render(
      <Dialog open={true} title="T" onClose={vi.fn()} size="sm">
        <div>x</div>
      </Dialog>,
    );

    let content = screen.getByTestId('radix-dialog-content');
    expect(content.className).toContain('md:max-w-sm');

    rerender(
      <Dialog open={true} title="T" onClose={vi.fn()} size="lg">
        <div>x</div>
      </Dialog>,
    );

    content = screen.getByTestId('radix-dialog-content');
    expect(content.className).toContain('md:max-w-3xl');
  });

  it('mobileFullScreen variant uses h-dvh class', () => {
    render(
      <Dialog open={true} title="T" onClose={vi.fn()} mobileFullScreen={true}>
        <div>x</div>
      </Dialog>,
    );

    const content = screen.getByTestId('radix-dialog-content');
    expect(content.className).toContain('h-[100dvh]');
  });
});
