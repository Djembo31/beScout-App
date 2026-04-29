'use client';

/**
 * StalePipelineBanner (Slice 256 — UI-Sentinel)
 *
 * Subdued amber-banner that appears on /fantasy + /market when the Vercel-Cron
 * pipeline has drifted (`leagues.active_gameweek` lagging behind reality).
 *
 * Detection-Logic via `useCronHealth` (anon-readable, 5min staleTime).
 * Render-Decision: NULL wenn healthy ODER dismissed (sessionStorage).
 *
 * Designed nach MissionBanner-Pattern (Slice 161): Tailwind-Card,
 * lucide-react-Icons, Mobile 393px Touch-Targets (≥44px Dismiss-Button).
 *
 * Per-Session-Dismiss (sessionStorage 'bescout-stale-pipeline-dismissed-v1'):
 * User klickt X → Banner für aktuelle Session weg, bei neuer Session wieder
 * sichtbar bis Cron healthy ist.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCronHealth } from '@/lib/queries/cronHealth';

const DISMISS_KEY = 'bescout-stale-pipeline-dismissed-v1';

function readDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function writeDismissed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // sessionStorage unavailable (Privacy-Mode) — silent no-op, Banner stays open
  }
}

export default function StalePipelineBanner() {
  const t = useTranslations('system.stalePipeline');
  const { data } = useCronHealth();
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed());

  // Re-sync dismissed state on mount in case sessionStorage was changed in another tab.
  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  const handleDismiss = useCallback(() => {
    writeDismissed();
    setDismissed(true);
  }, []);

  if (dismissed) return null;
  if (!data || data.healthy) return null;

  return (
    <div
      role="alert"
      className="bg-amber-500/[0.08] border border-amber-500/25 rounded-2xl p-4 flex items-start gap-3"
    >
      <div className="size-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
        <AlertTriangle className="size-5 text-amber-400" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-amber-200">{t('title')}</div>
        <div className="text-xs text-amber-200/70 mt-0.5 text-pretty">{t('message')}</div>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t('dismiss')}
        className="flex-shrink-0 size-11 -m-1.5 flex items-center justify-center text-amber-300/60 hover:text-amber-200 transition-colors rounded-lg active:scale-[0.97]"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
