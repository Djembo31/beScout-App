'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface TermTooltipProps {
  term: string;
  children: React.ReactNode;
  onOpenGlossary?: () => void;
}

export function TermTooltip({ term, children, onOpenGlossary }: TermTooltipProps) {
  const t = useTranslations('glossary');
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(true);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Position popover above or below depending on viewport space
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    // If less than 120px above the trigger, show below
    setAbove(rect.top > 120);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        popoverRef.current && !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleToggle = useCallback(() => {
    if (!open) updatePosition();
    setOpen((prev) => !prev);
  }, [open, updatePosition]);

  let title = '';
  let description = '';
  try {
    title = t(`terms.${term}.title`);
    description = t(`terms.${term}.description`);
  } catch {
    title = term;
    description = '';
  }

  return (
    <span className="relative inline">
      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        onClick={handleToggle}
        onMouseEnter={() => { updatePosition(); setOpen(true); }}
        onMouseLeave={() => setOpen(false)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggle(); } }}
        className="border-b border-dotted border-white/30 cursor-help hover:border-gold/50 transition-colors"
      >
        {children}
      </span>

      {open && (
        <div
          ref={popoverRef}
          className={cn(
            'absolute left-1/2 -translate-x-1/2 z-50 w-[min(18rem,calc(100vw-2rem))] p-3 rounded-xl bg-surface-popover/90 backdrop-blur-sm border border-white/[0.12] shadow-card-md',
            above ? 'bottom-full mb-2' : 'top-full mt-2'
          )}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <div className="font-bold text-xs text-white/90">{title}</div>
          {description && (
            <p className="mt-1 text-[11px] text-white/60 leading-relaxed">{description}</p>
          )}
          {onOpenGlossary && (
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onOpenGlossary(); }}
              className="mt-2 text-[11px] font-semibold text-gold hover:text-gold/80 transition-colors"
            >
              {t('moreInGlossary')}
            </button>
          )}
          {/* Arrow */}
          <div
            className={cn(
              'absolute left-1/2 -translate-x-1/2 size-2 rotate-45 bg-surface-popover/90 border-white/[0.12]',
              above ? 'top-full -mt-1 border-r border-b' : 'bottom-full -mb-1 border-l border-t'
            )}
          />
        </div>
      )}
    </span>
  );
}
