/**
 * Club External IDs — Centralized identity mapping for club data sources.
 *
 * Replaces the old clubs.api_football_id column.
 * All external data sources (API-Football, Transfermarkt, etc.)
 * are stored in the club_external_ids table with source + external_id.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClubExternalIdSource } from '@/types';

/**
 * Load API-Football club mapping → Map<apiFootballNumericId, clubUUID>
 * Used by cron, backfill scripts, and admin routes.
 */
export async function loadApiFootballClubMap(
  supabase: SupabaseClient,
): Promise<Map<number, string>> {
  const { data, error } = await supabase
    .from('club_external_ids')
    .select('club_id, external_id')
    .eq('source', 'api_football');

  if (error || !data?.length) return new Map();

  const result = new Map<number, string>();
  for (const row of data) {
    const numId = parseInt(row.external_id as string, 10);
    if (!isNaN(numId)) result.set(numId, row.club_id as string);
  }
  return result;
}

/**
 * Load reverse mapping: clubUUID → apiFootballNumericId
 * Used by scripts that need to call API-Football endpoints per club.
 */
export async function loadClubToApiFootballMap(
  supabase: SupabaseClient,
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('club_external_ids')
    .select('club_id, external_id')
    .eq('source', 'api_football');

  if (error || !data?.length) return new Map();

  const result = new Map<string, number>();
  for (const row of data) {
    const numId = parseInt(row.external_id as string, 10);
    if (!isNaN(numId)) result.set(row.club_id as string, numId);
  }
  return result;
}

/**
 * Bulk upsert club external ID mappings.
 * Used by syncTeamMapping.
 */
export async function bulkUpsertClubExternalIds(
  supabase: SupabaseClient,
  mappings: Array<{ clubId: string; source: ClubExternalIdSource; externalId: string }>,
): Promise<{ success: boolean; count: number; error?: string }> {
  if (mappings.length === 0) return { success: true, count: 0 };

  const rows = mappings.map(m => ({
    club_id: m.clubId,
    source: m.source,
    external_id: m.externalId,
    metadata: {},
  }));

  const { error } = await supabase
    .from('club_external_ids')
    .upsert(rows, { onConflict: 'club_id,source' });

  if (error) return { success: false, count: 0, error: error.message };
  return { success: true, count: mappings.length };
}
