'use client';

import React, { useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Flame,
  Shield,
  Eye,
  Crown,
  Banana,
  Swords,
  Loader2,
  Package,
  Lock,
  ArrowDownUp,
} from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useUser } from '@/components/providers/AuthProvider';
import {
  useUserEquipment,
  useEquipmentDefinitions,
  useEquipmentRanks,
} from '@/lib/queries/equipment';
import { EQUIPMENT_POSITION_COLORS } from '@/components/gamification/rarityConfig';
import { resolveEquipmentName } from '@/components/gamification/equipmentNames';
import type { DbUserEquipment, DbEquipmentDefinition, EquipmentPosition } from '@/types';
import EquipmentDetailModal from './EquipmentDetailModal';

// ============================================
// EQUIPMENT ICONS — duplicated from EquipmentPicker.tsx
// (duplication acceptable per task spec)
// ============================================
const EQUIPMENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  flame: Flame,
  shield: Shield,
  eye: Eye,
  crown: Crown,
  banana: Banana,
};

function getEquipmentIcon(iconName: string | null): React.ComponentType<{ className?: string }> {
  return EQUIPMENT_ICONS[iconName ?? ''] ?? Swords;
}

// ============================================
// View modes
// ============================================
type ViewMode = 'all' | 'active' | 'consumed';
type PositionFilter = 'all' | EquipmentPosition;
type SortMode = 'rank_desc' | 'rank_asc' | 'recent';

// ============================================
// Helpers
// ============================================

type GroupEntry = {
  def: DbEquipmentDefinition;
  rank: number;
  items: DbUserEquipment[];
};

/** Group non-consumed items by equipment_key + rank */
function groupActive(
  inventory: DbUserEquipment[],
  definitions: DbEquipmentDefinition[],
): GroupEntry[] {
  const map = new Map<string, GroupEntry>();
  for (const eq of inventory) {
    if (eq.consumed_at) continue;
    const key = `${eq.equipment_key}_${eq.rank}`;
    const existing = map.get(key);
    if (existing) {
      existing.items.push(eq);
    } else {
      const def = definitions.find(d => d.key === eq.equipment_key);
      if (def) map.set(key, { def, rank: eq.rank, items: [eq] });
    }
  }
  return Array.from(map.values());
}

/** Group consumed items by equipment_key + rank */
function groupConsumed(
  inventory: DbUserEquipment[],
  definitions: DbEquipmentDefinition[],
): GroupEntry[] {
  const map = new Map<string, GroupEntry>();
  for (const eq of inventory) {
    if (!eq.consumed_at) continue;
    const key = `${eq.equipment_key}_${eq.rank}`;
    const existing = map.get(key);
    if (existing) {
      existing.items.push(eq);
    } else {
      const def = definitions.find(d => d.key === eq.equipment_key);
      if (def) map.set(key, { def, rank: eq.rank, items: [eq] });
    }
  }
  return Array.from(map.values());
}

function sortGroups(groups: GroupEntry[], sort: SortMode, locale: string): GroupEntry[] {
  const out = [...groups];
  const nameOf = (g: GroupEntry) => resolveEquipmentName(g.def, locale);
  // FIX-12: localeCompare nutzt locale-Param fuer korrekte TR-Unicode-Order (ş/ç/ğ/ı/ö/ü).
  switch (sort) {
    case 'rank_desc':
      out.sort((a, b) => b.rank - a.rank || nameOf(a).localeCompare(nameOf(b), locale));
      break;
    case 'rank_asc':
      out.sort((a, b) => a.rank - b.rank || nameOf(a).localeCompare(nameOf(b), locale));
      break;
    case 'recent':
      out.sort((a, b) => {
        const aTs = [...a.items].sort((x, y) => y.acquired_at.localeCompare(x.acquired_at))[0]?.acquired_at ?? '';
        const bTs = [...b.items].sort((x, y) => y.acquired_at.localeCompare(x.acquired_at))[0]?.acquired_at ?? '';
        return bTs.localeCompare(aTs);
      });
      break;
  }
  return out;
}

// ============================================
// EquipmentSection Component
// ============================================
export default function EquipmentSection() {
  const t = useTranslations('inventory');
  const locale = useLocale();
  const { user } = useUser();
  const uid = user?.id;

  // Consumed view needs the "includeConsumed" variant → separate query key
  const { data: invActive = [], isLoading: invActiveLoading } = useUserEquipment(uid);
  const { data: invAll = [], isLoading: invAllLoading } = useUserEquipment(uid, true);
  const { data: definitions = [], isLoading: defLoading } = useEquipmentDefinitions();
  const { data: ranks = [], isLoading: rankLoading } = useEquipmentRanks();

  const loading = invActiveLoading || invAllLoading || defLoading || rankLoading;

  // ── UI state ──
  const [mode, setMode] = useState<ViewMode>('all');
  const [posFilter, setPosFilter] = useState<PositionFilter>('all');
  const [sort, setSort] = useState<SortMode>('rank_desc');
  const [selected, setSelected] = useState<GroupEntry | null>(null);

  // ── Rank multiplier labels ──
  // FIX-10: Wenn `equipment_ranks` leer ist (DB-Query pending oder RLS-Lockdown),
  // bleibt der Fallback für die bekannten Beta-Ranks R1-R4 aktiv. Sobald Admin
  // via `equipment_ranks` einen neuen Rank (R5+) addet, wird dieser genutzt.
  const multiplierLabels = useMemo<Record<number, string>>(() => {
    // Ohne DB-Daten: konservative Defaults für bekannte Ranks.
    if (ranks.length === 0) {
      return { 1: '×1.05', 2: '×1.10', 3: '×1.15', 4: '×1.25' };
    }
    // Mit DB-Daten: ausschliesslich DB als Source-of-Truth — verhindert Ghost-Labels
    // für nicht-geseedete Ranks (z.B. R5 ohne multiplier -> Fallback wuerde luegen).
    const out: Record<number, string> = {};
    for (const r of ranks) {
      out[r.rank] = `×${r.multiplier.toFixed(2).replace(/\.?0+$/, '')}`;
    }
    return out;
  }, [ranks]);

  const maxRank = useMemo(() => {
    if (ranks.length > 0) return Math.max(...ranks.map(r => r.rank));
    return 4;
  }, [ranks]);

  const rankList = useMemo(() => {
    if (ranks.length > 0) return [...ranks].sort((a, b) => a.rank - b.rank).map(r => r.rank);
    return [1, 2, 3, 4];
  }, [ranks]);

  // ── Stats (derived from active inventory) ──
  const stats = useMemo(() => {
    const active = invActive.filter(eq => !eq.consumed_at);
    const totalItems = active.length;
    const typesOwned = new Set(active.map(eq => eq.equipment_key));
    const totalTypes = definitions.length || 5;
    const maxOwnedRank = active.reduce((m, eq) => Math.max(m, eq.rank), 0);
    // FIX-09: equipped=Count filtert non-consumed items. Nach erstem Scoring-Event
    // wird `consumed_at` gesetzt — der `equipped_event_id`-Pointer bleibt aber
    // (historisch). Ohne `!consumed_at` zaehlt die Zahl verbrauchte Items.
    const equippedCount = active.filter(
      eq => eq.equipped_event_id !== null && !eq.consumed_at,
    ).length;
    return {
      totalItems,
      typesOwnedCount: typesOwned.size,
      totalTypes,
      maxOwnedRank,
      equippedCount,
    };
  }, [invActive, definitions]);

  // ── Groupings ──
  const activeGroups = useMemo(() => {
    const g = groupActive(invActive, definitions);
    const filtered = posFilter === 'all' ? g : g.filter(entry => entry.def.position === posFilter);
    return sortGroups(filtered, sort, locale);
  }, [invActive, definitions, posFilter, sort, locale]);

  const consumedGroups = useMemo(() => {
    const g = groupConsumed(invAll, definitions);
    const filtered = posFilter === 'all' ? g : g.filter(entry => entry.def.position === posFilter);
    return sortGroups(filtered, sort, locale);
  }, [invAll, definitions, posFilter, sort, locale]);

  // ── Matrix entries for "Alle" mode: every definition × every rank ──
  type MatrixEntry = {
    def: DbEquipmentDefinition;
    rank: number;
    owned: GroupEntry | null;
  };

  const matrixEntries = useMemo<MatrixEntry[]>(() => {
    const ownedByKey = new Map<string, GroupEntry>();
    for (const g of groupActive(invActive, definitions)) {
      ownedByKey.set(`${g.def.key}_${g.rank}`, g);
    }
    const sortedDefs = [...definitions].sort((a, b) => {
      // Keep ATT, MID, DEF, GK, ALL consistent order
      const order = ['GK', 'DEF', 'MID', 'ATT', 'ALL'];
      const ai = order.indexOf(a.position);
      const bi = order.indexOf(b.position);
      if (ai !== bi) return ai - bi;
      // FIX-01+FIX-12: locale-aware sort on the resolved display name.
      return resolveEquipmentName(a, locale).localeCompare(
        resolveEquipmentName(b, locale),
        locale,
      );
    });
    const out: MatrixEntry[] = [];
    for (const def of sortedDefs) {
      if (posFilter !== 'all' && def.position !== posFilter) continue;
      for (const rank of rankList) {
        out.push({
          def,
          rank,
          owned: ownedByKey.get(`${def.key}_${rank}`) ?? null,
        });
      }
    }
    return out;
  }, [invActive, definitions, rankList, posFilter, locale]);

  // ── Position filter chips ──
  const positionChips: readonly { id: PositionFilter; label: string }[] = useMemo(
    () => [
      { id: 'all', label: t('equipmentPositionAll') },
      { id: 'GK', label: 'GK' },
      { id: 'DEF', label: 'DEF' },
      { id: 'MID', label: 'MID' },
      { id: 'ATT', label: 'ATT' },
      { id: 'ALL', label: t('equipmentPositionAny') },
    ],
    [t],
  );

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin motion-reduce:animate-none text-gold" aria-hidden="true" />
      </div>
    );
  }

  // ── Entirely empty (no items at all, ever) ──
  if (invAll.length === 0) {
    return (
      <EmptyState
        icon={<Package />}
        title={t('equipmentEmpty')}
        description={t('equipmentEmptyDesc')}
        action={{ label: t('equipmentEmptyCta'), href: '/missions' }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* ===== Header ===== */}
      <div className="px-1">
        <h2 className="text-lg font-black text-balance">{t('equipmentTitle')}</h2>
        <p className="text-xs text-white/50 text-pretty mt-0.5">{t('equipmentSubtitle')}</p>
      </div>

      {/* ===== Stats Grid ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatBox
          label={t('equipmentStatsItems')}
          value={stats.totalItems.toString()}
          accent="white"
        />
        <StatBox
          label={t('equipmentStatsTypes')}
          value={`${stats.typesOwnedCount}/${stats.totalTypes}`}
          accent="white"
        />
        <StatBox
          label={t('equipmentStatsMaxRank')}
          value={stats.maxOwnedRank > 0 ? `R${stats.maxOwnedRank}` : '–'}
          accent="gold"
        />
        <StatBox
          label={t('equipmentStatsEquipped')}
          value={stats.equippedCount.toString()}
          accent={stats.equippedCount > 0 ? 'gold' : 'white'}
        />
      </div>

      {/* ===== View Mode Toggle ===== */}
      <div
        className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/10"
        role="tablist"
        aria-label={t('equipmentViewToggle')}
      >
        {(['all', 'active', 'consumed'] as const).map(m => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              'flex-1 min-h-[40px] rounded-lg text-xs font-bold transition-colors',
              'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none',
              mode === m
                ? 'bg-gold text-black'
                : 'text-white/60 hover:text-white/80 hover:bg-white/[0.04]',
            )}
          >
            {t(
              m === 'all'
                ? 'equipmentFilterAll'
                : m === 'active'
                  ? 'equipmentFilterActive'
                  : 'equipmentFilterConsumed',
            )}
          </button>
        ))}
      </div>

      {/* ===== Filter Row ===== */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Position chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {positionChips.map(chip => {
            const isActive = posFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setPosFilter(chip.id)}
                className={cn(
                  'min-h-[32px] px-2.5 rounded-lg text-[11px] font-bold transition-colors border',
                  'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none',
                  isActive
                    ? 'bg-gold/15 border-gold/30 text-gold'
                    : 'bg-white/[0.02] border-white/10 text-white/60 hover:border-white/20 hover:text-white/80',
                )}
                aria-pressed={isActive}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Sort dropdown (only for aktiv / verbraucht) */}
        {mode !== 'all' && (
          <label className="flex items-center gap-1.5 text-[11px] text-white/50 font-bold">
            <ArrowDownUp className="size-3.5" aria-hidden="true" />
            <span className="sr-only">{t('equipmentSortLabel')}</span>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortMode)}
              className="min-h-[32px] rounded-lg bg-white/[0.02] border border-white/10 px-2 text-[11px] font-bold text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
              aria-label={t('equipmentSortLabel')}
            >
              <option value="rank_desc" className="bg-[#0a0a0a]">{t('equipmentSortRankDesc')}</option>
              <option value="rank_asc" className="bg-[#0a0a0a]">{t('equipmentSortRankAsc')}</option>
              <option value="recent" className="bg-[#0a0a0a]">{t('equipmentSortRecent')}</option>
            </select>
          </label>
        )}
      </div>

      {/* ===== Content Grid ===== */}
      {mode === 'all' && (
        <MatrixGrid
          entries={matrixEntries}
          multiplierLabels={multiplierLabels}
          onSelect={setSelected}
        />
      )}

      {mode === 'active' && (
        <ActiveGrid
          groups={activeGroups}
          multiplierLabels={multiplierLabels}
          onSelect={setSelected}
          emptyText={t('equipmentActiveEmpty')}
        />
      )}

      {mode === 'consumed' && (
        <ConsumedGrid
          groups={consumedGroups}
          multiplierLabels={multiplierLabels}
          onSelect={setSelected}
          emptyText={t('equipmentConsumedEmpty')}
        />
      )}

      {/* ===== Detail Modal ===== */}
      <EquipmentDetailModal
        open={selected !== null}
        onClose={() => setSelected(null)}
        def={selected?.def ?? null}
        rank={selected?.rank ?? 0}
        items={selected?.items ?? []}
        multiplierLabel={selected ? multiplierLabels[selected.rank] ?? `×${selected.rank}` : ''}
        maxRank={maxRank}
      />
    </div>
  );
}

// ============================================
// StatBox
// ============================================
function StatBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: 'white' | 'gold';
}) {
  return (
    <div
      className={cn(
        'rounded-xl px-3 py-2.5 border',
        accent === 'gold'
          ? 'bg-gold/[0.05] border-gold/[0.15]'
          : 'bg-white/[0.02] border-white/10',
      )}
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
    >
      <div className="text-[10px] uppercase tracking-wide font-bold text-white/40">{label}</div>
      <div
        className={cn(
          'text-lg font-black font-mono tabular-nums mt-0.5',
          accent === 'gold' ? 'text-gold' : 'text-white',
        )}
      >
        {value}
      </div>
    </div>
  );
}

// ============================================
// OwnedCard — for active items (matrix + active mode)
// ============================================
function OwnedCard({
  entry,
  displayName,
  multiplierLabels,
  onSelect,
  tEquipped,
  tMultiplier,
  tDetailOpen,
}: {
  entry: GroupEntry;
  displayName: string;
  multiplierLabels: Record<number, string>;
  onSelect: (g: GroupEntry) => void;
  tEquipped: string;
  tMultiplier: string;
  tDetailOpen: string;
}) {
  const Icon = getEquipmentIcon(entry.def.icon);
  const eqPosColors = EQUIPMENT_POSITION_COLORS[entry.def.position] ?? EQUIPMENT_POSITION_COLORS.ALL;
  const equippedItem = entry.items.find(eq => eq.equipped_event_id !== null);
  const isEquipped = !!equippedItem;
  const stackCount = entry.items.length;

  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      aria-label={`${displayName} R${entry.rank} — ${tDetailOpen}`}
      className={cn(
        'text-left p-3 flex flex-col gap-2 relative rounded-2xl border bg-white/[0.02] border-white/10 shadow-card-sm transition-all min-h-[44px]',
        'hover:bg-white/[0.04] hover:border-white/20 active:scale-[0.97]',
        'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none',
        isEquipped && 'border-gold/40 bg-gold/[0.04] hover:border-gold/50',
      )}
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
    >
      {isEquipped && (
        <span className="absolute top-2 right-2 text-[10px] font-bold text-gold bg-gold/15 border border-gold/30 rounded px-1.5 py-0.5">
          {tEquipped}
        </span>
      )}

      <div className="flex items-center gap-2">
        <div
          className={cn(
            'size-10 rounded-lg flex items-center justify-center flex-shrink-0',
            eqPosColors.bg,
          )}
        >
          <Icon className={cn('size-5', eqPosColors.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white truncate">{displayName}</div>
          <div className="text-[10px] text-white/40 mt-0.5 truncate">
            {multiplierLabels[entry.rank] ?? `×${entry.rank}`} {tMultiplier}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'text-[10px] font-bold px-1.5 py-0.5 rounded border',
            eqPosColors.bg,
            eqPosColors.text,
            eqPosColors.border,
          )}
        >
          {entry.def.position}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono font-black text-xs text-white/60 bg-white/[0.08] px-2 py-1 rounded">
            R{entry.rank}
          </span>
          {stackCount > 1 && (
            <span className="font-mono text-[10px] text-white/40 tabular-nums">×{stackCount}</span>
          )}
        </div>
      </div>
    </button>
  );
}

// ============================================
// MissingCard — ghost slot in matrix mode
// ============================================
function MissingCard({
  def,
  displayName,
  rank,
  multiplierLabels,
  tMissing,
}: {
  def: DbEquipmentDefinition;
  displayName: string;
  rank: number;
  multiplierLabels: Record<number, string>;
  tMissing: string;
}) {
  const Icon = getEquipmentIcon(def.icon);

  return (
    <div
      className={cn(
        'p-3 flex flex-col gap-2 relative rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] min-h-[44px]',
        'opacity-60',
      )}
      aria-label={`${displayName} R${rank} — ${tMissing}`}
    >
      <span className="absolute top-2 right-2 text-white/30">
        <Lock className="size-3" aria-hidden="true" />
      </span>

      <div className="flex items-center gap-2">
        <div className="size-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/[0.03] border border-white/[0.06]">
          <Icon className="size-5 text-white/20" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white/40 truncate">{displayName}</div>
          <div className="text-[10px] text-white/25 mt-0.5 truncate">
            {multiplierLabels[rank] ?? `×${rank}`}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-white/30 px-1.5 py-0.5 rounded border border-white/[0.08]">
          {def.position}
        </span>
        <span className="font-mono font-black text-xs text-white/25 bg-white/[0.03] px-2 py-1 rounded">
          R{rank}
        </span>
      </div>
    </div>
  );
}

// ============================================
// ConsumedCard — grey-ish card for used-up items
// ============================================
function ConsumedCard({
  entry,
  displayName,
  multiplierLabels,
  onSelect,
  tUsed,
  tMultiplier,
  tDetailOpen,
}: {
  entry: GroupEntry;
  displayName: string;
  multiplierLabels: Record<number, string>;
  onSelect: (g: GroupEntry) => void;
  tUsed: string;
  tMultiplier: string;
  tDetailOpen: string;
}) {
  const Icon = getEquipmentIcon(entry.def.icon);
  const eqPosColors = EQUIPMENT_POSITION_COLORS[entry.def.position] ?? EQUIPMENT_POSITION_COLORS.ALL;
  const usedCount = entry.items.length;

  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      aria-label={`${displayName} R${entry.rank} — ${tDetailOpen}`}
      className={cn(
        'text-left p-3 flex flex-col gap-2 relative rounded-2xl border bg-white/[0.015] border-white/[0.06] min-h-[44px]',
        'transition-colors hover:bg-white/[0.03] hover:border-white/10 active:scale-[0.97]',
        'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none',
      )}
    >
      <span className="absolute top-2 right-2 text-[10px] font-bold text-white/50 bg-white/[0.04] border border-white/10 rounded px-1.5 py-0.5">
        {usedCount}× {tUsed}
      </span>

      <div className="flex items-center gap-2 opacity-70">
        <div
          className={cn(
            'size-10 rounded-lg flex items-center justify-center flex-shrink-0 grayscale',
            eqPosColors.bg,
          )}
        >
          <Icon className={cn('size-5', eqPosColors.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white/70 truncate">{displayName}</div>
          <div className="text-[10px] text-white/30 mt-0.5 truncate">
            {multiplierLabels[entry.rank] ?? `×${entry.rank}`} {tMultiplier}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 opacity-70">
        <span
          className={cn(
            'text-[10px] font-bold px-1.5 py-0.5 rounded border',
            'bg-white/[0.03]',
            'text-white/40',
            'border-white/10',
          )}
        >
          {entry.def.position}
        </span>
        <span className="font-mono font-black text-xs text-white/40 bg-white/[0.04] px-2 py-1 rounded">
          R{entry.rank}
        </span>
      </div>
    </button>
  );
}

// ============================================
// Grid wrappers
// ============================================
function MatrixGrid({
  entries,
  multiplierLabels,
  onSelect,
}: {
  entries: { def: DbEquipmentDefinition; rank: number; owned: GroupEntry | null }[];
  multiplierLabels: Record<number, string>;
  onSelect: (g: GroupEntry) => void;
}) {
  const t = useTranslations('inventory');
  const locale = useLocale();
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-white/40">
        {t('equipmentFilterResultEmpty')}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {entries.map(({ def, rank, owned }) =>
        owned ? (
          <OwnedCard
            key={`${def.key}_${rank}`}
            entry={owned}
            displayName={resolveEquipmentName(owned.def, locale)}
            multiplierLabels={multiplierLabels}
            onSelect={onSelect}
            tEquipped={t('equipmentEquipped')}
            tMultiplier={t('equipmentMultiplier')}
            tDetailOpen={t('equipmentDetailOpen')}
          />
        ) : (
          <MissingCard
            key={`${def.key}_${rank}_ghost`}
            def={def}
            displayName={resolveEquipmentName(def, locale)}
            rank={rank}
            multiplierLabels={multiplierLabels}
            tMissing={t('equipmentMissingSlot')}
          />
        ),
      )}
    </div>
  );
}

function ActiveGrid({
  groups,
  multiplierLabels,
  onSelect,
  emptyText,
}: {
  groups: GroupEntry[];
  multiplierLabels: Record<number, string>;
  onSelect: (g: GroupEntry) => void;
  emptyText: string;
}) {
  const t = useTranslations('inventory');
  const locale = useLocale();
  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-white/40">{emptyText}</div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {groups.map(entry => (
        <OwnedCard
          key={`${entry.def.key}_${entry.rank}`}
          entry={entry}
          displayName={resolveEquipmentName(entry.def, locale)}
          multiplierLabels={multiplierLabels}
          onSelect={onSelect}
          tEquipped={t('equipmentEquipped')}
          tMultiplier={t('equipmentMultiplier')}
          tDetailOpen={t('equipmentDetailOpen')}
        />
      ))}
    </div>
  );
}

function ConsumedGrid({
  groups,
  multiplierLabels,
  onSelect,
  emptyText,
}: {
  groups: GroupEntry[];
  multiplierLabels: Record<number, string>;
  onSelect: (g: GroupEntry) => void;
  emptyText: string;
}) {
  const t = useTranslations('inventory');
  const locale = useLocale();
  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-white/40">{emptyText}</div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {groups.map(entry => (
        <ConsumedCard
          key={`${entry.def.key}_${entry.rank}`}
          entry={entry}
          displayName={resolveEquipmentName(entry.def, locale)}
          multiplierLabels={multiplierLabels}
          onSelect={onSelect}
          tUsed={t('equipmentConsumedBadge')}
          tMultiplier={t('equipmentMultiplier')}
          tDetailOpen={t('equipmentDetailOpen')}
        />
      ))}
    </div>
  );
}
