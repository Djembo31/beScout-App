/**
 * Slice 181 — Shared mock-factories fuer Radix-UI-Primitives.
 *
 * Wird in den 48+ Folge-Migrationen wiederverwendet. Die Mocks rendern children
 * inline + reichen Callbacks durch — kein Portal/FocusScope/DismissableLayer
 * (die brauchen DOM-APIs die jsdom nicht hat).
 *
 * USAGE (Pattern wegen vi.mock-Hoisting):
 *
 * ```ts
 * import { vi } from 'vitest';
 * import { createRadixDialogMock, createRadixAlertDialogMock }
 *   from '@/test-utils/radix-mocks';
 *
 * vi.mock('@radix-ui/react-dialog', () => createRadixDialogMock());
 * vi.mock('@radix-ui/react-alert-dialog', () => createRadixAlertDialogMock());
 *
 * // ...dann import des zu testenden Components
 * import { Dialog, AlertDialog } from '@/components/ui';
 * ```
 *
 * vi.mock-Factory wird hoisted — der Import-Pfad zu den Factories wird
 * statisch resolved. Funktioniert weil die Factories nur React (top-level
 * import) brauchen.
 *
 * Anti-Pattern: NICHT versuchen `mockRadixPrimitives()` als Setup-Function
 * vom Test-Body zu rufen — vi.mock muss aus dem Top-Level eines Files
 * ausgewertet werden.
 *
 * Was die Mocks ABDECKEN:
 * - Children-Rendering wenn `open=true`
 * - Title/Description/Item passthrough (incl. asChild)
 * - onClick/onSelect/onOpenChange als simple Callbacks
 * - Cancel/Action passthrough (Click loest Caller-Callback aus)
 *
 * Was sie NICHT abdecken (jsdom-Limit):
 * - Portal-Rendering (children sind inline statt im body)
 * - Focus-Trap + Focus-Restore
 * - Keyboard-Navigation (ESC/Tab/Arrow)
 *   → fuer diese Pfade Playwright/Browser-Test nutzen
 */

import React from 'react';

// ============================================
// Helper: passthrough div component
// ============================================

function passthroughDiv(displayName: string) {
  const Comp: React.FC<any> = ({ children, asChild, ...props }) => {
    void asChild;
    return React.createElement('div', props, children);
  };
  Comp.displayName = displayName;
  return Comp;
}

function asChildOrWrap(tag: string, displayName: string) {
  const Comp: React.FC<any> = ({ children, asChild, ...props }) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, props as any);
    }
    return React.createElement(tag, props, children);
  };
  Comp.displayName = displayName;
  return Comp;
}

// ============================================
// Dialog mock
// ============================================

export function createRadixDialogMock() {
  const Root: React.FC<any> = ({ open, children, onOpenChange }) => {
    void onOpenChange;
    if (!open) return null;
    return React.createElement(
      'div',
      { 'data-testid': 'radix-dialog-root' },
      children,
    );
  };

  const Content: React.FC<any> = ({
    children,
    onPointerDownOutside,
    onEscapeKeyDown,
    asChild,
    ...rest
  }) => {
    void onPointerDownOutside;
    void onEscapeKeyDown;
    void asChild;
    return React.createElement(
      'div',
      { 'data-testid': 'radix-dialog-content', ...rest },
      children,
    );
  };

  return {
    Root,
    Portal: passthroughDiv('RadixDialog.Portal'),
    Overlay: passthroughDiv('RadixDialog.Overlay'),
    Content,
    Title: asChildOrWrap('h2', 'RadixDialog.Title'),
    Description: asChildOrWrap('p', 'RadixDialog.Description'),
    Trigger: asChildOrWrap('button', 'RadixDialog.Trigger'),
    Close: asChildOrWrap('button', 'RadixDialog.Close'),
    WarningProvider: passthroughDiv('RadixDialog.WarningProvider'),
  };
}

// ============================================
// AlertDialog mock
// ============================================

export function createRadixAlertDialogMock() {
  const Root: React.FC<any> = ({ open, children, onOpenChange }) => {
    void onOpenChange;
    if (!open) return null;
    return React.createElement(
      'div',
      { 'data-testid': 'radix-alert-root' },
      children,
    );
  };

  const Content: React.FC<any> = ({
    children,
    onEscapeKeyDown,
    asChild,
    ...rest
  }) => {
    void onEscapeKeyDown;
    void asChild;
    return React.createElement(
      'div',
      { 'data-testid': 'radix-alert-content', ...rest },
      children,
    );
  };

  return {
    Root,
    Portal: passthroughDiv('RadixAlert.Portal'),
    Overlay: passthroughDiv('RadixAlert.Overlay'),
    Content,
    Title: asChildOrWrap('h2', 'RadixAlert.Title'),
    Description: asChildOrWrap('p', 'RadixAlert.Description'),
    Action: asChildOrWrap('button', 'RadixAlert.Action'),
    Cancel: asChildOrWrap('button', 'RadixAlert.Cancel'),
    Trigger: asChildOrWrap('button', 'RadixAlert.Trigger'),
  };
}

