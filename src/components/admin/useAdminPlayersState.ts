import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from '@/components/providers/AuthProvider';
import { getPlayersByClubId, dbToPlayers, centsToBsd, bsdToCents, createPlayer } from '@/lib/services/players';
import { getIposByClubId, createIpo, updateIpoStatus } from '@/lib/services/ipo';
import { getPbtForPlayer } from '@/lib/services/pbt';
import { setSuccessFeeCap, liquidatePlayer } from '@/lib/services/liquidation';
import { canPerformAction } from '@/lib/adminRoles';
import { mapErrorToKey, normalizeError } from '@/lib/errorMessages';
import type { ClubWithAdmin, Player, DbIpo } from '@/types';

interface LiqResult {
  holder_count: number;
  distributed_cents: number;
  pbt_distributed_cents: number;
  success_fee_cents: number;
  fee_per_dpc_cents: number;
  transfer_value_eur: number;
}

// eslint-disable-next-line -- next-intl Translator type is complex
type TranslatorFn = (key: any, params?: any) => string;

export function useAdminPlayersState(club: ClubWithAdmin, t: TranslatorFn, te: TranslatorFn) {
  const { user } = useUser();
  const role = club.admin_role ?? 'editor';
  const canCreateIpo = canPerformAction('create_ipo', role);
  const canLiquidate = canPerformAction('liquidate', role);
  const canSetFee = canPerformAction('set_success_fee', role);
  const canCreatePlayerAction = canPerformAction('create_player', role);

  // ── Data State ──
  const [players, setPlayers] = useState<Player[]>([]);
  const [clubIpos, setClubIpos] = useState<DbIpo[]>([]);
  const [loading, setLoading] = useState(true);

  // ── IPO Modal State ──
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

  // ── Create Player State ──
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [cpFirstName, setCpFirstName] = useState('');
  const [cpLastName, setCpLastName] = useState('');
  const [cpPosition, setCpPosition] = useState<string>('MID');
  const [cpShirtNumber, setCpShirtNumber] = useState('');
  const [cpAge, setCpAge] = useState('');
  const [cpNationality, setCpNationality] = useState('TR');
  const [cpIpoPrice, setCpIpoPrice] = useState('5');

  // ── Cap State ──
  const [capModalPlayer, setCapModalPlayer] = useState<Player | null>(null);
  const [capValue, setCapValue] = useState('');
  const [capLoading, setCapLoading] = useState(false);

  // ── Liquidation State ──
  const [liqModalPlayer, setLiqModalPlayer] = useState<Player | null>(null);
  const [liqPbtBalance, setLiqPbtBalance] = useState<number>(0);
  const [liqHolderCount, setLiqHolderCount] = useState<number | null>(null);
  const [liqLoading, setLiqLoading] = useState(false);
  const [liqTransferValue, setLiqTransferValue] = useState('');
  const [liqResult, setLiqResult] = useState<LiqResult | null>(null);

  // ── Data Loading ──
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

  // ── Derived Data ──
  const eligiblePlayers = useMemo(() => {
    const activeIpoPlayerIds = new Set(
      clubIpos.filter(ipo => ['announced', 'early_access', 'open'].includes(ipo.status)).map(ipo => ipo.player_id)
    );
    return players.filter(p => !activeIpoPlayerIds.has(p.id) && !p.isLiquidated);
  }, [players, clubIpos]);

  const activeIpos = clubIpos.filter(ipo => ['announced', 'early_access', 'open'].includes(ipo.status));
  const pastIpos = clubIpos.filter(ipo => ['ended', 'cancelled'].includes(ipo.status));
  const activePlayers = players.filter(p => !p.isLiquidated);
  const liquidatedPlayers = players.filter(p => p.isLiquidated);

  // ── IPO Actions ──
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
  }, [user, ipoPlayerId, ipoPrice, ipoQty, ipoMaxPerUser, ipoDuration, ipoStartNow, club.id, t, te]);

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
  }, [user, club.id, t, te]);

  // ── Cap Actions ──
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
  }, [user, capModalPlayer, capValue, club.id, t, te]);

  const openCapModal = useCallback((p: Player) => {
    setCapModalPlayer(p);
    setCapValue(p.successFeeCap != null ? String(p.successFeeCap) : '');
  }, []);

  // ── Liquidation Actions ──
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
        const dbPlayers = await getPlayersByClubId(club.id);
        setPlayers(dbToPlayers(dbPlayers));
      }
    } catch (err) {
      setIpoError(te(mapErrorToKey(normalizeError(err))));
      setLiqModalPlayer(null);
    } finally {
      setLiqLoading(false);
    }
  }, [user, liqModalPlayer, liqTransferValue, club.id, t, te]);

  const closeLiquidationModal = useCallback(() => {
    setLiqModalPlayer(null);
    setLiqResult(null);
  }, []);

  // ── Create Player Actions ──
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
  }, [user, cpFirstName, cpLastName, cpPosition, cpShirtNumber, cpAge, cpNationality, cpIpoPrice, club.id, club.name, t, te]);

  return {
    // Permissions
    canCreateIpo, canLiquidate, canSetFee, canCreatePlayerAction,
    // Data
    players, loading, eligiblePlayers, activeIpos, pastIpos, activePlayers, liquidatedPlayers,
    // Feedback
    ipoError, setIpoError, ipoSuccess,
    // IPO Modal
    ipoModalOpen, setIpoModalOpen, ipoLoading,
    ipoPlayerId, setIpoPlayerId, ipoPrice, setIpoPrice,
    ipoQty, setIpoQty, ipoMaxPerUser, setIpoMaxPerUser,
    ipoDuration, setIpoDuration, ipoStartNow, setIpoStartNow,
    handleCreateIpo, handleIpoStatusChange,
    // Cap Modal
    capModalPlayer, setCapModalPlayer, capValue, setCapValue, capLoading,
    handleSetCap, openCapModal,
    // Liquidation Modal
    liqModalPlayer, liqPbtBalance, liqHolderCount, liqLoading,
    liqTransferValue, setLiqTransferValue, liqResult,
    openLiquidationModal, handleLiquidate, closeLiquidationModal,
    // Create Player Modal
    createModalOpen, setCreateModalOpen, createLoading,
    cpFirstName, setCpFirstName, cpLastName, setCpLastName,
    cpPosition, setCpPosition, cpShirtNumber, setCpShirtNumber,
    cpAge, setCpAge, cpNationality, setCpNationality,
    cpIpoPrice, setCpIpoPrice, handleCreatePlayer,
  };
}
