/**
 * Slice 181 — AlertDialog wrapper tests.
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { createRadixAlertDialogMock } from '@/test-utils/radix-mocks';

vi.mock('@radix-ui/react-alert-dialog', () => createRadixAlertDialogMock());
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
// AlertDialog imports Button from `./index`, which transitively pulls in
// LeagueBarShared -> leagues.ts -> supabaseClient. Stub the env-bound client
// so jsdom-tests don't need NEXT_PUBLIC_SUPABASE_*.
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: () => ({ select: () => ({ data: null, error: null }) }),
    auth: { getUser: () => Promise.resolve({ data: { user: null }, error: null }) },
  },
}));

import { AlertDialog } from '../AlertDialog';

describe('AlertDialog (Slice 181 Radix wrapper)', () => {
  it('renders title + message + buttons when open', () => {
    render(
      <AlertDialog
        open={true}
        title="Verlassen?"
        message="Bist du sicher?"
        confirmLabel="Verlassen"
        cancelLabel="Abbrechen"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('Verlassen?')).toBeInTheDocument();
    expect(screen.getByText('Bist du sicher?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verlassen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeInTheDocument();
  });

  it('renders nothing when open=false', () => {
    render(
      <AlertDialog
        open={false}
        title="Hidden"
        message="x"
        confirmLabel="C"
        cancelLabel="X"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('calls onConfirm on confirm-button click', () => {
    const onConfirm = vi.fn();
    render(
      <AlertDialog
        open={true}
        title="T"
        message="M"
        confirmLabel="OK"
        cancelLabel="Cancel"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel on cancel-button click', () => {
    const onCancel = vi.fn();
    render(
      <AlertDialog
        open={true}
        title="T"
        message="M"
        confirmLabel="OK"
        cancelLabel="Cancel"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables both buttons when confirming=true', () => {
    render(
      <AlertDialog
        open={true}
        title="T"
        message="M"
        confirmLabel="OK"
        cancelLabel="Cancel"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        confirming={true}
      />,
    );

    const confirmBtn = screen.getByRole('button', { name: 'OK' }) as HTMLButtonElement;
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
    expect(cancelBtn.disabled).toBe(true);
  });

  it('confirmVariant=danger applies danger button class', () => {
    render(
      <AlertDialog
        open={true}
        title="T"
        message="M"
        confirmLabel="Loeschen"
        cancelLabel="Cancel"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        confirmVariant="danger"
      />,
    );

    const confirmBtn = screen.getByRole('button', { name: 'Loeschen' });
    // danger variant -> red bg classes
    expect(confirmBtn.className).toMatch(/bg-red/);
  });
});
