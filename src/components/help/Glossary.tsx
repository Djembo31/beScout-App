'use client';

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Modal } from '@/components/ui';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlossaryProps {
  open: boolean;
  onClose: () => void;
}

type GlossaryCategory = 'trading' | 'fantasy' | 'gamification';

const GLOSSARY_TERMS: { key: string; category: GlossaryCategory }[] = [
  // Trading
  { key: 'dpc', category: 'trading' },
  { key: '$SCOUT', category: 'trading' },
  { key: 'ipo', category: 'trading' },
  { key: 'floorPrice', category: 'trading' },
  { key: 'pbt', category: 'trading' },
  { key: 'successFee', category: 'trading' },
  // Fantasy
  { key: 'lineup', category: 'fantasy' },
  { key: 'prediction', category: 'fantasy' },
  { key: 'chip', category: 'fantasy' },
  { key: 'l5Score', category: 'fantasy' },
  // Gamification
  { key: 'eloScore', category: 'gamification' },
  { key: 'streak', category: 'gamification' },
  { key: 'tickets', category: 'gamification' },
  { key: 'bounty', category: 'gamification' },
  { key: 'research', category: 'gamification' },
];

const CATEGORIES: GlossaryCategory[] = ['trading', 'fantasy', 'gamification'];

export function Glossary({ open, onClose }: GlossaryProps) {
  const t = useTranslations('glossary');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return GLOSSARY_TERMS;
    const q = search.toLowerCase();
    return GLOSSARY_TERMS.filter((term) => {
      const title = t(`terms.${term.key}.title`).toLowerCase();
      const desc = t(`terms.${term.key}.description`).toLowerCase();
      return title.includes(q) || desc.includes(q);
    });
  }, [search, t]);

  const groupedByCategory = useMemo(() => {
    const map = new Map<GlossaryCategory, typeof GLOSSARY_TERMS>();
    for (const term of filtered) {
      const list = map.get(term.category) ?? [];
      list.push(term);
      map.set(term.category, list);
    }
    return map;
  }, [filtered]);

  return (
    <Modal open={open} onClose={onClose} title={t('title')} size="sm">
      {/* Search input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className={cn(
            'w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl',
            'text-sm text-white placeholder:text-white/30',
            'focus:outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-colors'
          )}
        />
      </div>

      {/* Terms grouped by category */}
      <div className="space-y-5">
        {CATEGORIES.map((cat) => {
          const terms = groupedByCategory.get(cat);
          if (!terms || terms.length === 0) return null;
          return (
            <div key={cat}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-2.5">
                {t(`categories.${cat}`)}
              </div>
              <div className="space-y-2.5">
                {terms.map((term) => (
                  <div
                    key={term.key}
                    className="p-3 bg-surface-minimal border border-white/[0.06] rounded-xl"
                  >
                    <div className="font-bold text-sm text-white/90">
                      {t(`terms.${term.key}.title`)}
                    </div>
                    <p className="mt-1 text-xs text-white/55 leading-relaxed">
                      {t(`terms.${term.key}.description`)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-sm text-white/40">
            {t('noResults')}
          </div>
        )}
      </div>
    </Modal>
  );
}
