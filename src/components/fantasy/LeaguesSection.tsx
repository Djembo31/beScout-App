'use client';

import { useState, useCallback } from 'react';
import { Trophy, Users, Copy, Plus, LogIn, LogOut, Crown, Medal, Loader2 } from 'lucide-react';
import { Card, Button, Modal } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useMyLeagues, useLeagueLeaderboard } from '@/lib/queries/fantasyLeagues';
import { createLeague, joinLeague, leaveLeague } from '@/lib/services/fantasyLeagues';
import { queryClient } from '@/lib/queryClient';
import { useTranslations } from 'next-intl';
import type { DbFantasyLeague } from '@/types';

const RANK_MEDALS: Record<number, string> = { 1: '\uD83E\uDD47', 2: '\uD83E\uDD48', 3: '\uD83E\uDD49' };

// ============================================
// Create League Modal
// ============================================

function CreateLeagueModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addToast } = useToast();
  const t = useTranslations('leagues');
  const [name, setName] = useState('');
  const [maxMembers, setMaxMembers] = useState('20');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || loading) return;
    setLoading(true);
    try {
      const result = await createLeague(name.trim(), parseInt(maxMembers) || 20);
      if (result.success) {
        addToast(t('created'), 'success');
        queryClient.invalidateQueries({ queryKey: ['fantasy-leagues'] });
        onClose();
        setName('');
      } else {
        addToast(result.error ?? 'Fehler', 'error');
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Fehler', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('createTitle')}>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-white/60 mb-1 block">{t('nameLabel')}</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
            maxLength={40}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/30"
          />
        </div>
        <div>
          <label className="text-sm text-white/60 mb-1 block">{t('maxLabel')}</label>
          <input
            type="number"
            inputMode="numeric"
            value={maxMembers}
            onChange={e => setMaxMembers(e.target.value)}
            min="2"
            max="100"
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-base text-white font-mono focus:outline-none focus:border-[#FFD700]/30"
          />
        </div>
        <Button onClick={handleCreate} disabled={!name.trim() || loading} className="w-full min-h-[44px]">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('creating')}</> : t('create')}
        </Button>
      </div>
    </Modal>
  );
}

// ============================================
// Join League Modal
// ============================================

function JoinLeagueModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addToast } = useToast();
  const t = useTranslations('leagues');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!code.trim() || loading) return;
    setLoading(true);
    try {
      const result = await joinLeague(code.trim());
      if (result.success) {
        addToast(`${t('joined')}: ${result.leagueName}`, 'success');
        queryClient.invalidateQueries({ queryKey: ['fantasy-leagues'] });
        onClose();
        setCode('');
      } else {
        addToast(result.error ?? 'Fehler', 'error');
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Fehler', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('joinTitle')}>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-white/60 mb-1 block">{t('codeLabel')}</label>
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder={t('codePlaceholder')}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/30"
          />
        </div>
        <Button onClick={handleJoin} disabled={!code.trim() || loading} className="w-full min-h-[44px]">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('joining')}</> : t('join')}
        </Button>
      </div>
    </Modal>
  );
}

// ============================================
// League Card with Leaderboard
// ============================================

function LeagueCard({ league, userId }: { league: DbFantasyLeague; userId: string }) {
  const { addToast } = useToast();
  const t = useTranslations('leagues');
  const [expanded, setExpanded] = useState(false);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const { data: leaderboard = [], isLoading } = useLeagueLeaderboard(expanded ? league.id : undefined);

  const isCreator = league.created_by === userId;

  const handleCopy = () => {
    navigator.clipboard.writeText(league.invite_code).then(() => addToast(t('codeCopied'), 'success'));
  };

  const handleLeave = async () => {
    if (leavingId) return;
    if (!confirm(t('leaveConfirm'))) return;
    setLeavingId(league.id);
    try {
      const result = await leaveLeague(league.id);
      if (result.success) {
        addToast(t('left'), 'success');
        queryClient.invalidateQueries({ queryKey: ['fantasy-leagues'] });
      } else {
        addToast(result.error ?? 'Fehler', 'error');
      }
    } finally {
      setLeavingId(null);
    }
  };

  return (
    <Card className="overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full p-4 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-purple-400" />
            </div>
            <div className="min-w-0">
              <div className="font-bold truncate">{league.name}</div>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <Users className="w-3 h-3" />
                <span>{league.member_count ?? 0}/{league.max_members}</span>
                {isCreator && <Crown className="w-3 h-3 text-[#FFD700]" />}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy(); }}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all active:scale-[0.95]"
              title={t('copyCode')}
            >
              <Copy className="w-3.5 h-3.5 text-white/40" />
            </button>
            {!isCreator && (
              <button
                onClick={(e) => { e.stopPropagation(); handleLeave(); }}
                disabled={leavingId === league.id}
                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-all active:scale-[0.95] text-red-400 disabled:opacity-50"
                title={t('leave')}
              >
                {leavingId === league.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
      </button>

      {/* Expanded: Leaderboard */}
      {expanded && (
        <div className="border-t border-white/[0.06] px-4 pb-4">
          <div className="text-[10px] text-white/30 uppercase tracking-wider font-bold mt-3 mb-2">{t('leaderboard')}</div>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-10 rounded-lg bg-white/[0.03] animate-pulse" />)}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-sm text-white/30 py-3 text-center">{t('noData')}</div>
          ) : (
            <div className="space-y-1">
              {leaderboard.map((entry, i) => (
                <div key={entry.user_id} className={`flex items-center gap-3 p-2 rounded-lg ${entry.user_id === userId ? 'bg-[#FFD700]/[0.05] border border-[#FFD700]/10' : 'bg-white/[0.02]'}`}>
                  <span className="w-6 text-center text-sm">{RANK_MEDALS[i + 1] ?? `#${i + 1}`}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{entry.display_name ?? entry.handle ?? 'Anonym'}</div>
                    <div className="text-[10px] text-white/40">{entry.events_played} {t('events')}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-sm">{entry.total_score}</div>
                    {entry.best_rank && <div className="text-[10px] text-white/40">{t('best')}: #{entry.best_rank}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 text-[10px] text-white/30 text-center">
            Code: <span className="font-mono text-white/50">{league.invite_code}</span>
          </div>
        </div>
      )}
    </Card>
  );
}

// ============================================
// Main Component
// ============================================

export default function LeaguesSection({ mode = 'full' }: { mode?: 'compact' | 'full' }) {
  const { user } = useUser();
  const t = useTranslations('leagues');
  const userId = user?.id;
  const { data: leagues = [], isLoading } = useMyLeagues(userId);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  if (mode === 'compact') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-purple-400" />
            <h3 className="font-bold text-sm">{t('title')}</h3>
            {leagues.length > 0 && (
              <span className="text-[10px] text-white/30 font-mono">{leagues.length}</span>
            )}
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => setShowJoin(true)} className="px-3 py-2 min-h-[44px] text-xs font-semibold rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-[0.95]">
              <LogIn className="w-3.5 h-3.5 inline mr-1" />
              {t('join')}
            </button>
            <button onClick={() => setShowCreate(true)} className="px-3 py-2 min-h-[44px] text-xs font-semibold rounded-lg bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] hover:bg-[#FFD700]/20 transition-all active:scale-[0.95]">
              <Plus className="w-3.5 h-3.5 inline mr-1" />
              {t('create')}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="h-12 rounded-xl bg-white/[0.02] animate-pulse border border-white/[0.06]" />)}
          </div>
        ) : leagues.length === 0 ? (
          <div className="p-4 text-center bg-white/[0.02] border border-white/[0.06] rounded-xl">
            <div className="text-xs text-white/30">{t('emptyDesc')}</div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {leagues.map(l => (
              <div key={l.id} className="flex items-center gap-3 p-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/25 flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{l.name}</div>
                  <div className="text-[10px] text-white/40 flex items-center gap-1.5">
                    <Users className="w-3 h-3" />
                    <span>{l.member_count ?? 0}/{l.max_members}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <CreateLeagueModal open={showCreate} onClose={() => setShowCreate(false)} />
        <JoinLeagueModal open={showJoin} onClose={() => setShowJoin(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{t('title')}</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowJoin(true)} className="gap-1.5 min-h-[44px]">
            <LogIn className="w-4 h-4" />
            {t('join')}
          </Button>
          <Button variant="gold" onClick={() => setShowCreate(true)} className="gap-1.5 min-h-[44px]">
            <Plus className="w-4 h-4" />
            {t('create')}
          </Button>
        </div>
      </div>

      {/* Leagues List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-20 rounded-2xl bg-white/[0.02] animate-pulse border border-white/[0.06]" />)}
        </div>
      ) : leagues.length === 0 ? (
        <Card className="p-8 text-center">
          <Trophy className="w-12 h-12 mx-auto mb-3 text-white/15" />
          <div className="text-sm font-medium text-white/40 mb-1">{t('emptyTitle')}</div>
          <div className="text-xs text-white/25">{t('emptyDesc')}</div>
        </Card>
      ) : (
        <div className="space-y-3">
          {leagues.map(l => (
            <LeagueCard key={l.id} league={l} userId={userId!} />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateLeagueModal open={showCreate} onClose={() => setShowCreate(false)} />
      <JoinLeagueModal open={showJoin} onClose={() => setShowJoin(false)} />
    </div>
  );
}
