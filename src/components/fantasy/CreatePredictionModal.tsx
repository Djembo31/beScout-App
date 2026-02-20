'use client';

import React, { useState, useMemo } from 'react';
import { Target, ChevronRight, ChevronLeft, User, Loader2 } from 'lucide-react';
import { Modal, Button, Card } from '@/components/ui';
import { PlayerIdentity } from '@/components/player';
import { getClub } from '@/lib/clubs';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { usePredictionFixtures, useCreatePrediction } from '@/lib/queries/predictions';
import type { PredictionFixture } from '@/lib/services/predictions';
import type { PredictionType, MatchCondition, PlayerCondition, PredictionCondition } from '@/types';

interface CreatePredictionModalProps {
  open: boolean;
  onClose: () => void;
  gameweek: number;
  userId: string;
  currentCount: number;
}

type Step = 'fixture' | 'condition' | 'confirm';

const MATCH_CONDITIONS: { key: MatchCondition; options: string[] }[] = [
  { key: 'match_result', options: ['home', 'draw', 'away'] },
  { key: 'total_goals', options: ['over_2_5', 'under_2_5'] },
  { key: 'both_score', options: ['yes', 'no'] },
];

const PLAYER_CONDITIONS: { key: PlayerCondition; options: string[] }[] = [
  { key: 'player_goals', options: ['0', '1', '2+'] },
  { key: 'player_assists', options: ['0', '1+'] },
  { key: 'player_card', options: ['yellow', 'red', 'none'] },
  { key: 'clean_sheet', options: ['yes', 'no'] },
  { key: 'player_minutes', options: ['over_60', 'sub', 'bench'] },
];

export function CreatePredictionModal({ open, onClose, gameweek, userId, currentCount }: CreatePredictionModalProps) {
  const t = useTranslations('predictions');
  const { data: fixtures = [] } = usePredictionFixtures(gameweek);
  const createMutation = useCreatePrediction(userId, gameweek);

  const [step, setStep] = useState<Step>('fixture');
  const [selectedFixture, setSelectedFixture] = useState<PredictionFixture | null>(null);
  const [predType, setPredType] = useState<PredictionType>('match');
  const [selectedCondition, setSelectedCondition] = useState<PredictionCondition | null>(null);
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(70);
  const [playerSearch, setPlayerSearch] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState('');
  const [players, setPlayers] = useState<{ id: string; first_name: string; last_name: string; position: string; club?: string; image_url?: string | null }[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [error, setError] = useState('');

  // Score preview
  const scorePreview = useMemo(() => {
    if (!selectedCondition || !selectedValue) return null;
    const difficulty = 1.0; // Will be computed by RPC — show estimate with 1.0
    const correct = +(10 * (confidence / 100) * difficulty).toFixed(1);
    const wrong = +(-6 * (confidence / 100) * difficulty).toFixed(1);
    return { correct, wrong };
  }, [confidence, selectedCondition, selectedValue]);

  const reset = () => {
    setStep('fixture');
    setSelectedFixture(null);
    setPredType('match');
    setSelectedCondition(null);
    setSelectedValue(null);
    setConfidence(70);
    setPlayerSearch('');
    setSelectedPlayerId(null);
    setSelectedPlayerName('');
    setPlayers([]);
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFixtureSelect = (f: PredictionFixture) => {
    setSelectedFixture(f);
    setStep('condition');
  };

  const handlePlayerTypeSelect = async () => {
    if (!selectedFixture || loadingPlayers) return;
    setPredType('player');
    setLoadingPlayers(true);
    try {
      const { getPlayersForFixture } = await import('@/lib/services/predictions');
      const result = await getPlayersForFixture(selectedFixture.homeClubId, selectedFixture.awayClubId);
      setPlayers(result);
    } catch (err) {
      console.error('[Predictions] Player load failed:', err);
      setPlayers([]);
    }
    setLoadingPlayers(false);
  };

  const filteredPlayers = useMemo(() => {
    if (!playerSearch) return players.slice(0, 20);
    const s = playerSearch.toLowerCase();
    return players.filter(p =>
      p.first_name.toLowerCase().includes(s) || p.last_name.toLowerCase().includes(s)
    ).slice(0, 20);
  }, [players, playerSearch]);

  const handleSubmit = async () => {
    if (!selectedFixture || !selectedCondition || !selectedValue) return;
    setError('');

    try {
      const result = await createMutation.mutateAsync({
        fixtureId: selectedFixture.id,
        type: predType,
        playerId: predType === 'player' ? selectedPlayerId ?? undefined : undefined,
        condition: selectedCondition,
        value: selectedValue,
        confidence,
      });

      if (result.ok) {
        handleClose();
      } else {
        setError(result.error ?? 'Fehler');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Netzwerkfehler');
    }
  };

  const conditions = predType === 'match' ? MATCH_CONDITIONS : PLAYER_CONDITIONS;

  return (
    <Modal open={open} onClose={handleClose} title={t('create')}>
      <div className="space-y-4">
        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs text-white/40">
          <span className={cn(step === 'fixture' && 'text-[#FFD700] font-bold')}>{t('selectFixture')}</span>
          <ChevronRight className="w-3 h-3" />
          <span className={cn(step === 'condition' && 'text-[#FFD700] font-bold')}>{t('selectCondition')}</span>
          <ChevronRight className="w-3 h-3" />
          <span className={cn(step === 'confirm' && 'text-[#FFD700] font-bold')}>{t('confidence')}</span>
        </div>

        {/* Step 1: Select Fixture */}
        {step === 'fixture' && (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {fixtures.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-4">{t('noFixtures')}</p>
            ) : (
              fixtures.map(f => {
                const home = getClub(f.homeClubId);
                const away = getClub(f.awayClubId);
                return (
                  <button
                    key={f.id}
                    onClick={() => handleFixtureSelect(f)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] transition-colors text-left"
                  >
                    <FixtureClubLogo club={home} />
                    <span className="font-semibold text-sm flex-1 text-center">
                      {f.homeClubShort} <span className="text-white/30">vs</span> {f.awayClubShort}
                    </span>
                    <FixtureClubLogo club={away} />
                    <ChevronRight className="w-4 h-4 text-white/20" />
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Step 2: Select Condition + Value */}
        {step === 'condition' && selectedFixture && (
          <div className="space-y-3">
            {/* Type toggle: Match / Player */}
            <div className="flex gap-2">
              <button
                onClick={() => { setPredType('match'); setSelectedPlayerId(null); setSelectedPlayerName(''); setSelectedCondition(null); setSelectedValue(null); }}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-bold transition-colors',
                  predType === 'match' ? 'bg-[#FFD700]/15 text-[#FFD700]' : 'bg-white/5 text-white/40'
                )}
              >
                <Target className="w-3.5 h-3.5 inline mr-1" />
                Match
              </button>
              <button
                onClick={() => { handlePlayerTypeSelect(); setSelectedCondition(null); setSelectedValue(null); }}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-bold transition-colors',
                  predType === 'player' ? 'bg-[#FFD700]/15 text-[#FFD700]' : 'bg-white/5 text-white/40'
                )}
              >
                <User className="w-3.5 h-3.5 inline mr-1" />
                {t('playerLabel')}
              </button>
            </div>

            {/* Player selector (only for player type) */}
            {predType === 'player' && !selectedPlayerId && (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder={t('searchPlayer')}
                  value={playerSearch}
                  onChange={e => setPlayerSearch(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#FFD700]/50"
                />
                {loadingPlayers ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filteredPlayers.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedPlayerId(p.id); setSelectedPlayerName(`${p.first_name} ${p.last_name}`); }}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-left text-sm"
                      >
                        <PlayerIdentity
                          player={{ first: p.first_name, last: p.last_name, pos: p.position as 'GK' | 'DEF' | 'MID' | 'ATT', status: 'fit', club: p.club ?? '', ticket: 0, age: 0, imageUrl: p.image_url }}
                          size="sm" showMeta={false} showStatus={false}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Selected player badge */}
            {predType === 'player' && selectedPlayerId && (
              <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg">
                <User className="w-3.5 h-3.5 text-[#FFD700]" />
                <span className="text-sm font-bold">{selectedPlayerName}</span>
                <button onClick={() => { setSelectedPlayerId(null); setSelectedPlayerName(''); setSelectedCondition(null); setSelectedValue(null); }} className="ml-auto text-xs text-white/40 hover:text-white/60">
                  {t('change')}
                </button>
              </div>
            )}

            {/* Condition + Value buttons (only show when ready) */}
            {(predType === 'match' || (predType === 'player' && selectedPlayerId)) && (
              <div className="space-y-3">
                {conditions.map(c => (
                  <div key={c.key} className="space-y-1.5">
                    <p className="text-xs text-white/50 font-semibold">{getConditionLabel(c.key, t)}</p>
                    <div className="flex gap-2 flex-wrap">
                      {c.options.map(opt => {
                        const isSelected = selectedCondition === c.key && selectedValue === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => { setSelectedCondition(c.key); setSelectedValue(opt); }}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border',
                              isSelected
                                ? 'bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/30'
                                : 'bg-white/[0.03] text-white/60 border-white/[0.06] hover:bg-white/[0.06]'
                            )}
                          >
                            {getValueLabel(c.key, opt, t)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => { setStep('fixture'); setSelectedCondition(null); setSelectedValue(null); setPredType('match'); }}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                className="flex-1"
                disabled={!selectedCondition || !selectedValue}
                onClick={() => setStep('confirm')}
              >
                {t('next')}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confidence + Confirm */}
        {step === 'confirm' && (
          <div className="space-y-4">
            {/* Summary */}
            <Card className="p-3 bg-white/[0.03]">
              <div className="text-sm">
                <span className="text-white/50">{selectedFixture?.homeClubShort} vs {selectedFixture?.awayClubShort}</span>
                {predType === 'player' && (
                  <span className="text-white/50"> — {selectedPlayerName}</span>
                )}
              </div>
              <div className="text-sm font-bold mt-1">
                {selectedCondition && getConditionLabel(selectedCondition, t)}: {selectedValue && selectedCondition && getValueLabel(selectedCondition, selectedValue, t)}
              </div>
            </Card>

            {/* Confidence slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold">{t('confidence')}</label>
                <span className={cn(
                  'text-lg font-mono font-black',
                  confidence >= 86 ? 'text-[#FFD700]' : confidence >= 66 ? 'text-[#22C55E]' : 'text-amber-400'
                )}>
                  {confidence}%
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                value={confidence}
                onChange={e => setConfidence(Number(e.target.value))}
                className="w-full accent-[#FFD700]"
              />
              <p className="text-[11px] text-white/30 mt-1">{t('confidenceHint')}</p>
            </div>

            {/* Score preview (estimate — actual difficulty computed server-side) */}
            {scorePreview && (
              <div>
                <div className="flex gap-4 text-center">
                  <div className="flex-1 p-2 rounded-lg bg-[#22C55E]/10">
                    <p className="text-[10px] text-[#22C55E]/60">{t('correct')}</p>
                    <p className="text-sm font-mono font-bold text-[#22C55E]">~+{scorePreview.correct}</p>
                  </div>
                  <div className="flex-1 p-2 rounded-lg bg-red-400/10">
                    <p className="text-[10px] text-red-400/60">{t('wrong')}</p>
                    <p className="text-sm font-mono font-bold text-red-400">~{scorePreview.wrong}</p>
                  </div>
                </div>
                <p className="text-[10px] text-white/20 text-center mt-1">{t('scoreEstimate')}</p>
              </div>
            )}

            {error && <p className="text-xs text-red-400">{error}</p>}

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('condition')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t('submit')
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Helpers ──

function FixtureClubLogo({ club }: { club: { logo?: string | null; colors?: { primary: string } } | null }) {
  if (club?.logo) {
    return <img src={club.logo} alt="" className="w-6 h-6 rounded-full object-cover" />;
  }
  return <div className="w-5 h-5 rounded-full" style={{ backgroundColor: club?.colors?.primary ?? '#666' }} />;
}

function getConditionLabel(condition: string, t: ReturnType<typeof useTranslations<'predictions'>>): string {
  const map: Record<string, string> = {
    match_result: t('matchResult'),
    total_goals: t('totalGoals'),
    both_score: t('bothScore'),
    player_goals: t('playerGoals'),
    player_assists: t('playerAssists'),
    player_card: t('playerCard'),
    clean_sheet: t('cleanSheet'),
    player_minutes: t('playerMinutes'),
  };
  return map[condition] ?? condition;
}

function getValueLabel(condition: string, value: string, t: ReturnType<typeof useTranslations<'predictions'>>): string {
  const map: Record<string, Record<string, string>> = {
    match_result: { home: t('home'), draw: t('draw'), away: t('away') },
    total_goals: { over_2_5: t('over25'), under_2_5: t('under25') },
    both_score: { yes: t('yes'), no: t('no') },
    player_goals: { '0': '0', '1': '1', '2+': '2+' },
    player_assists: { '0': '0', '1+': '1+' },
    player_card: { yellow: t('yellowCard'), red: t('redCard'), none: t('noCard') },
    clean_sheet: { yes: t('yes'), no: t('no') },
    player_minutes: { over_60: '>60 Min', sub: t('sub'), bench: t('bench') },
  };
  return map[condition]?.[value] ?? value;
}
