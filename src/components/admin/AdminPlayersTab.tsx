'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Play, XCircle, Package, Loader2, Shield, Flame, AlertTriangle, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Card, Button, Chip, Modal } from '@/components/ui';
import { PlayerIdentity } from '@/components/player';
import { useUser } from '@/components/providers/AuthProvider';
import { getPlayersByClubId, dbToPlayers, centsToBsd, bsdToCents, createPlayer } from '@/lib/services/players';
import { getIposByClubId, createIpo, updateIpoStatus } from '@/lib/services/ipo';
import { getPbtForPlayer } from '@/lib/services/pbt';
import { setSuccessFeeCap, liquidatePlayer } from '@/lib/services/liquidation';
import { fmtScout } from '@/lib/utils';
import { canPerformAction } from '@/lib/adminRoles';
import { getSuccessFeeTier } from '@/components/player/PlayerRow';
import { mapErrorToKey, normalizeError } from '@/lib/errorMessages';
import type { ClubWithAdmin, Player, DbIpo } from '@/types';

export default function AdminPlayersTab({ club }: { club: ClubWithAdmin }) {
  const t = useTranslations('admin');
  const te = useTranslations('errors');
  const role = club.admin_role ?? 'editor';
  const canCreateIpo = canPerformAction('create_ipo', role);
  const canLiquidate = canPerformAction('liquidate', role);
  const canSetFee = canPerformAction('set_success_fee', role);
  const canCreatePlayerAction = canPerformAction('create_player', role);
  const { user } = useUser();
  const [players, setPlayers] = useState<Player[]>([]);
  const [clubIpos, setClubIpos] = useState<DbIpo[]>([]);
  const [loading, setLoading] = useState(true);
  const [ipoModalOpen, setIpoModalOpen] = useState(false);
  const [ipoLoading, setIpoLoading] = useState(false);
  const [ipoError, setIpoError] = useState<string | null>(null);
  const [ipoSuccess, setIpoSuccess] = useState<string | null>(null);
  const [ipoPlayerId, setIpoPlayerId] = useState('');
  const [ipoPrice, setIpoPrice] = useState('');
  const [ipoQty, setIpoQty] = useState('100');
  const [ipoMaxPerUser, setIpoMaxPerUser] = useState('10');
  const [ipoDuration, setIpoDuration] = useState('14');
  const [ipoStartNow, setIpoStartNow] = useState(true);

  // Create player state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [cpFirstName, setCpFirstName] = useState('');
  const [cpLastName, setCpLastName] = useState('');
  const [cpPosition, setCpPosition] = useState<string>('MID');
  const [cpShirtNumber, setCpShirtNumber] = useState('');
  const [cpAge, setCpAge] = useState('');
  const [cpNationality, setCpNationality] = useState('TR');
  const [cpIpoPrice, setCpIpoPrice] = useState('5');

  // Liquidation state
  const [capModalPlayer, setCapModalPlayer] = useState<Player | null>(null);
  const [capValue, setCapValue] = useState('');
  const [capLoading, setCapLoading] = useState(false);
  const [liqModalPlayer, setLiqModalPlayer] = useState<Player | null>(null);
  const [liqPbtBalance, setLiqPbtBalance] = useState<number>(0);
  const [liqHolderCount, setLiqHolderCount] = useState<number | null>(null);
  const [liqLoading, setLiqLoading] = useState(false);
  const [liqTransferValue, setLiqTransferValue] = useState('');
  const [liqResult, setLiqResult] = useState<{
    holder_count: number;
    distributed_cents: number;
    pbt_distributed_cents: number;
    success_fee_cents: number;
    fee_per_dpc_cents: number;
    transfer_value_eur: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [dbPlayers, ipos] = await Promise.all([
          getPlayersByClubId(club.id),
          getIposByClubId(club.id),
        ]);
        if (!cancelled) {
          setPlayers(dbToPlayers(dbPlayers));
          setClubIpos(ipos);
        }
      } catch (err) { console.error('[AdminPlayers] Load failed:', err); }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [club.id]);

  const eligiblePlayers = useMemo(() => {
    const activeIpoPlayerIds = new Set(
      clubIpos.filter(ipo => ['announced', 'early_access', 'open'].includes(ipo.status)).map(ipo => ipo.player_id)
    );
    return players.filter(p => !activeIpoPlayerIds.has(p.id) && !p.isLiquidated);
  }, [players, clubIpos]);

  const activeIpos = clubIpos.filter(ipo => ['announced', 'early_access', 'open'].includes(ipo.status));
  const pastIpos = clubIpos.filter(ipo => ['ended', 'cancelled'].includes(ipo.status));

  const statusConfig: Record<string, { bg: string; border: string; text: string; label: string }> = {
    announced: { bg: 'bg-blue-500/15', border: 'border-blue-400/25', text: 'text-blue-300', label: t('ipoStatusAnnounced') },
    early_access: { bg: 'bg-purple-500/15', border: 'border-purple-400/25', text: 'text-purple-300', label: t('ipoStatusEarlyAccess') },
    open: { bg: 'bg-green-500/15', border: 'border-green-500/25', text: 'text-green-500', label: t('ipoStatusLive') },
    ended: { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/50', label: t('ipoStatusEnded') },
    cancelled: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', label: t('ipoStatusCancelled') },
  };

  const handleCreateIpo = useCallback(async () => {
    if (!user || !ipoPlayerId || !ipoPrice) return;
    setIpoLoading(true);
    setIpoError(null);
    setIpoSuccess(null);
    try {
      const result = await createIpo({
        userId: user.id,
        playerId: ipoPlayerId,
        priceCents: bsdToCents(parseFloat(ipoPrice)),
        totalOffered: parseInt(ipoQty),
        maxPerUser: parseInt(ipoMaxPerUser),
        durationDays: parseInt(ipoDuration),
        startImmediately: ipoStartNow,
      });
      if (!result.success) {
        setIpoError(result.error ? te(mapErrorToKey(result.error)) : t('ipoCreateError'));
      } else {
        setIpoSuccess(t('ipoCreateSuccess'));
        const refreshed = await getIposByClubId(club.id);
        setClubIpos(refreshed);
        setIpoPlayerId('');
        setIpoPrice('');
        setIpoQty('100');
        setIpoMaxPerUser('10');
        setIpoDuration('14');
        setIpoStartNow(true);
        setIpoModalOpen(false);
        setTimeout(() => setIpoSuccess(null), 3000);
      }
    } catch (err) {
      setIpoError(te(mapErrorToKey(normalizeError(err))));
    } finally {
      setIpoLoading(false);
    }
  }, [user, ipoPlayerId, ipoPrice, ipoQty, ipoMaxPerUser, ipoDuration, ipoStartNow, club.id, t]);

  const handleIpoStatusChange = useCallback(async (ipoId: string, newStatus: string) => {
    if (!user) return;
    setIpoLoading(true);
    setIpoError(null);
    try {
      const result = await updateIpoStatus(user.id, ipoId, newStatus);
      if (!result.success) {
        setIpoError(result.error ? te(mapErrorToKey(result.error)) : t('statusChangeError'));
      } else {
        const refreshed = await getIposByClubId(club.id);
        setClubIpos(refreshed);
      }
    } catch (err) {
      setIpoError(te(mapErrorToKey(normalizeError(err))));
    } finally {
      setIpoLoading(false);
    }
  }, [user, club.id, t]);

  // Success Fee Cap handler
  const handleSetCap = useCallback(async () => {
    if (!user || !capModalPlayer || !capValue) return;
    setCapLoading(true);
    setIpoError(null);
    try {
      const result = await setSuccessFeeCap(user.id, capModalPlayer.id, bsdToCents(parseFloat(capValue)));
      if (!result.success) {
        setIpoError(result.error ? te(mapErrorToKey(result.error)) : t('capSetError'));
      } else {
        setIpoSuccess(t('capSetSuccess', { value: capValue }));
        // Refresh players
        const dbPlayers = await getPlayersByClubId(club.id);
        setPlayers(dbToPlayers(dbPlayers));
        setCapModalPlayer(null);
        setCapValue('');
        setTimeout(() => setIpoSuccess(null), 3000);
      }
    } catch (err) {
      setIpoError(te(mapErrorToKey(normalizeError(err))));
    } finally {
      setCapLoading(false);
    }
  }, [user, capModalPlayer, capValue, club.id, t]);

  // Liquidation handler — open modal and fetch PBT balance
  const openLiquidationModal = useCallback(async (player: Player) => {
    setLiqModalPlayer(player);
    setLiqResult(null);
    setLiqPbtBalance(0);
    setLiqHolderCount(null);
    setLiqTransferValue(player.marketValue ? String(player.marketValue) : '');
    try {
      const pbt = await getPbtForPlayer(player.id);
      setLiqPbtBalance(pbt ? centsToBsd(pbt.balance) : 0);
    } catch (err) { console.error('[AdminPlayers] PBT fetch failed:', err); }
  }, []);

  const handleLiquidate = useCallback(async () => {
    if (!user || !liqModalPlayer) return;
    setLiqLoading(true);
    setIpoError(null);
    try {
      const tvEur = parseInt(liqTransferValue) || 0;
      const result = await liquidatePlayer(user.id, liqModalPlayer.id, tvEur);
      if (!result.success) {
        setIpoError(result.error ? te(mapErrorToKey(result.error)) : t('liquidationError'));
        setLiqModalPlayer(null);
      } else {
        setLiqResult({
          holder_count: result.holder_count ?? 0,
          distributed_cents: result.distributed_cents ?? 0,
          pbt_distributed_cents: result.pbt_distributed_cents ?? 0,
          success_fee_cents: result.success_fee_cents ?? 0,
          fee_per_dpc_cents: result.fee_per_dpc_cents ?? 0,
          transfer_value_eur: result.transfer_value_eur ?? 0,
        });
        // Refresh players
        const dbPlayers = await getPlayersByClubId(club.id);
        setPlayers(dbToPlayers(dbPlayers));
      }
    } catch (err) {
      setIpoError(te(mapErrorToKey(normalizeError(err))));
      setLiqModalPlayer(null);
    } finally {
      setLiqLoading(false);
    }
  }, [user, liqModalPlayer, liqTransferValue, club.id, t]);

  const handleCreatePlayer = useCallback(async () => {
    if (!user || !cpFirstName || !cpLastName || !cpShirtNumber || !cpAge) return;
    setCreateLoading(true);
    setIpoError(null);
    try {
      const result = await createPlayer({
        firstName: cpFirstName,
        lastName: cpLastName,
        position: cpPosition,
        shirtNumber: parseInt(cpShirtNumber),
        age: parseInt(cpAge),
        clubId: club.id,
        clubName: club.name,
        nationality: cpNationality || 'TR',
        ipoPrice: parseFloat(cpIpoPrice) || 5,
      });
      if (!result.success) {
        setIpoError(result.error ? te(mapErrorToKey(result.error)) : t('playerCreateError'));
      } else {
        setIpoSuccess(t('playerCreateSuccess'));
        const dbPlayers = await getPlayersByClubId(club.id);
        setPlayers(dbToPlayers(dbPlayers));
        setCpFirstName('');
        setCpLastName('');
        setCpPosition('MID');
        setCpShirtNumber('');
        setCpAge('');
        setCpNationality('TR');
        setCpIpoPrice('5');
        setCreateModalOpen(false);
        setTimeout(() => setIpoSuccess(null), 3000);
      }
    } catch (err) {
      setIpoError(te(mapErrorToKey(normalizeError(err))));
    } finally {
      setCreateLoading(false);
    }
  }, [user, cpFirstName, cpLastName, cpPosition, cpShirtNumber, cpAge, cpNationality, cpIpoPrice, club.id, club.name, t]);

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Card key={i} className="h-20 animate-pulse" />)}</div>;

  const activePlayers = players.filter(p => !p.isLiquidated);
  const liquidatedPlayers = players.filter(p => p.isLiquidated);

  return (
    <div className="space-y-6">
      {ipoSuccess && (
        <div className="bg-green-500/20 border border-green-500/30 text-green-500 px-4 py-3 rounded-xl font-bold text-sm">{ipoSuccess}</div>
      )}
      {ipoError && (
        <div role="alert" className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl font-bold text-sm cursor-pointer" onClick={() => setIpoError(null)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIpoError(null); } }} tabIndex={0}>{ipoError}</div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-balance">{t('ipoManagement')}</h2>
          <p className="text-xs text-white/50">{t('playerAndIpoCount', { players: players.length, ipos: activeIpos.length })}</p>
        </div>
        {canCreateIpo && (
          <Button variant="gold" onClick={() => setIpoModalOpen(true)}>
            <Plus className="w-4 h-4" />
            {t('newIpo')}
          </Button>
        )}
      </div>

      {activeIpos.length === 0 && pastIpos.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-white/20" />
          <div className="text-white/30 mb-2">{t('noIpos')}</div>
          <div className="text-sm text-white/50">{t('noIposDesc')}</div>
        </Card>
      ) : (
        <div className="space-y-6">
          {activeIpos.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-bold text-white/50">{t('activeIposCount', { count: activeIpos.length })}</div>
              {activeIpos.map(ipo => {
                const player = players.find(p => p.id === ipo.player_id);
                if (!player) return null;
                const progress = ipo.total_offered > 0 ? (ipo.sold / ipo.total_offered) * 100 : 0;
                const priceBsd = centsToBsd(ipo.price);
                const msLeft = Math.max(0, new Date(ipo.ends_at).getTime() - Date.now());
                const daysLeft = Math.floor(msLeft / 86400000);
                const hoursLeft = Math.floor((msLeft % 86400000) / 3600000);
                const sc = statusConfig[ipo.status] || statusConfig.ended;

                return (
                  <Card key={ipo.id} className="p-3 md:p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <PlayerIdentity player={player} size="sm" showStatus={false} className="min-w-0 flex-1" />
                        <span className="text-xs text-white/40 shrink-0">{fmtScout(priceBsd)} $SCOUT</span>
                        <Chip className={cn(sc.bg, sc.text, sc.border, 'border flex-shrink-0')}>{sc.label}</Chip>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="text-white/50">{t('soldProgress', { sold: ipo.sold, total: ipo.total_offered })}</span>
                            <span className="font-mono font-bold text-gold">{progress.toFixed(0)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gold rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                        <div className="text-xs text-white/40 whitespace-nowrap flex-shrink-0">
                          {ipo.status === 'open' || ipo.status === 'announced' ? `${daysLeft}d ${hoursLeft}h` : '-'}
                        </div>
                      </div>
                      {canCreateIpo && (
                        <div className="flex items-center gap-2">
                          {ipo.status === 'announced' && (
                            <>
                              <Button variant="gold" size="sm" onClick={() => handleIpoStatusChange(ipo.id, 'open')} disabled={ipoLoading}>
                                <Play className="w-3 h-3" />{t('start')}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleIpoStatusChange(ipo.id, 'cancelled')} disabled={ipoLoading}>
                                <XCircle className="w-3 h-3" />{t('cancel')}
                              </Button>
                            </>
                          )}
                          {ipo.status === 'open' && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleIpoStatusChange(ipo.id, 'ended')} disabled={ipoLoading}>{t('end')}</Button>
                              <Button variant="outline" size="sm" onClick={() => handleIpoStatusChange(ipo.id, 'cancelled')} disabled={ipoLoading}>
                                <XCircle className="w-3 h-3" />{t('cancel')}
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {pastIpos.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-bold text-white/30">{t('pastIposCount', { count: pastIpos.length })}</div>
              {pastIpos.map(ipo => {
                const player = players.find(p => p.id === ipo.player_id);
                if (!player) return null;
                const progress = ipo.total_offered > 0 ? (ipo.sold / ipo.total_offered) * 100 : 0;
                const sc = ipo.status === 'cancelled'
                  ? { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', label: t('ipoStatusCancelled') }
                  : { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/50', label: t('ipoStatusEnded') };
                return (
                  <Card key={ipo.id} className="p-3 md:p-4 opacity-60">
                    <div className="flex items-center gap-3 min-w-0">
                      <PlayerIdentity player={player} size="sm" showStatus={false} className="min-w-0 flex-1" />
                      <span className="text-xs text-white/40 shrink-0">{fmtScout(centsToBsd(ipo.price))} $SCOUT · {progress.toFixed(0)}%</span>
                      <Chip className={cn(sc.bg, sc.text, sc.border, 'border flex-shrink-0')}>{sc.label}</Chip>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Spieler-Verwaltung: Cap + Liquidierung */}
      <div className="border-t border-white/10 pt-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-xl font-black text-balance">{t('playerManagement')}</h2>
          {canCreatePlayerAction && (
            <Button variant="gold" onClick={() => setCreateModalOpen(true)}>
              <UserPlus className="w-4 h-4" />
              {t('createPlayer')}
            </Button>
          )}
        </div>

        {activePlayers.length > 0 && (
          <div className="space-y-2">
            {activePlayers.map(p => (
              <Card key={p.id} className="p-3 md:p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <PlayerIdentity player={p} size="sm" showStatus={false} className="min-w-0 flex-1" />
                  {p.successFeeCap != null && (
                    <Chip className="bg-gold/10 text-gold border border-gold/20 text-[10px] px-1.5 py-0 shrink-0">
                      Cap: {fmtScout(p.successFeeCap)} $SCOUT
                    </Chip>
                  )}
                  {(canSetFee || canLiquidate) && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {canSetFee && (
                        <button
                          onClick={() => { setCapModalPlayer(p); setCapValue(p.successFeeCap != null ? String(p.successFeeCap) : ''); }}
                          className="p-2 rounded-lg bg-white/5 hover:bg-gold/10 text-white/50 hover:text-gold transition-colors"
                          aria-label={t('setCapLabel')}
                        >
                          <Shield className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                      {canLiquidate && (
                        <button
                          onClick={() => openLiquidationModal(p)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-white/50 hover:text-red-400 transition-colors"
                          aria-label={t('liquidateLabel')}
                        >
                          <Flame className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {liquidatedPlayers.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-bold text-white/30">{t('liquidatedPlayersCount', { count: liquidatedPlayers.length })}</div>
            {liquidatedPlayers.map(p => (
              <Card key={p.id} className="p-3 md:p-4 opacity-50">
                <div className="flex items-center gap-3 min-w-0">
                  <PlayerIdentity player={p} size="sm" showStatus={false} className="min-w-0 flex-1" />
                  <Chip className="bg-white/5 text-white/40 border border-white/10">{t('liquidated')}</Chip>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Success Fee Cap Modal */}
      <Modal open={!!capModalPlayer} title={t('successFeeCap')} onClose={() => setCapModalPlayer(null)}>
        {capModalPlayer && (
          <div className="space-y-4 p-4 md:p-6">
            <div className="text-sm text-white/60">
              {t('capDesc', { player: `${capModalPlayer.first} ${capModalPlayer.last}` })}
            </div>
            <div>
              <label htmlFor="cap-amount" className="block text-sm font-bold text-white/70 mb-1">{t('capAmount')}</label>
              <input
                id="cap-amount"
                type="number"
                inputMode="numeric"
                step="0.01"
                min="0"
                value={capValue}
                onChange={(e) => setCapValue(e.target.value)}
                placeholder={t('examplePrice', { example: '500.00' })}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25"
              />
            </div>
            {capModalPlayer.successFeeCap != null && (
              <div className="text-xs text-white/40">
                {t('currentCap')} <span className="text-gold font-mono font-bold">{fmtScout(capModalPlayer.successFeeCap)} $SCOUT</span>
              </div>
            )}
            <Button variant="gold" fullWidth onClick={handleSetCap} disabled={capLoading || !capValue}>
              {capLoading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Shield className="w-4 h-4" aria-hidden="true" />}
              {capLoading ? t('saving') : t('setCap')}
            </Button>
          </div>
        )}
      </Modal>

      {/* Liquidation Confirmation Modal */}
      <Modal open={!!liqModalPlayer} title={t('liquidatePlayerTitle')} onClose={() => { setLiqModalPlayer(null); setLiqResult(null); }}>
        {liqModalPlayer && !liqResult && (() => {
          const tvEur = parseInt(liqTransferValue) || 0;
          const tier = getSuccessFeeTier(tvEur);
          const feeCents = tier.fee;
          const capCents = liqModalPlayer.successFeeCap != null ? Math.round(liqModalPlayer.successFeeCap * 100) : null;
          const effectiveFee = capCents != null && capCents > 0 ? Math.min(feeCents, capCents) : feeCents;
          const effectiveFeeBsd = effectiveFee / 100;
          const totalDpcs = liqModalPlayer.dpc.circulation;
          const totalSfBsd = effectiveFeeBsd * totalDpcs;
          return (
            <div className="space-y-4 p-4 md:p-6">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-300">
                  {t('liquidateWarning', { player: `${liqModalPlayer.first} ${liqModalPlayer.last}` })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-white/70 mb-1">{t('transferValueEur')}</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={liqTransferValue}
                  onChange={(e) => setLiqTransferValue(e.target.value)}
                  placeholder={t('examplePrice', { example: '1000000' })}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25"
                />
                <div className="text-xs text-white/40 mt-1">{t('transferValueHint')}</div>
              </div>
              <div className="bg-gold/5 border border-gold/20 rounded-xl p-3 space-y-2 text-sm">
                <div className="text-xs font-bold text-gold/70 mb-1">{t('livePreview')}</div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">{t('tierLabel')}</span>
                  <span className="font-mono font-bold text-gold">{tier.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">{t('feePerDpc')}</span>
                  <span className="font-mono font-bold text-gold">
                    {fmtScout(effectiveFeeBsd)} $SCOUT
                    {capCents != null && capCents > 0 && capCents < feeCents && <span className="text-white/40 text-xs ml-1">{t('capTag')}</span>}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">{t('dpcsCirculation')}</span>
                  <span className="font-mono font-bold">{totalDpcs}</span>
                </div>
                <div className="border-t border-white/10 pt-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">{t('pbtDistribution')}</span>
                    <span className="font-mono font-bold text-green-500">{fmtScout(liqPbtBalance)} $SCOUT</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">{t('communityBonus')}</span>
                    <span className="font-mono font-bold text-gold">{fmtScout(totalSfBsd)} $SCOUT</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-1">
                    <span className="text-white font-bold">{t('total')}</span>
                    <span className="font-mono font-bold text-green-500">{fmtScout(liqPbtBalance + totalSfBsd)} $SCOUT</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" fullWidth onClick={() => setLiqModalPlayer(null)}>
                  {t('cancel')}
                </Button>
                <Button
                  fullWidth
                  onClick={handleLiquidate}
                  disabled={liqLoading}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
                >
                  {liqLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
                  {liqLoading ? t('liquidating') : t('liquidateAction')}
                </Button>
              </div>
            </div>
          );
        })()}
        {liqModalPlayer && liqResult && (
          <div className="space-y-4 p-4 md:p-6">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
              <div className="text-green-500 font-black text-lg mb-1">{t('liquidationComplete')}</div>
              <div className="text-sm text-white/60">{t('liquidationSuccess', { player: `${liqModalPlayer.first} ${liqModalPlayer.last}` })}</div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white/50">{t('dpcHolder')}</span>
                <span className="font-mono font-bold">{liqResult.holder_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">{t('transferValueResult')}</span>
                <span className="font-mono font-bold">{liqResult.transfer_value_eur > 0 ? `${(liqResult.transfer_value_eur / 1000000).toFixed(1)}M EUR` : '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">{t('feePerDpc')}</span>
                <span className="font-mono font-bold text-gold">{fmtScout(centsToBsd(liqResult.fee_per_dpc_cents))} $SCOUT</span>
              </div>
              <div className="border-t border-white/10 pt-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-white/50">{t('pbtDistribution')}</span>
                  <span className="font-mono font-bold text-green-500">{fmtScout(centsToBsd(liqResult.pbt_distributed_cents))} $SCOUT</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">{t('communityBonus')}</span>
                  <span className="font-mono font-bold text-gold">{fmtScout(centsToBsd(liqResult.success_fee_cents))} $SCOUT</span>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-1">
                  <span className="text-white font-bold">{t('total')}</span>
                  <span className="font-mono font-bold text-green-500">{fmtScout(centsToBsd(liqResult.distributed_cents))} $SCOUT</span>
                </div>
              </div>
            </div>
            <Button variant="outline" fullWidth onClick={() => { setLiqModalPlayer(null); setLiqResult(null); }}>
              {t('close')}
            </Button>
          </div>
        )}
      </Modal>

      {/* Create IPO Modal */}
      <Modal open={ipoModalOpen} title={t('newIpo')} onClose={() => setIpoModalOpen(false)}>
        <div className="space-y-4 p-4 md:p-6">
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{t('playerLabel')}</label>
            <select
              value={ipoPlayerId}
              onChange={(e) => setIpoPlayerId(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-gold/40"
            >
              <option value="" className="bg-[#1a1a2e] text-white/50">{t('selectPlayer')}</option>
              {eligiblePlayers.map(p => (
                <option key={p.id} value={p.id} className="bg-[#1a1a2e] text-white">{p.first} {p.last} ({p.pos})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{t('pricePerDpc')}</label>
            <input type="number" inputMode="numeric" step="0.01" min="0.01" value={ipoPrice} onChange={(e) => setIpoPrice(e.target.value)} placeholder={t('examplePrice', { example: '5.00' })} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25" />
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{t('dpcCount')}</label>
            <input type="number" inputMode="numeric" min="1" max={(() => { const sp = players.find(p => p.id === ipoPlayerId); return sp ? sp.dpc.supply - sp.dpc.circulation : 300; })()} value={ipoQty} onChange={(e) => setIpoQty(e.target.value)} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40" />
            {ipoPlayerId && (() => {
              const sp = players.find(p => p.id === ipoPlayerId);
              if (!sp) return null;
              const available = sp.dpc.supply - sp.dpc.circulation;
              return (
                <div className="mt-1 text-xs text-white/40">
                  {t('availableOf', { available, total: sp.dpc.supply, circulation: sp.dpc.circulation })}
                </div>
              );
            })()}
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{t('maxPerUser')}</label>
            <input type="number" inputMode="numeric" min="1" value={ipoMaxPerUser} onChange={(e) => setIpoMaxPerUser(e.target.value)} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40" />
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{t('durationLabel')}</label>
            <select value={ipoDuration} onChange={(e) => setIpoDuration(e.target.value)} className="w-full px-3 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-gold/40">
              <option value="7">{t('daysOption7')}</option>
              <option value="14">{t('daysOption14')}</option>
              <option value="21">{t('daysOption21')}</option>
              <option value="28">{t('daysOption28')}</option>
            </select>
          </div>
          <div className="flex items-center justify-between p-3 bg-surface-minimal rounded-xl border border-white/10">
            <div>
              <div className="text-sm font-bold">{t('startNow')}</div>
              <div className="text-xs text-white/40">{t('startNowDesc')}</div>
            </div>
            <button
              onClick={() => setIpoStartNow(!ipoStartNow)}
              className={cn('w-12 h-6 rounded-full transition-colors relative', ipoStartNow ? 'bg-green-500' : 'bg-white/10')}
            >
              <div className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', ipoStartNow ? 'left-6' : 'left-0.5')} />
            </button>
          </div>
          {ipoPlayerId && ipoPrice && (
            <div className="bg-gold/5 border border-gold/20 rounded-xl p-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/50">{t('totalVolumeIpo')}</span>
                <span className="font-mono font-bold text-gold">{fmtScout(parseFloat(ipoPrice) * parseInt(ipoQty || '0'))} $SCOUT</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">{t('statusAfterCreation')}</span>
                <span className={ipoStartNow ? 'text-green-500 font-bold' : 'text-blue-300 font-bold'}>{ipoStartNow ? t('ipoStatusLive') : t('ipoStatusAnnounced')}</span>
              </div>
            </div>
          )}
          <Button variant="gold" fullWidth onClick={handleCreateIpo} disabled={ipoLoading || !ipoPlayerId || !ipoPrice}>
            {ipoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {ipoLoading ? t('creating') : t('newIpo')}
          </Button>
        </div>
      </Modal>

      {/* Create Player Modal */}
      <Modal open={createModalOpen} title={t('createPlayer')} onClose={() => setCreateModalOpen(false)}>
        <div className="space-y-4 p-4 md:p-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">{t('firstName')}</label>
              <input
                type="text"
                value={cpFirstName}
                onChange={(e) => setCpFirstName(e.target.value.slice(0, 30))}
                placeholder={t('firstName')}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">{t('lastName')}</label>
              <input
                type="text"
                value={cpLastName}
                onChange={(e) => setCpLastName(e.target.value.slice(0, 30))}
                placeholder={t('lastName')}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">{t('positionLabel')}</label>
              <select
                value={cpPosition}
                onChange={(e) => setCpPosition(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-gold/40"
              >
                <option value="GK">GK</option>
                <option value="DEF">DEF</option>
                <option value="MID">MID</option>
                <option value="ATT">ATT</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">{t('shirtNumber')}</label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="99"
                value={cpShirtNumber}
                onChange={(e) => setCpShirtNumber(e.target.value)}
                placeholder={t('examplePrice', { example: '10' })}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">{t('ageLabel')}</label>
              <input
                type="number"
                inputMode="numeric"
                min="15"
                max="45"
                value={cpAge}
                onChange={(e) => setCpAge(e.target.value)}
                placeholder={t('examplePrice', { example: '24' })}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">{t('nationalityLabel')}</label>
              <input
                type="text"
                value={cpNationality}
                onChange={(e) => setCpNationality(e.target.value.slice(0, 3).toUpperCase())}
                placeholder="TR"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{t('ipoPriceLabel')}</label>
            <input
              type="number"
              inputMode="numeric"
              step="0.01"
              min="0.01"
              value={cpIpoPrice}
              onChange={(e) => setCpIpoPrice(e.target.value)}
              placeholder={t('examplePrice', { example: '5.00' })}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25"
            />
          </div>
          <div className="bg-surface-minimal rounded-xl p-3 text-xs text-white/40">
            Club: <span className="text-white/70 font-bold">{club.name}</span>
          </div>
          <Button
            variant="gold"
            fullWidth
            onClick={handleCreatePlayer}
            disabled={createLoading || !cpFirstName || !cpLastName || !cpShirtNumber || !cpAge}
          >
            {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            {createLoading ? t('creating') : t('createPlayer')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
