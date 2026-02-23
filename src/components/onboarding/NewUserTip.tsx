'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { X, Sparkles } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { useTranslations } from 'next-intl';

interface NewUserTipAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface NewUserTipProps {
  tipKey: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: NewUserTipAction;
  show: boolean;
}

const STORAGE_PREFIX = 'bescout-tip-';

export default function NewUserTip({ tipKey, icon, title, description, action, show }: NewUserTipProps) {
  const t = useTranslations('tips');

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(`${STORAGE_PREFIX}${tipKey}-dismissed`);
  });

  if (!show || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(`${STORAGE_PREFIX}${tipKey}-dismissed`, '1');
    setDismissed(true);
  };

  return (
    <Card className="relative p-4 border-[#FFD700]/20 bg-[#FFD700]/[0.03]">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
        aria-label={t('dismiss')}
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#FFD700]/10 text-[#FFD700] flex-shrink-0 mt-0.5">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Sparkles className="w-3 h-3 text-[#FFD700]" />
            <span className="text-sm font-bold">{title}</span>
          </div>
          <div className="text-xs text-white/50 leading-relaxed">{description}</div>
          {action && (
            action.href ? (
              <Link href={action.href}>
                <Button variant="gold" size="sm" className="mt-2.5">{action.label}</Button>
              </Link>
            ) : (
              <Button variant="gold" size="sm" className="mt-2.5" onClick={action.onClick}>{action.label}</Button>
            )
          )}
        </div>
      </div>
    </Card>
  );
}
