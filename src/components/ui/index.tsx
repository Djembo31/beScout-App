'use client';

import React, { useEffect, useRef } from 'react';
import { X, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';

// ============================================
// BUTTON
// ============================================

export type ButtonVariant = 'gold' | 'outline' | 'ghost' | 'danger';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

const btnVariants: Record<ButtonVariant, string> = {
  gold: 'bg-[#FFD700] hover:bg-[#FFD700]/90 text-black',
  outline: 'bg-white/5 hover:bg-white/10 border border-white/10 text-white',
  ghost: 'hover:bg-white/5 text-white/80',
  danger: 'bg-red-500/15 hover:bg-red-500/20 border border-red-400/25 text-red-200',
};

const btnSizes = {
  sm: 'px-3 py-2 text-sm min-h-[44px]',
  md: 'px-4 py-2.5 text-sm min-h-[44px]',
  lg: 'px-6 py-3 text-base min-h-[44px]',
};

export function Button({
  variant = 'ghost',
  size = 'md',
  loading,
  fullWidth,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all active:scale-[0.97]
        focus-visible:ring-2 focus-visible:ring-[#FFD700]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0a0a0a] outline-none
        ${btnVariants[variant]} ${btnSizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-40 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {loading && <Loader2 className="animate-spin h-4 w-4" />}
      {children}
    </button>
  );
}

// ============================================
// CARD
// ============================================

export function Card({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`bg-white/[0.02] border border-white/10 rounded-2xl ${className}`} {...props}>
      {children}
    </div>
  );
}

// ============================================
// CHIP & PILL
// ============================================

export function Chip({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-white/70 ${className}`}>
      {children}
    </span>
  );
}

// ============================================
// MODAL
// ============================================

export interface ModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
  /** Prevent closing via backdrop click or ESC (e.g. during form submission) */
  preventClose?: boolean;
  /** Modal size: sm=384px, md=576px (default), lg=768px, full=100% */
  size?: 'sm' | 'md' | 'lg' | 'full';
}

const modalMaxW = {
  sm: 'md:max-w-sm',
  md: 'md:max-w-xl',
  lg: 'md:max-w-3xl',
  full: 'md:max-w-[calc(100vw-2rem)]',
};

export function Modal({ open, title, subtitle, children, onClose, preventClose, size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // ESC key closes modal
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !preventClose) onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Focus trap
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) focusable[0].focus();

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab' || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-end md:items-center md:justify-center md:p-4 anim-fade"
      onClick={(e) => { if (!preventClose && e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`w-full ${modalMaxW[size]} bg-[#0b0b0b] border border-white/10 shadow-2xl
          rounded-t-3xl max-h-[90vh] overflow-y-auto anim-bottom-sheet
          md:rounded-3xl md:mx-4 md:max-h-[85vh] md:anim-modal`}
      >
        {/* Swipe handle — mobile only */}
        <div className="flex justify-center pt-2 pb-1 md:hidden">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>
        <div className="px-4 py-3 md:p-5 border-b border-white/10 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            {subtitle && <div className="text-xs text-white/50">{subtitle}</div>}
            <div id="modal-title" className="text-base md:text-lg font-black truncate">{title}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 hover:scale-110 active:scale-95 transition-all flex-shrink-0 ml-2" aria-label="Schließen">
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>
        <div className="px-4 py-4 md:p-5">{children}</div>
      </div>
    </div>
  );
}

// ============================================
// STAT CARD
// ============================================

export function StatCard({
  label,
  value,
  sub,
  icon,
  trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down';
}) {
  const trendColor = trend === 'up' ? 'text-[#22C55E]' : trend === 'down' ? 'text-red-300' : 'text-white';

  return (
    <div className="bg-black/30 border border-white/10 rounded-2xl p-3 md:p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs text-white/50 truncate">{label}</div>
        {icon}
      </div>
      <div className={`mt-1.5 md:mt-2 text-xl md:text-2xl font-black font-mono truncate ${trendColor}`}>{value}</div>
      {sub && <div className="mt-1 md:mt-2 text-xs md:text-sm text-white/60 truncate">{sub}</div>}
    </div>
  );
}

// ============================================
// SKELETON PRIMITIVES
// ============================================

export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-white/[0.04] rounded-xl ${className ?? ''}`} />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-white/[0.02] border border-white/10 rounded-2xl ${className ?? ''}`} />;
}

// ============================================
// ERROR STATE
// ============================================

// ============================================
// INFO TOOLTIP
// ============================================

export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        onClick={() => setOpen(!open)}
        className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/10 transition-all"
        aria-label="Info"
      >
        <span className="text-[9px] font-bold leading-none">?</span>
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[min(13rem,calc(100vw-2rem))] p-2.5 rounded-xl bg-[#1a1a1a] border border-white/15 shadow-xl z-50 anim-dropdown">
          <div className="text-[11px] text-white/70 leading-relaxed">{text}</div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-[#1a1a1a] border-r border-b border-white/15 -mt-1" />
        </div>
      )}
    </div>
  );
}

export { TabBar, TabPanel } from './TabBar';
export { MobileTableCard } from './MobileTableCard';
export { LoadMoreButton } from './LoadMoreButton';
export { SearchInput } from './SearchInput';
export { PosFilter } from './PosFilter';
export { SortPills } from './SortPills';
export { EmptyState } from './EmptyState';
export { RangBadge, RangScorePill, RangProgress, DimensionRangRow, DimensionRangStack } from './RangBadge';

export function ErrorState({
  message = 'Daten konnten nicht geladen werden.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="p-8 md:p-12 text-center">
      <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-red-400/70" />
      <div className="text-sm text-red-300 mb-4">{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Nochmal versuchen
        </button>
      )}
    </Card>
  );
}
