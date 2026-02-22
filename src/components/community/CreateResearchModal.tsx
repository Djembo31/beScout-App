'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import ScoutingEvaluationForm from '@/components/community/ScoutingEvaluationForm';
import type { Pos, ResearchCall, ResearchHorizon, ResearchCategory, ScoutingEvaluation, DbFixture } from '@/types';
import { useTranslations } from 'next-intl';

type Props = {
  open: boolean;
  onClose: () => void;
  players: { id: string; name: string; pos: Pos }[];
  onSubmit: (params: {
    playerId: string | null;
    title: string;
    preview: string;
    content: string;
    tags: string[];
    category: ResearchCategory;
    call: ResearchCall;
    horizon: ResearchHorizon;
    priceBsd: number;
    evaluation?: ScoutingEvaluation | null;
    fixtureId?: string | null;
  }) => void;
  loading: boolean;
  fixtures?: DbFixture[];
};

const CALLS: ResearchCall[] = ['Bullish', 'Bearish', 'Neutral'];
const HORIZONS: ResearchHorizon[] = ['24h', '7d', 'Season'];

const CATEGORY_IDS: ResearchCategory[] = ['Spieler-Analyse', 'Transfer-Empfehlung', 'Taktik', 'Saisonvorschau', 'Scouting-Report'];
const CATEGORY_COLORS: Record<ResearchCategory, string> = {
  'Spieler-Analyse': 'bg-sky-500/15 text-sky-300 border-sky-500/20',
  'Transfer-Empfehlung': 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  'Taktik': 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  'Saisonvorschau': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  'Scouting-Report': 'bg-rose-500/15 text-rose-300 border-rose-500/20',
};
const CATEGORY_I18N_KEYS: Record<ResearchCategory, string> = {
  'Spieler-Analyse': 'catPlayerAnalysis',
  'Transfer-Empfehlung': 'catTransferRec',
  'Taktik': 'catTactics',
  'Saisonvorschau': 'catSeasonPreview',
  'Scouting-Report': 'catScoutingReport',
};

const callStyle: Record<ResearchCall, { active: string; inactive: string }> = {
  Bullish: { active: 'bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30', inactive: 'bg-white/5 text-white/50 border-white/10' },
  Bearish: { active: 'bg-red-500/20 text-red-300 border-red-500/30', inactive: 'bg-white/5 text-white/50 border-white/10' },
  Neutral: { active: 'bg-white/15 text-white border-white/30', inactive: 'bg-white/5 text-white/50 border-white/10' },
};

const EMPTY_EVALUATION: ScoutingEvaluation = {
  technik: 0, taktik: 0, athletik: 0, mentalitaet: 0, potenzial: 0,
  staerken: '', schwaechen: '', gesamteindruck: '',
};

export default function CreateResearchModal({ open, onClose, players, onSubmit, loading, fixtures }: Props) {
  const tr = useTranslations('research');
  const [title, setTitle] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [call, setCall] = useState<ResearchCall>('Bullish');
  const [horizon, setHorizon] = useState<ResearchHorizon>('7d');
  const [priceBsd, setPriceBsd] = useState(10);
  const [preview, setPreview] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [category, setCategory] = useState<ResearchCategory>('Spieler-Analyse');
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerDropdownOpen, setPlayerDropdownOpen] = useState(false);
  const [tried, setTried] = useState(false);
  const [evaluation, setEvaluation] = useState<ScoutingEvaluation>(EMPTY_EVALUATION);
  const [fixtureId, setFixtureId] = useState<string | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  const isScouting = category === 'Scouting-Report';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (playerRef.current && !playerRef.current.contains(e.target as Node)) {
        setPlayerDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isEvalValid = isScouting
    ? evaluation.technik >= 1 && evaluation.taktik >= 1 && evaluation.athletik >= 1 &&
      evaluation.mentalitaet >= 1 && evaluation.potenzial >= 1 &&
      evaluation.staerken.length >= 20 && evaluation.schwaechen.length >= 20 &&
      evaluation.gesamteindruck.length >= 30
    : true;

  const canSubmit = title.length >= 5 && content.length >= 50 && preview.length > 0 &&
    priceBsd >= 1 && priceBsd <= 100000 &&
    (!isScouting || (playerId && isEvalValid));

  const handleSubmit = () => {
    setTried(true);
    if (!canSubmit) return;
    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
    onSubmit({
      playerId: playerId || null,
      title: title.trim(),
      preview: preview.trim(),
      content: content.trim(),
      tags,
      category,
      call,
      horizon,
      priceBsd,
      evaluation: isScouting ? evaluation : null,
      fixtureId: isScouting ? fixtureId : null,
    });
  };

  // Reset form when modal closes (parent sets open=false on success)
  React.useEffect(() => {
    if (!open) {
      setTitle('');
      setPlayerId('');
      setCall('Bullish');
      setHorizon('7d');
      setPriceBsd(10);
      setPreview('');
      setContent('');
      setTagInput('');
      setCategory('Spieler-Analyse');
      setPlayerSearch('');
      setTried(false);
      setEvaluation(EMPTY_EVALUATION);
      setFixtureId(null);
    }
  }, [open]);

  return (
    <Modal
      open={open}
      title={isScouting ? tr('newScoutingReport') : tr('newResearchReport')}
      onClose={onClose}
      footer={
        <div className="space-y-2">
          {!canSubmit && (tried || title.length > 0 || preview.length > 0 || content.length > 0) && (
            <div className="text-xs text-red-400/80 space-y-0.5">
              {title.length < 5 && <div>{tr('errorTitle', { min: 5, count: title.length })}</div>}
              {preview.length === 0 && <div>{tr('errorPreview')}</div>}
              {content.length < 50 && <div>{tr('errorContent', { min: 50, count: content.length })}</div>}
              {(priceBsd < 1 || priceBsd > 100000) && <div>{tr('errorPrice')}</div>}
              {isScouting && !playerId && <div>{tr('errorPlayer')}</div>}
              {isScouting && !isEvalValid && <div>{tr('errorEval')}</div>}
            </div>
          )}
          <Button variant="gold" fullWidth loading={loading} disabled={!canSubmit} onClick={handleSubmit}>
            {isScouting ? tr('publishScouting') : tr('publishResearch')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 flex justify-between">
            <span>{tr('title')}</span>
            <span className={cn('font-mono', title.length > 180 ? 'text-amber-400' : 'text-white/30')}>{title.length}/200</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 200))}
            placeholder={isScouting ? tr('titleScoutingPlaceholder') : tr('titleResearchPlaceholder')}
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40"
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">{tr('category')}</label>
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORY_IDS.map(catId => (
              <button
                key={catId}
                type="button"
                onClick={() => setCategory(catId)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                  category === catId
                    ? CATEGORY_COLORS[catId]
                    : 'text-white/50 bg-white/5 border-white/10 hover:bg-white/10'
                )}
              >
                {tr(CATEGORY_I18N_KEYS[catId])}
              </button>
            ))}
          </div>
        </div>

        {/* Player */}
        <div className="relative" ref={playerRef}>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">
            {isScouting ? tr('playerRequired') : tr('playerOptional')}
          </label>
          <input
            type="text"
            value={playerSearch}
            onChange={(e) => { setPlayerSearch(e.target.value); setPlayerDropdownOpen(true); }}
            onFocus={() => setPlayerDropdownOpen(true)}
            onKeyDown={(e) => { if (e.key === 'Escape') setPlayerDropdownOpen(false); }}
            placeholder={playerId ? players.find(p => p.id === playerId)?.name ?? tr('searchPlayer') : tr('searchPlayer')}
            className={cn(
              'w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40',
              playerId && !playerSearch && 'text-white/70',
              tried && isScouting && !playerId ? 'border-red-500/40' : 'border-white/10'
            )}
          />
          {playerId && (
            <button
              type="button"
              onClick={() => { setPlayerId(''); setPlayerSearch(''); }}
              className="absolute right-3 top-[34px] text-white/30 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
          {playerDropdownOpen && (
            <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-xl bg-[#1a1a1a] border border-white/10 shadow-xl">
              {!isScouting && (
                <button
                  type="button"
                  onClick={() => { setPlayerId(''); setPlayerSearch(''); setPlayerDropdownOpen(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-white/50 hover:bg-white/5"
                >
                  {tr('noPlayer')}
                </button>
              )}
              {players
                .filter(p => !playerSearch || p.name.toLowerCase().includes(playerSearch.toLowerCase()))
                .slice(0, 20)
                .map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setPlayerId(p.id); setPlayerSearch(p.name); setPlayerDropdownOpen(false); }}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm hover:bg-white/5 flex items-center justify-between',
                      playerId === p.id ? 'text-[#FFD700]' : 'text-white/80'
                    )}
                  >
                    <span>{p.name}</span>
                    <span className="text-[10px] text-white/30">{p.pos}</span>
                  </button>
                ))}
              {players.filter(p => !playerSearch || p.name.toLowerCase().includes(playerSearch.toLowerCase())).length === 0 && (
                <div className="px-4 py-2 text-sm text-white/30">{tr('noPlayerFound')}</div>
              )}
            </div>
          )}
          {tried && isScouting && !playerId && (
            <div className="text-[10px] text-red-400 mt-0.5">{tr('playerRequiredError')}</div>
          )}
        </div>

        {/* Scouting Evaluation Form (only for Scouting-Report) */}
        {isScouting && (
          <div className="border border-rose-500/20 rounded-2xl p-4 bg-rose-500/5">
            <ScoutingEvaluationForm
              evaluation={evaluation}
              onEvaluationChange={setEvaluation}
              fixtures={fixtures}
              selectedFixtureId={fixtureId}
              onFixtureChange={setFixtureId}
              tried={tried}
            />
          </div>
        )}

        {/* Call + Horizon Row — hidden for Scouting */}
        {!isScouting && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/50 font-semibold mb-1.5 block">{tr('call')}</label>
              <div className="flex gap-1.5">
                {CALLS.map(c => (
                  <button
                    key={c}
                    onClick={() => setCall(c)}
                    className={cn(
                      'flex-1 px-2 py-2 rounded-xl text-xs font-bold border transition-all',
                      call === c ? callStyle[c].active : callStyle[c].inactive
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-white/50 font-semibold mb-1.5 block">{tr('horizon')}</label>
              <div className="flex gap-1.5">
                {HORIZONS.map(h => (
                  <button
                    key={h}
                    onClick={() => setHorizon(h)}
                    className={cn(
                      'flex-1 px-2 py-2 rounded-xl text-xs font-bold border transition-all',
                      horizon === h ? 'bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/25' : 'bg-white/5 text-white/50 border-white/10'
                    )}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Price */}
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">{tr('price')}</label>
          <input
            type="number" inputMode="numeric"
            value={priceBsd}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') { setPriceBsd(0); return; }
              const v = parseInt(raw);
              if (!isNaN(v)) setPriceBsd(Math.min(100000, Math.max(1, v)));
            }}
            min={1}
            max={100000}
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white font-mono focus:outline-none focus:border-[#FFD700]/40"
          />
          <div className="text-[10px] text-white/30 mt-1">{tr('priceHint')}</div>
        </div>

        {/* Preview */}
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 flex justify-between">
            <span>{tr('preview')}</span>
            <span className={cn('font-mono', preview.length > 280 ? 'text-amber-400' : 'text-white/30')}>{preview.length}/300</span>
          </label>
          <textarea
            value={preview}
            onChange={(e) => setPreview(e.target.value.slice(0, 300))}
            rows={2}
            placeholder={tr('previewPlaceholder')}
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40 resize-none"
          />
        </div>

        {/* Content */}
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 flex justify-between">
            <span>{tr('contentBehindPaywall')}</span>
            <span className={cn('font-mono', content.length > 9500 ? 'text-amber-400' : 'text-white/30')}>{content.length}/10.000</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 10000))}
            rows={6}
            placeholder={isScouting ? tr('contentScoutingPlaceholder') : tr('contentResearchPlaceholder')}
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40 resize-none"
          />
          <div className="text-[10px] text-white/30 mt-1">{tr('minChars', { count: 50 })}</div>
        </div>

        {/* Tags */}
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">{tr('tags')}</label>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder={tr('tagsPlaceholder')}
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40"
          />
        </div>

      </div>
    </Modal>
  );
}
