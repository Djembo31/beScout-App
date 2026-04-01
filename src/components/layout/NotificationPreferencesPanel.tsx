'use client';

import React from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  Send,
  Trophy,
  UserPlus,
  Target,
  Gift,
  Loader2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/lib/queries/notifications';
import type { NotificationCategory } from '@/types';

const CATEGORY_ICONS: Record<NotificationCategory, React.ReactNode> = {
  trading: <ArrowLeftRight className="size-4" aria-hidden="true" />,
  offers: <Send className="size-4" aria-hidden="true" />,
  fantasy: <Trophy className="size-4" aria-hidden="true" />,
  social: <UserPlus className="size-4" aria-hidden="true" />,
  bounties: <Target className="size-4" aria-hidden="true" />,
  rewards: <Gift className="size-4" aria-hidden="true" />,
};

const CATEGORIES: NotificationCategory[] = [
  'trading',
  'offers',
  'fantasy',
  'social',
  'bounties',
  'rewards',
];

interface NotificationPreferencesPanelProps {
  userId: string;
  onBack: () => void;
}

export default function NotificationPreferencesPanel({
  userId,
  onBack,
}: NotificationPreferencesPanelProps) {
  const tn = useTranslations('notifications');
  const { data: prefs, isLoading } = useNotificationPreferences(userId);
  const { mutate: updatePrefs } = useUpdateNotificationPreferences(userId);

  function handleToggle(cat: NotificationCategory, current: boolean) {
    updatePrefs({ [cat]: !current });
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <button
          onClick={onBack}
          className="flex items-center justify-center size-8 rounded-lg hover:bg-white/[0.06] transition-colors focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none"
          aria-label={tn('back')}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </button>
        <span className="font-bold text-sm">{tn('preferences')}</span>
      </div>

      {/* Toggles */}
      <div className="py-2">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="size-5 animate-spin motion-reduce:animate-none text-white/30" />
          </div>
        ) : (
          CATEGORIES.map((cat) => {
            const enabled = prefs ? prefs[cat] : true;
            const label = tn(`pref${cat.charAt(0).toUpperCase()}${cat.slice(1)}` as Parameters<typeof tn>[0]);
            return (
              <div key={cat} className="flex items-center justify-between px-4 py-3 min-h-[44px]">
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center size-8 rounded-lg bg-white/[0.06] text-white/60"
                    aria-hidden="true"
                  >
                    {CATEGORY_ICONS[cat]}
                  </div>
                  <span className="text-sm text-white/80">{label}</span>
                </div>
                <button
                  onClick={() => handleToggle(cat, enabled)}
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50',
                    enabled ? 'bg-gold' : 'bg-white/20',
                  )}
                  role="switch"
                  aria-checked={enabled}
                  aria-label={label}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm transition-transform',
                      enabled ? 'translate-x-5' : 'translate-x-0',
                    )}
                  />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
