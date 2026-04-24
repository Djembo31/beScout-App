'use client';

/**
 * Slice 181 — Radix-AlertDialog Wrapper.
 *
 * Drop-in replacement fuer den ConfirmDialog (`./ConfirmDialog.tsx`). Identische
 * Props (`open`, `title`, `message`, `confirmLabel`, `cancelLabel`, `onConfirm`,
 * `onCancel`, `confirmVariant`, `confirming`).
 *
 * Unterschied zu Dialog: AlertDialog hat keinen Backdrop-Click-Close (Radix
 * default — destructive flows muessen explizit Cancel oder Confirm). ESC
 * funktioniert default, wird via `confirming` blockiert (analog `preventClose`).
 *
 * Anti-Pattern (vermeiden): native window.confirm() — siehe errors-frontend.md
 * "ConfirmDialog statt native alert/confirm".
 */

import React from 'react';
import * as RadixAlert from '@radix-ui/react-alert-dialog';
import { Button } from './index';
import { cn } from '@/lib/utils';

export interface AlertDialogProps {
  /** Whether the dialog is visible */
  open: boolean;
  /** Dialog title — short, action-oriented (e.g. "Event verlassen?") */
  title: string;
  /** Main confirmation message shown to the user */
  message: string;
  /** Label for the confirm button (default variant: gold) */
  confirmLabel: string;
  /** Label for the cancel button (default variant: outline) */
  cancelLabel: string;
  /** Called on confirm — invoker handles async state + closes on completion */
  onConfirm: () => void | Promise<void>;
  /** Called on cancel or ESC close (NOT called when `confirming` is true) */
  onCancel: () => void;
  /** Confirm button variant — use "danger" for destructive actions */
  confirmVariant?: 'gold' | 'danger';
  /** Disable confirm button + block ESC (e.g. during pending mutation) */
  confirming?: boolean;
}

export function AlertDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  confirmVariant = 'gold',
  confirming = false,
}: AlertDialogProps) {
  function handleOpenChange(nextOpen: boolean) {
    if (confirming) return;
    if (!nextOpen) onCancel();
  }

  // Action-Click ist async-safe: wir lassen onConfirm async werden, der
  // Caller toggles `confirming` extern. Radix-Action ruft default close —
  // das wollen wir NICHT bei confirming, daher Custom-Button statt
  // RadixAlert.Action ohne `asChild` — Cancel via RadixAlert.Cancel beibehalten.
  return (
    <RadixAlert.Root open={open} onOpenChange={handleOpenChange}>
      <RadixAlert.Portal>
        <RadixAlert.Overlay
          className={cn(
            'fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm',
            'data-[state=open]:anim-fade',
          )}
        />
        <RadixAlert.Content
          onEscapeKeyDown={(e) => {
            if (confirming) e.preventDefault();
          }}
          className={cn(
            'fixed inset-x-0 bottom-0 z-[81] flex flex-col',
            'bg-surface-modal border border-white/[0.12] shadow-card-lg overflow-hidden',
            'rounded-t-3xl max-h-[90vh] md:bottom-auto md:top-1/2 md:left-1/2 md:right-auto md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:mx-4 md:max-h-[85vh]',
            'data-[state=open]:anim-bottom-sheet md:data-[state=open]:anim-modal',
            'w-full md:max-w-sm',
          )}
        >
          {/* Swipe handle — mobile only */}
          <div className="flex justify-center pt-2 pb-1 md:hidden flex-shrink-0">
            <div className="w-10 h-1 bg-white/20 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-4 py-3 md:p-5 border-b border-white/10 flex-shrink-0">
            <RadixAlert.Title className="text-base md:text-lg font-black truncate">
              {title}
            </RadixAlert.Title>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 md:p-5">
            <RadixAlert.Description asChild>
              <p className="text-sm text-white/80 leading-relaxed">{message}</p>
            </RadixAlert.Description>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-divider bg-[#0b0b0b] px-4 py-3 safe-bottom md:px-5 md:py-4">
            <div className="flex items-center gap-3">
              <RadixAlert.Cancel asChild>
                <Button
                  variant="outline"
                  onClick={onCancel}
                  disabled={confirming}
                  className="flex-1"
                >
                  {cancelLabel}
                </Button>
              </RadixAlert.Cancel>
              {/*
                Bewusst KEIN RadixAlert.Action — Action triggered impliziten
                Close. Wir wollen Close erst nach successful onConfirm
                (controlled durch Caller via `open`-Prop-Change).
              */}
              <Button
                variant={confirmVariant}
                onClick={onConfirm}
                loading={confirming}
                disabled={confirming}
                className="flex-1"
              >
                {confirmLabel}
              </Button>
            </div>
          </div>
        </RadixAlert.Content>
      </RadixAlert.Portal>
    </RadixAlert.Root>
  );
}
