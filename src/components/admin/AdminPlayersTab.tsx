'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Play, XCircle, Package, Loader2, Shield, Flame, AlertTriangle, UserPlus } from 'lucide-react';
import { Card, Button, Chip, Modal } from '@/components/ui';
import { PlayerIdentity } from '@/components/player';
import { useUser } from '@/components/providers/AuthProvider';
import { getPlayersByClubId, dbToPlayers, centsToBsd, bsdToCents, createPlayer } from '@/lib/services/players';
import { getIposByClubId, createIpo, updateIpoStatus } from '@/lib/services/ipo';
import { getPbtForPlayer } from '@/lib/services/pbt';
import { setSuccessFeeCap, liquidatePlayer } from '@/lib/services/liquidation';
import { fmtScout } from '@/lib/utils';
import type { ClubWithAdmin, Player, DbIpo } from '@/types';

export default function AdminPlayersTab({ club }: { club: ClubWithAdmin }) {
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
  const [liqResult, setLiqResult] = useState<{ holder_count: number; distributed_cents: number; success_fee_cents: number } | null>(null);

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
      } catch {}
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
        setIpoError(result.error || 'IPO konnte nicht erstellt werden.');
      } else {
        setIpoSuccess('IPO erfolgreich erstellt!');
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
      setIpoError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIpoLoading(false);
    }
  }, [user, ipoPlayerId, ipoPrice, ipoQty, ipoMaxPerUser, ipoDuration, ipoStartNow, club.id]);

  const handleIpoStatusChange = useCallback(async (ipoId: string, newStatus: string) => {
    if (!user) return;
    setIpoLoading(true);
    setIpoError(null);
    try {
      const result = await updateIpoStatus(user.id, ipoId, newStatus);
      if (!result.success) {
        setIpoError(result.error || 'Status konnte nicht geändert werden.');
      } else {
        const refreshed = await getIposByClubId(club.id);
        setClubIpos(refreshed);
      }
    } catch (err) {
      setIpoError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIpoLoading(false);
    }
  }, [user, club.id]);

  // Success Fee Cap handler
  const handleSetCap = useCallback(async () => {
    if (!user || !capModalPlayer || !capValue) return;
    setCapLoading(true);
    setIpoError(null);
    try {
      const result = await setSuccessFeeCap(user.id, capModalPlayer.id, bsdToCents(parseFloat(capValue)));
      if (!result.success) {
        setIpoError(result.error || 'Cap konnte nicht gesetzt werden.');
      } else {
        setIpoSuccess(`Success Fee Cap auf ${capValue} $SCOUT gesetzt.`);
        // Refresh players
        const dbPlayers = await getPlayersByClubId(club.id);
        setPlayers(dbToPlayers(dbPlayers));
        setCapModalPlayer(null);
        setCapValue('');
        setTimeout(() => setIpoSuccess(null), 3000);
      }
    } catch (err) {
      setIpoError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setCapLoading(false);
    }
  }, [user, capModalPlayer, capValue, club.id]);

  // Liquidation handler — open modal and fetch PBT balance
  const openLiquidationModal = useCallback(async (player: Player) => {
    setLiqModalPlayer(player);
    setLiqResult(null);
    setLiqPbtBalance(0);
    setLiqHolderCount(null);
    try {
      const pbt = await getPbtForPlayer(player.id);
      setLiqPbtBalance(pbt ? centsToBsd(pbt.balance) : 0);
    } catch {}
  }, []);

  const handleLiquidate = useCallback(async () => {
    if (!user || !liqModalPlayer) return;
    setLiqLoading(true);
    setIpoError(null);
    try {
      const result = await liquidatePlayer(user.id, liqModalPlayer.id);
      if (!result.success) {
        setIpoError(result.error || 'Liquidierung fehlgeschlagen.');
        setLiqModalPlayer(null);
      } else {
        setLiqResult({
          holder_count: result.holder_count ?? 0,
          distributed_cents: result.distributed_cents ?? 0,
          success_fee_cents: result.success_fee_cents ?? 0,
        });
        // Refresh players
        const dbPlayers = await getPlayersByClubId(club.id);
        setPlayers(dbToPlayers(dbPlayers));
      }
    } catch (err) {
      setIpoError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      setLiqModalPlayer(null);
    } finally {
      setLiqLoading(false);
    }
  }, [user, liqModalPlayer, club.id]);

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
        setIpoError(result.error || 'Spieler konnte nicht angelegt werden.');
      } else {
        setIpoSuccess('Spieler erfolgreich angelegt!');
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
      setIpoError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setCreateLoading(false);
    }
  }, [user, cpFirstName, cpLastName, cpPosition, cpShirtNumber, cpAge, cpNationality, cpIpoPrice, club.id, club.name]);

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Card key={i} className="h-20 animate-pulse" />)}</div>;

  const statusConfig: Record<string, { bg: string; border: string; text: string; label: string }> = {
    announced: { bg: 'bg-blue-500/15', border: 'border-blue-400/25', text: 'text-blue-300', label: 'Angekündigt' },
    early_access: { bg: 'bg-purple-500/15', border: 'border-purple-400/25', text: 'text-purple-300', label: 'Vorkaufsrecht' },
    open: { bg: 'bg-[#22C55E]/15', border: 'border-[#22C55E]/25', text: 'text-[#22C55E]', label: 'Live' },
    ended: { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/50', label: 'Beendet' },
    cancelled: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', label: 'Abgebrochen' },
  };

  const activePlayers = players.filter(p => !p.isLiquidated);
  const liquidatedPlayers = players.filter(p => p.isLiquidated);

  return (
    <div className="space-y-6">
      {ipoSuccess && (
        <div className="bg-[#22C55E]/20 border border-[#22C55E]/30 text-[#22C55E] px-4 py-3 rounded-xl font-bold text-sm">{ipoSuccess}</div>
      )}
      {ipoError && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl font-bold text-sm cursor-pointer" onClick={() => setIpoError(null)}>{ipoError}</div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">IPO Verwaltung</h2>
          <p className="text-xs text-white/50">{players.length} Spieler • {activeIpos.length} aktive IPOs</p>
        </div>
        <Button variant="gold" onClick={() => setIpoModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Neue IPO erstellen
        </Button>
      </div>

      {activeIpos.length === 0 && pastIpos.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-white/20" />
          <div className="text-white/30 mb-2">Keine IPOs vorhanden</div>
          <div className="text-sm text-white/50">Erstelle eine neue IPO, um DPCs an User zu verkaufen.</div>
        </Card>
      ) : (
        <div className="space-y-6">
          {activeIpos.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-bold text-white/50">Aktive IPOs ({activeIpos.length})</div>
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
                        <Chip className={`${sc.bg} ${sc.text} ${sc.border} border flex-shrink-0`}>{sc.label}</Chip>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="text-white/50">{ipo.sold}/{ipo.total_offered} verkauft</span>
                            <span className="font-mono font-bold text-[#FFD700]">{progress.toFixed(0)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                        <div className="text-xs text-white/40 whitespace-nowrap flex-shrink-0">
                          {ipo.status === 'open' || ipo.status === 'announced' ? `${daysLeft}d ${hoursLeft}h` : '-'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {ipo.status === 'announced' && (
                          <>
                            <Button variant="gold" size="sm" onClick={() => handleIpoStatusChange(ipo.id, 'open')} disabled={ipoLoading}>
                              <Play className="w-3 h-3" />Starten
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleIpoStatusChange(ipo.id, 'cancelled')} disabled={ipoLoading}>
                              <XCircle className="w-3 h-3" />Abbrechen
                            </Button>
                          </>
                        )}
                        {ipo.status === 'open' && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handleIpoStatusChange(ipo.id, 'ended')} disabled={ipoLoading}>Beenden</Button>
                            <Button variant="outline" size="sm" onClick={() => handleIpoStatusChange(ipo.id, 'cancelled')} disabled={ipoLoading}>
                              <XCircle className="w-3 h-3" />Abbrechen
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {pastIpos.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-bold text-white/30">Beendete IPOs ({pastIpos.length})</div>
              {pastIpos.map(ipo => {
                const player = players.find(p => p.id === ipo.player_id);
                if (!player) return null;
                const progress = ipo.total_offered > 0 ? (ipo.sold / ipo.total_offered) * 100 : 0;
                const sc = ipo.status === 'cancelled'
                  ? { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', label: 'Abgebrochen' }
                  : { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/50', label: 'Beendet' };
                return (
                  <Card key={ipo.id} className="p-3 md:p-4 opacity-60">
                    <div className="flex items-center gap-3 min-w-0">
                      <PlayerIdentity player={player} size="sm" showStatus={false} className="min-w-0 flex-1" />
                      <span className="text-xs text-white/40 shrink-0">{fmtScout(centsToBsd(ipo.price))} $SCOUT · {progress.toFixed(0)}%</span>
                      <Chip className={`${sc.bg} ${sc.text} ${sc.border} border flex-shrink-0`}>{sc.label}</Chip>
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
          <h2 className="text-xl font-black">Spieler-Verwaltung</h2>
          <Button variant="gold" onClick={() => setCreateModalOpen(true)}>
            <UserPlus className="w-4 h-4" />
            Spieler anlegen
          </Button>
        </div>

        {activePlayers.length > 0 && (
          <div className="space-y-2">
            {activePlayers.map(p => (
              <Card key={p.id} className="p-3 md:p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <PlayerIdentity player={p} size="sm" showStatus={false} className="min-w-0 flex-1" />
                  {p.successFeeCap != null && (
                    <Chip className="bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20 text-[10px] px-1.5 py-0 shrink-0">
                      Cap: {fmtScout(p.successFeeCap)} $SCOUT
                    </Chip>
                  )}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => { setCapModalPlayer(p); setCapValue(p.successFeeCap != null ? String(p.successFeeCap) : ''); }}
                      className="p-2 rounded-lg bg-white/5 hover:bg-[#FFD700]/10 text-white/50 hover:text-[#FFD700] transition-colors"
                      title="Success Fee Cap setzen"
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openLiquidationModal(p)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-white/50 hover:text-red-400 transition-colors"
                      title="Spieler liquidieren"
                    >
                      <Flame className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {liquidatedPlayers.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-bold text-white/30">Liquidierte Spieler ({liquidatedPlayers.length})</div>
            {liquidatedPlayers.map(p => (
              <Card key={p.id} className="p-3 md:p-4 opacity-50">
                <div className="flex items-center gap-3 min-w-0">
                  <PlayerIdentity player={p} size="sm" showStatus={false} className="min-w-0 flex-1" />
                  <Chip className="bg-white/5 text-white/40 border border-white/10">Liquidiert</Chip>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Success Fee Cap Modal */}
      <Modal open={!!capModalPlayer} title="Success Fee Cap" onClose={() => setCapModalPlayer(null)}>
        {capModalPlayer && (
          <div className="space-y-4 p-4 md:p-6">
            <div className="text-sm text-white/60">
              Der Cap bestimmt, wie viel $SCOUT als Success Fee im PBT reserviert bleibt, wenn <span className="text-white font-bold">{capModalPlayer.first} {capModalPlayer.last}</span> liquidiert wird.
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Cap-Betrag ($SCOUT)</label>
              <input
                type="number"
                inputMode="numeric"
                step="0.01"
                min="0"
                value={capValue}
                onChange={(e) => setCapValue(e.target.value)}
                placeholder="z.B. 500.00"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/25"
              />
            </div>
            {capModalPlayer.successFeeCap != null && (
              <div className="text-xs text-white/40">
                Aktueller Cap: <span className="text-[#FFD700] font-mono font-bold">{fmtScout(capModalPlayer.successFeeCap)} $SCOUT</span>
              </div>
            )}
            <Button variant="gold" fullWidth onClick={handleSetCap} disabled={capLoading || !capValue}>
              {capLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              {capLoading ? 'Speichere...' : 'Cap setzen'}
            </Button>
          </div>
        )}
      </Modal>

      {/* Liquidation Confirmation Modal */}
      <Modal open={!!liqModalPlayer} title="Spieler liquidieren" onClose={() => { setLiqModalPlayer(null); setLiqResult(null); }}>
        {liqModalPlayer && !liqResult && (
          <div className="space-y-4 p-4 md:p-6">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-300">
                Diese Aktion ist <span className="font-black">UNWIDERRUFLICH</span>. Alle DPCs von <span className="font-bold text-white">{liqModalPlayer.first} {liqModalPlayer.last}</span> werden gelöscht und die PBT-Balance an Holder ausgeschüttet.
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white/50">PBT-Balance</span>
                <span className="font-mono font-bold text-[#FFD700]">{fmtScout(liqPbtBalance)} $SCOUT</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Success Fee Cap</span>
                <span className="font-mono font-bold">
                  {liqModalPlayer.successFeeCap != null
                    ? <span className="text-[#FFD700]">{fmtScout(liqModalPlayer.successFeeCap)} $SCOUT</span>
                    : <span className="text-white/30">Kein Cap</span>}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-2">
                <span className="text-white/50">Geschätzte Ausschüttung</span>
                <span className="font-mono font-bold text-[#22C55E]">
                  {fmtScout(Math.max(0, liqPbtBalance - (liqModalPlayer.successFeeCap ?? 0)))} $SCOUT
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" fullWidth onClick={() => setLiqModalPlayer(null)}>
                Abbrechen
              </Button>
              <Button
                fullWidth
                onClick={handleLiquidate}
                disabled={liqLoading}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
              >
                {liqLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
                {liqLoading ? 'Liquidiere...' : 'Liquidieren'}
              </Button>
            </div>
          </div>
        )}
        {liqModalPlayer && liqResult && (
          <div className="space-y-4 p-4 md:p-6">
            <div className="bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-xl p-4 text-center">
              <div className="text-[#22C55E] font-black text-lg mb-1">Liquidierung abgeschlossen</div>
              <div className="text-sm text-white/60">{liqModalPlayer.first} {liqModalPlayer.last} wurde erfolgreich liquidiert.</div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white/50">DPC-Holder</span>
                <span className="font-mono font-bold">{liqResult.holder_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Ausgeschüttet</span>
                <span className="font-mono font-bold text-[#22C55E]">{fmtScout(centsToBsd(liqResult.distributed_cents))} $SCOUT</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Success Fee (reserviert)</span>
                <span className="font-mono font-bold text-[#FFD700]">{fmtScout(centsToBsd(liqResult.success_fee_cents))} $SCOUT</span>
              </div>
            </div>
            <Button variant="outline" fullWidth onClick={() => { setLiqModalPlayer(null); setLiqResult(null); }}>
              Schließen
            </Button>
          </div>
        )}
      </Modal>

      {/* Create IPO Modal */}
      <Modal open={ipoModalOpen} title="Neue IPO erstellen" onClose={() => setIpoModalOpen(false)}>
        <div className="space-y-4 p-4 md:p-6">
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Spieler</label>
            <select
              value={ipoPlayerId}
              onChange={(e) => setIpoPlayerId(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FFD700]/40"
            >
              <option value="" className="bg-[#1a1a2e] text-white/50">Spieler wählen...</option>
              {eligiblePlayers.map(p => (
                <option key={p.id} value={p.id} className="bg-[#1a1a2e] text-white">{p.first} {p.last} ({p.pos})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Preis pro DPC ($SCOUT)</label>
            <input type="number" inputMode="numeric" step="0.01" min="0.01" value={ipoPrice} onChange={(e) => setIpoPrice(e.target.value)} placeholder="z.B. 5.00" className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/25" />
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Anzahl DPC</label>
            <input type="number" inputMode="numeric" min="1" max={(() => { const sp = players.find(p => p.id === ipoPlayerId); return sp ? sp.dpc.supply - sp.dpc.circulation : 300; })()} value={ipoQty} onChange={(e) => setIpoQty(e.target.value)} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40" />
            {ipoPlayerId && (() => {
              const sp = players.find(p => p.id === ipoPlayerId);
              if (!sp) return null;
              const available = sp.dpc.supply - sp.dpc.circulation;
              return (
                <div className="mt-1 text-xs text-white/40">
                  Verfügbar: <span className="font-mono font-bold text-white/60">{available}</span> von <span className="font-mono font-bold text-white/60">{sp.dpc.supply}</span> (im Umlauf: {sp.dpc.circulation})
                </div>
              );
            })()}
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Max pro User</label>
            <input type="number" inputMode="numeric" min="1" value={ipoMaxPerUser} onChange={(e) => setIpoMaxPerUser(e.target.value)} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40" />
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Laufzeit</label>
            <select value={ipoDuration} onChange={(e) => setIpoDuration(e.target.value)} className="w-full px-3 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FFD700]/40">
              <option value="7">7 Tage</option>
              <option value="14">14 Tage</option>
              <option value="21">21 Tage</option>
              <option value="28">28 Tage</option>
            </select>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/10">
            <div>
              <div className="text-sm font-bold">Sofort starten</div>
              <div className="text-xs text-white/40">IPO wird direkt auf &quot;Live&quot; gesetzt</div>
            </div>
            <button
              onClick={() => setIpoStartNow(!ipoStartNow)}
              className={`w-12 h-6 rounded-full transition-all relative ${ipoStartNow ? 'bg-[#22C55E]' : 'bg-white/10'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${ipoStartNow ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>
          {ipoPlayerId && ipoPrice && (
            <div className="bg-[#FFD700]/5 border border-[#FFD700]/20 rounded-xl p-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/50">Gesamtvolumen</span>
                <span className="font-mono font-bold text-[#FFD700]">{fmtScout(parseFloat(ipoPrice) * parseInt(ipoQty || '0'))} $SCOUT</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Status nach Erstellung</span>
                <span className={ipoStartNow ? 'text-[#22C55E] font-bold' : 'text-blue-300 font-bold'}>{ipoStartNow ? 'Live' : 'Angekündigt'}</span>
              </div>
            </div>
          )}
          <Button variant="gold" fullWidth onClick={handleCreateIpo} disabled={ipoLoading || !ipoPlayerId || !ipoPrice}>
            {ipoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {ipoLoading ? 'Erstelle...' : 'IPO erstellen'}
          </Button>
        </div>
      </Modal>

      {/* Create Player Modal */}
      <Modal open={createModalOpen} title="Spieler anlegen" onClose={() => setCreateModalOpen(false)}>
        <div className="space-y-4 p-4 md:p-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Vorname</label>
              <input
                type="text"
                value={cpFirstName}
                onChange={(e) => setCpFirstName(e.target.value.slice(0, 30))}
                placeholder="Vorname"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/25"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Nachname</label>
              <input
                type="text"
                value={cpLastName}
                onChange={(e) => setCpLastName(e.target.value.slice(0, 30))}
                placeholder="Nachname"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/25"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Position</label>
              <select
                value={cpPosition}
                onChange={(e) => setCpPosition(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FFD700]/40"
              >
                <option value="GK">GK</option>
                <option value="DEF">DEF</option>
                <option value="MID">MID</option>
                <option value="ATT">ATT</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Trikotnr.</label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="99"
                value={cpShirtNumber}
                onChange={(e) => setCpShirtNumber(e.target.value)}
                placeholder="z.B. 10"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/25"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Alter</label>
              <input
                type="number"
                inputMode="numeric"
                min="15"
                max="45"
                value={cpAge}
                onChange={(e) => setCpAge(e.target.value)}
                placeholder="z.B. 24"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/25"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Nationalität</label>
              <input
                type="text"
                value={cpNationality}
                onChange={(e) => setCpNationality(e.target.value.slice(0, 3).toUpperCase())}
                placeholder="TR"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/25"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">IPO-Preis ($SCOUT)</label>
            <input
              type="number"
              inputMode="numeric"
              step="0.01"
              min="0.01"
              value={cpIpoPrice}
              onChange={(e) => setCpIpoPrice(e.target.value)}
              placeholder="z.B. 5.00"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/25"
            />
          </div>
          <div className="bg-white/[0.02] rounded-xl p-3 text-xs text-white/40">
            Club: <span className="text-white/70 font-bold">{club.name}</span>
          </div>
          <Button
            variant="gold"
            fullWidth
            onClick={handleCreatePlayer}
            disabled={createLoading || !cpFirstName || !cpLastName || !cpShirtNumber || !cpAge}
          >
            {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            {createLoading ? 'Erstelle...' : 'Spieler anlegen'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
