import { supabase } from '@/lib/supabaseClient';
import type { ChipType, DbChipUsage } from '@/types';

/** Season usage per chip type from get_season_chip_usage RPC */
export type SeasonChipUsage = {
  ok: boolean;
  triple_captain: { used: number; max: number };
  synergy_surge: { used: number; max: number };
  second_chance: { used: number; max: number };
  wildcard: { used: number; max: number };
};

// ============================================
// Chip Service (Gamification v5 Phase C)
// ============================================

/**
 * Activate a chip for an event.
 * Calls the activate_chip RPC which handles:
 * - Ticket spending
 * - Season limit enforcement
 * - Max 2 active chips per event
 */
export async function activateChip(
  eventId: string,
  chipType: ChipType,
): Promise<{ success: boolean; chip_usage_id?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('activate_chip', {
      p_event_id: eventId,
      p_chip_type: chipType,
    });

    if (error) {
      console.error('[Chips] activateChip error:', error);
      return { success: false, error: error.message };
    }

    const result = data as { ok: boolean; chip_id?: string; ticket_cost?: number; remaining_season_uses?: number; error?: string };
    return { success: result.ok, chip_usage_id: result.chip_id, error: result.error };
  } catch (err) {
    console.error('[Chips] activateChip unexpected error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Deactivate a chip by its usage ID.
 * Calls the deactivate_chip RPC which handles:
 * - Ticket refund (full cost via credit_tickets with source='chip_refund')
 * - DELETE chip_usages row
 */
export async function deactivateChip(
  chipUsageId: string,
): Promise<{ success: boolean; refunded_tickets?: number; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('deactivate_chip', {
      p_chip_usage_id: chipUsageId,
    });

    if (error) {
      console.error('[Chips] deactivateChip error:', error);
      return { success: false, error: error.message };
    }

    const result = data as { ok: boolean; tickets_refunded?: number; error?: string };
    return { success: result.ok, refunded_tickets: result.tickets_refunded, error: result.error };
  } catch (err) {
    console.error('[Chips] deactivateChip unexpected error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Get user's active chips for a specific event.
 * Returns SETOF chip_usages (user's chips for this event).
 */
export async function getEventChips(eventId: string): Promise<DbChipUsage[]> {
  try {
    const { data, error } = await supabase.rpc('get_event_chips', {
      p_event_id: eventId,
    });

    if (error) {
      console.error('[Chips] getEventChips error:', error);
      return [];
    }

    return (data ?? []) as DbChipUsage[];
  } catch (err) {
    console.error('[Chips] getEventChips unexpected error:', err);
    return [];
  }
}

/**
 * Get user's chip usage counts for the current season.
 * Returns per-chip-type usage with max limits.
 */
export async function getSeasonChipUsage(): Promise<SeasonChipUsage | null> {
  try {
    const { data, error } = await supabase.rpc('get_season_chip_usage');

    if (error) {
      console.error('[Chips] getSeasonChipUsage error:', error);
      return null;
    }

    const result = data as SeasonChipUsage;
    return result.ok ? result : null;
  } catch (err) {
    console.error('[Chips] getSeasonChipUsage unexpected error:', err);
    return null;
  }
}
