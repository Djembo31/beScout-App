'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { Card } from '@/components/ui';
import { useToast } from '@/components/providers/ToastProvider';
import { cn, fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type {
  DbEloConfig,
  DbRangThreshold,
  DbScoreRoadConfig,
  DbManagerPointsConfig,
  DbStreakConfig,
  DbMissionDefinition,
  DbAchievementDefinition,
} from '@/types';

type EloDimension = DbEloConfig['dimension'];
import {
  getEloConfig,
  getRangThresholds,
  getScoreRoadConfig,
  getManagerPointsConfig,
  getStreakConfig,
  getMissionDefinitions,
  getAchievementDefinitions,
  updateEloConfig,
  updateRangThreshold,
  updateScoreRoadConfig,
  updateManagerPointsConfig,
  updateStreakConfig,
  createMission,
  updateMission,
  createAchievementDefinition,
  updateAchievementDefinition,
} from '@/lib/services/economyConfig';

// ============================================
// HELPERS
// ============================================

const DIMENSION_COLORS: Record<EloDimension, string> = {
  trader: 'text-sky-400',
  manager: 'text-purple-400',
  analyst: 'text-emerald-400',
};

const DIMENSION_BG: Record<EloDimension, string> = {
  trader: 'bg-sky-500/10',
  manager: 'bg-purple-500/10',
  analyst: 'bg-emerald-500/10',
};

const INPUT_CLASS = 'bg-surface-base border border-white/10 rounded-lg px-2 py-1 text-white text-xs w-20 tabular-nums font-mono';
const INPUT_WIDE_CLASS = 'bg-surface-base border border-white/10 rounded-lg px-2 py-1 text-white text-xs w-32 tabular-nums';

function SectionHeader({
  title,
  count,
  open,
  onToggle,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 bg-surface-minimal border border-white/10 rounded-2xl hover:bg-surface-subtle transition-colors min-h-[44px]"
      aria-expanded={open}
    >
      <div className="flex items-center gap-2">
        <span className="font-black text-white">{title}</span>
        <span className="text-xs font-mono tabular-nums px-2 py-0.5 rounded-full bg-white/10 text-white/60">
          {count}
        </span>
      </div>
      {open ? (
        <ChevronUp className="size-4 text-white/40" aria-hidden="true" />
      ) : (
        <ChevronDown className="size-4 text-white/40" aria-hidden="true" />
      )}
    </button>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-3 py-1 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-colors min-h-[44px]"
    >
      Bearbeiten
    </button>
  );
}

function SaveCancelButtons({
  onSave,
  onCancel,
}: {
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onCancel}
        className="text-xs px-3 py-1 rounded-lg bg-white/10 text-white/40 hover:bg-white/20 transition-colors min-h-[44px]"
      >
        Abbrechen
      </button>
      <button
        onClick={onSave}
        className="text-xs px-3 py-1 rounded-lg bg-gold/20 text-gold hover:bg-gold/30 transition-colors min-h-[44px]"
      >
        Speichern
      </button>
    </div>
  );
}

// ============================================
// SECTION 1: ELO-PUNKTE
// ============================================

function EloSection({
  data,
  canEdit,
  onRefresh,
  adminId,
}: {
  data: DbEloConfig[];
  canEdit: boolean;
  onRefresh: () => void;
  adminId: string;
}) {
  const { addToast } = useToast();
  const [editId, setEditId] = useState<string | null>(null);
  const [editDelta, setEditDelta] = useState(0);
  const [editActive, setEditActive] = useState(true);

  const grouped = data.reduce<Record<EloDimension, DbEloConfig[]>>(
    (acc, item) => {
      const dim = item.dimension;
      if (!acc[dim]) acc[dim] = [];
      acc[dim].push(item);
      return acc;
    },
    { trader: [], manager: [], analyst: [] },
  );

  const handleSave = useCallback(async (id: string) => {
    const result = await updateEloConfig(adminId, id, {
      delta: editDelta,
      active: editActive,
    });
    if (result.ok) {
      addToast('Gespeichert', 'success');
      setEditId(null);
      onRefresh();
    } else {
      addToast(result.error ?? 'Fehler', 'error');
    }
  }, [adminId, editDelta, editActive, addToast, onRefresh]);

  return (
    <div className="space-y-4">
      {(Object.entries(grouped) as [EloDimension, DbEloConfig[]][]).map(
        ([dim, items]) => {
          if (items.length === 0) return null;
          return (
            <div key={dim}>
              <div className={cn('text-xs font-bold uppercase tracking-wider mb-2', DIMENSION_COLORS[dim])}>
                {dim.charAt(0).toUpperCase() + dim.slice(1)}
              </div>
              <div className="space-y-1">
                {items.map((item) => {
                  const isEditing = editId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-xl text-xs',
                        DIMENSION_BG[dim],
                      )}
                    >
                      <div className="flex-shrink-0 w-36 font-medium text-white">
                        {item.event_type}
                      </div>
                      <div className="flex-shrink-0 w-16">
                        {isEditing ? (
                          <input
                            type="number"
                            inputMode="numeric"
                            value={editDelta}
                            onChange={(e) => setEditDelta(parseInt(e.target.value) || 0)}
                            className={INPUT_CLASS}
                          />
                        ) : (
                          <span className={cn('font-mono tabular-nums', item.delta >= 0 ? 'text-green-400' : 'text-red-400')}>
                            {item.delta >= 0 ? '+' : ''}{item.delta}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 text-white/40 truncate">
                        {item.description ?? '-'}
                      </div>
                      <div className="flex-shrink-0 w-12">
                        {isEditing ? (
                          <button
                            onClick={() => setEditActive(!editActive)}
                            className={cn(
                              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                              editActive ? 'bg-green-500' : 'bg-white/20',
                            )}
                            aria-label={editActive ? 'Aktiv' : 'Inaktiv'}
                          >
                            <span
                              className={cn(
                                'inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform',
                                editActive ? 'translate-x-4' : 'translate-x-0.5',
                              )}
                            />
                          </button>
                        ) : (
                          <span className={cn('text-xs', item.active ? 'text-green-400' : 'text-white/30')}>
                            {item.active ? 'An' : 'Aus'}
                          </span>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {canEdit && !isEditing && (
                          <EditButton onClick={() => {
                            setEditId(item.id);
                            setEditDelta(item.delta);
                            setEditActive(item.active);
                          }} />
                        )}
                        {isEditing && (
                          <SaveCancelButtons
                            onSave={() => handleSave(item.id)}
                            onCancel={() => setEditId(null)}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        },
      )}
      {data.length === 0 && (
        <div className="text-center text-white/30 text-sm py-4">Keine Elo-Konfiguration vorhanden</div>
      )}
    </div>
  );
}

// ============================================
// SECTION 2: RAENGE
// ============================================

function RangeSection({
  data,
  canEdit,
  onRefresh,
  adminId,
}: {
  data: DbRangThreshold[];
  canEdit: boolean;
  onRefresh: () => void;
  adminId: string;
}) {
  const { addToast } = useToast();
  const [editId, setEditId] = useState<number | null>(null);
  const [editMin, setEditMin] = useState(0);
  const [editMax, setEditMax] = useState<number | null>(null);

  const handleSave = useCallback(async (id: number) => {
    const result = await updateRangThreshold(adminId, id, {
      min_score: editMin,
      max_score: editMax,
    });
    if (result.ok) {
      addToast('Gespeichert', 'success');
      setEditId(null);
      onRefresh();
    } else {
      addToast(result.error ?? 'Fehler', 'error');
    }
  }, [adminId, editMin, editMax, addToast, onRefresh]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-white/40 border-b border-white/10">
            <th className="text-left py-2 px-2">Rang</th>
            <th className="text-left py-2 px-2">Tier</th>
            <th className="text-left py-2 px-2">Min Score</th>
            <th className="text-left py-2 px-2">Max Score</th>
            {canEdit && <th className="text-right py-2 px-2">Aktion</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const isEditing = editId === row.id;
            return (
              <tr key={row.id} className="border-b border-white/[0.04]">
                <td className="py-2 px-2 text-white font-medium">{row.rang_name}</td>
                <td className="py-2 px-2 font-mono tabular-nums text-white/60">{row.tier_number}</td>
                <td className="py-2 px-2">
                  {isEditing ? (
                    <input
                      type="number"
                      inputMode="numeric"
                      value={editMin}
                      onChange={(e) => setEditMin(parseInt(e.target.value) || 0)}
                      className={INPUT_CLASS}
                    />
                  ) : (
                    <span className="font-mono tabular-nums text-white">{row.min_score}</span>
                  )}
                </td>
                <td className="py-2 px-2">
                  {isEditing ? (
                    <input
                      type="number"
                      inputMode="numeric"
                      value={editMax ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setEditMax(v === '' ? null : parseInt(v) || 0);
                      }}
                      placeholder="\u221E"
                      className={INPUT_CLASS}
                    />
                  ) : (
                    <span className="font-mono tabular-nums text-white">
                      {row.max_score !== null ? row.max_score : '\u221E'}
                    </span>
                  )}
                </td>
                {canEdit && (
                  <td className="py-2 px-2 text-right">
                    {!isEditing ? (
                      <EditButton onClick={() => {
                        setEditId(row.id);
                        setEditMin(row.min_score);
                        setEditMax(row.max_score);
                      }} />
                    ) : (
                      <SaveCancelButtons
                        onSave={() => handleSave(row.id)}
                        onCancel={() => setEditId(null)}
                      />
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="text-center text-white/30 text-sm py-4">Keine Rang-Schwellwerte vorhanden</div>
      )}
    </div>
  );
}

// ============================================
// SECTION 3: SCORE ROAD
// ============================================

function ScoreRoadSection({
  data,
  canEdit,
  onRefresh,
  adminId,
}: {
  data: DbScoreRoadConfig[];
  canEdit: boolean;
  onRefresh: () => void;
  adminId: string;
}) {
  const { addToast } = useToast();
  const [editId, setEditId] = useState<number | null>(null);
  const [editRewardCents, setEditRewardCents] = useState(0);
  const [editRewardLabel, setEditRewardLabel] = useState('');
  const [editRewardType, setEditRewardType] = useState<'bsd' | 'cosmetic' | 'both'>('bsd');

  const handleSave = useCallback(async (id: number) => {
    const result = await updateScoreRoadConfig(adminId, id, {
      reward_cents: editRewardCents,
      reward_label: editRewardLabel,
      reward_type: editRewardType,
    });
    if (result.ok) {
      addToast('Gespeichert', 'success');
      setEditId(null);
      onRefresh();
    } else {
      addToast(result.error ?? 'Fehler', 'error');
    }
  }, [adminId, editRewardCents, editRewardLabel, editRewardType, addToast, onRefresh]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-white/40 border-b border-white/10">
            <th className="text-left py-2 px-2">Score</th>
            <th className="text-left py-2 px-2">Rang</th>
            <th className="text-left py-2 px-2">Reward ($SCOUT)</th>
            <th className="text-left py-2 px-2">Label</th>
            <th className="text-left py-2 px-2">Typ</th>
            {canEdit && <th className="text-right py-2 px-2">Aktion</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const isEditing = editId === row.id;
            return (
              <tr key={row.id} className="border-b border-white/[0.04]">
                <td className="py-2 px-2 font-mono tabular-nums text-gold">{row.score_threshold}</td>
                <td className="py-2 px-2 text-white">{row.rang_name}</td>
                <td className="py-2 px-2">
                  {isEditing ? (
                    <input
                      type="number"
                      inputMode="numeric"
                      value={editRewardCents}
                      onChange={(e) => setEditRewardCents(parseInt(e.target.value) || 0)}
                      className={INPUT_CLASS}
                    />
                  ) : (
                    <span className="font-mono tabular-nums text-gold">
                      {fmtScout(centsToBsd(row.reward_cents))}
                    </span>
                  )}
                </td>
                <td className="py-2 px-2">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editRewardLabel}
                      onChange={(e) => setEditRewardLabel(e.target.value)}
                      className={INPUT_WIDE_CLASS}
                    />
                  ) : (
                    <span className="text-white/60">{row.reward_label}</span>
                  )}
                </td>
                <td className="py-2 px-2">
                  {isEditing ? (
                    <select
                      value={editRewardType}
                      onChange={(e) => setEditRewardType(e.target.value as 'bsd' | 'cosmetic' | 'both')}
                      className={cn(INPUT_WIDE_CLASS, 'w-24')}
                    >
                      <option value="bsd">bsd</option>
                      <option value="cosmetic">cosmetic</option>
                      <option value="both">both</option>
                    </select>
                  ) : (
                    <span className="text-white/40">{row.reward_type}</span>
                  )}
                </td>
                {canEdit && (
                  <td className="py-2 px-2 text-right">
                    {!isEditing ? (
                      <EditButton onClick={() => {
                        setEditId(row.id);
                        setEditRewardCents(row.reward_cents);
                        setEditRewardLabel(row.reward_label);
                        setEditRewardType(row.reward_type);
                      }} />
                    ) : (
                      <SaveCancelButtons
                        onSave={() => handleSave(row.id)}
                        onCancel={() => setEditId(null)}
                      />
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="text-center text-white/30 text-sm py-4">Keine Score-Road-Konfiguration vorhanden</div>
      )}
    </div>
  );
}

// ============================================
// SECTION 4: MANAGER POINTS
// ============================================

function ManagerPointsSection({
  data,
  canEdit,
  onRefresh,
  adminId,
}: {
  data: DbManagerPointsConfig[];
  canEdit: boolean;
  onRefresh: () => void;
  adminId: string;
}) {
  const { addToast } = useToast();
  const [editId, setEditId] = useState<number | null>(null);
  const [editPoints, setEditPoints] = useState(0);

  const normalEvents = data.filter((d) => !d.small_event);
  const smallEvents = data.filter((d) => d.small_event);

  const handleSave = useCallback(async (id: number) => {
    const result = await updateManagerPointsConfig(adminId, id, {
      points: editPoints,
    });
    if (result.ok) {
      addToast('Gespeichert', 'success');
      setEditId(null);
      onRefresh();
    } else {
      addToast(result.error ?? 'Fehler', 'error');
    }
  }, [adminId, editPoints, addToast, onRefresh]);

  function renderTable(items: DbManagerPointsConfig[], label: string) {
    return (
      <div>
        <div className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">{label}</div>
        <table className="w-full text-xs mb-4">
          <thead>
            <tr className="text-white/40 border-b border-white/10">
              <th className="text-left py-2 px-2">Percentile / Rank</th>
              <th className="text-left py-2 px-2">Punkte</th>
              <th className="text-left py-2 px-2">Label</th>
              {canEdit && <th className="text-right py-2 px-2">Aktion</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((row) => {
              const isEditing = editId === row.id;
              const rangeLabel = row.max_percentile !== null
                ? `Top ${row.max_percentile}%`
                : row.max_rank !== null
                  ? `Rank ${row.max_rank}`
                  : '-';
              return (
                <tr key={row.id} className="border-b border-white/[0.04]">
                  <td className="py-2 px-2 font-mono tabular-nums text-white">{rangeLabel}</td>
                  <td className="py-2 px-2">
                    {isEditing ? (
                      <input
                        type="number"
                        inputMode="numeric"
                        value={editPoints}
                        onChange={(e) => setEditPoints(parseInt(e.target.value) || 0)}
                        className={INPUT_CLASS}
                      />
                    ) : (
                      <span className={cn('font-mono tabular-nums', row.points >= 0 ? 'text-green-400' : 'text-red-400')}>
                        {row.points >= 0 ? '+' : ''}{row.points}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-white/60">{row.label}</td>
                  {canEdit && (
                    <td className="py-2 px-2 text-right">
                      {!isEditing ? (
                        <EditButton onClick={() => {
                          setEditId(row.id);
                          setEditPoints(row.points);
                        }} />
                      ) : (
                        <SaveCancelButtons
                          onSave={() => handleSave(row.id)}
                          onCancel={() => setEditId(null)}
                        />
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="text-center text-white/30 text-sm py-2">Keine Konfiguration</div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {renderTable(normalEvents, 'Normal Events (\u226520 Teilnehmer)')}
      {renderTable(smallEvents, 'Small Events (<20 Teilnehmer)')}
    </div>
  );
}

// ============================================
// SECTION 5: STREAK BENEFITS
// ============================================

function StreakSection({
  data,
  canEdit,
  onRefresh,
  adminId,
}: {
  data: DbStreakConfig[];
  canEdit: boolean;
  onRefresh: () => void;
  adminId: string;
}) {
  const { addToast } = useToast();
  const [editId, setEditId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<DbStreakConfig>>({});

  const handleSave = useCallback(async (id: number) => {
    const result = await updateStreakConfig(adminId, id, {
      daily_tickets: editValues.daily_tickets,
      fantasy_bonus_pct: editValues.fantasy_bonus_pct,
      elo_boost_pct: editValues.elo_boost_pct,
      free_mystery_boxes_per_week: editValues.free_mystery_boxes_per_week,
      mystery_box_ticket_discount: editValues.mystery_box_ticket_discount,
    });
    if (result.ok) {
      addToast('Gespeichert', 'success');
      setEditId(null);
      onRefresh();
    } else {
      addToast(result.error ?? 'Fehler', 'error');
    }
  }, [adminId, editValues, addToast, onRefresh]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-white/40 border-b border-white/10">
            <th className="text-left py-2 px-2">Min Tage</th>
            <th className="text-left py-2 px-2">Tickets/Tag</th>
            <th className="text-left py-2 px-2">Fantasy %</th>
            <th className="text-left py-2 px-2">Elo %</th>
            <th className="text-left py-2 px-2">Free Boxes/W</th>
            <th className="text-left py-2 px-2">Box Rabatt</th>
            {canEdit && <th className="text-right py-2 px-2">Aktion</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const isEditing = editId === row.id;
            const vals = isEditing ? editValues : row;
            return (
              <tr key={row.id} className="border-b border-white/[0.04]">
                <td className="py-2 px-2 font-mono tabular-nums text-white">{row.min_days}</td>
                <td className="py-2 px-2">
                  {isEditing ? (
                    <input
                      type="number"
                      inputMode="numeric"
                      value={vals.daily_tickets ?? 0}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, daily_tickets: parseInt(e.target.value) || 0 }))}
                      className={INPUT_CLASS}
                    />
                  ) : (
                    <span className="font-mono tabular-nums text-gold">{row.daily_tickets}</span>
                  )}
                </td>
                <td className="py-2 px-2">
                  {isEditing ? (
                    <input
                      type="number"
                      inputMode="numeric"
                      value={vals.fantasy_bonus_pct ?? 0}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, fantasy_bonus_pct: parseFloat(e.target.value) || 0 }))}
                      className={INPUT_CLASS}
                    />
                  ) : (
                    <span className="font-mono tabular-nums text-white">{row.fantasy_bonus_pct}%</span>
                  )}
                </td>
                <td className="py-2 px-2">
                  {isEditing ? (
                    <input
                      type="number"
                      inputMode="numeric"
                      value={vals.elo_boost_pct ?? 0}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, elo_boost_pct: parseFloat(e.target.value) || 0 }))}
                      className={INPUT_CLASS}
                    />
                  ) : (
                    <span className="font-mono tabular-nums text-white">{row.elo_boost_pct}%</span>
                  )}
                </td>
                <td className="py-2 px-2">
                  {isEditing ? (
                    <input
                      type="number"
                      inputMode="numeric"
                      value={vals.free_mystery_boxes_per_week ?? 0}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, free_mystery_boxes_per_week: parseInt(e.target.value) || 0 }))}
                      className={INPUT_CLASS}
                    />
                  ) : (
                    <span className="font-mono tabular-nums text-white">{row.free_mystery_boxes_per_week}</span>
                  )}
                </td>
                <td className="py-2 px-2">
                  {isEditing ? (
                    <input
                      type="number"
                      inputMode="numeric"
                      value={vals.mystery_box_ticket_discount ?? 0}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, mystery_box_ticket_discount: parseInt(e.target.value) || 0 }))}
                      className={INPUT_CLASS}
                    />
                  ) : (
                    <span className="font-mono tabular-nums text-white">{row.mystery_box_ticket_discount}</span>
                  )}
                </td>
                {canEdit && (
                  <td className="py-2 px-2 text-right">
                    {!isEditing ? (
                      <EditButton onClick={() => {
                        setEditId(row.id);
                        setEditValues(row);
                      }} />
                    ) : (
                      <SaveCancelButtons
                        onSave={() => handleSave(row.id)}
                        onCancel={() => setEditId(null)}
                      />
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="text-center text-white/30 text-sm py-4">Keine Streak-Konfiguration vorhanden</div>
      )}
    </div>
  );
}

// ============================================
// SECTION 6: MISSIONS
// ============================================

function MissionsSection({
  data,
  canEdit,
  onRefresh,
  adminId,
}: {
  data: DbMissionDefinition[];
  canEdit: boolean;
  onRefresh: () => void;
  adminId: string;
}) {
  const { addToast } = useToast();
  const [editId, setEditId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState(0);
  const [editRewardCents, setEditRewardCents] = useState(0);
  const [editActive, setEditActive] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMission, setNewMission] = useState({
    key: '',
    type: 'daily' as 'daily' | 'weekly',
    title: '',
    description: '',
    icon: 'star',
    target_value: 1,
    reward_cents: 10000,
    tracking_type: 'manual' as 'manual' | 'transaction',
  });

  const handleSave = useCallback(async (id: string) => {
    const result = await updateMission(adminId, id, {
      target_value: editTarget,
      reward_cents: editRewardCents,
      active: editActive,
    });
    if (result.ok) {
      addToast('Gespeichert', 'success');
      setEditId(null);
      onRefresh();
    } else {
      addToast(result.error ?? 'Fehler', 'error');
    }
  }, [adminId, editTarget, editRewardCents, editActive, addToast, onRefresh]);

  const handleCreate = useCallback(async () => {
    if (!newMission.key || !newMission.title) {
      addToast('Key und Titel sind Pflichtfelder', 'error');
      return;
    }
    const result = await createMission(adminId, newMission);
    if (result.ok) {
      addToast('Mission erstellt', 'success');
      setShowCreateForm(false);
      setNewMission({
        key: '', type: 'daily', title: '', description: '', icon: 'star',
        target_value: 1, reward_cents: 10000, tracking_type: 'manual',
      });
      onRefresh();
    } else {
      addToast(result.error ?? 'Fehler', 'error');
    }
  }, [adminId, newMission, addToast, onRefresh]);

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gold/20 text-gold hover:bg-gold/30 transition-colors min-h-[44px]"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Neue Mission
          </button>
        </div>
      )}

      {showCreateForm && (
        <Card className="p-4 space-y-3">
          <div className="text-xs font-bold text-white mb-2">Neue Mission erstellen</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-white/40 text-xs block mb-1">Key</label>
              <input
                type="text"
                value={newMission.key}
                onChange={(e) => setNewMission((p) => ({ ...p, key: e.target.value }))}
                placeholder="z.B. daily_trade"
                className={cn(INPUT_WIDE_CLASS, 'w-full')}
              />
            </div>
            <div>
              <label className="text-white/40 text-xs block mb-1">Typ</label>
              <select
                value={newMission.type}
                onChange={(e) => setNewMission((p) => ({ ...p, type: e.target.value as 'daily' | 'weekly' }))}
                className={cn(INPUT_WIDE_CLASS, 'w-full')}
              >
                <option value="daily">daily</option>
                <option value="weekly">weekly</option>
              </select>
            </div>
            <div>
              <label className="text-white/40 text-xs block mb-1">Titel</label>
              <input
                type="text"
                value={newMission.title}
                onChange={(e) => setNewMission((p) => ({ ...p, title: e.target.value }))}
                className={cn(INPUT_WIDE_CLASS, 'w-full')}
              />
            </div>
            <div>
              <label className="text-white/40 text-xs block mb-1">Beschreibung</label>
              <input
                type="text"
                value={newMission.description}
                onChange={(e) => setNewMission((p) => ({ ...p, description: e.target.value }))}
                className={cn(INPUT_WIDE_CLASS, 'w-full')}
              />
            </div>
            <div>
              <label className="text-white/40 text-xs block mb-1">Icon</label>
              <input
                type="text"
                value={newMission.icon}
                onChange={(e) => setNewMission((p) => ({ ...p, icon: e.target.value }))}
                className={cn(INPUT_WIDE_CLASS, 'w-full')}
              />
            </div>
            <div>
              <label className="text-white/40 text-xs block mb-1">Zielwert</label>
              <input
                type="number"
                inputMode="numeric"
                value={newMission.target_value}
                onChange={(e) => setNewMission((p) => ({ ...p, target_value: parseInt(e.target.value) || 1 }))}
                className={cn(INPUT_CLASS, 'w-full')}
              />
            </div>
            <div>
              <label className="text-white/40 text-xs block mb-1">Reward (Cents)</label>
              <input
                type="number"
                inputMode="numeric"
                value={newMission.reward_cents}
                onChange={(e) => setNewMission((p) => ({ ...p, reward_cents: parseInt(e.target.value) || 0 }))}
                className={cn(INPUT_CLASS, 'w-full')}
              />
            </div>
            <div>
              <label className="text-white/40 text-xs block mb-1">Tracking</label>
              <select
                value={newMission.tracking_type}
                onChange={(e) => setNewMission((p) => ({ ...p, tracking_type: e.target.value as 'manual' | 'transaction' }))}
                className={cn(INPUT_WIDE_CLASS, 'w-full')}
              >
                <option value="manual">manual</option>
                <option value="transaction">transaction</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-xs px-3 py-1 rounded-lg bg-white/10 text-white/40 hover:bg-white/20 transition-colors min-h-[44px]"
            >
              Abbrechen
            </button>
            <button
              onClick={handleCreate}
              className="text-xs px-3 py-1 rounded-lg bg-gold/20 text-gold hover:bg-gold/30 transition-colors min-h-[44px]"
            >
              Erstellen
            </button>
          </div>
        </Card>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-white/40 border-b border-white/10">
              <th className="text-left py-2 px-2">Key</th>
              <th className="text-left py-2 px-2">Typ</th>
              <th className="text-left py-2 px-2">Titel</th>
              <th className="text-left py-2 px-2">Ziel</th>
              <th className="text-left py-2 px-2">Reward ($SCOUT)</th>
              <th className="text-left py-2 px-2">Status</th>
              {canEdit && <th className="text-right py-2 px-2">Aktion</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const isEditing = editId === row.id;
              return (
                <tr key={row.id} className="border-b border-white/[0.04]">
                  <td className="py-2 px-2 font-mono text-white/60">{row.key}</td>
                  <td className="py-2 px-2">
                    <span className={cn(
                      'px-1.5 py-0.5 rounded-full text-xs',
                      row.type === 'daily' ? 'bg-sky-500/20 text-sky-400' : 'bg-purple-500/20 text-purple-400',
                    )}>
                      {row.type}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-white">{row.title}</td>
                  <td className="py-2 px-2">
                    {isEditing ? (
                      <input
                        type="number"
                        inputMode="numeric"
                        value={editTarget}
                        onChange={(e) => setEditTarget(parseInt(e.target.value) || 0)}
                        className={INPUT_CLASS}
                      />
                    ) : (
                      <span className="font-mono tabular-nums text-white">{row.target_value}</span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    {isEditing ? (
                      <input
                        type="number"
                        inputMode="numeric"
                        value={editRewardCents}
                        onChange={(e) => setEditRewardCents(parseInt(e.target.value) || 0)}
                        className={INPUT_CLASS}
                      />
                    ) : (
                      <span className="font-mono tabular-nums text-gold">
                        {fmtScout(centsToBsd(row.reward_cents))}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    {isEditing ? (
                      <button
                        onClick={() => setEditActive(!editActive)}
                        className={cn(
                          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                          editActive ? 'bg-green-500' : 'bg-white/20',
                        )}
                        aria-label={editActive ? 'Aktiv' : 'Inaktiv'}
                      >
                        <span
                          className={cn(
                            'inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform',
                            editActive ? 'translate-x-4' : 'translate-x-0.5',
                          )}
                        />
                      </button>
                    ) : (
                      <span className={cn('text-xs', row.active ? 'text-green-400' : 'text-white/30')}>
                        {row.active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="py-2 px-2 text-right">
                      {!isEditing ? (
                        <EditButton onClick={() => {
                          setEditId(row.id);
                          setEditTarget(row.target_value);
                          setEditRewardCents(row.reward_cents);
                          setEditActive(row.active);
                        }} />
                      ) : (
                        <SaveCancelButtons
                          onSave={() => handleSave(row.id)}
                          onCancel={() => setEditId(null)}
                        />
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {data.length === 0 && (
          <div className="text-center text-white/30 text-sm py-4">Keine Missionen vorhanden</div>
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

// ============================================
// SECTION 7: ACHIEVEMENTS
// ============================================

const CATEGORY_COLORS: Record<string, string> = {
  trading: 'text-sky-400',
  manager: 'text-purple-400',
  scout: 'text-emerald-400',
};

function AchievementsSection({
  data,
  canEdit,
  onRefresh,
  adminId,
}: {
  data: DbAchievementDefinition[];
  canEdit: boolean;
  onRefresh: () => void;
  adminId: string;
}) {
  const { addToast } = useToast();
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editFeatured, setEditFeatured] = useState(false);
  const [editActive, setEditActive] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAch, setNewAch] = useState({
    key: '',
    category: 'trading' as string,
    title: '',
    description: '',
    icon: '🏆',
    featured: false,
  });

  const handleStartEdit = useCallback((item: DbAchievementDefinition) => {
    setEditId(item.id);
    setEditTitle(item.title);
    setEditDesc(item.description);
    setEditIcon(item.icon);
    setEditFeatured(item.featured);
    setEditActive(item.active);
  }, []);

  const handleSave = useCallback(async (id: string) => {
    const result = await updateAchievementDefinition(adminId, id, {
      title: editTitle,
      description: editDesc,
      icon: editIcon,
      featured: editFeatured,
      active: editActive,
    });
    if (result.ok) {
      addToast('Gespeichert', 'success');
      setEditId(null);
      onRefresh();
    } else {
      addToast(result.error ?? 'Fehler', 'error');
    }
  }, [adminId, editTitle, editDesc, editIcon, editFeatured, editActive, addToast, onRefresh]);

  const handleCreate = useCallback(async () => {
    if (!newAch.key || !newAch.title) {
      addToast('Key und Titel sind Pflichtfelder', 'error');
      return;
    }
    const result = await createAchievementDefinition(adminId, newAch);
    if (result.ok) {
      addToast('Achievement erstellt', 'success');
      setShowCreateForm(false);
      setNewAch({ key: '', category: 'trading', title: '', description: '', icon: '🏆', featured: false });
      onRefresh();
    } else {
      addToast(result.error ?? 'Fehler', 'error');
    }
  }, [adminId, newAch, addToast, onRefresh]);

  const grouped = data.reduce<Record<string, DbAchievementDefinition[]>>(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gold/20 text-gold hover:bg-gold/30 transition-colors min-h-[44px]"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Neues Achievement
          </button>
        </div>
      )}

      {showCreateForm && (
        <Card className="p-4 space-y-3">
          <div className="text-xs font-bold text-white mb-2">Neues Achievement erstellen</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-white/40 text-xs block mb-1">Key</label>
              <input
                type="text"
                value={newAch.key}
                onChange={(e) => setNewAch((p) => ({ ...p, key: e.target.value }))}
                placeholder="z.B. first_trade"
                className={cn(INPUT_WIDE_CLASS, 'w-full')}
              />
            </div>
            <div>
              <label className="text-white/40 text-xs block mb-1">Kategorie</label>
              <select
                value={newAch.category}
                onChange={(e) => setNewAch((p) => ({ ...p, category: e.target.value }))}
                className={cn(INPUT_WIDE_CLASS, 'w-full')}
              >
                <option value="trading">Trading</option>
                <option value="manager">Manager</option>
                <option value="scout">Scout</option>
              </select>
            </div>
            <div>
              <label className="text-white/40 text-xs block mb-1">Titel</label>
              <input
                type="text"
                value={newAch.title}
                onChange={(e) => setNewAch((p) => ({ ...p, title: e.target.value }))}
                className={cn(INPUT_WIDE_CLASS, 'w-full')}
              />
            </div>
            <div>
              <label className="text-white/40 text-xs block mb-1">Beschreibung</label>
              <input
                type="text"
                value={newAch.description}
                onChange={(e) => setNewAch((p) => ({ ...p, description: e.target.value }))}
                className={cn(INPUT_WIDE_CLASS, 'w-full')}
              />
            </div>
            <div>
              <label className="text-white/40 text-xs block mb-1">Icon</label>
              <input
                type="text"
                value={newAch.icon}
                onChange={(e) => setNewAch((p) => ({ ...p, icon: e.target.value }))}
                className={cn(INPUT_CLASS, 'w-full')}
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-1.5 text-xs text-white/60">
                <input
                  type="checkbox"
                  checked={newAch.featured}
                  onChange={(e) => setNewAch((p) => ({ ...p, featured: e.target.checked }))}
                  className="rounded"
                />
                Featured
              </label>
            </div>
          </div>
          <SaveCancelButtons onSave={handleCreate} onCancel={() => setShowCreateForm(false)} />
        </Card>
      )}

      {(Object.entries(grouped) as [string, DbAchievementDefinition[]][]).map(([cat, items]) => (
        <div key={cat}>
          <div className={cn('text-xs font-bold uppercase tracking-wider mb-2', CATEGORY_COLORS[cat] ?? 'text-white/60')}>
            {cat.charAt(0).toUpperCase() + cat.slice(1)} ({items.length})
          </div>
          <div className="space-y-1">
            {items.map((item) => {
              const isEditing = editId === item.id;
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg',
                    !item.active && 'opacity-40',
                    isEditing ? 'bg-surface-subtle' : 'hover:bg-surface-minimal',
                  )}
                >
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={editIcon}
                        onChange={(e) => setEditIcon(e.target.value)}
                        className={cn(INPUT_CLASS, 'w-12 text-center')}
                      />
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className={cn(INPUT_WIDE_CLASS, 'w-full')}
                        />
                        <input
                          type="text"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className={cn(INPUT_WIDE_CLASS, 'w-full')}
                        />
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-xs text-white/60">
                            <input type="checkbox" checked={editFeatured} onChange={(e) => setEditFeatured(e.target.checked)} className="rounded" />
                            Featured
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-white/60">
                            <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} className="rounded" />
                            Aktiv
                          </label>
                        </div>
                      </div>
                      <SaveCancelButtons onSave={() => handleSave(item.id)} onCancel={() => setEditId(null)} />
                    </>
                  ) : (
                    <>
                      <span className="text-lg flex-shrink-0">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">{item.title}</span>
                          <span className="text-[10px] text-white/30 font-mono">{item.key}</span>
                          {item.featured && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold/10 text-gold border border-gold/20">Featured</span>
                          )}
                          {!item.active && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/20">Inaktiv</span>
                          )}
                        </div>
                        <p className="text-[10px] text-white/40 truncate">{item.description}</p>
                      </div>
                      {canEdit && <EditButton onClick={() => handleStartEdit(item)} />}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminEconomyTab({
  adminId,
  role,
}: {
  adminId: string;
  role: string;
}) {
  const [loading, setLoading] = useState(true);
  const [eloData, setEloData] = useState<DbEloConfig[]>([]);
  const [rangData, setRangData] = useState<DbRangThreshold[]>([]);
  const [scoreRoadData, setScoreRoadData] = useState<DbScoreRoadConfig[]>([]);
  const [managerData, setManagerData] = useState<DbManagerPointsConfig[]>([]);
  const [streakData, setStreakData] = useState<DbStreakConfig[]>([]);
  const [missionData, setMissionData] = useState<DbMissionDefinition[]>([]);
  const [achievementData, setAchievementData] = useState<DbAchievementDefinition[]>([]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    elo: true,
    rang: false,
    scoreRoad: false,
    manager: false,
    streak: false,
    missions: false,
    achievements: false,
  });

  const canEdit = role !== 'viewer';

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [elo, rang, sr, mp, st, mi, ach] = await Promise.all([
        getEloConfig(),
        getRangThresholds(),
        getScoreRoadConfig(),
        getManagerPointsConfig(),
        getStreakConfig(),
        getMissionDefinitions(),
        getAchievementDefinitions(),
      ]);
      setEloData(elo);
      setRangData(rang);
      setScoreRoadData(sr);
      setManagerData(mp);
      setStreakData(st);
      setMissionData(mi);
      setAchievementData(ach);
    } catch (err) {
      console.error('[AdminEconomyTab] Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const toggleSection = useCallback((key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-5 animate-spin motion-reduce:animate-none text-white/30" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Section 1: Elo-Punkte */}
      <SectionHeader
        title="Elo-Punkte"
        count={eloData.length}
        open={openSections.elo ?? false}
        onToggle={() => toggleSection('elo')}
      />
      {openSections.elo && (
        <Card className="p-4">
          <EloSection data={eloData} canEdit={canEdit} onRefresh={loadAll} adminId={adminId} />
        </Card>
      )}

      {/* Section 2: Raenge */}
      <SectionHeader
        title="Raenge"
        count={rangData.length}
        open={openSections.rang ?? false}
        onToggle={() => toggleSection('rang')}
      />
      {openSections.rang && (
        <Card className="p-4">
          <RangeSection data={rangData} canEdit={canEdit} onRefresh={loadAll} adminId={adminId} />
        </Card>
      )}

      {/* Section 3: Score Road */}
      <SectionHeader
        title="Score Road"
        count={scoreRoadData.length}
        open={openSections.scoreRoad ?? false}
        onToggle={() => toggleSection('scoreRoad')}
      />
      {openSections.scoreRoad && (
        <Card className="p-4">
          <ScoreRoadSection data={scoreRoadData} canEdit={canEdit} onRefresh={loadAll} adminId={adminId} />
        </Card>
      )}

      {/* Section 4: Manager Points */}
      <SectionHeader
        title="Manager Points"
        count={managerData.length}
        open={openSections.manager ?? false}
        onToggle={() => toggleSection('manager')}
      />
      {openSections.manager && (
        <Card className="p-4">
          <ManagerPointsSection data={managerData} canEdit={canEdit} onRefresh={loadAll} adminId={adminId} />
        </Card>
      )}

      {/* Section 5: Streak Benefits */}
      <SectionHeader
        title="Streak Benefits"
        count={streakData.length}
        open={openSections.streak ?? false}
        onToggle={() => toggleSection('streak')}
      />
      {openSections.streak && (
        <Card className="p-4">
          <StreakSection data={streakData} canEdit={canEdit} onRefresh={loadAll} adminId={adminId} />
        </Card>
      )}

      {/* Section 6: Missionen */}
      <SectionHeader
        title="Missionen"
        count={missionData.length}
        open={openSections.missions ?? false}
        onToggle={() => toggleSection('missions')}
      />
      {openSections.missions && (
        <Card className="p-4">
          <MissionsSection data={missionData} canEdit={canEdit} onRefresh={loadAll} adminId={adminId} />
        </Card>
      )}

      {/* Section 7: Achievements */}
      <SectionHeader
        title="Achievements"
        count={achievementData.length}
        open={openSections.achievements ?? false}
        onToggle={() => toggleSection('achievements')}
      />
      {openSections.achievements && (
        <Card className="p-4">
          <AchievementsSection data={achievementData} canEdit={canEdit} onRefresh={loadAll} adminId={adminId} />
        </Card>
      )}
    </div>
  );
}
