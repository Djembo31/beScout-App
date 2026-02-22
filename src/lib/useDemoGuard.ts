'use client';

import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

export function useDemoGuard() {
  const { profile } = useUser();
  const { addToast } = useToast();
  const t = useTranslations('demo');
  const isDemo = profile?.is_demo === true;

  /** Wraps an async action — shows toast instead of executing in demo mode */
  const guard = useCallback(
    <T,>(action: () => Promise<T>): (() => Promise<T | undefined>) => {
      return async () => {
        if (isDemo) {
          addToast(t('blocked'), 'info');
          return undefined;
        }
        return action();
      };
    },
    [isDemo, addToast, t]
  );

  return { isDemo, guard };
}
