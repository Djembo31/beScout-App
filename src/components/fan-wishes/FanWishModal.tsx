'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, Loader2 } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { submitFanWish } from '@/lib/services/fanWishes';
import { useToast } from '@/components/providers/ToastProvider';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queries/keys';
import { useSafeMutation } from '@/lib/hooks/useSafeMutation';
import { mapErrorToKey, normalizeError } from '@/lib/errorMessages';

interface FanWishModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: 'player' | 'club';
  defaultClubName?: string;
  defaultPlayerName?: string;
}

export function FanWishModal({ open, onClose, defaultTab = 'club', defaultClubName = '', defaultPlayerName = '' }: FanWishModalProps) {
  const t = useTranslations('fanWishes');
  const tErrors = useTranslations('errors');
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<'player' | 'club'>(defaultTab);
  const [playerName, setPlayerName] = useState(defaultPlayerName);
  const [clubName, setClubName] = useState(defaultClubName);
  const [leagueName, setLeagueName] = useState('');
  const [note, setNote] = useState('');

  // Slice 159 Ferrari: useSafeMutation + synchroner isPending-Guard + errorTag.
  const wishMut = useSafeMutation<
    { success: boolean; error?: string },
    Error,
    {
      wishType: 'player' | 'club';
      playerName?: string;
      clubName?: string;
      leagueName?: string;
      note?: string;
    }
  >({
    mutationFn: async (vars) => {
      const result = await submitFanWish(vars);
      if (!result.success) throw new Error(result.error || 'wishError');
      return result;
    },
    onSuccess: () => {
      addToast(t('success'), 'success');
      queryClient.invalidateQueries({ queryKey: qk.fanWishes.mine() });
      onClose();
      setPlayerName(''); setClubName(''); setLeagueName(''); setNote('');
    },
    onError: (err) => {
      // i18n-Key-Leak-Schutz: err.message ggf. raw-key.
      addToast(tErrors(mapErrorToKey(normalizeError(err))), 'error');
    },
    errorTag: 'fanWish.submit',
  });

  const canSubmit = (tab === 'player'
    ? playerName.trim().length >= 2
    : clubName.trim().length >= 2) && !wishMut.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    // Ferrari-Blueprint-Konsistenz (156/157/158): safeTrigger mit synchronem isPending-Check.
    wishMut.safeTrigger({
      wishType: tab,
      playerName: tab === 'player' ? playerName.trim() : undefined,
      clubName: clubName.trim() || undefined,
      leagueName: leagueName.trim() || undefined,
      note: note.trim() || undefined,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={t('title')} preventClose={wishMut.isPending}>
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1">
          {(['player', 'club'] as const).map(tabId => (
            <button
              key={tabId}
              onClick={() => setTab(tabId)}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-bold transition-colors min-h-[44px]',
                tab === tabId ? 'bg-gold/10 text-gold' : 'text-white/40 hover:text-white/60',
              )}
            >
              {tabId === 'player' ? t('tabPlayer') : t('tabClub')}
            </button>
          ))}
        </div>

        {/* Player Name (player tab) */}
        {tab === 'player' && (
          <div>
            <label className="text-xs text-white/50 mb-1 block">{t('playerName')}</label>
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder={t('playerNamePlaceholder')}
              maxLength={100}
              className="w-full px-3 py-2.5 bg-surface-base border border-white/10 rounded-xl text-white text-sm min-h-[44px]"
            />
          </div>
        )}

        {/* Club Name (always shown) */}
        <div>
          <label className="text-xs text-white/50 mb-1 block">{t('clubName')}</label>
          <input
            type="text"
            value={clubName}
            onChange={e => setClubName(e.target.value)}
            placeholder={t('clubNamePlaceholder')}
            maxLength={100}
            className="w-full px-3 py-2.5 bg-surface-base border border-white/10 rounded-xl text-white text-sm min-h-[44px]"
          />
        </div>

        {/* League (optional) */}
        <div>
          <label className="text-xs text-white/50 mb-1 block">{t('leagueName')}</label>
          <input
            type="text"
            value={leagueName}
            onChange={e => setLeagueName(e.target.value)}
            placeholder={t('leagueNamePlaceholder')}
            maxLength={100}
            className="w-full px-3 py-2.5 bg-surface-base border border-white/10 rounded-xl text-white text-sm min-h-[44px]"
          />
        </div>

        {/* Note (optional) */}
        <div>
          <label className="text-xs text-white/50 mb-1 block">{t('note')}</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={t('notePlaceholder')}
            maxLength={300}
            rows={2}
            className="w-full px-3 py-2.5 bg-surface-base border border-white/10 rounded-xl text-white text-sm resize-none"
          />
        </div>

        {/* Submit */}
        <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
          {wishMut.isPending
            ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            : <><Sparkles className="size-4" aria-hidden="true" /> {t('submit')}</>
          }
        </Button>
      </div>
    </Modal>
  );
}
