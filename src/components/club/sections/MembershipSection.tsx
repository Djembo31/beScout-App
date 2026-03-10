'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Crown, Check, Loader2 } from 'lucide-react';
import { cn, fmtScout } from '@/lib/utils';
import { Card } from '@/components/ui';
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
                'flex flex-col gap-3 p-4',
                isActive
                  ? 'border-2 bg-white/[0.04]'
                  : 'bg-white/[0.02] border border-white/10',
              )}
              style={isActive ? { borderColor: config.color } : undefined}
            >
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-wider" style={{ color: config.color }}>
                  {t(config.labelKey)}
                </p>
                <p className="font-mono text-sm text-white/70">
                  {fmtScout(config.priceBsd)} $SCOUT {t('perMonth')}
                </p>
              </div>

              <ul className="flex-1 space-y-1.5">
                {config.benefitKeys.map((key) => (
                  <li key={key} className="flex items-start gap-1.5 text-sm text-white/60">
                    <Check className="size-4 shrink-0 text-green-500 mt-0.5" />
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-1">
                {isActive ? (
                  <p className="text-center text-sm font-semibold" style={{ color: config.color }}>
                    {t('activeTier')}
                  </p>
                ) : (
                  <button
                    onClick={() => handleSubscribe(tier)}
                    disabled={subscribing !== null || !userId || isDowngrade}
                    className={cn(
                      'w-full rounded-xl px-4 py-2 text-sm font-bold transition-all active:scale-[0.97]',
                      'disabled:opacity-40 disabled:pointer-events-none',
                      tier === 'gold' || (!isUpgrade && !isDowngrade)
                        ? 'bg-gradient-to-r from-[#FFE44D] to-[#E6B800] text-black'
                        : 'border border-white/10 text-white/70 hover:bg-white/[0.04]',
                    )}
                  >
                    {subscribing === tier ? (
                      <Loader2 className="mx-auto size-4 animate-spin" />
                    ) : isUpgrade ? (
                      t('upgrade')
                    ) : (
                      t('subscribe')
                    )}
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
