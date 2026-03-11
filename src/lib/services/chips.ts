import { supabase } from '@/lib/supabaseClient';
import { getCurrentSeason } from '@/lib/chips';
import type { ChipType, DbChipUsage } from '@/types';

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

    const result = data as { success: boolean; chip_usage_id?: string; error?: string };
    return result;
  } catch (err) {
    console.error('[Chips] activateChip unexpected error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Deactivate a chip for an event.
 * Calls the deactivate_chip RPC which handles:
 * - Ticket refund (full cost via credit_tickets with source='chip_refund')
 * - Setting is_active=false + deactivated_at timestamp
 */
export async function deactivateChip(
  eventId: string,
  chipType: ChipType,
): Promise<{ success: boolean; refunded_tickets?: number; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('deactivate_chip', {
      p_event_id: eventId,
      p_chip_type: chipType,
    });

    if (error) {
      console.error('[Chips] deactivateChip error:', error);
      return { success: false, error: error.message };
    }

    const result = data as { success: boolean; refunded_tickets?: number; error?: string };
    return result;
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
 * Get user's chip usage for a season (default: current season).
 * Returns SETOF chip_usages for tracking season limits.
 */
export async function getSeasonChipUsage(season?: string): Promise<DbChipUsage[]> {
  try {
    const targetSeason = season ?? getCurrentSeason();
    const { data, error } = await supabase.rpc('get_season_chip_usage', {
      p_season: targetSeason,
    });

    if (error) {
      console.error('[Chips] getSeasonChipUsage error:', error);
      return [];
    }

    return (data ?? []) as DbChipUsage[];
  } catch (err) {
    console.error('[Chips] getSeasonChipUsage unexpected error:', err);
    return [];
  }
}
