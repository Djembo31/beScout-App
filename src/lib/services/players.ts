import { supabase } from '@/lib/supabaseClient';
import { cached, invalidate } from '@/lib/cache';
import type { DbPlayer, Player, PlayerStatus } from '@/types';
import { toPos } from '@/types';

const FIVE_MIN = 5 * 60 * 1000;

// ============================================
// Queries
// ============================================

/** Alle Spieler laden — via server-cached API Route */
export async function getPlayers(): Promise<DbPlayer[]> {
  return cached('players:all', async () => {
    const res = await fetch('/api/players');
    if (!res.ok) throw new Error('Failed to fetch players');
    return (await res.json()) as DbPlayer[];
  }, FIVE_MIN);
}

/** Einzelnen Spieler laden */
export async function getPlayerById(id: string): Promise<DbPlayer | null> {
  return cached(`player:${id}`, async () => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as DbPlayer;
  }, FIVE_MIN);
}

/** Alle Spieler eines Clubs laden (by name — legacy) */
export async function getPlayersByClub(clubName: string): Promise<DbPlayer[]> {
  return cached(`players:club:${clubName}`, async () => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('club', clubName)
      .order('last_name');

    if (error) throw new Error(error.message);
    return data as DbPlayer[];
  }, FIVE_MIN);
}

/** Alle Spieler eines Clubs laden (by club_id) */
export async function getPlayersByClubId(clubId: string): Promise<DbPlayer[]> {
  return cached(`players:club:${clubId}`, async () => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('club_id', clubId)
      .order('last_name');

    if (error) throw new Error(error.message);
    return data as DbPlayer[];
  }, FIVE_MIN);
}

// ============================================
// Mapper: DbPlayer → Frontend Player Type
// ============================================

/** Cents → BSD (z.B. 15600 → 156). Uses Math.round to avoid floating-point artifacts. */
export function centsToBsd(cents: number): number {
  return Math.round(cents) / 100;
}

/** BSD → Cents (z.B. 156 → 15600) */
export function bsdToCents(bsd: number): number {
  return Math.round(bsd * 100);
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
    club: db.club,
    league: 'TFF 1. Lig',
    pos: toPos(db.position),
    status: (db.status as PlayerStatus) ?? 'fit',
    age: db.age ?? 0,
    country: db.nationality ?? 'TR',
    contractMonthsLeft: 12, // TODO: contract_end in DB nutzen
    perf: {
      l5: Number(db.perf_l5),
      l15: Number(db.perf_l15),
      trend: Number(db.perf_l5) > Number(db.perf_l15) ? 'UP' : Number(db.perf_l5) < Number(db.perf_l15) ? 'DOWN' : 'FLAT',
    },
    stats: {
      matches: db.matches,
      goals: db.goals,
      assists: db.assists,
    },
    prices: {
      lastTrade: lastBsd,
      change24h: Number(db.price_change_24h),
      floor: floorBsd,
      ipoPrice: centsToBsd(db.ipo_price ?? db.floor_price),
    },
    dpc: {
      supply: db.dpc_total,
      float: db.dpc_total,
      circulation: db.dpc_total - db.dpc_available,
      onMarket: 0, // Wird spaeter aus Orders berechnet
      owned: 0,    // Wird per User-Holdings gesetzt
    },
    ipo: { status: 'none' }, // IPO status loaded separately
    listings: [], // Wird spaeter aus Orders befuellt
    topOwners: [], // Wird spaeter befuellt
    successFeeCap: db.success_fee_cap_cents != null ? centsToBsd(db.success_fee_cap_cents) : undefined,
    isLiquidated: db.is_liquidated || false,
  };
}

/** Batch-Mapper */
export function dbToPlayers(rows: DbPlayer[]): Player[] {
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
}): Promise<{ success: boolean; playerId?: string; error?: string }> {
  const ipoPriceCents = params.ipoPrice ? Math.round(params.ipoPrice * 100) : 500;
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
      price_change_24h: 0,
      volume_24h: 0,
      status: 'fit',
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  invalidate('players:');
  return { success: true, playerId: data.id };
}
