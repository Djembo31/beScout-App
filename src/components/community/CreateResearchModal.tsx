'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import ScoutingEvaluationForm from '@/components/community/ScoutingEvaluationForm';
import type { Pos, ResearchCall, ResearchHorizon, ResearchCategory, ScoutingEvaluation, DbFixture } from '@/types';

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

const CATEGORIES: { id: ResearchCategory; label: string; color: string }[] = [
  { id: 'Spieler-Analyse', label: 'Spieler-Analyse', color: 'bg-sky-500/15 text-sky-300 border-sky-500/20' },
  { id: 'Transfer-Empfehlung', label: 'Transfer-Empfehlung', color: 'bg-purple-500/15 text-purple-300 border-purple-500/20' },
  { id: 'Taktik', label: 'Taktik', color: 'bg-amber-500/15 text-amber-300 border-amber-500/20' },
  { id: 'Saisonvorschau', label: 'Saisonvorschau', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' },
  { id: 'Scouting-Report', label: 'Scouting-Report', color: 'bg-rose-500/15 text-rose-300 border-rose-500/20' },
];

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
    <Modal open={open} title={isScouting ? 'Neuer Scouting-Report' : 'Neuer Research-Bericht'} onClose={onClose}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Title */}
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 flex justify-between">
            <span>Titel</span>
            <span className={cn('font-mono', title.length > 180 ? 'text-amber-400' : 'text-white/30')}>{title.length}/200</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 200))}
            placeholder={isScouting ? 'z.B. Scouting: Mehmet Yilmaz — Starke Technik, Potenzial' : 'z.B. Matchday Edge: Warum Yasin heute überperformen kann'}
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40"
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">Kategorie</label>
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                  category === cat.id
                    ? cat.color
                    : 'text-white/50 bg-white/5 border-white/10 hover:bg-white/10'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Player */}
        <div className="relative" ref={playerRef}>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">
            Spieler {isScouting ? '(Pflicht)' : '(optional)'}
          </label>
          <input
            type="text"
            value={playerSearch}
            onChange={(e) => { setPlayerSearch(e.target.value); setPlayerDropdownOpen(true); }}
            onFocus={() => setPlayerDropdownOpen(true)}
            onKeyDown={(e) => { if (e.key === 'Escape') setPlayerDropdownOpen(false); }}
            placeholder={playerId ? players.find(p => p.id === playerId)?.name ?? 'Spieler suchen...' : 'Spieler suchen...'}
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
                  Kein Spieler
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
                <div className="px-4 py-2 text-sm text-white/30">Kein Spieler gefunden</div>
              )}
            </div>
          )}
          {tried && isScouting && !playerId && (
            <div className="text-[10px] text-red-400 mt-0.5">Spieler ist Pflichtfeld für Scouting-Reports</div>
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
              <label className="text-xs text-white/50 font-semibold mb-1.5 block">Call</label>
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
              <label className="text-xs text-white/50 font-semibold mb-1.5 block">Horizon</label>
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
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">Preis ($SCOUT)</label>
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
          <div className="text-[10px] text-white/30 mt-1">Min 1 $SCOUT, Max 100.000 $SCOUT — 80% gehen an dich, 20% Plattform-Gebühr</div>
        </div>

        {/* Preview */}
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 flex justify-between">
            <span>Vorschau (Teaser)</span>
            <span className={cn('font-mono', preview.length > 280 ? 'text-amber-400' : 'text-white/30')}>{preview.length}/300</span>
          </label>
          <textarea
            value={preview}
            onChange={(e) => setPreview(e.target.value.slice(0, 300))}
            rows={2}
            placeholder="Kurzer Teaser, der immer sichtbar ist..."
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40 resize-none"
          />
        </div>

        {/* Content */}
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 flex justify-between">
            <span>Inhalt (hinter Paywall)</span>
            <span className={cn('font-mono', content.length > 9500 ? 'text-amber-400' : 'text-white/30')}>{content.length}/10.000</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 10000))}
            rows={6}
            placeholder={isScouting ? 'Detaillierte Begründung deiner Bewertung...' : 'Deine vollständige Analyse...'}
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40 resize-none"
          />
          <div className="text-[10px] text-white/30 mt-1">Mindestens 50 Zeichen</div>
        </div>

        {/* Tags */}
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">Tags (kommagetrennt)</label>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="z.B. Form, Value, Tactics, Matchup"
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40"
          />
        </div>

        {!canSubmit && (tried || title.length > 0 || preview.length > 0 || content.length > 0) && (
          <div className="text-xs text-red-400/80 space-y-0.5">
            {title.length < 5 && <div>Titel: mind. 5 Zeichen ({title.length}/5)</div>}
            {preview.length === 0 && <div>Vorschau darf nicht leer sein</div>}
            {content.length < 50 && <div>Inhalt: mind. 50 Zeichen ({content.length}/50)</div>}
            {(priceBsd < 1 || priceBsd > 100000) && <div>Preis: 1–100.000 $SCOUT</div>}
            {isScouting && !playerId && <div>Spieler ist Pflichtfeld</div>}
            {isScouting && !isEvalValid && <div>Alle 5 Dimensionen + Texte ausfüllen</div>}
          </div>
        )}
        <Button variant="gold" fullWidth loading={loading} disabled={!canSubmit} onClick={handleSubmit}>
          {isScouting ? 'Scouting-Report veröffentlichen' : 'Bericht veröffentlichen'}
        </Button>
      </div>
    </Modal>
  );
}
