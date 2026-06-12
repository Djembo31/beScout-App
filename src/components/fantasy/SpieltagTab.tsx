'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Trophy, Calendar, Play, ArrowRight, Loader2, Target,
} from 'lucide-react';
import Image from 'next/image';
import { Card, Dialog } from '@/components/ui';
import { useTranslations } from 'next-intl';
import { getFixturesByGameweek } from '@/lib/services/fixtures';
import { simulateGameweekFlow, importProgressiveStats, finalizeGameweek } from '@/lib/services/scoring';
import { isApiConfigured, hasApiFixtures } from '@/lib/services/footballData';
import type { Fixture } from '@/types';
import type { FantasyEvent, FantasyTab } from './types';
import dynamic from 'next/dynamic';
const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), { ssr: false });
import { TopspielCard, pickTopspiel } from './spieltag';
import { SpieltagPulse } from './spieltag/SpieltagPulse';
import { SpieltagBrowser } from './spieltag/SpieltagBrowser';
import { FixtureDetailModal } from './spieltag/FixtureDetailModal';
import { useLiveFixtures } from '@/features/fantasy/hooks/useLiveFixtures';

// ============================================
// SpieltagTab (3-Zone Layout)
// ============================================

type SpieltagTabProps = {
  gameweek: number;
  activeGameweek: number;
  clubId: string;
  /** Liga-filter: wenn gesetzt werden nur Fixtures dieser Liga geladen. */
  leagueId?: string | null;
  isAdmin: boolean;
  events: FantasyEvent[];
  userId: string;
  onSimulated: () => void;
  onTabChange?: (tab: FantasyTab) => void;
};

export function SpieltagTab({
  gameweek, activeGameweek, clubId, leagueId, isAdmin, events, userId,
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
  // Slice 273 Track C — Snapshot-State ersetzt durch ID-Selektion + derived-from-fixtures.
  // Pre-Slice-273: selectedFixture als Fixture-Snapshot war stale wenn useLiveFixtures
  // den fixtures[]-Array via setFixtures patched (Realtime-Update auf score/minute/status).
  // Modal sah weiterhin den alten Snapshot → Score-Header und MVP zeigten stale Werte.
  // Slice 273: selectedFixtureId ist die einzige State-Source-of-Truth, das Modal-fixture
  // wird per-render aus aktuellem fixtures[]-Array abgeleitet → atomar synchron.
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);
  const [apiAvailable, setApiAvailable] = useState(false);

  // Load fixtures for current GW (league-scoped when leagueId is provided)
  const loadFixtures = useCallback(async (gw: number, lgId?: string | null) => {
    setFixturesLoading(true);
    try {
      const data = await getFixturesByGameweek(gw, lgId ?? null);
      setFixtures(data);
    } catch {
      setFixtures([]);
    }
    setFixturesLoading(false);
  }, []);

  useEffect(() => {
    loadFixtures(gameweek, leagueId);
  }, [gameweek, leagueId, loadFixtures]);

  // Slice 267 — Realtime-Subscription auf fixtures-UPDATE für aktive Liga.
  // Hook subscribes side-effect-only. onUpdate bridge zu local-fixtures-state:
  // patcht matching row in-place (kein refetch nötig — payload ist deterministisch).
  // Bei status='finished' triggern wir reload um Bucket-Resort sauber zu erzwingen
  // (Live → Finished in SpieltagBrowser).
  const { isPolling: liveChannelPolling } = useLiveFixtures(leagueId ?? undefined, {
    onUpdate: (updatedRow) => {
      setFixtures((prev) => {
        const idx = prev.findIndex((f) => f.id === updatedRow.id);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], ...updatedRow };
        return next;
      });
      if (updatedRow.status === 'finished') {
        // Status-Transition triggert kompletten Refetch für Bucket-Resort
        // (Live-Bucket → Finished-Bucket in SpieltagBrowser).
        loadFixtures(gameweek, leagueId);
      }
    },
  });

  // Polling-Fallback X1 (Spec §2, F-08): bei Channel-Error/Timeout/Close
  // alle 60s manuell reload, bis Channel wieder SUBSCRIBED ist.
  useEffect(() => {
    if (!liveChannelPolling) return;
    const interval = setInterval(() => {
      loadFixtures(gameweek, leagueId);
    }, 60_000);
    return () => clearInterval(interval);
  }, [liveChannelPolling, gameweek, leagueId, loadFixtures]);

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
  // Review-284a-F-04: cancelled zählt als komplett — sonst hält ein abgesagtes
  // Spiel den grünen „Offen"-Pulse für immer (FANT-07-Symptomklasse).
  const simulatedCount = fixtures.filter(f => f.status === 'simulated' || f.status === 'finished' || f.status === 'cancelled').length;
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

  // Topspiel selection (liga-scoped: sponsor > club > highest-score > first)
  const topspiel = useMemo(
    () => pickTopspiel(fixtures, clubId, leagueId),
    [fixtures, clubId, leagueId]
  );
  const otherFixtures = useMemo(() => {
    if (!topspiel) return fixtures;
    return fixtures.filter(f => f.id !== topspiel.id);
  }, [fixtures, topspiel]);

  // Slice 273 Track C — Derive selectedFixture from current fixtures[].
  // Atomar synchron mit useLiveFixtures.onUpdate-Patches: Modal sieht immer
  // aktuellen Score/Status/Minute weil das Fixture-Object der useState-Quelle entstammt.
  const selectedFixture = useMemo(
    () => (selectedFixtureId ? fixtures.find(f => f.id === selectedFixtureId) ?? null : null),
    [selectedFixtureId, fixtures],
  );

  const handleImport = async () => {
    if (!isAdmin || importing) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await importProgressiveStats(clubId, gameweek, userId);
      if (result.fixturesImported > 0 || result.scoresSynced > 0) {
        await loadFixtures(gameweek, leagueId);
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
        await loadFixtures(gameweek, leagueId);
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
        await loadFixtures(gameweek, leagueId);
        onSimulated();
      }
      if (result.errors.length > 0) {
        console.warn('[Spieltag] Simulation warnings:', result.errors);
      }
    } catch { /* handled via toast in parent */ }
    setSimulating(false);
  };

  return (
    <div className="space-y-4">
      {/* ADMIN ACTION ROW (Slice 251 Wave 6 — League-Selector entfernt, SSOT in LeagueScopeHeader) */}
      {isAdmin && (
        <div className="flex items-center justify-end gap-2">
          {isCurrentGw && apiAvailable && gwEvents.length > 0 && !allEnded && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-sky-500/10 border border-sky-500/30 rounded-xl text-xs font-bold text-sky-400 hover:bg-sky-500/20 disabled:opacity-50 transition-colors"
            >
              {importing ? <Loader2 aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" /> : <ArrowRight aria-hidden="true" className="size-3.5" />}
              {ts('importBtn', { count: finishedCount, total: fixtures.length })}
            </button>
          )}
          {isCurrentGw && allFixturesFinished && !allEnded && gwEvents.length > 0 && (
            <button
              onClick={() => setShowFinalizeConfirm(true)}
              disabled={simulating}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-gold/10 border border-gold/30 rounded-xl text-xs font-bold text-gold hover:bg-gold/20 disabled:opacity-50 transition-colors"
            >
              {simulating ? <Loader2 aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" /> : <Trophy aria-hidden="true" className="size-3.5" />}
              {ts('finalizeBtn')}
            </button>
          )}
          {isCurrentGw && !apiAvailable && gwStatus === 'open' && gwEvents.length > 0 && (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={simulating}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-gold/10 border border-gold/30 rounded-xl text-xs font-bold text-gold hover:bg-gold/20 disabled:opacity-50 transition-colors"
            >
              {simulating ? <Loader2 aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" /> : <Play aria-hidden="true" className="size-3.5" />}
              {ts('startSimulation')}
            </button>
          )}
          {gwStatus === 'simulated' && isCurrentGw && (
            <span className="text-xs text-green-500 font-bold px-2 py-1 bg-green-500/10 rounded-lg">{ts('gwSimulatedLabel')}</span>
          )}
        </div>
      )}

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
              onSelect={(f) => setSelectedFixtureId(f.id)}
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
              onSelect={(f) => setSelectedFixtureId(f.id)}
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
      <Dialog open={showConfirm} title={ts('startGameweekBtn')} onClose={() => setShowConfirm(false)}>
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
      </Dialog>

      <Dialog open={showFinalizeConfirm} title={ts('finalizeTitle')} onClose={() => setShowFinalizeConfirm(false)}>
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
      </Dialog>

      <FixtureDetailModal
        fixture={selectedFixture}
        isOpen={!!selectedFixture}
        onClose={() => setSelectedFixtureId(null)}
        sponsorName={events.find(e => e.sponsorName)?.sponsorName}
        sponsorLogo={events.find(e => e.sponsorLogo)?.sponsorLogo}
      />
    </div>
  );
}
