'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Plus, Lock, ChevronDown, Save, Trash2 } from 'lucide-react';
import type { Pos } from '@/types';
import { cn } from '@/lib/utils';
import { FORMATIONS, FORMATION_KEYS } from '../lib/formations';
import type { SlotDef } from '../lib/formations';
import { useManagerStore } from '../store/managerStore';

// ============================================
// TYPES
// ============================================

interface TacticalBoardPlayer {
  id: string;
  first_name: string;
  last_name: string;
  position: Pos;
  perf_l5: number | null;
  status?: string; // 'injured' | 'doubtful' | 'fit'
  isLocked?: boolean;
}

interface TacticalBoardProps {
  /** All players the user owns (filtered to owned > 0) */
  players: TacticalBoardPlayer[];
  /** Called when user clicks a player circle on the pitch */
  onPlayerClick: (playerId: string) => void;
  /** Called when user clicks an empty slot */
  onEmptySlotClick: (pos: Pos) => void;
}

// ============================================
// POSITION COLORS — static hex values (no dynamic Tailwind)
// ============================================

const POS_COLORS: Record<Pos, { hex: string; bg20: string; border40: string }> = {
  GK:  { hex: '#34d399', bg20: 'rgba(52,211,153,0.20)', border40: 'rgba(52,211,153,0.40)' },
  DEF: { hex: '#fbbf24', bg20: 'rgba(251,191,36,0.20)', border40: 'rgba(251,191,36,0.40)' },
  MID: { hex: '#38bdf8', bg20: 'rgba(56,189,248,0.20)', border40: 'rgba(56,189,248,0.40)' },
  ATT: { hex: '#fb7185', bg20: 'rgba(251,113,133,0.20)', border40: 'rgba(251,113,133,0.40)' },
};

const FITNESS_COLORS: Record<string, string> = {
  fit: '#34d399',       // emerald-400
  doubtful: '#fbbf24',  // amber-400
  injured: '#f87171',   // red-400
};

const PRESETS_KEY = 'bescout-manager-presets';

interface Preset {
  name: string;
  formation: string;
  assignments: Record<string, string>;
}

// ============================================
// POSITIONING MATH
// ============================================

/**
 * Convert a SlotDef row/col to CSS top/left percentages.
 * ATT at top (low %), GK at bottom (high %).
 */
function getSlotPercent(
  slot: SlotDef,
  maxRow: number,
  colCountInRow: number,
): { top: number; left: number } {
  // Vertical: row 0 (GK) at ~87%, highest row (ATT) at ~13%
  const topPadding = 13;
  const bottomPadding = 13;
  const usableHeight = 100 - topPadding - bottomPadding;
  const rowStep = maxRow > 0 ? usableHeight / maxRow : 0;
  const top = bottomPadding + (maxRow - slot.row) * rowStep;

  // Horizontal: distribute columns evenly
  const sidePadding = 12;
  const usableWidth = 100 - 2 * sidePadding;
  let left: number;
  if (colCountInRow <= 1) {
    left = 50; // center single player (GK or lone ATT)
  } else {
    left = sidePadding + (slot.col / (colCountInRow - 1)) * usableWidth;
  }

  return { top, left };
}

// ============================================
// L5 BADGE COLOR
// ============================================

function getL5BadgeStyle(score: number): { bg: string; color: string } {
  if (score >= 80) return { bg: '#FFD700', color: '#000' };
  if (score >= 60) return { bg: 'rgba(255,255,255,0.70)', color: '#000' };
  return { bg: '#f87171', color: '#fff' };
}

// ============================================
// SUB-COMPONENTS
// ============================================

function PitchFieldLines() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="none"
      viewBox="0 0 400 500"
    >
      {/* Grass stripes */}
      {[0, 1, 2, 3, 4].map(i => (
        <rect key={i} x="20" y={15 + i * 94} width="360" height="47" fill="white" fillOpacity="0.015" />
      ))}
      {/* Outer border */}
      <rect x="20" y="15" width="360" height="470" fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="1.5" />
      {/* Center line */}
      <line x1="20" y1="250" x2="380" y2="250" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
      {/* Center circle */}
      <circle cx="200" cy="250" r="50" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
      <circle cx="200" cy="250" r="3" fill="white" fillOpacity="0.1" />
      {/* Top penalty area (ATT side) */}
      <rect x="100" y="15" width="200" height="80" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
      <rect x="140" y="15" width="120" height="35" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
      {/* Bottom penalty area (GK side) */}
      <rect x="100" y="405" width="200" height="80" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
      <rect x="140" y="450" width="120" height="35" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
    </svg>
  );
}

function FilledSlot({
  player,
  posColor,
  onClick,
}: {
  player: TacticalBoardPlayer;
  posColor: typeof POS_COLORS[Pos];
  onClick: () => void;
}) {
  const l5 = player.perf_l5 ?? 0;
  const initials = `${(player.first_name[0] ?? '').toUpperCase()}. ${player.last_name.slice(0, 5)}`;
  const fitnessColor = FITNESS_COLORS[player.status ?? 'fit'] ?? FITNESS_COLORS.fit;
  const l5Style = l5 > 0 ? getL5BadgeStyle(l5) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group focus-visible:outline-none"
      aria-label={`${player.first_name} ${player.last_name}`}
    >
      <div
        className="relative size-11 md:size-14 rounded-full flex items-center justify-center border-2 transition-colors group-hover:scale-110"
        style={{
          backgroundColor: posColor.bg20,
          borderColor: posColor.border40,
          boxShadow: `0 0 12px ${posColor.hex}30`,
        }}
      >
        <span
          className="font-semibold text-[10px] md:text-xs text-center leading-tight truncate max-w-[38px] md:max-w-[48px]"
          style={{ color: posColor.hex }}
        >
          {initials}
        </span>

        {/* Fitness dot — top right */}
        <span
          className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border border-black/50"
          style={{ backgroundColor: fitnessColor }}
          aria-hidden="true"
        />

        {/* L5 badge — bottom right */}
        {l5Style && l5 > 0 && (
          <span
            className="absolute -bottom-1 -right-2 z-10 min-w-[1.5rem] px-1 py-px rounded-full font-mono tabular-nums text-[10px] font-bold text-center shadow-md"
            style={{ backgroundColor: l5Style.bg, color: l5Style.color }}
          >
            {l5}
          </span>
        )}

        {/* Lock overlay */}
        {player.isLocked && (
          <span
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50"
            aria-label="Gesperrt"
          >
            <Lock className="size-4 text-white/60" aria-hidden="true" />
          </span>
        )}
      </div>

      {/* Name below circle */}
      <span
        className="text-[9px] md:text-[10px] mt-1 font-medium truncate max-w-[56px] md:max-w-[72px] text-center"
        style={{ color: `${posColor.hex}cc` }}
      >
        {player.last_name.slice(0, 8)}
      </span>
    </button>
  );
}

function EmptySlot({
  slot,
  posColor,
  onClick,
}: {
  slot: SlotDef;
  posColor: typeof POS_COLORS[Pos];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group focus-visible:outline-none"
      aria-label={`Leerer ${slot.pos} Platz`}
    >
      <div
        className="size-11 md:size-14 rounded-full flex items-center justify-center border-2 border-dashed transition-colors group-hover:bg-white/5"
        style={{ borderColor: 'rgba(255,255,255,0.20)' }}
      >
        <Plus className="size-5 text-white/30" aria-hidden="true" />
      </div>
      <span
        className="text-[9px] md:text-[10px] mt-1 font-bold"
        style={{ color: `${posColor.hex}80` }}
      >
        {slot.pos}
      </span>
    </button>
  );
}

// ============================================
// FORMATION PICKER
// ============================================

function FormationPicker() {
  const formation = useManagerStore((s) => s.formation);
  const setFormation = useManagerStore((s) => s.setFormation);

  return (
    <div className="flex items-center justify-center gap-2 mb-3">
      <label htmlFor="formation-select" className="text-xs text-white/50 font-semibold">
        Formation
      </label>
      <select
        id="formation-select"
        value={formation}
        onChange={(e) => setFormation(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/50 transition-colors"
      >
        {FORMATION_KEYS.map((key) => (
          <option key={key} value={key} className="bg-[#0a0a0a] text-white">
            {FORMATIONS[key].label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================
// PRESET BUTTONS
// ============================================

function PresetButtons() {
  const [showPresets, setShowPresets] = useState(false);
  const formation = useManagerStore((s) => s.formation);
  const assignments = useManagerStore((s) => s.assignments);
  const clearAssignments = useManagerStore((s) => s.clearAssignments);
  const loadPreset = useManagerStore((s) => s.loadPreset);

  const savedPresets = useMemo<Preset[]>(() => {
    try {
      const raw = localStorage.getItem(PRESETS_KEY);
      return raw ? (JSON.parse(raw) as Preset[]) : [];
    } catch {
      return [];
    }
  }, [showPresets]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = useCallback(() => {
    const name = `${formation} - ${new Date().toLocaleDateString('de-DE')}`;
    const preset: Preset = { name, formation, assignments };
    try {
      const existing = JSON.parse(localStorage.getItem(PRESETS_KEY) ?? '[]') as Preset[];
      existing.push(preset);
      localStorage.setItem(PRESETS_KEY, JSON.stringify(existing));
    } catch (err) {
      console.error('Failed to save preset:', err);
    }
  }, [formation, assignments]);

  const handleLoad = useCallback(
    (preset: Preset) => {
      loadPreset(preset.formation, preset.assignments);
      setShowPresets(false);
    },
    [loadPreset],
  );

  return (
    <div className="flex items-center justify-center gap-2 mt-3">
      {/* Preset dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowPresets((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl min-h-[44px]',
            'bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-white transition-colors',
          )}
          aria-expanded={showPresets}
          aria-label="Presets laden"
        >
          Laden
          <ChevronDown className="size-4" aria-hidden="true" />
        </button>

        {showPresets && (
          <div className="absolute bottom-full mb-1 left-0 min-w-[200px] bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-xl z-30">
            {savedPresets.length === 0 ? (
              <p className="px-3 py-2 text-xs text-white/40">Keine Presets</p>
            ) : (
              savedPresets.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleLoad(p)}
                  className="w-full text-left px-3 py-2 text-sm text-white/70 hover:bg-white/10 transition-colors min-h-[44px]"
                >
                  {p.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Save */}
      <button
        type="button"
        onClick={handleSave}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl min-h-[44px]',
          'bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-white transition-colors',
        )}
        aria-label="Formation speichern"
      >
        <Save className="size-4" aria-hidden="true" />
        Speichern
      </button>

      {/* Clear */}
      <button
        type="button"
        onClick={clearAssignments}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl min-h-[44px]',
          'bg-red-500/15 hover:bg-red-500/25 border border-red-400/30 text-red-200 transition-colors',
        )}
        aria-label="Aufstellung leeren"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        Leeren
      </button>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function TacticalBoard({
  players,
  onPlayerClick,
  onEmptySlotClick,
}: TacticalBoardProps) {
  const formation = useManagerStore((s) => s.formation);
  const assignments = useManagerStore((s) => s.assignments);

  const formationData = FORMATIONS[formation];
  const slots = formationData?.slots ?? [];

  // Build a lookup: playerId → player
  const playerMap = useMemo(() => {
    const map = new Map<string, TacticalBoardPlayer>();
    players.forEach((p) => map.set(p.id, p));
    return map;
  }, [players]);

  // Precompute max row and column counts per row
  const { maxRow, colCounts } = useMemo(() => {
    let max = 0;
    const counts = new Map<number, number>();
    slots.forEach((s) => {
      if (s.row > max) max = s.row;
      counts.set(s.row, Math.max(counts.get(s.row) ?? 0, s.col + 1));
    });
    return { maxRow: max, colCounts: counts };
  }, [slots]);

  return (
    <div className="w-full">
      {/* Formation Picker */}
      <FormationPicker />

      {/* Pitch */}
      <div
        className="relative w-full bg-gradient-to-b from-emerald-950/40 to-emerald-900/20 rounded-2xl overflow-hidden border border-white/10"
        style={{ aspectRatio: '5/4', maxHeight: 'min(55vh, 500px)' }}
      >
        <PitchFieldLines />

        {/* Player slots */}
        <div className="absolute inset-0">
          {slots.map((slot) => {
            const colCount = colCounts.get(slot.row) ?? 1;
            const { top, left } = getSlotPercent(slot, maxRow, colCount);
            const assignedPlayerId = assignments[slot.key];
            const player = assignedPlayerId ? playerMap.get(assignedPlayerId) : undefined;
            const posColor = POS_COLORS[slot.pos];

            return (
              <div
                key={slot.key}
                className="absolute"
                style={{ top: `${top}%`, left: `${left}%` }}
              >
                {player ? (
                  <FilledSlot
                    player={player}
                    posColor={posColor}
                    onClick={() => onPlayerClick(player.id)}
                  />
                ) : (
                  <EmptySlot
                    slot={slot}
                    posColor={posColor}
                    onClick={() => onEmptySlotClick(slot.pos)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Preset Buttons */}
      <PresetButtons />
    </div>
  );
}
