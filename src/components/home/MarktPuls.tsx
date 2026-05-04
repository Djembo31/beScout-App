'use client';

import { memo, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { TabBar, TabPanel, type TabDef } from '@/components/ui/TabBar';
import { SectionHeader } from '@/components/home/helpers';
import OwnTopMoversStrip, { type OwnTopMover } from './OwnTopMoversStrip';
import TopMoversStrip from './TopMoversStrip';
import TrendingPlayersStrip from './TrendingPlayersStrip';
import MostWatchedStrip from './MostWatchedStrip';
import type { Player } from '@/types';
import type { TrendingPlayer } from '@/lib/services/trading';

// Slice 269 (D63 Phase 4) — Markt-Puls 3-Tab Discovery-Konsolidierung.
//
// 3 fragmentierte Sektionen (TopMoversWeek + TopMoversStrip + MostWatchedStrip)
// → 1 Section mit 3 Tabs: Movers / Trending / Watched.
//
// Architektur:
//   - Tab-Visibility-Filter: Tab nur in Bar wenn Inhalt vorhanden
//   - Tab-Default-Cascade: movers > trending > watched > null
//   - Tabs ohne Inhalt: NICHT gerendert (kein Empty-State-Tab)
//   - 0 visible Tabs → return null (Section unsichtbar)
//   - 1 visible Tab → SectionHeader + Strip ohne TabBar (kein Single-Tab-Slop)
//   - 2+ visible Tabs → SectionHeader + TabBar + TabPanel je active tab
//
// Pre-Review F-02 Hook-Hoist: watchedPlayers wird per Prop von page.tsx
// übergeben (statt zweitem useMostWatchedPlayers-Call hier) — Single-Source-
// Visibility-Decision ohne TanStack-Subscription-Overhead.
// Pre-Review F-04: !playersLoading-Gate für movers-Tab (sonst Mount-Flicker).

type TabId = 'movers' | 'trending' | 'watched';

interface MarktPulsProps {
  topMovers: OwnTopMover[];
  holdings: { playerId: string }[];
  players: Player[];
  hasGlobalMovers: boolean;
  trendingPlayers: TrendingPlayer[];
  /** Pre-Review F-02: hoisted from page.tsx for Single-Source-Visibility */
  watchedPlayers: { playerId: string }[];
  uid: string | undefined;
  /** Pre-Review F-04: gate movers-Tab against initial-mount flicker */
  playersLoading: boolean;
}

function MarktPulsInner({
  topMovers,
  holdings,
  players,
  hasGlobalMovers,
  trendingPlayers,
  watchedPlayers,
  uid,
  playersLoading,
}: MarktPulsProps) {
  const t = useTranslations('home');

  // Tab-Visibility-Logic (Pre-Review F-04 incl. playersLoading-Gate).
  const moversAvailable = !playersLoading && (holdings.length > 0 || hasGlobalMovers);
  const trendingAvailable = trendingPlayers.length > 0;
  const watchedAvailable = !!uid && watchedPlayers.length >= 2;

  const visibleTabs = useMemo<TabDef[]>(() => {
    const tabs: TabDef[] = [];
    if (moversAvailable) tabs.push({
      id: 'movers',
      label: t('marketPulseTabs.movers'),
      shortLabel: t('marketPulseTabs.moversShort'),
    });
    if (trendingAvailable) tabs.push({
      id: 'trending',
      label: t('marketPulseTabs.trending'),
      shortLabel: t('marketPulseTabs.trendingShort'),
    });
    if (watchedAvailable) tabs.push({
      id: 'watched',
      label: t('marketPulseTabs.watched'),
      shortLabel: t('marketPulseTabs.watchedShort'),
    });
    return tabs;
  }, [moversAvailable, trendingAvailable, watchedAvailable, t]);

  // Tab-Default-Cascade — first available wins.
  const defaultTabId = (visibleTabs[0]?.id ?? null) as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId | null>(defaultTabId);

  // If activeTab becomes invalid (e.g. content disappears), fall back to default.
  const effectiveActiveTab: TabId | null = activeTab && visibleTabs.some(t => t.id === activeTab)
    ? activeTab
    : defaultTabId;

  // 0 visible tabs → render nothing.
  if (visibleTabs.length === 0 || !effectiveActiveTab) return null;

  // Single-Tab-Render: kein TabBar, nur Section-Header + Inhalt (kein Slop).
  if (visibleTabs.length === 1) {
    return (
      <div>
        <SectionHeader title={t('marketPulse')} href="/market" />
        <div className="mt-2">
          {renderTabContent(effectiveActiveTab)}
        </div>
      </div>
    );
  }

  // Multi-Tab-Render: SectionHeader + TabBar + active TabPanel.
  return (
    <div>
      <SectionHeader title={t('marketPulse')} href="/market" />
      <div className="mt-3">
        <TabBar
          tabs={visibleTabs}
          activeTab={effectiveActiveTab}
          onChange={(id) => setActiveTab(id as TabId)}
        />
        <div className="mt-3">
          {visibleTabs.map(tab => (
            <TabPanel key={tab.id} id={tab.id} activeTab={effectiveActiveTab}>
              {renderTabContent(tab.id as TabId)}
            </TabPanel>
          ))}
        </div>
      </div>
    </div>
  );

  function renderTabContent(tab: TabId) {
    if (tab === 'movers') {
      return (
        <div className="space-y-3">
          <OwnTopMoversStrip topMovers={topMovers} hasHoldings={holdings.length > 0} />
          {hasGlobalMovers && <TopMoversStrip players={players} />}
        </div>
      );
    }
    if (tab === 'trending') {
      return <TrendingPlayersStrip trendingPlayers={trendingPlayers} players={players} />;
    }
    // 'watched' — F-NEW-01 inline-heal: showHeader={false} weil MarktPuls bereits SectionHeader rendert
    return uid ? <MostWatchedStrip userId={uid} showHeader={false} /> : null;
  }
}

export default memo(MarktPulsInner);
