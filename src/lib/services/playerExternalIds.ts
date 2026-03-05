/**
 * Player External IDs — Centralized identity mapping for all import pipelines.
 *
 * Replaces the old players.api_football_id / fixture_api_football_id columns.
 * All external data sources (API-Football squad, fixture, Transfermarkt, Opta)
 * are stored in the player_external_ids table with source + external_id.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExternalIdSource } from '@/types';

type PlayerMapEntry = { id: string; position: string };

/**
 * Load all external IDs for API-Football sources → Map<apiFootballNumericId, {id, position}>
 * Used by cron, backfill scripts, and admin routes that match API-Football player IDs.
 *
 * Joins with players table to get position. Supports both squad and fixture ID sources.
 */
export async function loadApiFootballPlayerMap(
  supabase: SupabaseClient,
): Promise<Map<number, PlayerMapEntry>> {
  const { data: extIds, error } = await supabase
    .from('player_external_ids')
    .select('player_id, source, external_id')
    .in('source', ['api_football_squad', 'api_football_fixture']);

  if (error || !extIds?.length) return new Map();

  // Load player positions in one query
  const playerIds = Array.from(new Set(extIds.map(e => e.player_id as string)));
  const { data: players } = await supabase
    .from('players')
    .select('id, position')
    .in('id', playerIds);

  const posMap = new Map<string, string>();
  for (const p of players ?? []) {
    posMap.set(p.id as string, p.position as string);
  }

  const result = new Map<number, PlayerMapEntry>();
  for (const ext of extIds) {
    const numId = parseInt(ext.external_id as string, 10);
    if (isNaN(numId)) continue;
    result.set(numId, {
      id: ext.player_id as string,
      position: posMap.get(ext.player_id as string) ?? 'MID',
    });
  }

  return result;
}

/**
 * Upsert a single external ID mapping.
 * Uses ON CONFLICT to handle re-mapping gracefully.
 */
export async function upsertExternalId(
  supabase: SupabaseClient,
  playerId: string,
  source: ExternalIdSource,
  externalId: string,
  metadata?: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('player_external_ids')
    .upsert(
      {
        player_id: playerId,
        source,
        external_id: externalId,
        metadata: metadata ?? {},
      },
      { onConflict: 'player_id,source' },
    );

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Bulk upsert external ID mappings.
 * Used by sync-unmapped-players, reconcile-player-ids, and admin_map_players.
 */
export async function bulkUpsertExternalIds(
  supabase: SupabaseClient,
  mappings: Array<{ playerId: string; source: ExternalIdSource; externalId: string }>,
): Promise<{ success: boolean; count: number; error?: string }> {
  if (mappings.length === 0) return { success: true, count: 0 };

  const rows = mappings.map(m => ({
    player_id: m.playerId,
    source: m.source,
    external_id: m.externalId,
    metadata: {},
  }));

  const { error } = await supabase
    .from('player_external_ids')
    .upsert(rows, { onConflict: 'player_id,source' });

  if (error) return { success: false, count: 0, error: error.message };
  return { success: true, count: mappings.length };
}
