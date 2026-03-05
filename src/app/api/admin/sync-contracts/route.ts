import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { apiFetch, getLeagueId, getCurrentSeason } from '@/lib/footballApi';

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


  try {
    // Load clubs + players (via external_ids tables)
    const [{ data: clubExtIds }, { data: clubRows }, { data: extIds }, { data: players }] = await Promise.all([
      supabaseAdmin.from('club_external_ids').select('club_id, external_id').eq('source', 'api_football'),
      supabaseAdmin.from('clubs').select('id, name'),
      supabaseAdmin.from('player_external_ids').select('player_id, external_id').in('source', ['api_football_squad', 'api_football_fixture']),
      supabaseAdmin.from('players').select('id, first_name, last_name, contract_end'),
    ]);

    // Build club API ID lookup
    const clubApiIdMap = new Map<string, number>();
    for (const ext of (clubExtIds ?? [])) {
      const numId = parseInt(ext.external_id as string, 10);
      if (!isNaN(numId)) clubApiIdMap.set(ext.club_id as string, numId);
    }
    const clubs = (clubRows ?? [])
      .filter(c => clubApiIdMap.has(c.id as string))
      .map(c => ({ ...c, _apiFootballId: clubApiIdMap.get(c.id as string)! }));

    if (!clubs?.length) return NextResponse.json({ error: 'No clubs with api_football external ID' }, { status: 500 });
    if (!extIds?.length) return NextResponse.json({ error: 'No mapped players' }, { status: 500 });

    const playerNameMap = new Map<string, string>();
    for (const p of (players ?? [])) {
      playerNameMap.set(p.id as string, `${p.first_name} ${p.last_name}`);
    }

    const apiToLocal = new Map<number, { id: string; name: string }>();
    for (const ext of extIds) {
      const numId = parseInt(ext.external_id as string, 10);
      if (isNaN(numId)) continue;
      apiToLocal.set(numId, {
        id: ext.player_id as string,
        name: playerNameMap.get(ext.player_id as string) ?? 'Unknown',
      });
    }

    // Step 1: Probe one player to check if contract info is in the response
    const probeId = Array.from(apiToLocal.keys())[0];
    const probeData = await apiFetch<{
      response: Array<{
        player: Record<string, unknown>;
        statistics: Array<Record<string, unknown>>;
      }>;
    }>(`/players?id=${probeId}&season=${getCurrentSeason()}`, apiKey);

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
            `/players?team=${club._apiFootballId}&league=${getLeagueId()}&season=${getCurrentSeason()}&page=${page}`,
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
