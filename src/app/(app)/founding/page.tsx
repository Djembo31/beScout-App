'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Ticket, Search, Zap, Crown, Check, Loader2, ShieldCheck } from 'lucide-react';
import { Card, Button, Modal } from '@/components/ui';
import FoundingPassBadge from '@/components/ui/FoundingPassBadge';
import { cn, fmtScout } from '@/lib/utils';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { queryClient } from '@/lib/queryClient';
import { qk } from '@/lib/queries/keys';
import {
  FOUNDING_PASS_TIERS,
  FOUNDING_PASS_LIMITS,
  FOUNDING_PASS_TOTAL_LIMIT,
} from '@/lib/foundingPasses';
import type { FoundingPassTierDef } from '@/lib/foundingPasses';
import { grantFoundingPass, getHighestPass, getFoundingPassCounts } from '@/lib/services/foundingPasses';
import { centsToBsd } from '@/lib/services/players';
import type { FoundingPassTier, DbUserFoundingPass } from '@/types';

// ============================================
// Tier visual config + fee discount mapping
// ============================================

const FEE_DISCOUNT_BPS: Record<FoundingPassTier, number> = {
  fan: 25,
  scout: 50,
  pro: 75,
  founder: 100,
};

type TierVisual = {
  borderClass: string;
  textClass: string;
  bgClass: string;
  icon: React.ReactNode;
};

const TIER_VISUALS: Record<FoundingPassTier, TierVisual> = {
  fan: {
    borderClass: 'border-sky-500/20',
    textClass: 'text-sky-400',
    bgClass: 'bg-sky-500/[0.06]',
    icon: <Ticket className="size-6" />,
  },
  scout: {
    borderClass: 'border-emerald-500/20',
    textClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/[0.06]',
    icon: <Search className="size-6" />,
  },
  pro: {
    borderClass: 'border-purple-500/20',
    textClass: 'text-purple-400',
    bgClass: 'bg-purple-500/[0.06]',
    icon: <Zap className="size-6" />,
  },
  founder: {
    borderClass: 'border-gold/20',
    textClass: 'text-gold',
    bgClass: 'bg-gold/[0.06]',
    icon: <Crown className="size-6" />,
  },
};

// ============================================
// Page
// ============================================

export default function FoundingPassPage() {
  const { user, loading: authLoading } = useUser();
  const { addToast } = useToast();
  const t = useTranslations('founding');

  // State — all hooks BEFORE any early returns
  const [counts, setCounts] = useState<{ total: number; byTier: Record<FoundingPassTier, number> } | null>(null);
  const [userPass, setUserPass] = useState<DbUserFoundingPass | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [confirmTier, setConfirmTier] = useState<FoundingPassTierDef | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  // Load counts + user pass
  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const countsPromise = getFoundingPassCounts();
      const passPromise = user ? getHighestPass(user.id) : Promise.resolve(null);
      const [c, p] = await Promise.all([countsPromise, passPromise]);
      setCounts(c);
      setUserPass(p);
    } catch (err) {
      console.error('[FoundingPass] loadData error:', err);
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Purchase handler
  const handlePurchase = async () => {
    if (!user || !confirmTier) return;
    const uid = user.id;
    const tier = confirmTier.tier;
    const priceEurCents = confirmTier.priceEurCents;

    setPurchasing(true);
    try {
      // Pilot mode: Founding Passes granted without payment gateway (Sakaryaspor pilot).
      // Payment integration (Stripe/PayPal) deferred to post-pilot phase.
      const result = await grantFoundingPass(uid, tier, priceEurCents, 'pilot-grant');
      if (result.ok) {
        addToast(t('successToast'), 'celebration');
        queryClient.invalidateQueries({ queryKey: qk.foundingPasses.list(uid) });
        queryClient.invalidateQueries({ queryKey: qk.wallet.all });
        setConfirmTier(null);
        // Reload data to show updated state
        await loadData();
      } else {
        addToast(result.error ?? 'Error', 'error');
      }
    } catch (err) {
      console.error('[FoundingPass] purchase error:', err);
      addToast('Ein Fehler ist aufgetreten', 'error');
    } finally {
      setPurchasing(false);
    }
  };

  // Loading state
  if (authLoading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-gold motion-reduce:animate-none" />
      </div>
    );
  }

  const totalSold = counts?.total ?? 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
      {/* Header */}
      <div className="text-center mb-8 md:mb-12">
        <h1 className="text-2xl md:text-4xl font-black text-white mb-2">{t('title')}</h1>
        <p className="text-sm md:text-base text-white/60 max-w-lg mx-auto mb-4">{t('subtitle')}</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-subtle border border-white/10">
          <span className="text-sm font-mono tabular-nums text-white/80">
            {t('totalCounter', { count: fmtScout(totalSold), total: fmtScout(FOUNDING_PASS_TOTAL_LIMIT) })}
          </span>
        </div>
      </div>

      {/* Already member banner */}
      {userPass && (
        <Card surface="featured" className="p-6 mb-8 text-center">
          <ShieldCheck className="size-10 mx-auto mb-3 text-gold" />
          <h2 className="text-lg font-black text-white mb-1">{t('alreadyMember')}</h2>
          <p className="text-sm text-white/60 mb-3">
            {t('alreadyMemberDesc', { tier: FOUNDING_PASS_TIERS.find(td => td.tier === userPass.tier)?.name ?? userPass.tier })}
          </p>
          <FoundingPassBadge tier={userPass.tier as FoundingPassTier} size="md" />
        </Card>
      )}

      {/* Tier cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {FOUNDING_PASS_TIERS.map((tierDef) => (
          <TierCard
            key={tierDef.tier}
            tierDef={tierDef}
            visual={TIER_VISUALS[tierDef.tier]}
            soldCount={counts?.byTier[tierDef.tier] ?? 0}
            limit={FOUNDING_PASS_LIMITS[tierDef.tier]}
            userHasPass={!!userPass}
            isUserTier={userPass?.tier === tierDef.tier}
            loggedIn={!!user}
            onBuy={() => setConfirmTier(tierDef)}
            t={t}
          />
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-white/40 text-center max-w-2xl mx-auto leading-relaxed">
        {t('disclaimer')}
      </p>

      {/* Confirmation modal */}
      <Modal
        open={!!confirmTier}
        title={t('confirmTitle')}
        onClose={() => { if (!purchasing) setConfirmTier(null); }}
        preventClose={purchasing}
        size="sm"
        footer={
          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setConfirmTier(null)}
              disabled={purchasing}
            >
              {t('cancelButton')}
            </Button>
            <Button
              variant="gold"
              fullWidth
              loading={purchasing}
              onClick={handlePurchase}
            >
              {t('confirmButton')}
            </Button>
          </div>
        }
      >
        {confirmTier && (
          <div className="text-center py-2">
            <div className={cn('size-14 mx-auto mb-4 rounded-2xl flex items-center justify-center', TIER_VISUALS[confirmTier.tier].bgClass, TIER_VISUALS[confirmTier.tier].textClass)}>
              {TIER_VISUALS[confirmTier.tier].icon}
            </div>
            <p className="text-sm text-white/70 leading-relaxed">
              {t('confirmDesc', {
                tier: confirmTier.name,
                price: confirmTier.priceLabel,
                credits: fmtScout(centsToBsd(confirmTier.bcreditsCents)),
              })}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============================================
// TierCard component
// ============================================

function TierCard({
  tierDef,
  visual,
  soldCount,
  limit,
  userHasPass,
  isUserTier,
  loggedIn,
  onBuy,
  t,
}: {
  tierDef: FoundingPassTierDef;
  visual: TierVisual;
  soldCount: number;
  limit: number;
  userHasPass: boolean;
  isUserTier: boolean;
  loggedIn: boolean;
  onBuy: () => void;
  t: ReturnType<typeof useTranslations<'founding'>>;
}) {
  const isPopular = tierDef.tier === 'pro';
  const soldOut = soldCount >= limit;
  const disabled = userHasPass || soldOut || !loggedIn;

  return (
    <div className={cn(
      'relative rounded-2xl border bg-surface-minimal p-5 md:p-6 flex flex-col transition-colors',
      visual.borderClass,
      isUserTier && 'ring-2 ring-gold/30',
    )}>
      {/* Popular badge */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 rounded-full bg-purple-500 text-white text-xs font-bold shadow-lg">
            {t('popular')}
          </span>
        </div>
      )}

      {/* Icon + Name */}
      <div className="flex items-center gap-3 mb-4">
        <div className={cn('size-10 rounded-xl flex items-center justify-center flex-shrink-0', visual.bgClass, visual.textClass)}>
          {visual.icon}
        </div>
        <h3 className="text-lg font-black text-white">{tierDef.name}</h3>
      </div>

      {/* Price */}
      <div className="mb-4">
        <span className="text-2xl font-black font-mono tabular-nums text-white">{tierDef.priceLabel}</span>
      </div>

      {/* Key stats */}
      <div className="space-y-2 mb-5">
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-bold font-mono tabular-nums', visual.textClass)}>
            {t('credits', { amount: tierDef.bcreditsLabel })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/60">
            {t('feeDiscount', { bps: String(FEE_DISCOUNT_BPS[tierDef.tier]) })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-sm', visual.textClass)}>
            {t('migrationBonus', { pct: tierDef.migrationBonusPct })}
          </span>
        </div>
      </div>

      {/* Extras list */}
      <ul className="space-y-2 mb-6 flex-1">
        {tierDef.extras.map((extraKey) => (
          <li key={extraKey} className="flex items-start gap-2">
            <Check className={cn('size-4 mt-0.5 flex-shrink-0', visual.textClass)} />
            <span className="text-sm text-white/70">{t(extraKey.replace('founding.', '') as 'extraAccess')}</span>
          </li>
        ))}
      </ul>

      {/* CTA button */}
      <Button
        variant={tierDef.tier === 'founder' ? 'gold' : 'outline'}
        fullWidth
        onClick={onBuy}
        disabled={disabled}
        className={cn(
          !disabled && tierDef.tier !== 'founder' && 'hover:bg-white/[0.12]',
        )}
      >
        {!loggedIn
          ? t('loginRequired')
          : userHasPass
            ? (isUserTier ? t('alreadyMember') : t('alreadyMember'))
            : soldOut
              ? t('soldOut')
              : t('buyButton')}
      </Button>

      {/* Tier counter */}
      <div className="mt-3 text-center">
        <span className="text-xs text-white/40 font-mono tabular-nums">
          {t('tierCounter', { count: fmtScout(soldCount), limit: fmtScout(limit) })}
        </span>
      </div>
    </div>
  );
}
