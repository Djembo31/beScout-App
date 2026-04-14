'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2, Circle, Gift, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui';
import type { OnboardingProgress } from '@/lib/retentionEngine';

interface OnboardingChecklistProps {
  items: OnboardingProgress[];
  className?: string;
}

export default function OnboardingChecklist({ items, className = '' }: OnboardingChecklistProps) {
  const t = useTranslations('home');
  const locale = useLocale();
  const isTr = locale === 'tr';
  const completed = items.filter((i) => i.completed).length;
  const total = items.length;
  const pct = Math.round((completed / total) * 100);

  if (completed === total) return null; // All done — hide checklist

  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="bg-gradient-to-r from-gold/10 to-gold/5 border-b border-gold/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="size-5 text-gold" aria-hidden="true" />
            <span className="font-black">{t('onboardingTitle')}</span>
          </div>
          <span className="text-xs font-mono tabular-nums text-gold">{completed}/{total}</span>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-surface-base rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#FFE44D] to-[#E6B800] rounded-full transition-colors duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="p-2">
        {items.map((item) => (
          <Link
            key={item.action}
            href={item.href}
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              item.completed
                ? 'opacity-50'
                : 'hover:bg-surface-subtle active:scale-[0.98]'
            }`}
          >
            {item.completed ? (
              <CheckCircle2 className="size-5 text-green-400 shrink-0" aria-hidden="true" />
            ) : (
              <Circle className="size-5 text-white/20 shrink-0" aria-hidden="true" />
            )}
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${item.completed ? 'line-through text-white/40' : ''}`}>
                {isTr ? item.labelTr : item.labelDe}
              </div>
              <div className="text-[10px] text-gold/70">{isTr ? item.rewardLabelTr : item.rewardLabelDe}</div>
            </div>
            {!item.completed && (
              <ChevronRight className="size-4 text-white/20 shrink-0" aria-hidden="true" />
            )}
          </Link>
        ))}
      </div>
    </Card>
  );
}
