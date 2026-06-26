'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { X, Check, Search } from 'lucide-react';
import CountryFlag from '@/components/ui/CountryFlag';
import { cn } from '@/lib/utils';
import { FOOTBALL_NATIONS, nationDisplayName } from '@/lib/constants/footballNations';
import { INPUT_CLS } from './hooks/types';

interface NationMultiSelectProps {
  /** Ausgewählte ISO-Codes (nationality_iso). */
  selected: string[];
  /** Callback bei Auswahl-Änderung. */
  onChange: (codes: string[]) => void;
  /** Feld-Label (vom Builder, DE/TR via L). */
  label: string;
  /** Hilfetext unter dem Trigger. */
  hint?: string;
  /** Placeholder im leeren Zustand (keine Auswahl). */
  placeholder: string;
  disabled?: boolean;
}

/**
 * Slice 392 (E-3) — durchsuchbarer Länder-Multi-Select für die nation_in-Regel.
 * Trigger zeigt Auswahl als Flaggen-Chips; öffnet einen Full-Screen-Picker
 * (ui-components.md „Full-Screen Picker"): Header + Suche + scrollbare Liste.
 * Optionen = feste, kuratierte FOOTBALL_NATIONS; Namen via Intl.DisplayNames(locale).
 */
export default function NationMultiSelect({
  selected, onChange, label, hint, placeholder, disabled,
}: NationMultiSelectProps) {
  const t = useTranslations('admin');
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Optionen einmal pro Locale: {code, name}, alphabetisch nach lokalisiertem Namen.
  const options = useMemo(() => {
    return FOOTBALL_NATIONS
      .map(code => ({ code, name: nationDisplayName(code, locale) }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [locale]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase(locale);
    if (!q) return options;
    return options.filter(
      o => o.name.toLocaleLowerCase(locale).includes(q) || o.code.toLowerCase().includes(q),
    );
  }, [options, query, locale]);

  // Body-Scroll sperren + ESC-Close solange Picker offen.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (code: string) => {
    if (selected.includes(code)) onChange(selected.filter(c => c !== code));
    else onChange(Array.from(new Set([...selected, code])));
  };

  return (
    <div>
      <label className="block text-sm font-bold text-white/70 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-label={label}
        className={cn(
          INPUT_CLS, 'min-h-[44px] flex items-center gap-2 text-left',
          disabled && 'opacity-40 cursor-not-allowed',
        )}
      >
        {selected.length === 0 ? (
          <span className="text-white/25">{placeholder}</span>
        ) : (
          <span className="flex items-center gap-1 flex-wrap">
            {selected.slice(0, 8).map(c => <CountryFlag key={c} code={c} size={16} />)}
            {selected.length > 8 && (
              <span className="text-xs text-white/50">+{selected.length - 8}</span>
            )}
            <span className="ml-1 text-xs text-white/50 tabular-nums">
              {t('nationSelectedCount', { count: selected.length })}
            </span>
          </span>
        )}
      </button>
      {hint && <p className="mt-1 text-[10px] text-white/40">{hint}</p>}

      {open && (
        <div className="fixed inset-0 z-[60] bg-[#0a0a0a] flex flex-col anim-fade">
          <div className="sticky top-0 z-10 bg-[#0a0a0a] border-b border-white/10 px-4 py-3 flex items-center gap-2"
               style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
            <div className="relative flex-1">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('nationSearchPlaceholder')}
                aria-label={t('nationSearchPlaceholder')}
                autoFocus
                className={cn(INPUT_CLS, 'min-h-[44px] pl-9')}
              />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('nationPickerDone')}
              className="min-h-[44px] px-3 rounded-xl bg-gradient-to-b from-[#FFE44D] to-[#E6B800] text-black text-sm font-bold active:scale-[0.97]"
            >
              {t('nationPickerDone')}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06]">
            {filtered.map(({ code, name }) => {
              const isSel = selected.includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggle(code)}
                  aria-pressed={isSel}
                  className={cn(
                    'w-full min-h-[48px] flex items-center gap-3 px-4 text-left transition-colors',
                    isSel ? 'bg-gold/10' : 'hover:bg-white/[0.04]',
                  )}
                >
                  <CountryFlag code={code} size={18} />
                  <span className="flex-1 text-sm text-white/90">{name}</span>
                  <span className="text-[10px] text-white/30 tabular-nums">{code}</span>
                  {isSel && <Check aria-hidden="true" className="size-4 text-gold shrink-0" />}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-white/40">{t('nationPickerEmpty')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
