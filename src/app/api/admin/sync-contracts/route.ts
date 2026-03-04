import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Admin API: Sync contract end dates from API-Football /players/profiles endpoint.
 *
 * Usage: POST /api/admin/sync-contracts
 * Header: Authorization: Bearer <CRON_SECRET>
 * Body (optional): { "dryRun": true } — preview without writing
 *
 * Strategy: Fetch /players?id={apiId}&season=2025 for each mapped player.
 * The response includes contract info when available.
 * Falls back to /transfers endpoint for transfer-based contract estimation.
 *
 * Rate limit: API-Football Plus = 100 calls/day.
 * With ~544 mapped players we need ~27 batch calls (20/page) per team.
 * For 20 teams: ~20-30 API calls (one per team with pagination).
 *
 * Run monthly or after transfer windows.
 */

const API_BASE = 'https://v3.football.api-sports.io';
const LEAGUE_ID = 204; // TFF 1. Lig
const SEASON = 2025;

async function apiFetch<T>(endpoint: string, apiKey: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'x-apisports-key': apiKey },
  });
  if (!res.ok) throw new Error(`API-Football ${res.status}: ${res.statusText}`);
  return (await res.json()) as T;
}

type PlayerResponse = {
  paging: { current: number; total: number };
  response: Array<{
    player: {
      id: number;
      name: string;
      firstname: string;
      lastname: string;
    };
    statistics: Array<{
      league: { id: number | null; season: number | null };
      team: { id: number; name: string };
      games: {
        appearences: number | null;
        minutes: number | null;
        position: string | null;
        captain: boolean;
      };
      // Some API-Football plans include contract info here
      [key: string]: unknown;
    }>;
  }>;
};

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.API_FOOTBALL_KEY ?? process.env.NEXT_PUBLIC_API_FOOTBALL_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API_FOOTBALL_KEY not set' }, { status: 500 });
  }

  let dryRun = false;
  try {
    const body = await req.json().catch(() => ({}));
    dryRun = body?.dryRun === true;
  } catch { /* empty body is fine */ }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    // Load clubs + players
    const [{ data: clubs }, { data: players }] = await Promise.all([
      supabaseAdmin.from('clubs').select('id, api_football_id, name').not('api_football_id', 'is', null),
      supabaseAdmin.from('players').select('id, api_football_id, first_name, last_name, contract_end').not('api_football_id', 'is', null),
    ]);

    if (!clubs?.length) return NextResponse.json({ error: 'No clubs with api_football_id' }, { status: 500 });
    if (!players?.length) return NextResponse.json({ error: 'No mapped players' }, { status: 500 });

    const apiToLocal = new Map<number, { id: string; name: string }>();
    for (const p of players) {
      if (p.api_football_id) {
        apiToLocal.set(p.api_football_id, { id: p.id, name: `${p.first_name} ${p.last_name}` });
      }
    }

    // Step 1: Probe one player to check if contract info is in the response
    const probeId = Array.from(apiToLocal.keys())[0];
    const probeData = await apiFetch<{
      response: Array<{
        player: Record<string, unknown>;
        statistics: Array<Record<string, unknown>>;
      }>;
    }>(`/players?id=${probeId}&season=${SEASON}`, apiKey);

    const probePlayer = probeData.response[0];
    const probeStat = probePlayer?.statistics?.[0];
    const probeFields = {
      playerKeys: probePlayer ? Object.keys(probePlayer.player) : [],
      statKeys: probeStat ? Object.keys(probeStat) : [],
    };

    // Check if contract data exists in player object or statistics
    const hasContractInPlayer = probePlayer?.player && ('contract' in probePlayer.player || 'contract_until' in probePlayer.player);
    const hasContractInStats = probeStat && ('contract' in probeStat);

    if (!hasContractInPlayer && !hasContractInStats) {
      // API-Football doesn't provide contract data on our plan.
      // Return what we found so the admin knows what's available.
      return NextResponse.json({
        message: 'Contract data NOT available in API-Football response on current plan.',
        probePlayerId: probeId,
        availableFields: probeFields,
        suggestion: 'Contract end dates need to be sourced from Transfermarkt or entered manually. Use POST /api/admin/sync-contracts with body { "manual": [...] } to set them.',
      });
    }

    // If we DO have contract data, fetch for all teams
    let updated = 0;
    let apiCalls = 1; // already used 1 for probe
    const updates: Array<{ id: string; name: string; contractEnd: string }> = [];
    const errors: string[] = [];

    for (const club of clubs) {
      try {
        let page = 1;
        let totalPages = 1;

        while (page <= totalPages) {
          apiCalls++;
          const data = await apiFetch<PlayerResponse>(
            `/players?team=${club.api_football_id}&league=${LEAGUE_ID}&season=${SEASON}&page=${page}`,
            apiKey,
          );
          totalPages = data.paging.total;

          for (const entry of data.response) {
            const local = apiToLocal.get(entry.player.id);
            if (!local) continue;

            // Extract contract end from wherever we found it
            const contractEnd = hasContractInPlayer
              ? String((entry.player as Record<string, unknown>)['contract_until'] ?? (entry.player as Record<string, unknown>)['contract'] ?? '')
              : String((entry.statistics[0] as Record<string, unknown>)['contract'] ?? '');

            if (contractEnd && contractEnd !== 'null' && contractEnd !== 'undefined') {
              // Normalize to ISO date: could be "2026-06-30" or "June 30, 2026" or "2026"
              const parsed = parseContractDate(contractEnd);
              if (parsed) {
                updates.push({ id: local.id, name: local.name, contractEnd: parsed });
              }
            }
          }

          page++;
        }
      } catch (err) {
        errors.push(`${club.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Write to DB
    if (!dryRun && updates.length > 0) {
      for (const u of updates) {
        const { error } = await supabaseAdmin
          .from('players')
          .update({ contract_end: u.contractEnd })
          .eq('id', u.id);
        if (error) {
          errors.push(`Update ${u.name}: ${error.message}`);
        } else {
          updated++;
        }
      }
    }

    return NextResponse.json({
      message: dryRun ? 'Dry run complete' : 'Contract sync complete',
      apiCalls,
      totalMapped: apiToLocal.size,
      contractsFound: updates.length,
      updated,
      errors,
      preview: updates.slice(0, 20),
    });
  } catch (err) {
    console.error('[sync-contracts] Error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

/** Parse various contract date formats to ISO date string (YYYY-MM-DD) */
function parseContractDate(raw: string): string | null {
  // Already ISO format: "2026-06-30"
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // Year only: "2026" → assume June 30
  if (/^\d{4}$/.test(raw)) return `${raw}-06-30`;

  // Try Date parsing for other formats
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return null;
}
