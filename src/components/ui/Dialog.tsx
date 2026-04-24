'use client';

/**
 * Slice 181 — Radix-Dialog Wrapper.
 *
 * Drop-in replacement fuer den Custom-Modal aus `./index.tsx`. Identische Props
 * (`open`, `title`, `subtitle`, `footer`, `onClose`, `preventClose`, `size`,
 * `mobileFullScreen`). Migration eines Sites: `import { Modal }` ↔
 * `import { Dialog }` + Component-Rename.
 *
 * Was Radix uns gratis gibt (vs. dem alten Modal):
 * - korrekter `role="dialog"` + ARIA-labelledby/describedby via DialogTitle/DialogDescription
 * - robusterer Focus-Trap (react-focus-scope)
 * - Focus-Restore aufs Trigger-Element beim Schliessen
 * - Body-Scroll-Lock + `pointer-events`-Lock auf Hintergrund
 * - Konsistente ESC-Handling
 *
 * Animations sind auf Radix-`data-state="open|closed"` Selektoren gemappt
 * (siehe `globals.css` `.dialog-content-mobile`/`.dialog-content-desktop`).
 *
 * preventClose-Pattern (siehe errors-frontend.md "Modal preventClose"):
 * - `onOpenChange`: gated → kein Close wenn `preventClose`
 * - `onPointerDownOutside`: preventDefault wenn `preventClose`
 * - `onEscapeKeyDown`: preventDefault wenn `preventClose`
 * Dadurch ueberlebt eine Mid-Mutation kein Click + kein ESC.
 */

import React from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as RadixDialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

export interface DialogProps {
  /** Whether the dialog is visible */
  open: boolean;
  /** Dialog title — also used for screen-reader (Radix-Pflicht) */
  title: string;
  /** Optional small caption above the title */
  subtitle?: string;
  /** Body content */
  children: React.ReactNode;
  /** Sticky footer for action buttons — always visible at the bottom */
  footer?: React.ReactNode;
  /** Called when user closes via X-Button, ESC, or backdrop (only if !preventClose) */
  onClose: () => void;
  /** Prevent closing via backdrop click or ESC (e.g. during form submission) */
  preventClose?: boolean;
  /** Modal size: sm=384px, md=576px (default), lg=768px, full=100% */
  size?: 'sm' | 'md' | 'lg' | 'full';
  /** Full-screen on mobile instead of bottom sheet — for data-rich content */
  mobileFullScreen?: boolean;
}

const dialogMaxW: Record<NonNullable<DialogProps['size']>, string> = {
  sm: 'md:max-w-sm',
  md: 'md:max-w-xl',
  lg: 'md:max-w-3xl',
  full: 'md:max-w-[calc(100vw-2rem)]',
};

export function Dialog({
  open,
  title,
  subtitle,
  children,
  footer,
  onClose,
  preventClose,
  size = 'md',
  mobileFullScreen,
}: DialogProps) {
  const tc = useTranslations('common');

  // Single source of truth: Radix-`onOpenChange` callback. Wenn open=false
  // gemeldet wird, rufen wir onClose() — aber nur wenn !preventClose.
  // Selbst wenn ESC/PointerDownOutside intern preventDefault'd werden,
  // kommt diese Function trotzdem nie mit `nextOpen=false` durch.
  function handleOpenChange(nextOpen: boolean) {
    if (preventClose) return;
    if (!nextOpen) onClose();
  }

  return (
    <RadixDialog.Root open={open} onOpenChange={handleOpenChange}>
      <RadixDialog.Portal>
        {/* Backdrop / Overlay — anim-fade auf data-state */}
        <RadixDialog.Overlay
          className={cn(
            'fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm',
            'data-[state=open]:anim-fade',
          )}
        />

        {/* Content — Mobile bottom-sheet, Desktop center */}
        <RadixDialog.Content
          onPointerDownOutside={(e) => {
            if (preventClose) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (preventClose) e.preventDefault();
          }}
          // Radix focus-restore happens automatisch — wir blocken nichts.
          aria-describedby={subtitle ? 'bs-dialog-subtitle' : undefined}
          className={cn(
            // Position: full-screen-overlay-positioned, centered on desktop, bottom-aligned on mobile
            'fixed inset-x-0 z-[81] flex flex-col',
            'bg-surface-modal border border-white/[0.12] shadow-card-lg overflow-hidden',
            // Mobile vs Desktop layout
            mobileFullScreen
              ? // Full-screen mobile: top-0 + h-dvh
                'top-0 h-[100dvh] max-h-[100dvh] md:top-1/2 md:left-1/2 md:right-auto md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2 md:h-auto md:max-h-[85vh] md:rounded-3xl md:mx-4'
              : // Bottom-sheet mobile: bottom-0 with rounded top
                'bottom-0 rounded-t-3xl max-h-[90vh] md:bottom-auto md:top-1/2 md:left-1/2 md:right-auto md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:mx-4 md:max-h-[85vh]',
            // Anim mapping: mobile = slide-up, desktop = scale (anim-modal). Use data-state on Content.
            mobileFullScreen
              ? 'data-[state=open]:anim-fade md:data-[state=open]:anim-modal'
              : 'data-[state=open]:anim-bottom-sheet md:data-[state=open]:anim-modal',
            // Width
            'w-full',
            dialogMaxW[size],
          )}
        >
          {/* Swipe handle — mobile only, hidden in full-screen mode */}
          {!mobileFullScreen && (
            <div className="flex justify-center pt-2 pb-1 md:hidden flex-shrink-0">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>
          )}

          {/* Header — fixed, never scrolls. Title is Radix-Pflicht fuer a11y. */}
          <div className="px-4 py-3 md:p-5 border-b border-white/10 flex items-center justify-between flex-shrink-0">
            <div className="min-w-0 flex-1">
              {subtitle && (
                <RadixDialog.Description
                  id="bs-dialog-subtitle"
                  className="text-xs text-white/50"
                >
                  {subtitle}
                </RadixDialog.Description>
              )}
              <RadixDialog.Title className="text-base md:text-lg font-black truncate">
                {title}
              </RadixDialog.Title>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!preventClose) onClose();
              }}
              disabled={preventClose}
              className="p-2 min-w-[44px] min-h-[44px] rounded-xl hover:bg-surface-base hover:scale-110 active:scale-95 transition-transform flex-shrink-0 ml-2 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label={tc('closeLabel')}
            >
              <X className="size-5 text-white/70" />
            </button>
          </div>

          {/* Body — scrollable */}
          <div
            className={cn(
              'flex-1 overflow-y-auto min-h-0 px-4 py-4 md:p-5',
              !footer && 'pb-6 safe-bottom',
            )}
          >
            {children}
          </div>

          {/* Footer — sticky, always visible */}
          {footer && (
            <div className="flex-shrink-0 border-t border-divider bg-[#0b0b0b] px-4 py-3 safe-bottom md:px-5 md:py-4">
              {footer}
            </div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
