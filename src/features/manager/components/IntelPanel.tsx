'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlayerPhoto, PositionBadge, getL5Color } from '@/components/player/index';
import { Modal } from '@/components/ui/index';
import type { Pos } from '@/types';
import StatsTab from './intel/StatsTab';
import FormTab from './intel/FormTab';
import MarktTab from './intel/MarktTab';

// ============================================
// TYPES
// ============================================

interface IntelPlayer {
  id: string;
  first_name: string;
  last_name: string;
  position: Pos;
  perf_l5: number | null;
  perf_l15: number | null;
  age: number | null;
  shirt_number: number | null;
  club_name: string | null;
  status?: string;
  matches_played?: number;
  goals?: number;
  assists?: number;
  minutes_played?: number;
  floor_price?: number;
  avg_buy_price?: number;
  quantity_held?: number;
  price_change_7d_pct?: number;
}

type IntelTab = 'stats' | 'form' | 'markt';

interface IntelPanelProps {
  player: IntelPlayer | null;
  nextFixture: { opponent: string; isHome: boolean; date: string } | null;
  recentScores: number[];
  activeTab: IntelTab;
  onTabChange: (tab: IntelTab) => void;
  onClose: () => void;
}

// ============================================
// TAB CONFIG
// ============================================

const TABS: { key: IntelTab; label: string }[] = [
  { key: 'stats', label: 'Stats' },
  { key: 'form', label: 'Form' },
  { key: 'markt', label: 'Markt' },
];

// ============================================
// SUB-COMPONENTS
// ============================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
      <p className="text-white/50 text-sm font-semibold mb-1">Kein Spieler ausgewaehlt</p>
      <p className="text-white/30 text-xs">
        Tippe auf einen Spieler im Spielfeld oder in der Kader-Leiste
      </p>
    </div>
  );
}

function PlayerHeader({
  player,
  activeTab,
  onTabChange,
  onClose,
}: {
  player: IntelPlayer;
  activeTab: IntelTab;
  onTabChange: (tab: IntelTab) => void;
  onClose: () => void;
}) {
  return (
    <div className="mb-4">
      {/* Top row: photo + name + close */}
      <div className="flex items-start gap-3 mb-3">
        <PlayerPhoto
          first={player.first_name}
          last={player.last_name}
          pos={player.position}
          size={48}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-black text-base truncate">
              {player.first_name} {player.last_name}
            </h2>
            <button
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Panel schliessen"
            >
              <X className="size-4 text-white/50" aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <PositionBadge pos={player.position} size="sm" />
            {player.club_name && (
              <span className="text-white/40 text-xs">{player.club_name}</span>
            )}
            {player.shirt_number != null && (
              <span className="text-white/40 text-xs font-mono">#{player.shirt_number}</span>
            )}
          </div>

          {/* L5 / L15 */}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-white/40">L5:</span>
            <span className={cn(
              'text-xs font-mono tabular-nums font-semibold',
              getL5Color(player.perf_l5 ?? 0)
            )}>
              {player.perf_l5 ?? '-'}
            </span>
            <span className="text-xs text-white/40">L15:</span>
            <span className={cn(
              'text-xs font-mono tabular-nums font-semibold',
              getL5Color(player.perf_l15 ?? 0)
            )}>
              {player.perf_l15 ?? '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-4 border-b border-white/[0.06]">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={cn(
              'pb-2 text-sm font-semibold transition-colors flex-shrink-0 min-h-[44px] flex items-center',
              activeTab === tab.key
                ? 'text-gold border-b-2 border-gold'
                : 'text-white/40 hover:text-white/60'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TabContent({
  player,
  activeTab,
  nextFixture,
  recentScores,
}: {
  player: IntelPlayer;
  activeTab: IntelTab;
  nextFixture: { opponent: string; isHome: boolean; date: string } | null;
  recentScores: number[];
}) {
  switch (activeTab) {
    case 'stats':
      return (
        <StatsTab
          matchesPlayed={player.matches_played ?? 0}
          goals={player.goals ?? 0}
          assists={player.assists ?? 0}
          minutesPlayed={player.minutes_played ?? 0}
          status={player.status}
          nextFixture={nextFixture}
          age={player.age}
        />
      );
    case 'form':
      return <FormTab recentScores={recentScores} />;
    case 'markt':
      return (
        <MarktTab
          playerId={player.id}
          floorPrice={player.floor_price ?? 0}
          avgBuyPrice={player.avg_buy_price ?? 0}
          quantityHeld={player.quantity_held ?? 0}
          priceChange7dPct={player.price_change_7d_pct ?? null}
        />
      );
  }
}

// ============================================
// PANEL CONTENT (shared between desktop/mobile)
// ============================================

function PanelContent({
  player,
  activeTab,
  onTabChange,
  onClose,
  nextFixture,
  recentScores,
}: {
  player: IntelPlayer;
  activeTab: IntelTab;
  onTabChange: (tab: IntelTab) => void;
  onClose: () => void;
  nextFixture: { opponent: string; isHome: boolean; date: string } | null;
  recentScores: number[];
}) {
  return (
    <>
      <PlayerHeader
        player={player}
        activeTab={activeTab}
        onTabChange={onTabChange}
        onClose={onClose}
      />
      <TabContent
        player={player}
        activeTab={activeTab}
        nextFixture={nextFixture}
        recentScores={recentScores}
      />
    </>
  );
}

// ============================================
// MAIN EXPORT
// ============================================

export default function IntelPanel({
  player,
  nextFixture,
  recentScores,
  activeTab,
  onTabChange,
  onClose,
}: IntelPanelProps) {
  // --- Desktop: static sidebar ---
  const desktopPanel = (
    <aside className="hidden lg:flex flex-col w-[340px] bg-white/[0.02] border-l border-white/10 p-4 h-full overflow-y-auto">
      {player ? (
        <PanelContent
          player={player}
          activeTab={activeTab}
          onTabChange={onTabChange}
          onClose={onClose}
          nextFixture={nextFixture}
          recentScores={recentScores}
        />
      ) : (
        <EmptyState />
      )}
    </aside>
  );

  // --- Mobile: Modal bottom sheet ---
  const mobilePanel = (
    <div className="lg:hidden">
      <Modal
        open={!!player}
        title={player ? `${player.first_name} ${player.last_name}` : ''}
        onClose={onClose}
        size="md"
      >
        {player && (
          <PanelContent
            player={player}
            activeTab={activeTab}
            onTabChange={onTabChange}
            onClose={onClose}
            nextFixture={nextFixture}
            recentScores={recentScores}
          />
        )}
      </Modal>
    </div>
  );

  return (
    <>
      {desktopPanel}
      {mobilePanel}
    </>
  );
}
