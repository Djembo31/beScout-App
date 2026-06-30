import { supabase } from '@/lib/supabaseClient';
import { getClub } from '@/lib/clubs';
import { getLeague } from '@/lib/leagues';
import { mapNationalityToIso } from '@/lib/utils/countryNameToIso';
import type { League } from '@/types';
import type { DbPlayer, Player, PlayerStatus, Pos } from '@/types';
import { toPos } from '@/types';

// ============================================
// Canonical Column Set — Single Source of Truth
// ============================================

/** ALL player queries MUST use this column list. Prevents data divergence between views. */
export const PLAYER_SELECT_COLS = [
  'id', 'first_name', 'last_name', 'position', 'club', 'club_id',
  'age', 'shirt_number', 'nationality', 'image_url',
  'matches', 'goals', 'assists', 'clean_sheets',
  'total_minutes', 'total_saves',
  'perf_l5', 'perf_l15', 'perf_season', 'l5_appearances', 'l15_appearances',
  'dpc_total', 'dpc_available',
  'floor_price', 'last_price', 'ipo_price', 'price_change_24h', 'volume_24h',
  'status', 'market_value_eur', 'mv_trend_7d', 'trades_volume_7d',
  'success_fee_cap_cents', 'max_supply',
  'is_liquidated', 'contract_end', 'last_appearance_gw', 'created_at', 'updated_at',
].join(', ');

// ============================================
// Queries
// ============================================

/** Alle Spieler laden — via server-cached API Route */
export async function getPlayers(): Promise<DbPlayer[]> {
  const res = await fetch('/api/players');
  if (!res.ok) throw new Error('Failed to fetch players');
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

/** Lightweight player names — only id, name, position. For dropdowns/autocomplete. */
export type PlayerName = { id: string; name: string; pos: Pos };
export async function getPlayerNames(): Promise<PlayerName[]> {
  // PostgREST cappt unranged .select() still bei ~1000 Rows; players hat >4000.
  // Range-Loop wie getClubsWithStats (club.ts, Slice 079b-Muster) — sonst fehlen
  // dem Spieler-Picker (CreatePollModal/CreateResearchModal) >3000 Spieler.
  const PAGE = 1000;
  const rows: { id: string; first_name: string; last_name: string; position: string }[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('players')
      .select('id, first_name, last_name, position')
      .order('last_name')
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows.map(p => ({
    id: p.id,
    name: `${p.first_name} ${p.last_name}`,
    pos: toPos(p.position),
  }));
}

/** Einzelnen Spieler laden */
export async function getPlayerById(id: string): Promise<DbPlayer | null> {
  const { data, error } = await supabase
    .from('players')
    .select(PLAYER_SELECT_COLS)
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as DbPlayer;
}

/** Server-side percentile ranks for a player — avoids fetching all 632 players client-side */
export async function getPlayerPercentiles(playerId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('rpc_get_player_percentiles', { p_player_id: playerId });
  if (error) throw new Error(error.message);
  return (data as Record<string, number>) ?? {};
}

/**
 * Slice 282 — targeted Mini-Fetch für Home-Ableitungen (Trending-Join, IPO-Player,
 * Lineup-Rows, Feed-Enrichment). Ersetzt das 4,2-MB-`getPlayers()` auf Home.
 * Chunked per common-errors.md §1 (.in() URL-Limit), auch wenn Caller ≤ 12 IDs liefern.
 */
export async function getPlayersByIds(ids: string[]): Promise<DbPlayer[]> {
  if (ids.length === 0) return [];
  const CHUNK = 100;
  const out: DbPlayer[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data, error } = await supabase
      .from('players')
      .select(PLAYER_SELECT_COLS)
      .in('id', ids.slice(i, i + CHUNK));
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as unknown as DbPlayer[]));
  }
  return out;
}

/**
 * Slice 282 — globale 24h-Top-Movers via server-cached API-Route
 * (`/api/players?movers=true`, 5-min In-Memory-Cache, PLAYER_SELECT_COLS-Rows).
 * Ersetzt das client-seitige sort/filter über die volle Players-Liste.
 */
export async function getGlobalMovers(limit: number): Promise<DbPlayer[]> {
  const res = await fetch(`/api/players?movers=true&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch global movers');
  const json = await res.json();
  return Array.isArray(json) ? (json as DbPlayer[]) : [];
}

/**
 * Slice 283 — server-side Name-Suche für Picker-UIs (CreateOfferModal).
 * Ersetzt das Filtern über die volle 4,2-MB-Liste. ilike auf Vor-/Nachname,
 * kleine Result-Caps — Parity zum früheren client-side includes()-Filter.
 */
export async function searchPlayersByName(query: string, limit = 8): Promise<DbPlayer[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  // Review-283-F-02: neben %_ auch PostgREST-or-Syntax-Zeichen strippen —
  // Kommas/Klammern parsen als Bedingungs-Separator/Gruppierung → 400-Error.
  const pattern = `%${q.replace(/[%_,().]/g, '')}%`;
  const { data, error } = await supabase
    .from('players')
    .select(PLAYER_SELECT_COLS)
    .or(`first_name.ilike.${pattern},last_name.ilike.${pattern}`)
    .order('last_name')
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as DbPlayer[];
}

/**
 * Alle Spieler eines Clubs laden (by club_id).
 *
 * @param opts.activeOnly Wenn true, werden Spieler mit `mv_source='transfermarkt_stale'`
 *   ausgeschlossen. Default false = Full-Set (wird z.B. von Admin-Liquidate-UI gebraucht).
 *   Filter-Hintergrund: Slice 081/081b/081c hat 52% der Rows als stale geflaggt.
 */
export async function getPlayersByClubId(
  clubId: string,
  opts?: { activeOnly?: boolean }
): Promise<DbPlayer[]> {
  let query = supabase
    .from('players')
    .select(PLAYER_SELECT_COLS)
    .eq('club_id', clubId)
    .order('last_name');

  if (opts?.activeOnly) {
    query = query.neq('mv_source', 'transfermarkt_stale');
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as DbPlayer[];
}

// ============================================
// Mapper: DbPlayer → Frontend Player Type
// ============================================

/** Cents → Credits (z.B. 15600 → 156; 1 Credit = 100 cents, D99). Uses Math.round to avoid floating-point artifacts. */
export function centsToBsd(cents: number): number {
  return Math.round(cents) / 100;
}

/** Credits → Cents (z.B. 156 → 15600; 1 Credit = 100 cents, D99). Funktionsname bleibt (Code-intern). */
export function bsdToCents(bsd: number): number {
  return Math.round(bsd * 100);
}

/** Calculate months left from contract_end date string. Returns 0 if unknown. */
function calcContractMonths(contractEnd?: string | null): number {
  if (!contractEnd) return 0;
  const end = new Date(contractEnd);
  const now = new Date();
  const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
  return Math.max(0, months);
}

/** Resolve league for a club_id via Club → League cache chain. */
function leagueLookup(clubId: string): League | undefined {
  const club = getClub(clubId);
  return club?.league ? getLeague(club.league) : undefined;
}

/**
 * Konvertiert eine DB-Row in den Frontend Player-Type.
 * Felder die nicht in der DB sind (listings, topOwners, pbt, ipo)
 * bekommen sinnvolle Defaults.
 */
export function dbToPlayer(db: DbPlayer): Player {
  const floorBsd = centsToBsd(db.floor_price);
  const lastBsd = centsToBsd(db.last_price);

  return {
    id: db.id,
    ticket: db.shirt_number ?? 0,
    first: db.first_name,
    last: db.last_name,
    // Slice 477 (D-26): Club-Identität = FK-aufgelöster clubs.name (Wahrheit), NICHT
    // der stale players.club-Freitext (6,57% divergent, S368b-Klasse). Parallel zur
    // bereits FK-resolved Liga (unten). Fallback auf Freitext bei NULL club_id ODER
    // Cache-cold (getClub→null) — graceful, identisch zur Liga-Auflösung.
    club: db.club_id ? (getClub(db.club_id)?.name ?? db.club) : db.club,
    clubId: db.club_id ?? undefined,
    // Slice 326: leagueId (UUID) = Filter-Wahrheit; `league` (Name) bleibt Display.
    leagueId: db.club_id ? (getClub(db.club_id)?.league_id ?? undefined) : undefined,
    league: db.club_id ? (getClub(db.club_id)?.league ?? undefined) : undefined,
    leagueShort: db.club_id ? (leagueLookup(db.club_id)?.short ?? undefined) : undefined,
    leagueLogoUrl: db.club_id ? (leagueLookup(db.club_id)?.logoUrl ?? undefined) : undefined,
    leagueCountry: db.club_id ? (leagueLookup(db.club_id)?.country ?? undefined) : undefined,
    pos: toPos(db.position),
    status: (db.status as PlayerStatus) ?? 'fit',
    age: db.age ?? 0,
    country: mapNationalityToIso(db.nationality),
    contractMonthsLeft: calcContractMonths(db.contract_end),
    perf: {
      l5: Number(db.perf_l5),
      l15: Number(db.perf_l15),
      l5Apps: db.l5_appearances ?? 0,
      l15Apps: db.l15_appearances ?? 0,
      season: Number(db.perf_season ?? 0),
      trend: Number(db.perf_l5) > Number(db.perf_l15) ? 'UP' : Number(db.perf_l5) < Number(db.perf_l15) ? 'DOWN' : 'FLAT',
    },
    stats: {
      matches: db.matches,
      goals: db.goals,
      assists: db.assists,
      cleanSheets: db.clean_sheets,
      minutes: db.total_minutes ?? 0,
      saves: db.total_saves ?? 0,
    },
    prices: {
      lastTrade: lastBsd,
      change24h: Number(db.price_change_24h),
      floor: floorBsd,
      // Slice 308: strictly from ipo_price — NO floor_price fallback (semantic mix, S7 Trading-#4).
      // Markteintritt = erster IPO, eingefroren (D101). undefined when no IPO (ipo_price null/0) → "—".
      ipoPrice: db.ipo_price && db.ipo_price > 0 ? centsToBsd(db.ipo_price) : undefined,
    },
    dpc: {
      supply: db.max_supply ?? db.dpc_total,
      float: db.dpc_total,
      circulation: db.dpc_total - db.dpc_available,
      onMarket: 0, // Wird spaeter aus Orders berechnet
      owned: 0,    // Wird per User-Holdings gesetzt
    },
    ipo: { status: 'none' }, // IPO status loaded separately
    listings: [], // Wird spaeter aus Orders befuellt
    topOwners: [], // Wird spaeter befuellt
    marketValue: db.market_value_eur || undefined,
    mvTrend7d: db.mv_trend_7d ?? null,
    tradesVolume7d: db.trades_volume_7d ?? null,
    imageUrl: db.image_url ?? null,
    successFeeCap: db.success_fee_cap_cents != null ? centsToBsd(db.success_fee_cap_cents) : undefined,
    lastAppearanceGw: db.last_appearance_gw ?? 0,
    gwGap: 0, // Computed by component with currentGw context
    isLiquidated: db.is_liquidated || false,
  };
}

/** Batch-Mapper */
export function dbToPlayers(rows: DbPlayer[]): Player[] {
  if (!Array.isArray(rows)) return [];
  return rows.map(dbToPlayer);
}

// ============================================
// Mutations
// ============================================

export async function createPlayer(params: {
  firstName: string;
  lastName: string;
  position: string;
  shirtNumber: number;
  age: number;
  clubId: string;
  clubName: string;
  nationality?: string;
  ipoPrice?: number;
  marketValueEur?: number;
}): Promise<{ success: boolean; playerId?: string; error?: string }> {
  // Slice 108/111 CEO Pricing-Asset-Model:
  // - Explicit ipoPrice (in $SCOUT): respect admin override
  // - Else marketValueEur given: derive ipo_price_cents = MV / 10 (linear formula)
  // - Else fallback 500 cents (5 $SCOUT legacy placeholder)
  const mvEur = Number(params.marketValueEur) || 0;
  const ipoPriceCents = params.ipoPrice
    ? Math.round(params.ipoPrice * 100)
    : mvEur > 0
      ? Math.max(Math.floor(mvEur / 10), 0)
      : 500;
  const { data, error } = await supabase
    .from('players')
    .insert({
      first_name: params.firstName,
      last_name: params.lastName,
      position: params.position,
      shirt_number: params.shirtNumber,
      age: params.age,
      club: params.clubName,
      club_id: params.clubId,
      nationality: params.nationality || 'TR',
      market_value_eur: mvEur,
      ipo_price: ipoPriceCents,
      floor_price: ipoPriceCents,
      last_price: 0,
      dpc_total: 0,
      dpc_available: 0,
      matches: 0,
      goals: 0,
      assists: 0,
      clean_sheets: 0,
      perf_l5: 0,
      perf_l15: 0,
      perf_season: 0,
      l5_appearances: 0,
      l15_appearances: 0,
      price_change_24h: 0,
      volume_24h: 0,
      status: 'fit',
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, playerId: data.id };
}

// ============================================
// 7-Day Price Changes (via RPC)
// ============================================

export type PriceChange7d = {
  player_id: string;
  price_7d_ago: number;
  price_now: number;
  change_abs: number;
  change_pct: number;
};

/**
 * Get top movers by 7-day price change.
 *
 * Slice 268b (D63 Phase 3) — silent-fail-fix per `errors-db.md`
 * "Service Error-Swallowing":
 *   - Success path: `data ?? []` (unchanged — handles PostgREST `null`-data quirk).
 *   - RPC error: throws so React-Query can surface `isError` and retry.
 *
 * Caller should prefer `usePlayerPriceChanges7d` (queries/players.ts) — it
 * wraps this service in TanStack-Query with a 5-min staleTime, dedup, and
 * deterministic cache-keying.
 */
export async function getPlayerPriceChanges7d(
  playerIds?: string[],
  limit: number = 20,
): Promise<PriceChange7d[]> {
  const { data, error } = await supabase.rpc('get_player_price_changes_7d', {
    p_player_ids: playerIds ?? null,
    p_limit: limit,
  });
  if (error) {
    throw new Error(error.message);
  }
  return (data as PriceChange7d[]) ?? [];
}
