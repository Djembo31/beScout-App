'use client';

/**
 * Slice 181 — Radix-DropdownMenu Wrapper.
 *
 * Idiomatische Compound-API (Radix-Style):
 *
 *   <DropdownMenu>
 *     <DropdownMenu.Trigger asChild>
 *       <button>Open</button>
 *     </DropdownMenu.Trigger>
 *     <DropdownMenu.Content>
 *       <DropdownMenu.Label>Aktionen</DropdownMenu.Label>
 *       <DropdownMenu.Item onSelect={...}>Bearbeiten</DropdownMenu.Item>
 *       <DropdownMenu.Separator />
 *       <DropdownMenu.Item onSelect={...} variant="danger">Loeschen</DropdownMenu.Item>
 *     </DropdownMenu.Content>
 *   </DropdownMenu>
 *
 * Mobile-Bottom-Sheet (<768px): Content rendert als Bottom-Sheet via
 * Custom-Layer (Radix-Portal + Bottom-Sheet-Style). Caller muss nichts tun —
 * Detection via `useIsMobile` hook.
 *
 * Desktop (>=768px): Floating panel via Radix-Default mit `anim-dropdown`.
 *
 * Item-Defaults: keyboard-nav (Radix), highlight-style on focus, min 44px touch
 * target auf Mobile.
 */

import React from 'react';
import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

// ============================================
// useIsMobile — SSR-safe matchMedia hook
// ============================================
//
// Default `false` server-side (Desktop-first SSR), client hydratisiert auf
// echten Wert. Bewusst kein useEffect-bez. SSR-Anti-Pattern, weil das
// erste Render (server + client-hydrate) konsistent sein muss.

function useIsMobile(breakpointPx: number = 768): boolean {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    function update() {
      setIsMobile(mq.matches);
    }
    update();
    // Modern API
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [breakpointPx]);

  return isMobile;
}

// ============================================
// Root + Trigger (passthrough)
// ============================================

const Root = RadixMenu.Root;
const Trigger = RadixMenu.Trigger;
const Group = RadixMenu.Group;
const RadioGroup = RadixMenu.RadioGroup;

// ============================================
// Content — Mobile bottom-sheet vs Desktop floating
// ============================================

export interface DropdownMenuContentProps
  extends React.ComponentPropsWithoutRef<typeof RadixMenu.Content> {
  /** Override automatic mobile-bottom-sheet detection (default: auto via matchMedia). */
  forceVariant?: 'mobile' | 'desktop';
}

const Content = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  function Content({ className, forceVariant, sideOffset = 8, children, ...props }, ref) {
    const isMobileAuto = useIsMobile(768);
    const isMobile = forceVariant === 'mobile' || (forceVariant !== 'desktop' && isMobileAuto);

    if (isMobile) {
      // Mobile: render as bottom-sheet via Portal. Use sideOffset=0, full-width
      // bottom-anchored, ignore Radix positioning.
      return (
        <RadixMenu.Portal>
          <RadixMenu.Content
            ref={ref}
            // Avoid auto-collision for bottom-sheet variant
            side="bottom"
            align="center"
            sideOffset={0}
            // Make sure scroll-lock is active on mobile
            avoidCollisions={false}
            className={cn(
              'fixed inset-x-0 bottom-0 z-[81] flex flex-col',
              'bg-surface-modal border-t border-white/[0.12] shadow-card-lg overflow-hidden',
              'rounded-t-3xl max-h-[80vh] w-full',
              'data-[state=open]:anim-bottom-sheet',
              'p-2',
              className,
            )}
            {...props}
          >
            {/* Swipe handle */}
            <div className="flex justify-center pt-1 pb-2 flex-shrink-0">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 safe-bottom">{children}</div>
          </RadixMenu.Content>
        </RadixMenu.Portal>
      );
    }

    return (
      <RadixMenu.Portal>
        <RadixMenu.Content
          ref={ref}
          sideOffset={sideOffset}
          collisionPadding={8}
          className={cn(
            'z-[81] min-w-[10rem] rounded-xl p-1',
            'bg-surface-popover border border-white/[0.12] shadow-card-md',
            'data-[state=open]:anim-dropdown',
            className,
          )}
          {...props}
        >
          {children}
        </RadixMenu.Content>
      </RadixMenu.Portal>
    );
  },
);

// ============================================
// Item — focus highlight + min touch target
// ============================================

export interface DropdownMenuItemProps
  extends React.ComponentPropsWithoutRef<typeof RadixMenu.Item> {
  /** Variant — destructive items get red text + icon-color hint. */
  variant?: 'default' | 'danger';
}

const Item = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  function Item({ className, variant = 'default', ...props }, ref) {
    return (
      <RadixMenu.Item
        ref={ref}
        className={cn(
          // Layout
          'flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer outline-none',
          // Mobile-touch min-height
          'min-h-[44px] md:min-h-[36px]',
          // Text + transitions
          'text-sm transition-colors',
          // Variants
          variant === 'danger'
            ? 'text-red-300 data-[highlighted]:bg-red-500/10 data-[highlighted]:text-red-200'
            : 'text-white/80 data-[highlighted]:bg-white/[0.08] data-[highlighted]:text-white',
          // Disabled state (Radix sets data-disabled)
          'data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed',
          className,
        )}
        {...props}
      />
    );
  },
);

// ============================================
// Label — section header
// ============================================

const Label = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixMenu.Label>
>(function Label({ className, ...props }, ref) {
  return (
    <RadixMenu.Label
      ref={ref}
      className={cn(
        'px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-white/40 select-none',
        className,
      )}
      {...props}
    />
  );
});

// ============================================
// Separator
// ============================================

const Separator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixMenu.Separator>
>(function Separator({ className, ...props }, ref) {
  return (
    <RadixMenu.Separator
      ref={ref}
      className={cn('my-1 h-px bg-white/10', className)}
      {...props}
    />
  );
});

// ============================================
// Compound export
// ============================================

export const DropdownMenu = Object.assign(
  function DropdownMenuRoot(props: React.ComponentProps<typeof Root>) {
    return <Root {...props} />;
  },
  {
    Trigger,
    Content,
    Item,
    Label,
    Separator,
    Group,
    RadioGroup,
    /** Re-exports fuer fortgeschrittene Use-Cases (Checkbox/Radio Items, Sub-Menus). */
    Portal: RadixMenu.Portal,
    CheckboxItem: RadixMenu.CheckboxItem,
    RadioItem: RadixMenu.RadioItem,
    ItemIndicator: RadixMenu.ItemIndicator,
    Sub: RadixMenu.Sub,
    SubTrigger: RadixMenu.SubTrigger,
    SubContent: RadixMenu.SubContent,
  },
);
