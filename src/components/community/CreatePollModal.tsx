'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, X, Vote, Lock } from 'lucide-react';
import { Button, Dialog } from '@/components/ui';
import { cn } from '@/lib/utils';
import { createCommunityPoll } from '@/lib/services/communityPolls';
import { getFollowerCount } from '@/lib/services/social';
import { usePlayerNames } from '@/lib/queries';
import type { CommunityPollSource } from '@/types';

const FOLLOWER_THRESHOLD = 50;
const MAX_COST_SCOUT = 1000; // 100.000 cents Cap (Slice 333)

/** Bekannte RPC-Fehlerschlüssel → i18n. Service wirft den raw key (errors-frontend.md i18n-Leak). */
function pollErrorKey(raw: string): string {
  switch (raw) {
    case 'invalid_question': return 'pollErrQuestion';
    case 'invalid_options': return 'pollErrOptions';
    case 'invalid_cost': return 'pollErrCost';
    case 'invalid_duration': return 'pollErrDuration';
    case 'club_id_required': return 'pollErrClubRequired';
    case 'not_club_admin': return 'pollErrNotAdmin';
    case 'follower_threshold': return 'pollErrFollowerGate';
    default: return 'pollErrGeneric';
  }
}

type ModalProps = {
  open: boolean;
  onClose: () => void;
  userId: string;
  source: CommunityPollSource;
  clubId?: string | null;
  onCreated?: () => void;
};

export function CreatePollModal({ open, onClose, userId, source, clubId, onCreated }: ModalProps) {
  const t = useTranslations('community');
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [cost, setCost] = useState('0');
  const [days, setDays] = useState('7');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Slice 334: optionaler Spieler-Anker (Discovery). Picker analog CreateResearchModal.
  const { data: players = [] } = usePlayerNames();
  const [playerId, setPlayerId] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerDropdownOpen, setPlayerDropdownOpen] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (playerRef.current && !playerRef.current.contains(e.target as Node)) {
        setPlayerDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const reset = () => {
    setQuestion(''); setDescription(''); setOptions(['', '']);
    setCost('0'); setDays('7'); setError(null);
    setPlayerId(''); setPlayerSearch(''); setPlayerDropdownOpen(false);
  };

  const handleClose = () => {
    if (creating) return;
    reset();
    onClose();
  };

  const handleCreate = useCallback(async () => {
    if (creating) return;
    setError(null);
    const validOpts = options.map(o => o.trim()).filter(Boolean);
    if (!question.trim()) { setError(t('pollErrQuestion')); return; }
    if (validOpts.length < 2) { setError(t('pollErrOptions')); return; }
    const costScout = parseFloat(cost || '0');
    const costCents = Math.round((Number.isFinite(costScout) ? costScout : 0) * 100);
    if (costCents < 0 || costCents > MAX_COST_SCOUT * 100) { setError(t('pollErrCost')); return; }
    const durationDays = parseInt(days || '0', 10);
    if (!durationDays || durationDays < 1 || durationDays > 30) { setError(t('pollErrDuration')); return; }

    setCreating(true);
    try {
      await createCommunityPoll({
        userId,
        question: question.trim(),
        description: description.trim() || null,
        options: validOpts,
        costBsd: costCents,
        durationDays,
        source,
        clubId: source === 'club' ? clubId : null,
        playerId: playerId || null,
      });
      reset();
      onCreated?.();
      onClose();
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'pollErrGeneric';
      setError(t(pollErrorKey(raw)));
    } finally {
      setCreating(false);
    }
  }, [creating, options, question, description, cost, days, userId, source, clubId, playerId, onCreated, onClose, t]);

  const isClub = source === 'club';

  return (
    <Dialog
      open={open}
      title={isClub ? t('createClubPollTitle') : t('createPollTitle')}
      subtitle={isClub ? t('createClubPollSubtitle') : t('createPollSubtitle')}
      onClose={handleClose}
      preventClose={creating}
    >
      <div className="space-y-4">
        {/* Question */}
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">{t('pollQuestionLabel')}</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, 200))}
            placeholder={t('pollQuestionPlaceholder')}
            className="w-full px-4 py-2.5 rounded-xl text-base bg-surface-base border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40"
          />
        </div>

        {/* Description (optional) */}
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">{t('pollDescriptionLabel')}</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 280))}
            placeholder={t('pollDescriptionPlaceholder')}
            className="w-full px-4 py-2.5 rounded-xl text-base bg-surface-base border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40"
          />
        </div>

        {/* Slice 334: optionaler Spieler-Anker (Discovery) */}
        <div className="relative" ref={playerRef}>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">{t('pollPlayerLabel')}</label>
          <input
            type="text"
            value={playerSearch}
            onChange={(e) => { setPlayerSearch(e.target.value); setPlayerDropdownOpen(true); }}
            onFocus={() => setPlayerDropdownOpen(true)}
            onKeyDown={(e) => { if (e.key === 'Escape') setPlayerDropdownOpen(false); }}
            placeholder={playerId ? players.find(p => p.id === playerId)?.name ?? t('pollPlayerSearch') : t('pollPlayerSearch')}
            className={cn(
              'w-full px-4 py-2.5 rounded-xl text-base bg-surface-base border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40',
              playerId && !playerSearch && 'text-white/70',
            )}
          />
          {playerId && (
            <button
              type="button"
              onClick={() => { setPlayerId(''); setPlayerSearch(''); }}
              aria-label={t('pollPlayerRemove')}
              className="absolute right-3 top-[34px] min-h-[44px] min-w-[44px] flex items-center justify-center text-white/30 hover:text-white"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
          {playerDropdownOpen && (
            <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-xl bg-surface-popover/90 backdrop-blur-sm border border-white/[0.12] shadow-card-md">
              <button
                type="button"
                onClick={() => { setPlayerId(''); setPlayerSearch(''); setPlayerDropdownOpen(false); }}
                className="w-full px-4 py-2 text-left text-sm text-white/50 hover:bg-surface-base min-h-[44px]"
              >
                {t('pollPlayerNone')}
              </button>
              {players
                .filter(p => !playerSearch || p.name.toLowerCase().includes(playerSearch.toLowerCase()))
                .slice(0, 20)
                .map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setPlayerId(p.id); setPlayerSearch(p.name); setPlayerDropdownOpen(false); }}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm hover:bg-surface-base flex items-center justify-between min-h-[44px]',
                      playerId === p.id ? 'text-gold' : 'text-white/80'
                    )}
                  >
                    <span>{p.name}</span>
                    <span className="text-[10px] text-white/30">{p.pos}</span>
                  </button>
                ))}
              {players.filter(p => !playerSearch || p.name.toLowerCase().includes(playerSearch.toLowerCase())).length === 0 && (
                <div className="px-4 py-2 text-sm text-white/30">{t('pollPlayerNotFound')}</div>
              )}
            </div>
          )}
        </div>

        {/* Options */}
        <div className="space-y-2">
          <label className="text-xs text-white/50 font-semibold block">{t('pollOptionsLabel')}</label>
          {options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={opt}
                onChange={(e) => { const n = [...options]; n[idx] = e.target.value.slice(0, 100); setOptions(n); }}
                placeholder={t('pollOptionPlaceholder', { idx: idx + 1 })}
                className="flex-1 px-4 py-2.5 rounded-xl text-base bg-surface-base border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40"
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => setOptions(options.filter((_, i) => i !== idx))}
                  aria-label={t('pollRemoveOption')}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/40 hover:text-red-300 transition-colors"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
          {options.length < 4 && (
            <Button variant="outline" size="sm" onClick={() => setOptions([...options, ''])}>
              <Plus className="size-3.5" aria-hidden="true" />{t('pollAddOption')}
            </Button>
          )}
        </div>

        {/* Cost + Duration */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/50 font-semibold mb-1.5 block">{t('pollCostLabel')}</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_COST_SCOUT}
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-base bg-surface-base border border-white/10 text-white focus:outline-none focus:border-gold/40"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 font-semibold mb-1.5 block">{t('pollDurationLabel')}</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={30}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-base bg-surface-base border border-white/10 text-white focus:outline-none focus:border-gold/40"
            />
          </div>
        </div>

        {isClub && <p className="text-xs text-white/40">{t('pollClubRevenueHint')}</p>}

        {error && (
          <div role="alert" className="px-4 py-3 rounded-xl text-sm font-bold bg-red-500/20 border border-red-500/30 text-red-300">
            {error}
          </div>
        )}

        <Button variant="gold" fullWidth loading={creating} onClick={handleCreate}>
          {t('createPollCta')}
        </Button>
      </div>
    </Dialog>
  );
}

type ButtonProps = {
  userId: string;
  source: CommunityPollSource;
  clubId?: string | null;
  onCreated?: () => void;
  className?: string;
};

/** Selbst-verkabelter Trigger + Modal. User-Pfad mit Follower-Tor (50). */
export function CreatePollButton({ userId, source, clubId, onCreated, className }: ButtonProps) {
  const t = useTranslations('community');
  const [open, setOpen] = useState(false);
  const [followerCount, setFollowerCount] = useState<number | null>(null);

  useEffect(() => {
    if (source !== 'user') return;
    let cancelled = false;
    getFollowerCount(userId)
      .then(c => { if (!cancelled) setFollowerCount(c); })
      .catch(() => { if (!cancelled) setFollowerCount(0); });
    return () => { cancelled = true; };
  }, [source, userId]);

  const gated = source === 'user' && (followerCount === null || followerCount < FOLLOWER_THRESHOLD);

  if (gated) {
    return (
      <div className={className}>
        <Button variant="outline" disabled className="opacity-60">
          <Lock className="size-4" aria-hidden="true" />
          {t('createPollCta')}
        </Button>
        <p className="text-xs text-white/40 mt-1.5">{t('pollFollowerGateHint', { n: FOLLOWER_THRESHOLD })}</p>
      </div>
    );
  }

  return (
    <>
      <Button variant="gold" className={cn(className)} onClick={() => setOpen(true)}>
        <Vote className="size-4" aria-hidden="true" />
        {source === 'club' ? t('createClubPollCta') : t('createPollCta')}
      </Button>
      <CreatePollModal
        open={open}
        onClose={() => setOpen(false)}
        userId={userId}
        source={source}
        clubId={clubId}
        onCreated={onCreated}
      />
    </>
  );
}
