'use client';

import React, { Suspense, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Package, Loader2, Swords, Sparkles, Gift } from 'lucide-react';
import dynamic from 'next/dynamic';

import { TabBar, TabPanel } from '@/components/ui/TabBar';
import { useUser } from '@/components/providers/AuthProvider';

// ============================================
// Dynamic imports — heavy sections lazy-loaded
// ============================================
const SectionSkeleton = () => (
  <div className="h-64 rounded-2xl bg-white/[0.02] border border-white/10 animate-pulse motion-reduce:animate-none" />
);

const EquipmentSection = dynamic(() => import('@/components/inventory/EquipmentSection'), {
  ssr: false,
  loading: () => <SectionSkeleton />,
});
const CosmeticsSection = dynamic(() => import('@/components/inventory/CosmeticsSection'), {
  ssr: false,
  loading: () => <SectionSkeleton />,
});
const WildcardsSection = dynamic(() => import('@/components/inventory/WildcardsSection'), {
  ssr: false,
  loading: () => <SectionSkeleton />,
});
const MysteryBoxHistorySection = dynamic(
  () => import('@/components/inventory/MysteryBoxHistorySection'),
  { ssr: false, loading: () => <SectionSkeleton /> },
);

// ============================================
// Tab IDs (deep-link via ?tab=)
// ============================================
type InventoryTab = 'equipment' | 'cosmetics' | 'wildcards' | 'history';
const VALID_TABS: readonly InventoryTab[] = ['equipment', 'cosmetics', 'wildcards', 'history'] as const;

function isValidTab(value: string | null): value is InventoryTab {
  return value !== null && (VALID_TABS as readonly string[]).includes(value);
}

// ============================================
// Inner content (uses useSearchParams → must be in Suspense)
// ============================================
function InventoryContent() {
  const t = useTranslations('inventory');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading } = useUser();

  const tabParam = searchParams.get('tab');
  const activeTab: InventoryTab = isValidTab(tabParam) ? tabParam : 'equipment';

  const handleTabChange = useCallback(
    (id: string) => {
      if (!isValidTab(id)) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const tabDefs = useMemo(
    () => [
      {
        id: 'equipment',
        label: t('tabEquipment'),
        shortLabel: t('tabEquipmentShort'),
        icon: <Swords className="size-4" aria-hidden="true" />,
      },
      {
        id: 'cosmetics',
        label: t('tabCosmetics'),
        shortLabel: t('tabCosmeticsShort'),
        icon: <Sparkles className="size-4" aria-hidden="true" />,
      },
      {
        id: 'wildcards',
        label: t('tabWildcards'),
        shortLabel: t('tabWildcardsShort'),
        icon: <Sparkles className="size-4" aria-hidden="true" />,
      },
      {
        id: 'history',
        label: t('tabHistory'),
        shortLabel: t('tabHistoryShort'),
        icon: <Gift className="size-4" aria-hidden="true" />,
      },
    ],
    [t],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-8 animate-spin motion-reduce:animate-none text-gold" aria-hidden="true" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-24 text-white/40 text-sm">
        {t('pageSubtitle')}
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6 space-y-6">
      {/* ===== Header ===== */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Package className="size-5 text-gold" aria-hidden="true" />
          <h1 className="text-xl font-black text-balance">{t('pageTitle')}</h1>
        </div>
        <p className="text-sm text-white/50 text-pretty">{t('pageSubtitle')}</p>
      </div>

      {/* ===== Tab Bar ===== */}
      <TabBar tabs={tabDefs} activeTab={activeTab} onChange={handleTabChange} />

      {/* ===== Tab Panels ===== */}
      <TabPanel id="equipment" activeTab={activeTab}>
        <EquipmentSection />
      </TabPanel>
      <TabPanel id="cosmetics" activeTab={activeTab}>
        <CosmeticsSection />
      </TabPanel>
      <TabPanel id="wildcards" activeTab={activeTab}>
        <WildcardsSection />
      </TabPanel>
      <TabPanel id="history" activeTab={activeTab}>
        <MysteryBoxHistorySection />
      </TabPanel>
    </div>
  );
}

// ============================================
// Page export — wraps in Suspense for useSearchParams
// ============================================
export default function InventoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <Loader2 className="size-8 animate-spin motion-reduce:animate-none text-gold" aria-hidden="true" />
        </div>
      }
    >
      <InventoryContent />
    </Suspense>
  );
}
