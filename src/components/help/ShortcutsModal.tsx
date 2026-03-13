'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Modal } from '@/components/ui';
import { cn } from '@/lib/utils';

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

type Shortcut = { keys: string[]; label: string };
type ShortcutGroup = { title: string; shortcuts: Shortcut[] };

export default function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  const t = useTranslations('shortcuts');

  const groups: ShortcutGroup[] = [
    {
      title: t('navigation'),
      shortcuts: [
        { keys: ['G', 'H'], label: t('goHome') },
        { keys: ['G', 'M'], label: t('goMarket') },
        { keys: ['G', 'F'], label: t('goFantasy') },
        { keys: ['G', 'C'], label: t('goCommunity') },
        { keys: ['G', 'P'], label: t('goProfile') },
      ],
    },
    {
      title: t('actions'),
      shortcuts: [
        { keys: ['?'], label: t('showShortcuts') },
        { keys: ['Esc'], label: t('closeModal') },
      ],
    },
  ];

  return (
    <Modal open={open} title={t('title')} onClose={onClose}>
      <div className="space-y-5">
        {groups.map(group => (
          <div key={group.title}>
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">{group.title}</h3>
            <div className="space-y-1.5">
              {group.shortcuts.map(shortcut => (
                <div key={shortcut.label} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-white/70">{shortcut.label}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, i) => (
                      <React.Fragment key={key}>
                        {i > 0 && <span className="text-white/20 text-xs">+</span>}
                        <kbd className={cn(
                          'inline-flex items-center justify-center min-w-[28px] h-7 px-2',
                          'rounded-lg border border-white/15 bg-white/5',
                          'text-xs font-mono font-bold text-white/60',
                          'hover:bg-white/10 hover:border-white/20 hover:text-white/80 transition-colors'
                        )}>
                          {key}
                        </kbd>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="text-[10px] text-white/25 text-center pt-2 border-t border-white/[0.06]">
          {t('hint')}
        </div>
      </div>
    </Modal>
  );
}
