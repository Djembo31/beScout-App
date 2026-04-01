'use client';

import Link from 'next/link';
import { Sparkles, ChevronRight } from 'lucide-react';
import type { SuggestedAction } from '@/lib/retentionEngine';

interface SuggestedActionBannerProps {
  action: SuggestedAction;
  className?: string;
}

export default function SuggestedActionBanner({ action, className = '' }: SuggestedActionBannerProps) {
  return (
    <Link
      href={action.href}
      className={`flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-surface-minimal hover:bg-white/[0.04] active:scale-[0.98] transition-colors ${className}`}
    >
      <Sparkles className="size-4 text-gold shrink-0" aria-hidden="true" />
      <span className="text-sm text-white/70 flex-1">{action.labelDe}</span>
      <ChevronRight className="size-4 text-white/20 shrink-0" aria-hidden="true" />
    </Link>
  );
}
