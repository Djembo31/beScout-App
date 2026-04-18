'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Play, Users, TrendingUp, Search, CheckCircle2, XCircle } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { useToast } from '@/components/providers/ToastProvider';
import { cn } from '@/lib/utils';

type CronName = 'sync-players-daily' | 'sync-transfermarkt-batch' | 'transfermarkt-search-batch';

type CronResponse = {
  success: boolean;
  name: string;
  status: number;
  duration_ms: number;
  response: unknown;
};

type CronMeta = {
  name: CronName;
  icon: typeof Users;
  titleKey: string;
  descKey: string;
  scheduleKey: string;
};

const CRONS: CronMeta[] = [
  {
    name: 'sync-players-daily',
    icon: Users,
    titleKey: 'dataSyncPlayersTitle',
    descKey: 'dataSyncPlayersDesc',
    scheduleKey: 'dataSyncPlayersSchedule',
  },
  {
    name: 'sync-transfermarkt-batch',
    icon: TrendingUp,
    titleKey: 'dataSyncMarketTitle',
    descKey: 'dataSyncMarketDesc',
    scheduleKey: 'dataSyncMarketSchedule',
  },
  {
    name: 'transfermarkt-search-batch',
    icon: Search,
    titleKey: 'dataSyncDiscoveryTitle',
    descKey: 'dataSyncDiscoveryDesc',
    scheduleKey: 'dataSyncDiscoverySchedule',
  },
];

export function AdminDataSyncTab() {
  const t = useTranslations('bescoutAdmin');
  const { addToast } = useToast();
  const [pending, setPending] = useState<Record<CronName, boolean>>({
    'sync-players-daily': false,
    'sync-transfermarkt-batch': false,
    'transfermarkt-search-batch': false,
  });
  const [results, setResults] = useState<Record<CronName, CronResponse | null>>({
    'sync-players-daily': null,
    'sync-transfermarkt-batch': null,
    'transfermarkt-search-batch': null,
  });

  const handleTrigger = async (cron: CronName) => {
    setPending((p) => ({ ...p, [cron]: true }));
    try {
      const res = await fetch(`/api/admin/trigger-cron/${cron}`, {
        method: 'POST',
      });
      const payload = (await res.json()) as CronResponse;
      setResults((r) => ({ ...r, [cron]: payload }));
      if (payload.success) {
        addToast(t('dataSyncTriggerSuccess'), 'success');
      } else {
        addToast(t('dataSyncTriggerError'), 'error');
      }
    } catch (err) {
      console.error('[AdminDataSyncTab] Trigger failed:', err);
      addToast(t('dataSyncTriggerError'), 'error');
      setResults((r) => ({
        ...r,
        [cron]: {
          success: false,
          name: cron,
          status: 0,
          duration_ms: 0,
          response: { error: err instanceof Error ? err.message : String(err) },
        },
      }));
    } finally {
      setPending((p) => ({ ...p, [cron]: false }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-white/60">
        {t('dataSyncIntro')}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {CRONS.map((c) => {
          const Icon = c.icon;
          const isPending = pending[c.name];
          const result = results[c.name];
          return (
            <Card key={c.name} className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Icon className="size-5 text-white/60" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-black text-white">{t(c.titleKey)}</div>
                  <div className="text-xs text-white/50 mt-0.5">{t(c.descKey)}</div>
                  <div className="text-xs text-white/40 font-mono mt-1">
                    {t('dataSyncSchedulePrefix')}: {t(c.scheduleKey)}
                  </div>
                </div>
              </div>

              <Button
                onClick={() => handleTrigger(c.name)}
                disabled={isPending}
                className="w-full min-h-[44px]"
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <Play className="size-4" aria-hidden="true" />
                )}
                <span className="ml-2">
                  {isPending ? t('dataSyncRunning') : t('dataSyncTriggerNow')}
                </span>
              </Button>

              {result && (
                <div
                  className={cn(
                    'rounded-xl p-3 border text-xs space-y-1.5',
                    result.success
                      ? 'bg-emerald-500/5 border-emerald-400/20'
                      : 'bg-rose-500/5 border-rose-400/20',
                  )}
                  role="status"
                >
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle2 className="size-4 text-emerald-400" aria-hidden="true" />
                    ) : (
                      <XCircle className="size-4 text-rose-400" aria-hidden="true" />
                    )}
                    <span className="font-medium text-white">
                      {result.success ? t('dataSyncResultSuccess') : t('dataSyncResultError')}
                    </span>
                    <span className="text-white/40 font-mono tabular-nums ml-auto">
                      {(result.duration_ms / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <pre className="text-white/60 font-mono text-[10px] overflow-x-auto whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                    {JSON.stringify(result.response, null, 2)}
                  </pre>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
