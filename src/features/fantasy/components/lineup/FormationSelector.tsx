'use client';

import React, { useState, useEffect } from 'react';
import { Briefcase, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { LineupPlayer, UserDpcHolding, LineupPreset } from '@/components/fantasy/types';
import type { FormationDef } from '@/components/fantasy/constants';
import { PRESET_KEY } from '@/components/fantasy/constants';

export interface FormationSelectorProps {
  selectedFormation: string;
  availableFormations: FormationDef[];
  isReadOnly: boolean;
  selectedPlayers: LineupPlayer[];
  effectiveHoldings: UserDpcHolding[];
  formationSlots: { pos: string; slot: number }[];
  onFormationChange: (fId: string) => void;
  onApplyPreset: (formation: string, lineup: LineupPlayer[]) => void;
}

export function FormationSelector({
  selectedFormation,
  availableFormations,
  isReadOnly,
  selectedPlayers,
  effectiveHoldings,
  formationSlots,
  onFormationChange,
  onApplyPreset,
}: FormationSelectorProps) {
  const t = useTranslations('fantasy');

  const [presetName, setPresetName] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const [presets, setPresets] = useState<LineupPreset[]>([]);

  // Hydrate presets from localStorage in useEffect to avoid SSR hydration mismatch
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PRESET_KEY);
      if (saved) setPresets(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const savePreset = () => {
    if (!presetName.trim()) return;
    const ids = formationSlots.map(s => { const sp = selectedPlayers.find(p => p.slot === s.slot); return sp?.playerId || ''; });
    const updated = [...presets, { name: presetName, formation: selectedFormation, playerIds: ids }];
    if (updated.length > 5) updated.shift();
    localStorage.setItem(PRESET_KEY, JSON.stringify(updated));
    setPresets(updated);
    setPresetName(''); setShowPresets(false);
  };

  const applyPreset = (preset: LineupPreset) => {
    const fmts = availableFormations;
    const formation = fmts.find(f => f.id === preset.formation) || fmts[0];
    const slots: { pos: string; slot: number }[] = [];
    let idx = 0;
    for (const s of formation.slots) { for (let i = 0; i < s.count; i++) slots.push({ pos: s.pos, slot: idx++ }); }
    const lineup: LineupPlayer[] = [];
    slots.forEach((s, i) => {
      if (preset.playerIds[i] && effectiveHoldings.some(h => h.id === preset.playerIds[i] && !h.isLocked))
        lineup.push({ playerId: preset.playerIds[i], position: s.pos, slot: s.slot, isLocked: false });
    });
    onApplyPreset(preset.formation, lineup);
    setShowPresets(false);
  };

  const deletePreset = (index: number) => {
    const updated = [...presets]; updated.splice(index, 1);
    localStorage.setItem(PRESET_KEY, JSON.stringify(updated));
    setPresets(updated);
    setShowPresets(false);
  };

  return (
    <>
      {/* Formation Selector + Presets Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={selectedFormation}
          onChange={(e) => onFormationChange(e.target.value)}
          disabled={isReadOnly}
          className={`px-3 py-2 min-h-[44px] bg-surface-base border border-white/10 rounded-lg text-sm font-bold ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {availableFormations.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        {!isReadOnly && (
          <>
            <div className="flex-1" />
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="px-3 py-2 min-h-[44px] bg-surface-base border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors flex items-center gap-1"
            >
              <Briefcase aria-hidden="true" className="size-3.5" /> {t('presetsLabel')}
            </button>
          </>
        )}
      </div>

      {/* Presets Dropdown */}
      {showPresets && (
        <div className="p-3 bg-surface-subtle rounded-lg border border-white/10 space-y-2">
          <div className="text-xs font-bold text-white/60 mb-2">{t('presetsTitle')}</div>
          {presets.map((preset, i) => (
            <div key={i} className="flex items-center justify-between p-2 bg-surface-base rounded-lg">
              <button onClick={() => applyPreset(preset)} className="text-sm font-medium hover:text-gold transition-colors flex-1 text-left">
                {preset.name} <span className="text-white/30 text-xs">({preset.formation})</span>
              </button>
              <button onClick={() => deletePreset(i)} aria-label={t('deletePresetLabel')} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-red-500/20 rounded text-red-400">
                <X aria-hidden="true" className="size-3" />
              </button>
            </div>
          ))}
          {presets.length === 0 && <div className="text-xs text-white/30 text-center py-2">{t('noPresets')}</div>}
          <div className="flex gap-2 mt-2">
            <input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder={t('presetNamePlaceholder')}
              className="flex-1 px-3 py-1.5 bg-surface-base border border-white/10 rounded-lg text-xs"
            />
            <button
              onClick={savePreset}
              disabled={!presetName.trim() || selectedPlayers.length === 0}
              className="px-3 py-1.5 bg-gold/20 text-gold rounded-lg text-xs font-bold disabled:opacity-30"
            >
              {t('saveBtn')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
