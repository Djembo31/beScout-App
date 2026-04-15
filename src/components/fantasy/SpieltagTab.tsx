'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Trophy, Calendar, Play, ArrowRight, ChevronDown, Loader2, Target,
} from 'lucide-react';
import Image from 'next/image';
import { Card, Modal } from '@/components/ui';
import { LeagueBadge } from '@/components/ui/LeagueBadge';
import { useTranslations } from 'next-intl';
import { getFixturesByGameweek } from '@/lib/services/fixtures';
import { simulateGameweekFlow, importProgressiveStats, finalizeGameweek } from '@/lib/services/scoring';
import { isApiConfigured, hasApiFixtures } from '@/lib/services/footballData';
import { getActiveLeagues } from '@/lib/leagues';
import type { Fixture, League } from '@/types';
import type { FantasyEvent, FantasyTab } from './types';
import dynamic from 'next/dynamic';
const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), { ssr: false });
import { TopspielCard, pickTopspiel } from './spieltag';
import { SpieltagPulse } from './spieltag/SpieltagPulse';
import { SpieltagBrowser } from './spieltag/SpieltagBrowser';
import { FixtureDetailModal } from './spieltag/FixtureDetailModal';

// Static fallback for the edge case where the league cache isn't ready yet.
// Once initLeagueCache() populates, getActiveLeagues() replaces this.
const LEAGUE_FALLBACK: League = {
  id: 'fallback-tff1',
  name: 'TFF 1. Lig',
  short: 'TFF',
  country: 'TR',
  season: '2025/26',
  logoUrl: null,
  apiFootballId: 204,
  activeGameweek: 1,
  maxGameweeks: 34,
  isActive: true,
};

// ============================================
// SpieltagTab (3-Zone Layout)
// ============================================

type SpieltagTabProps = {
  gameweek: number;
  activeGameweek: number;
  clubId: string;
  isAdmin: boolean;
  events: FantasyEvent[];
  userId: string;
  onSimulated: () => void;
  onTabChange?: (tab: FantasyTab) => void;
};

export function SpieltagTab({
  gameweek, activeGameweek, clubId, isAdmin, events, userId,
  onSimulated, onTabChange,
}: SpieltagTabProps) {
  const ts = useTranslations('spieltag');
  const tc = useTranslations('common');
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [fixturesLoading, setFixturesLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [apiAvailable, setApiAvailable] = useState(false);
  // Load leagues from cache (populated in root layout). Fallback keeps the
  // selector from rendering empty on first paint.
  const availableLeagues = useMemo<League[]>(() => {
    const cached = getActiveLeagues();
    return cached.length > 0 ? cached : [LEAGUE_FALLBACK];
  }, []);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(availableLeagues[0].id);

  // Load fixtures for current GW
  const loadFixtures = useCallback(async (gw: number) => {
    setFixturesLoading(true);
    try {
      const data = await getFixturesByGameweek(gw);
      setFixtures(data);
    } catch {
      setFixtures([]);
    }
    setFixturesLoading(false);
  }, []);

  useEffect(() => {
    loadFixtures(gameweek);
  }, [gameweek, loadFixtures]);

  // Check if API import is available for this gameweek
  useEffect(() => {
    if (!isAdmin || !isApiConfigured()) {
      setApiAvailable(false);
      return;
    }
    let cancelled = false;
    hasApiFixtures(gameweek).then(avail => {
      if (!cancelled) setApiAvailable(avail);
    }).catch((err) => {
      console.error('[SpieltagTab] Failed to check API availability:', err);
      if (!cancelled) setApiAvailable(false);
    });
    return () => { cancelled = true; };
  }, [gameweek, isAdmin]);

  // Derived state
  const simulatedCount = fixtures.filter(f => f.status === 'simulated' || f.status === 'finished').length;
  const finishedCount = fixtures.filter(f => f.status === 'finished').length;
  const allFixturesFinished = finishedCount === fixtures.length && fixtures.length > 0;
  const gwEvents = events;
  const allEnded = gwEvents.length > 0 && gwEvents.every(e => e.status === 'ended' || e.scoredAt);
  const isCurrentGw = gameweek === activeGameweek;
  const allSimulated = simulatedCount === fixtures.length && fixtures.length > 0;

  const gwStatus: 'open' | 'simulated' | 'empty' =
    allSimulated ? 'simulated'
    : allEnded && simulatedCount > 0 ? 'simulated'
    : gwEvents.length === 0 && fixtures.length === 0 ? 'empty'
    : 'open';

  // Topspiel selection
  const topspiel = useMemo(() => pickTopspiel(fixtures, clubId), [fixtures, clubId]);
  const otherFixtures = useMemo(() => {
    if (!topspiel) return fixtures;
    return fixtures.filter(f => f.id !== topspiel.id);
  }, [fixtures, topspiel]);

  const handleImport = async () => {
    if (!isAdmin || importing) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await importProgressiveStats(clubId, gameweek, userId);
      if (result.fixturesImported > 0 || result.scoresSynced > 0) {
        await loadFixtures(gameweek);
      }
      setImportResult(ts('importResult', { fixtures: result.fixturesImported, scores: result.scoresSynced }));
      if (result.errors.length > 0) {
        console.warn('[Spieltag] Import warnings:', result.errors);
      }
    } catch (e) {
      setImportResult(ts('importError', { message: e instanceof Error ? e.message : 'Unknown' }));
    }
    setImporting(false);
  };

  const handleFinalize = async () => {
    if (!isAdmin || simulating) return;
    setShowFinalizeConfirm(false);
    setSimulating(true);
    try {
      const result = await finalizeGameweek(clubId, gameweek, userId);
      if (result.eventsScored > 0) {
        await loadFixtures(gameweek);
        onSimulated();
      }
      if (result.errors.length > 0) {
        console.warn('[Spieltag] Finalize warnings:', result.errors);
      }
    } catch { /* handled via toast in parent */ }
    setSimulating(false);
  };

  const handleSimulate = async () => {
    if (!isAdmin || simulating) return;
    setShowConfirm(false);
    setSimulating(true);
    try {
      const result = await simulateGameweekFlow(clubId, gameweek, userId);
      if (result.eventsScored > 0 || result.fixturesSimulated > 0) {
        await loadFixtures(gameweek);
        onSimulated();
      }
      if (result.errors.length > 0) {
        console.warn('[Spieltag] Simulation warnings:', result.errors);
      }
    } catch { /* handled via toast in parent */ }
    setSimulating(false);
  };

  const activeLeague = availableLeagues.find(l => l.id === selectedLeagueId) ?? availableLeagues[0];
  const hasMultipleLeagues = availableLeagues.length > 1;

  return (
    <div className="space-y-4">
      {/* ADMIN ROW: League selector + action buttons */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative">
          <button
            className="flex items-center gap-2 px-3 py-2 min-h-[40px] bg-surface-subtle border border-white/[0.08] rounded-xl text-sm font-semibold hover:bg-white/[0.06] transition-colors"
            aria-label={activeLeague.name}
            disabled={!hasMultipleLeagues}
          >
            <LeagueBadge
              logoUrl={activeLeague.logoUrl}
              name={activeLeague.name}
              short={activeLeague.short}
              size="sm"
            />
            {hasMultipleLeagues && <ChevronDown aria-hidden="true" className="size-3.5 text-white/30" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && isCurrentGw && apiAvailable && gwEvents.length > 0 && !allEnded && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-sky-500/10 border border-sky-500/30 rounded-xl text-xs font-bold text-sky-400 hover:bg-sky-500/20 disabled:opacity-50 transition-colors"
            >
              {importing ? <Loader2 aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" /> : <ArrowRight aria-hidden="true" className="size-3.5" />}
              {ts('importBtn', { count: finishedCount, total: fixtures.length })}
            </button>
          )}
          {isAdmin && isCurrentGw && allFixturesFinished && !allEnded && gwEvents.length > 0 && (
            <button
              onClick={() => setShowFinalizeConfirm(true)}
              disabled={simulating}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-gold/10 border border-gold/30 rounded-xl text-xs font-bold text-gold hover:bg-gold/20 disabled:opacity-50 transition-colors"
            >
              {simulating ? <Loader2 aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" /> : <Trophy aria-hidden="true" className="size-3.5" />}
              {ts('finalizeBtn')}
            </button>
          )}
          {isAdmin && isCurrentGw && !apiAvailable && gwStatus === 'open' && gwEvents.length > 0 && (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={simulating}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-gold/10 border border-gold/30 rounded-xl text-xs font-bold text-gold hover:bg-gold/20 disabled:opacity-50 transition-colors"
            >
              {simulating ? <Loader2 aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" /> : <Play aria-hidden="true" className="size-3.5" />}
              {ts('startSimulation')}
            </button>
          )}
          {isAdmin && gwStatus === 'simulated' && isCurrentGw && (
            <span className="text-xs text-green-500 font-bold px-2 py-1 bg-green-500/10 rounded-lg">{ts('gwSimulatedLabel')}</span>
          )}
        </div>
      </div>

      {/* Import Result Toast */}
      {importResult && (
        <div className="flex items-center justify-between p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl">
          <span className="text-xs text-sky-300 font-medium">{importResult}</span>
          <button onClick={() => setImportResult(null)} className="text-xs text-white/40 hover:text-white/60 transition-colors" aria-label={tc('closeLabel')}>✕</button>
        </div>
      )}

      {/* ZONE 1: Pulse — GW stats at a glance */}
      {!fixturesLoading && fixtures.length > 0 && (
        <div className="card-entrance" style={{ animationDelay: '0s' }}>
          <SpieltagPulse fixtures={fixtures} gwStatus={gwStatus} />
        </div>
      )}

      {/* Sponsor Banner */}
      <SponsorBanner placement="fantasy_spieltag" />

      {/* Prediction CTA — nudge users to Mitmachen tab */}
      {onTabChange && fixtures.length > 0 && !fixturesLoading && gwStatus !== 'simulated' && (
        <button
          onClick={() => onTabChange('mitmachen')}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-amber-500/[0.06] border border-amber-500/15 rounded-xl hover:bg-amber-500/10 transition-colors group"
        >
          <Target className="size-4 text-amber-400 flex-shrink-0" aria-hidden="true" />
          <span className="text-xs text-white/50 group-hover:text-white/70 transition-colors">{ts('predictionCta')}</span>
          <ArrowRight className="size-3.5 text-white/20 ml-auto flex-shrink-0" aria-hidden="true" />
        </button>
      )}

      {/* ZONE 2: Spotlight — Topspiel hero card */}
      {topspiel && !fixturesLoading && (
        <>
          <div className="floodlight-divider" />
          <div className="card-entrance" style={{ animationDelay: '0.1s' }}>
            <TopspielCard
              fixture={topspiel}
              userClubId={clubId}
              onSelect={(f) => setSelectedFixture(f)}
            />
          </div>
        </>
      )}

      {/* ZONE 3: Browser — Grouped fixture list */}
      {!fixturesLoading && otherFixtures.length > 0 && (
        <>
          <div className="floodlight-divider" />
          <div className="card-entrance" style={{ animationDelay: '0.2s' }}>
            <SpieltagBrowser
              fixtures={otherFixtures}
              onSelect={(f) => setSelectedFixture(f)}
            />
          </div>
        </>
      )}

      {/* Loading State — BeScout logo pulse */}
      {fixturesLoading && (
        <Card className="p-12 flex items-center justify-center">
          <Image
            src="/icons/bescout_icon_premium.svg"
            alt=""
            width={48}
            height={48}
            className="animate-pulse motion-reduce:animate-none opacity-30"
          />
        </Card>
      )}

      {/* Empty State */}
      {!fixturesLoading && fixtures.length === 0 && (
        <Card className="p-12 text-center">
          <Calendar aria-hidden="true" className="size-12 mx-auto mb-4 text-white/20" />
          <div className="text-white/50 mb-1">{ts('noActivity', { gw: gameweek })}</div>
          <div className="text-white/30 text-xs">{ts('noActivityDesc')}</div>
        </Card>
      )}

      {/* MODALS */}
      <Modal open={showConfirm} title={ts('startGameweekBtn')} onClose={() => setShowConfirm(false)}>
        <div className="space-y-4 p-2">
          <p className="text-sm text-white/70">
            {ts('finalizeDesc', { gw: gameweek })}
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-sky-400 mt-0.5">1.</span>
              <span>{ts('fixtureCount', { count: fixtures.length })}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gold mt-0.5">2.</span>
              <span>{ts('finalizeStep1Simple')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">3.</span>
              <span>{ts('finalizeStep2', { nextGw: gameweek + 1 })}</span>
            </li>
          </ul>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 px-4 py-2.5 min-h-[44px] bg-surface-base border border-white/10 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors"
            >
              {ts('cancelBtn')}
            </button>
            <button
              onClick={handleSimulate}
              className="flex-1 px-4 py-2.5 min-h-[44px] bg-gold/10 border border-gold/30 rounded-xl text-sm font-bold text-gold hover:bg-gold/20 transition-colors"
            >
              {ts('startGameweekBtn')}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={showFinalizeConfirm} title={ts('finalizeTitle')} onClose={() => setShowFinalizeConfirm(false)}>
        <div className="space-y-4 p-2">
          <p className="text-sm text-white/70">
            {ts('finalizeDesc', { gw: gameweek })}
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-gold mt-0.5">1.</span>
              <span>{ts('finalizeStep1')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">2.</span>
              <span>{ts('finalizeStep2', { nextGw: gameweek + 1 })}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-sky-400 mt-0.5">3.</span>
              <span>{ts('finalizeStep3', { nextGw: gameweek + 1 })}</span>
            </li>
          </ul>
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            {ts('finalizeWarning')}
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setShowFinalizeConfirm(false)}
              className="flex-1 px-4 py-2.5 min-h-[44px] bg-surface-base border border-white/10 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors"
            >
              {ts('cancelBtn')}
            </button>
            <button
              onClick={handleFinalize}
              className="flex-1 px-4 py-2.5 min-h-[44px] bg-gold/10 border border-gold/30 rounded-xl text-sm font-bold text-gold hover:bg-gold/20 transition-colors"
            >
              {ts('finalizeNowBtn')}
            </button>
          </div>
        </div>
      </Modal>

      <FixtureDetailModal
        fixture={selectedFixture}
        isOpen={!!selectedFixture}
        onClose={() => setSelectedFixture(null)}
        sponsorName={events.find(e => e.sponsorName)?.sponsorName}
        sponsorLogo={events.find(e => e.sponsorLogo)?.sponsorLogo}
      />
    </div>
  );
}
