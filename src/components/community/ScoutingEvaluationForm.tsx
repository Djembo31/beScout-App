'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { SCOUTING_DIMENSIONS } from '@/types';
import type { ScoutingEvaluation, ScoutingDimension, DbFixture } from '@/types';
import { useTranslations } from 'next-intl';
import { getClub } from '@/lib/clubs';

type Props = {
  evaluation: ScoutingEvaluation;
  onEvaluationChange: (ev: ScoutingEvaluation) => void;
  fixtures?: DbFixture[];
  selectedFixtureId: string | null;
  onFixtureChange: (id: string | null) => void;
  tried: boolean;
};

const PILLS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function DimensionRow({
  dimKey,
  label,
  desc,
  value,
  onChange,
  tried,
}: {
  dimKey: ScoutingDimension;
  label: string;
  desc: string;
  value: number;
  onChange: (v: number) => void;
  tried: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div>
          <span className="text-xs font-bold text-white/80">{label}</span>
          <span className="text-[10px] text-white/30 ml-2">{desc}</span>
        </div>
        {value > 0 && (
          <span className="text-xs font-mono font-bold text-[#FFD700]">{value}/10</span>
        )}
      </div>
      <div className="flex gap-1">
        {PILLS.map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border min-h-[36px]',
              value === n
                ? 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30 scale-105'
                : value > 0 && n <= value
                ? 'bg-[#FFD700]/10 text-[#FFD700]/60 border-[#FFD700]/15'
                : 'bg-white/5 text-white/30 border-white/10 hover:bg-white/10'
            )}
          >
            {n}
          </button>
        ))}
      </div>
      {tried && value === 0 && (
        <div className="text-[10px] text-red-400 mt-0.5">Bewertung erforderlich</div>
      )}
    </div>
  );
}

export default function ScoutingEvaluationForm({
  evaluation,
  onEvaluationChange,
  fixtures,
  selectedFixtureId,
  onFixtureChange,
  tried,
}: Props) {
  const ts = useTranslations('scouting');

  const setDim = (key: ScoutingDimension, value: number) => {
    onEvaluationChange({ ...evaluation, [key]: value });
  };

  return (
    <div className="space-y-4">
      {/* Dimensions */}
      <div className="space-y-3">
        <label className="text-xs text-white/50 font-semibold block">{ts('dimensions')}</label>
        {SCOUTING_DIMENSIONS.map(dim => (
          <DimensionRow
            key={dim.key}
            dimKey={dim.key}
            label={ts(`dim.${dim.key}`)}
            desc={ts(`dimDesc.${dim.key}`)}
            value={evaluation[dim.key]}
            onChange={(v) => setDim(dim.key, v)}
            tried={tried}
          />
        ))}
      </div>

      {/* Fixture Picker */}
      {fixtures && fixtures.length > 0 && (
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">{ts('fixture')}</label>
          <select
            value={selectedFixtureId ?? ''}
            onChange={(e) => onFixtureChange(e.target.value || null)}
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#FFD700]/40"
          >
            <option value="">{ts('noFixture')}</option>
            {fixtures.map(f => {
              const home = getClub(f.home_club_id);
              const away = getClub(f.away_club_id);
              return (
                <option key={f.id} value={f.id}>
                  GW {f.gameweek}: {home?.short ?? '?'} vs {away?.short ?? '?'}
                  {f.home_score !== null ? ` (${f.home_score}:${f.away_score})` : ''}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* Text Fields */}
      <div>
        <label className="text-xs text-white/50 font-semibold mb-1.5 flex justify-between">
          <span>{ts('strengths')}</span>
          <span className={cn('font-mono', evaluation.staerken.length > 0 ? 'text-white/30' : 'text-red-400/60')}>{evaluation.staerken.length}</span>
        </label>
        <textarea
          value={evaluation.staerken}
          onChange={(e) => onEvaluationChange({ ...evaluation, staerken: e.target.value.slice(0, 500) })}
          rows={2}
          placeholder={ts('strengthsPlaceholder')}
          className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40 resize-none"
        />
        {tried && evaluation.staerken.length < 20 && (
          <div className="text-[10px] text-red-400 mt-0.5">{ts('minChars', { count: 20 })} ({evaluation.staerken.length}/20)</div>
        )}
      </div>

      <div>
        <label className="text-xs text-white/50 font-semibold mb-1.5 flex justify-between">
          <span>{ts('weaknesses')}</span>
          <span className={cn('font-mono', evaluation.schwaechen.length > 0 ? 'text-white/30' : 'text-red-400/60')}>{evaluation.schwaechen.length}</span>
        </label>
        <textarea
          value={evaluation.schwaechen}
          onChange={(e) => onEvaluationChange({ ...evaluation, schwaechen: e.target.value.slice(0, 500) })}
          rows={2}
          placeholder={ts('weaknessesPlaceholder')}
          className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40 resize-none"
        />
        {tried && evaluation.schwaechen.length < 20 && (
          <div className="text-[10px] text-red-400 mt-0.5">{ts('minChars', { count: 20 })} ({evaluation.schwaechen.length}/20)</div>
        )}
      </div>

      <div>
        <label className="text-xs text-white/50 font-semibold mb-1.5 flex justify-between">
          <span>{ts('overall')}</span>
          <span className={cn('font-mono', evaluation.gesamteindruck.length > 0 ? 'text-white/30' : 'text-red-400/60')}>{evaluation.gesamteindruck.length}</span>
        </label>
        <textarea
          value={evaluation.gesamteindruck}
          onChange={(e) => onEvaluationChange({ ...evaluation, gesamteindruck: e.target.value.slice(0, 1000) })}
          rows={3}
          placeholder={ts('overallPlaceholder')}
          className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40 resize-none"
        />
        {tried && evaluation.gesamteindruck.length < 30 && (
          <div className="text-[10px] text-red-400 mt-0.5">{ts('minChars', { count: 30 })} ({evaluation.gesamteindruck.length}/30)</div>
        )}
      </div>
    </div>
  );
}
