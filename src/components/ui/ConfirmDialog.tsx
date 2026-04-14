'use client';

import React from 'react';
import { Button, Modal } from './index';

export interface ConfirmDialogProps {
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
  /** Called on cancel or backdrop/ESC close */
  onCancel: () => void;
  /** Confirm button variant — use "danger" for destructive actions */
  confirmVariant?: 'gold' | 'danger';
  /** Disable confirm button (e.g. during pending mutation) */
  confirming?: boolean;
}

/**
 * Styled confirm dialog built on top of `Modal` — replaces native
 * `window.confirm()` with a mobile-friendly, themed dialog.
 *
 * Always sets `preventClose` while `confirming` is true so that backdrop/ESC
 * cannot close the dialog mid-mutation (same pattern as Trading-Modals).
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  confirmVariant = 'gold',
  confirming = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      preventClose={confirming}
      footer={
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={confirming}
            className="flex-1"
          >
            {cancelLabel}
          </Button>
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
      }
    >
      <p className="text-sm text-white/80 leading-relaxed">{message}</p>
    </Modal>
  );
}
