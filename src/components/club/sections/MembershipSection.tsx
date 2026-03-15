'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Crown, Check } from 'lucide-react';
import { cn, fmtScout } from '@/lib/utils';
import { Card, Button } from '@/components/ui';
import { TIER_CONFIG, subscribeTo } from '@/lib/services/clubSubscriptions';
import type { SubscriptionTier } from '@/lib/services/clubSubscriptions';
import { useClubSubscription } from '@/lib/queries/misc';
import { useToast } from '@/components/providers/ToastProvider';

const TIERS: SubscriptionTier[] = ['bronze', 'silber', 'gold'];

type Props = {
  userId: string | undefined;
  clubId: string;
  clubColor: string;
  onSubscribed: () => void;
};

export function MembershipSection({ userId, clubId, clubColor, onSubscribed }: Props) {
  const t = useTranslations('club');
  const ts = useTranslations('subscription');
  const { addToast } = useToast();
  const { data: subscription } = useClubSubscription(userId, clubId);
  const [subscribing, setSubscribing] = useState<SubscriptionTier | null>(null);

  const activeTier = subscription?.status === 'active' ? subscription.tier : null;
  const activeTierIndex = activeTier ? TIERS.indexOf(activeTier) : -1;

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (!userId) return;
    setSubscribing(tier);
    try {
      const result = await subscribeTo(userId, clubId, tier);
      if (result.success) {
        addToast(t('subscribeSuccess'), 'success');
        onSubscribed();
      } else {
        addToast(t('subscribeFailed'), 'error');
      }
    } catch {
      addToast(t('subscribeFailed'), 'error');
    } finally {
      setSubscribing(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Crown className="size-5" style={{ color: clubColor }} />
        <h2 className="font-black text-balance">{t('membershipTitle')}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TIERS.map((tier) => {
          const config = TIER_CONFIG[tier];
          const tierIndex = TIERS.indexOf(tier);
          const isActive = activeTier === tier;
          const isUpgrade = activeTierIndex >= 0 && tierIndex > activeTierIndex;
          const isDowngrade = activeTierIndex >= 0 && tierIndex < activeTierIndex;

          return (
            <Card
              key={tier}
              className={cn(
                'flex flex-col gap-3 p-0 overflow-hidden',
                isActive
                  ? 'border-2 bg-white/[0.04] ring-2 animate-[pulse_3s_ease-in-out_infinite]'
                  : 'bg-surface-minimal border border-white/10',
              )}
              style={isActive ? { borderColor: config.color, '--tw-ring-color': `${config.color}40` } as React.CSSProperties : undefined}
            >
              {/* Gradient header strip */}
              <div className="h-1 rounded-t-2xl" style={{
                background: `linear-gradient(to right, ${config.color}, ${config.color}80)`
              }} />
              <div className="flex flex-col gap-3 p-4">
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-wider" style={{ color: config.color }}>
                  {ts(config.labelKey)}
                </p>
                <p className="text-white/70">
                  <span className="text-xl font-black font-mono tabular-nums">{fmtScout(config.priceBsd)}</span>
                  {' '}
                  <span className="text-xs text-white/40">bCredits / Monat</span>
                </p>
              </div>

              <ul className="flex-1 space-y-1.5">
                {config.benefitKeys.map((key) => (
                  <li key={key} className="flex items-start gap-1.5 text-sm text-white/60">
                    <Check className="size-4 shrink-0 mt-0.5" style={{ color: config.color }} />
                    <span>{ts(key)}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-1">
                {isActive ? (
                  <p className="text-center text-sm font-semibold" style={{ color: config.color }}>
                    {t('activeTier')}
                  </p>
                ) : (
                  <Button
                    variant={tier === 'gold' ? 'gold' : 'outline'}
                    size="sm"
                    fullWidth
                    loading={subscribing === tier}
                    disabled={subscribing !== null || !userId || isDowngrade}
                    onClick={() => handleSubscribe(tier)}
                    style={tier !== 'gold' ? { borderColor: clubColor, color: clubColor } : undefined}
                  >
                    {isUpgrade ? t('upgrade') : t('subscribe', { tier: ts(config.labelKey) })}
                  </Button>
                )}
              </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
