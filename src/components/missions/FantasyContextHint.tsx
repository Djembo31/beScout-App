'use client';

/**
 * Slice 201c (M-01): Fantasy-Context-Hint Render-Component.
 *
 * Render-Component fuer state-derived Fantasy-Hints (Lineup-Needed, Captain-Pick).
 * Visual entspricht MissionHint.tsx, aber mit kontext-spezifischem Icon (Target oder Crown)
 * und Link-Wrapper statt Progress-Bar (kein Progress fuer state-hints).
 */

import React from 'react';
import Link from 'next/link';
import { Target, Crown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { FantasyContextHint as FantasyContextHintType } from '@/features/fantasy/hooks/useFantasyContextHints';

const ICON_MAP: Record<string, React.ElementType> = {
  Target,
  Crown,
};

type Props = {
  hint: FantasyContextHintType;
};

export default function FantasyContextHint({ hint }: Props) {
  const t = useTranslations('missions');
  const Icon = ICON_MAP[hint.icon] ?? Target;

  return (
    <Link
      href={hint.ctaHref}
      className="block p-2.5 rounded-xl bg-purple-500/[0.06] border border-purple-500/15 hover:bg-purple-500/[0.10] transition-colors"
      aria-label={t('contextHintAriaLabel', { title: hint.title })}
    >
      <div className="flex items-center gap-2.5">
        <Icon className="size-4 text-purple-400 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-white/80 truncate">
              <span className="font-semibold text-purple-300/90">{t('contextHintLabel')}: </span>
              {hint.title}
            </span>
            <span className="text-[10px] text-purple-400/60 shrink-0" aria-hidden="true">→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
