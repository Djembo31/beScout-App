'use client';

import React, { useEffect, useRef } from 'react';
import { X, AlertTriangle, RefreshCw } from 'lucide-react';

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
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
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
        inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all
        focus-visible:ring-2 focus-visible:ring-[#FFD700]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0a0a0a] outline-none
        ${btnVariants[variant]} ${btnSizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-40 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
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
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/5 border border-white/10 text-white/70 ${className}`}>
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
}

export function Modal({ open, title, subtitle, children, onClose }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // ESC key closes modal
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Focus trap
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
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
      className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="w-full max-w-xl mx-4 rounded-3xl bg-[#0b0b0b] border border-white/10 shadow-2xl"
      >
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            {subtitle && <div className="text-xs text-white/50">{subtitle}</div>}
            <div id="modal-title" className="text-lg font-black">{title}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-colors" aria-label="Schließen">
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>
        <div className="p-5">{children}</div>
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
    <div className="bg-black/30 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs text-white/50">{label}</div>
        {icon}
      </div>
      <div className={`mt-2 text-2xl md:text-3xl font-black font-mono ${trendColor}`}>{value}</div>
      {sub && <div className="mt-2 text-sm text-white/60">{sub}</div>}
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
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2.5 rounded-xl bg-[#1a1a1a] border border-white/15 shadow-xl z-50">
          <div className="text-[11px] text-white/70 leading-relaxed">{text}</div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-[#1a1a1a] border-r border-b border-white/15 -mt-1" />
        </div>
      )}
    </div>
  );
}

export { TabBar, TabPanel } from './TabBar';
export { LoadMoreButton } from './LoadMoreButton';

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
