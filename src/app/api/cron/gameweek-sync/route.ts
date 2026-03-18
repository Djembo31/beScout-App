import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  apiFetch,
  getLeagueId,
  getCurrentSeason,
  calcFantasyPoints,
  scaleFormulaToRating,
  mapPosition,
  normalizeForMatch,
  deduplicateGhostStarters,
  type ApiFixtureResponse,
  type ApiFixturePlayerResponse,
  type ApiLineupsResponse,
  type ApiLineupPlayer,
  type ApiFixtureEventsResponse,
} from '@/lib/footballApi';

const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN']);

// ============================================
// Name-Matching (cron-route specific, uses shared normalizeForMatch)
// ============================================

function nameMatchPlayer(
  apiName: string,
  clubPlayers: Array<{ id: string; first_name: string; last_name: string; position: string; shirt_number?: number | null }>,
  shirtNumber?: number,
): { id: string; position: string } | null {
  const normalized = normalizeForMatch(apiName);
  const parts = normalized.split(/\s+/);
  const apiLast = parts[parts.length - 1];

  let bestMatch: { id: string; position: string } | null = null;
  let bestScore = 0;

  for (const p of clubPlayers) {
    const normFirst = normalizeForMatch(p.first_name);
    const normLast = normalizeForMatch(p.last_name);
    let score = 0;

    // Exact last name match
    if (normLast === apiLast) score += 50;
    // Last name contained in API name
    else if (normalized.includes(normLast) && normLast.length >= 3) score += 35;
    // API last part contained in DB last name
    else if (normLast.includes(apiLast) && apiLast.length >= 3) score += 25;

    // First name bonus
    if (parts.length > 1 && normFirst === parts[0]) score += 30;
    else if (normalized.includes(normFirst) && normFirst.length >= 3) score += 15;

    // Shirt-number bonus (strong signal when shirt numbers match)
    if (shirtNumber != null && p.shirt_number != null && p.shirt_number === shirtNumber) score += 25;

    if (score > bestScore && score >= 40) {
      // Check for ambiguity: if another player already matched at similar score, require higher threshold
      if (bestMatch && bestScore > 0 && score - bestScore < 15) {
        // Close match — both candidates similarly named. Require shirt number or first name to decide.
        continue;
      }
      bestScore = score;
      bestMatch = { id: p.id, position: p.position };
    }
  }

  return bestMatch;
}


// ============================================
// Step Result Tracking
// ============================================

type StepResult = {
  step: string;
  status: 'success' | 'skipped' | 'error';
  details?: Record<string, unknown>;
  duration_ms: number;
};

// ============================================
// GET /api/cron/gameweek-sync
// ============================================

export async function GET(request: Request) {
  const runStart = Date.now();
  const steps: StepResult[] = [];

  // ---- 1. Auth ----
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ---- 2. Env validation ----
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 });
  }

  if (!process.env.API_FOOTBALL_KEY && !process.env.NEXT_PUBLIC_API_FOOTBALL_KEY) {
    return NextResponse.json({ error: 'API_FOOTBALL_KEY not configured' }, { status: 500 });
  }

  const leagueId = getLeagueId();
  const season = getCurrentSeason();

  // ---- Helpers ----

  async function logStep(
    gameweek: number,
    step: string,
    status: string,
    details?: Record<string, unknown>,
    durationMs?: number,
  ) {
    try {
      await supabaseAdmin.from('cron_sync_log').insert({
        gameweek,
        step,
        status,
        details: details ?? null,
        duration_ms: durationMs ?? null,
      });
    } catch {
      /* best-effort logging */
    }
  }

  async function runStep<T>(
    name: string,
    fn: () => Promise<T>,
  ): Promise<{ result: T | null; error: string | null }> {
    const stepStart = Date.now();
    try {
      const result = await fn();
      steps.push({ step: name, status: 'success', duration_ms: Date.now() - stepStart });
      return { result, error: null };
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Unknown error';
      steps.push({
        step: name,
        status: 'error',
        details: { error: err },
        duration_ms: Date.now() - stepStart,
      });
      return { result: null, error: err };
    }
  }

  let activeGw = 1;

  try {
    // ---- 2b. Auto-expire IPOs past ends_at ----
    await runStep('expire_ipos', async () => {
      const { data, error } = await supabaseAdmin
        .from('ipos')
        .update({ status: 'ended' })
        .in('status', ['open', 'early_access'])
        .lt('ends_at', new Date().toISOString())
        .select('id');

      if (error) throw new Error(error.message);
      return { expired: data?.length ?? 0 };
    });

    // ---- 2c. Expire stale offers + release locked funds ----
    await runStep('expire_pending_offers', async () => {
      const { data, error } = await supabaseAdmin.rpc('expire_pending_offers');
      if (error) throw new Error(error.message);
      return data;
    });

    // ---- 2c2. Expire stale orders ----
    await runStep('expire_pending_orders', async () => {
      const { data, error } = await supabaseAdmin.rpc('expire_pending_orders');
      if (error) throw new Error(error.message);
      return data;
    });

    // ---- 2d. Daily price_change_24h + volume_24h reset ----
    await runStep('daily_price_volume_reset', async () => {
      const { data, error } = await supabaseAdmin.rpc('daily_price_volume_reset');
      if (error) throw new Error(error.message);
      return data;
    });

    // ---- 3. Get active gameweek ----
    const { result: gwResult } = await runStep('get_active_gw', async () => {
      const { data: clubs } = await supabaseAdmin
        .from('clubs')
        .select('id, active_gameweek')
        .order('active_gameweek', { ascending: true });

      if (!clubs || clubs.length === 0) throw new Error('No clubs found');

      const minGw = Math.min(
        ...clubs.map((c) => (c.active_gameweek as number) ?? 1),
      );
      const clubsAtGw = clubs.filter(
        (c) => (c.active_gameweek as number) === minGw,
      );
      return { gameweek: minGw, clubs: clubsAtGw };
    });

    if (!gwResult) {
      return NextResponse.json(
        { error: 'Failed to get active gameweek', steps },
        { status: 500 },
      );
    }

    activeGw = gwResult.gameweek;
    const clubsToProcess = gwResult.clubs as Array<{
      id: string;
      active_gameweek: number;
    }>;

    await logStep(activeGw, 'get_active_gw', 'success', {
      gameweek: activeGw,
      clubs: clubsToProcess.length,
    });

    // ---- 3b. Check for processable fixtures (past played_at OR all already finished) ----
    const { data: unfinishedFixtures } = await supabaseAdmin
      .from('fixtures')
      .select('id, played_at')
      .eq('gameweek', activeGw)
      .neq('status', 'finished')
      .limit(1);

    if (!unfinishedFixtures || unfinishedFixtures.length === 0) {
      // All fixtures already 'finished' in DB — check if GW finalization is needed
      const { data: unscoredEvents } = await supabaseAdmin
        .from('events')
        .select('id')
        .in('club_id', clubsToProcess.map(c => c.id))
        .eq('gameweek', activeGw)
        .is('scored_at', null)
        .limit(1);

      if (!unscoredEvents || unscoredEvents.length === 0) {
        await logStep(activeGw, 'already_complete', 'skipped', { reason: 'All fixtures finished, all events scored' });
        return NextResponse.json({ status: 'skipped', reason: 'GW already fully processed', gameweek: activeGw, duration_ms: Date.now() - runStart });
      }
      // Fixtures done but events not scored — fall through to Phase B
    } else {
      // There are unfinished fixtures — check if any have played_at in the past
      const { data: pastUnfinished } = await supabaseAdmin
        .from('fixtures')
        .select('id')
        .eq('gameweek', activeGw)
        .neq('status', 'finished')
        .lt('played_at', new Date().toISOString())
        .limit(1);

      if (!pastUnfinished || pastUnfinished.length === 0) {
        // All unfinished fixtures are in the future — nothing to sync
        await logStep(activeGw, 'no_past_fixtures', 'skipped', { reason: 'No fixtures past kickoff yet' });
        return NextResponse.json({ status: 'skipped', reason: 'No fixtures past kickoff', gameweek: activeGw, duration_ms: Date.now() - runStart });
      }
    }

    // ---- 4. Check API fixtures ----
    const { result: fixtureCheck } = await runStep(
      'check_api_fixtures',
      async () => {
        const apiFixData = await apiFetch<ApiFixtureResponse>(
          `/fixtures?league=${leagueId}&season=${season}&round=Regular Season - ${activeGw}`,
        );

        const total = apiFixData.response.length;
        const finished = apiFixData.response.filter((f) =>
          FINISHED_STATUSES.has(f.fixture.status.short),
        ).length;

        return {
          total,
          finished,
          allDone: total > 0 && total === finished,
          apiData: apiFixData,
        };
      },
    );

    if (!fixtureCheck || fixtureCheck.finished === 0) {
      const info = fixtureCheck ?? { total: 0, finished: 0 };
      await logStep(activeGw, 'check_fixtures', 'skipped', {
        total: info.total,
        finished: info.finished,
      });
      return NextResponse.json({
        skipped: true,
        gameweek: activeGw,
        reason: `No finished fixtures on API (${info.finished}/${info.total})`,
        steps,
      });
    }

    const apiFixData = fixtureCheck.apiData;
    const allFixturesDone = fixtureCheck.allDone;
    await logStep(activeGw, 'check_fixtures', 'success', {
      total: fixtureCheck.total,
      finished: fixtureCheck.finished,
      allDone: allFixturesDone,
    });

    // ---- 5. Load DB mappings ----
    const { result: mappings } = await runStep('load_mappings', async () => {
      const [fixtureRes, extIdRes, playerRes, clubExtRes] = await Promise.all([
        supabaseAdmin
          .from('fixtures')
          .select('id, home_club_id, away_club_id, api_fixture_id')
          .eq('gameweek', activeGw)
          .not('api_fixture_id', 'is', null),
        supabaseAdmin
          .from('player_external_ids')
          .select('player_id, external_id')
          .in('source', ['api_football_squad', 'api_football_fixture']),
        supabaseAdmin
          .from('players')
          .select('id, position, first_name, last_name, club_id, shirt_number'),
        supabaseAdmin
          .from('club_external_ids')
          .select('club_id, external_id')
          .eq('source', 'api_football'),
      ]);

      if (!fixtureRes.data?.length)
        throw new Error('No mapped fixtures for this gameweek');
      if (!extIdRes.data?.length) throw new Error('No mapped players');

      // Build player position lookup
      const posMap = new Map<string, string>();
      for (const p of playerRes.data ?? []) {
        posMap.set(p.id as string, p.position as string);
      }

      // Build club players map for name matching: clubId → players[]
      type ClubPlayerInfo = { id: string; first_name: string; last_name: string; position: string; shirt_number: number | null };
      const clubPlayersMap = new Map<string, ClubPlayerInfo[]>();
      for (const p of playerRes.data ?? []) {
        const cid = p.club_id as string;
        if (!cid) continue;
        const arr = clubPlayersMap.get(cid) ?? [];
        arr.push({
          id: p.id as string,
          first_name: p.first_name as string,
          last_name: p.last_name as string,
          position: p.position as string,
          shirt_number: (p.shirt_number as number | null) ?? null,
        });
        clubPlayersMap.set(cid, arr);
      }

      // Build shirt-number index: clubId → shirtNumber → player
      const clubPlayersByShirtNumber = new Map<string, Map<number, ClubPlayerInfo>>();
      for (const [cid, players] of Array.from(clubPlayersMap.entries())) {
        const snMap = new Map<number, ClubPlayerInfo>();
        for (const p of players) {
          if (p.shirt_number != null) snMap.set(p.shirt_number, p);
        }
        clubPlayersByShirtNumber.set(cid, snMap);
      }

      return {
        fixtures: fixtureRes.data as Array<{
          id: string;
          home_club_id: string;
          away_club_id: string;
          api_fixture_id: number;
        }>,
        playerMap: (() => {
          const m = new Map<number, { id: string; position: string }>();
          for (const ext of extIdRes.data) {
            const numId = parseInt(ext.external_id as string, 10);
            if (isNaN(numId)) continue;
            m.set(numId, {
              id: ext.player_id as string,
              position: posMap.get(ext.player_id as string) ?? 'MID',
            });
          }
          return m;
        })(),
        clubMap: (() => {
          const m = new Map<number, string>();
          for (const ext of (clubExtRes.data ?? [])) {
            const numId = parseInt(ext.external_id as string, 10);
            if (!isNaN(numId)) m.set(numId, ext.club_id as string);
          }
          return m;
        })(),
        clubPlayersMap,
        clubPlayersByShirtNumber,
      };
    });

    if (!mappings) {
      await logStep(activeGw, 'load_mappings', 'error');
      return NextResponse.json(
        { error: 'Failed to load mappings', gameweek: activeGw, steps },
        { status: 500 },
      );
    }

    await logStep(activeGw, 'load_mappings', 'success', {
      fixtures: mappings.fixtures.length,
      players: mappings.playerMap.size,
      clubs: mappings.clubMap.size,
    });

    // ---- 5b. Identify newly finished fixtures (API=FT, DB!=finished) ----
    const dbFinishedIds = new Set<string>();
    {
      const { data: alreadyFinished } = await supabaseAdmin
        .from('fixtures')
        .select('id')
        .eq('gameweek', activeGw)
        .eq('status', 'finished');
      for (const f of alreadyFinished ?? []) {
        dbFinishedIds.add(f.id as string);
      }
    }

    const finishedApiFixtureIds = new Set(
      apiFixData.response
        .filter(f => FINISHED_STATUSES.has(f.fixture.status.short))
        .map(f => f.fixture.id)
    );

    const newlyFinishedFixtures = mappings.fixtures.filter(f =>
      !dbFinishedIds.has(f.id) && finishedApiFixtureIds.has(f.api_fixture_id)
    );

    if (newlyFinishedFixtures.length === 0 && !allFixturesDone) {
      // No new fixtures to process and GW not complete — skip gracefully
      await logStep(activeGw, 'no_new_fixtures', 'skipped', { alreadyFinished: dbFinishedIds.size, total: mappings.fixtures.length });
      return NextResponse.json({
        status: 'partial',
        gameweek: activeGw,
        reason: `No newly finished fixtures (${dbFinishedIds.size}/${mappings.fixtures.length} already done)`,
        duration_ms: Date.now() - runStart,
        steps,
      });
    }

    const fixturesToProcess = newlyFinishedFixtures;

    // ---- 6. Fetch lineups + player stats ----
    type PlayerStatRow = {
      fixture_id: string;
      player_id: string | null;
      club_id: string;
      minutes_played: number;
      goals: number;
      assists: number;
      clean_sheet: boolean;
      goals_conceded: number;
      yellow_card: boolean;
      red_card: boolean;
      saves: number;
      bonus: number;
      fantasy_points: number;
      rating: number | null;
      match_position: string | null;
      is_starter: boolean;
      grid_position: string | null;
      api_football_player_id: number;
      player_name_api: string;
    };

    const { result: statsResult } = await runStep('fetch_stats', async () => {
      const fixtureResults: Array<{
        fixture_id: string;
        home_score: number;
        away_score: number;
      }> = [];
      const playerStats: PlayerStatRow[] = [];
      const allSubstitutions: Array<{
        fixture_id: string;
        club_id: string;
        minute: number;
        extra_minute: number | null;
        player_in_id: string | null;
        player_out_id: string | null;
        player_in_api_id: number;
        player_out_api_id: number;
        player_in_name: string;
        player_out_name: string;
      }> = [];
      let matchedCount = 0;
      let unmatchedCount = 0;
      let nameMatchCount = 0;
      let shirtBridgeCount = 0;
      const newExternalIds: Array<{ player_id: string; external_id: number }> = [];

      for (const fixture of fixturesToProcess) {
        // Fetch lineups, player stats, and events in parallel
        const [lineupsData, apiStats, eventsData] = await Promise.all([
          apiFetch<ApiLineupsResponse>(
            `/fixtures/lineups?fixture=${fixture.api_fixture_id}`,
          ).catch(() => ({ response: [] as ApiLineupsResponse['response'] })),
          apiFetch<ApiFixturePlayerResponse>(
            `/fixtures/players?fixture=${fixture.api_fixture_id}`,
          ),
          apiFetch<ApiFixtureEventsResponse>(
            `/fixtures/events?fixture=${fixture.api_fixture_id}`,
          ).catch(() => ({ response: [] as ApiFixtureEventsResponse['response'] })),
        ]);

        const apiMatch = apiFixData.response.find(
          (f) => f.fixture.id === fixture.api_fixture_id,
        );

        // Collect fixture score
        if (
          apiMatch &&
          apiMatch.goals.home != null &&
          apiMatch.goals.away != null
        ) {
          fixtureResults.push({
            fixture_id: fixture.id,
            home_score: apiMatch.goals.home,
            away_score: apiMatch.goals.away,
          });
        }

        // Build lineup map: apiPlayerId → {isStarter, gridPosition, name}
        // Also build name-based maps for cross-referencing (handles dual-ID mismatches)
        type LineupInfo = { isStarter: boolean; gridPosition: string | null; name: string; apiId: number; shirtNumber: number };
        const lineupMap = new Map<number, LineupInfo>();
        const lineupByName = new Map<string, LineupInfo>();
        // Fuzzy: last-name only map (value = info if unique, null if ambiguous)
        const lineupByLastName = new Map<string, LineupInfo | null>();
        // Shirt-number map for cross-referencing
        const lineupByShirtNumber = new Map<number, LineupInfo>();

        // Store formations on fixture
        const formationUpdates: Record<string, string> = {};

        for (const teamLineup of lineupsData.response) {
          const clubId = mappings.clubMap.get(teamLineup.team.id);
          if (!clubId) continue;

          if (teamLineup.formation) {
            if (clubId === fixture.home_club_id) formationUpdates.home_formation = teamLineup.formation;
            if (clubId === fixture.away_club_id) formationUpdates.away_formation = teamLineup.formation;
          }

          const addToLineupMaps = (entry: { player: ApiLineupPlayer }, info: LineupInfo) => {
            lineupMap.set(entry.player.id, info);
            lineupByName.set(normalizeForMatch(entry.player.name), info);
            // Fuzzy last-name index (null = ambiguous if multiple players share last name)
            const parts = normalizeForMatch(entry.player.name).split(/\s+/);
            const last = parts[parts.length - 1];
            if (last && last.length >= 3) {
              lineupByLastName.set(last, lineupByLastName.has(last) ? null : info);
            }
            // Shirt-number index (overwrite if duplicate — rare edge case)
            if (info.shirtNumber > 0) {
              lineupByShirtNumber.set(info.shirtNumber, info);
            }
          };

          for (const entry of teamLineup.startXI ?? []) {
            addToLineupMaps(entry, {
              isStarter: true,
              gridPosition: entry.player.grid,
              name: entry.player.name,
              apiId: entry.player.id,
              shirtNumber: entry.player.number,
            });
          }
          for (const entry of teamLineup.substitutes ?? []) {
            addToLineupMaps(entry, {
              isStarter: false,
              gridPosition: null,
              name: entry.player.name,
              apiId: entry.player.id,
              shirtNumber: entry.player.number,
            });
          }
        }

        // Save formations
        if (Object.keys(formationUpdates).length > 0) {
          await supabaseAdmin
            .from('fixtures')
            .update(formationUpdates)
            .eq('id', fixture.id);
        }

        // Track which API player IDs we've already processed (from stats)
        const processedApiIds = new Set<number>();

        // Process player stats from both teams
        for (const teamData of apiStats.response) {
          const clubId = mappings.clubMap.get(teamData.team.id);
          if (!clubId) continue;

          const isHome = fixture.home_club_id === clubId;
          const goalsAgainst = apiMatch
            ? (isHome ? apiMatch.goals.away : apiMatch.goals.home) ?? 0
            : 0;
          const isCleanSheet = goalsAgainst === 0;

          for (const pd of teamData.players) {
            const apiPlayerId = pd.player.id;
            processedApiIds.add(apiPlayerId);

            const stat = pd.statistics[0];
            if (!stat) continue;

            const matchPosition = stat.games.position ? mapPosition(stat.games.position) : null;
            const minutes = stat.games.minutes ?? 0;
            // Resolution order: 1) Direct API-ID  2) Shirt-Number Bridge  3) Name fallback
            let lineupInfo = lineupMap.get(apiPlayerId);
            let bridgeMethod: 'direct' | 'shirt_bridge' | 'name' | null = lineupInfo ? 'direct' : null;

            // 2) Shirt-Number Bridge: stats-player → DB player → shirt_number → lineup
            if (!lineupInfo && clubId) {
              const clubPlayers = mappings.clubPlayersMap.get(clubId);
              if (clubPlayers) {
                const dbMatch = nameMatchPlayer(pd.player.name ?? '', clubPlayers, undefined);
                if (dbMatch) {
                  const snMap = mappings.clubPlayersByShirtNumber.get(clubId);
                  const dbPlayer = clubPlayers.find(cp => cp.id === dbMatch.id);
                  if (dbPlayer?.shirt_number != null && snMap) {
                    const byShirt = lineupByShirtNumber.get(dbPlayer.shirt_number);
                    if (byShirt) {
                      lineupInfo = byShirt;
                      bridgeMethod = 'shirt_bridge';
                      shirtBridgeCount++;
                      console.warn(`[SHIRT_BRIDGE] ${pd.player.name}(${apiPlayerId}) → ${byShirt.name}(${byShirt.apiId}) via #${dbPlayer.shirt_number}`);
                    }
                  }
                }
              }
            }

            // 3) Name fallback: exact name → fuzzy last-name → shirt-number fallback
            if (!lineupInfo && pd.player.name) {
              const normalizedName = normalizeForMatch(pd.player.name);
              lineupInfo = lineupByName.get(normalizedName) ?? undefined;
              if (!lineupInfo) {
                const parts = normalizedName.split(/\s+/);
                const last = parts[parts.length - 1];
                if (last && last.length >= 3) {
                  const lastNameMatch = lineupByLastName.get(last);
                  if (lastNameMatch === null) {
                    // Ambiguous (multiple players share last name) — try shirt number as tiebreaker
                    const dbMatch = mappings.clubPlayersMap.get(clubId)
                      ? nameMatchPlayer(pd.player.name ?? '', mappings.clubPlayersMap.get(clubId)!, undefined)
                      : null;
                    const sn = dbMatch ? mappings.clubPlayersMap.get(clubId)?.find(cp => cp.id === dbMatch.id)?.shirt_number : undefined;
                    if (sn != null && lineupByShirtNumber.has(sn)) {
                      lineupInfo = lineupByShirtNumber.get(sn) ?? undefined;
                      if (lineupInfo) console.log(`[NAME_DISAMBIG] "${pd.player.name}" ambiguous last-name "${last}" → resolved via shirt #${sn}`);
                    } else {
                      console.warn(`[NAME_AMBIG] "${pd.player.name}" matches multiple lineup entries for last-name "${last}" — cannot resolve, defaulting to bench`);
                    }
                  } else if (lastNameMatch) {
                    lineupInfo = lastNameMatch;
                  }
                }
              }
              if (lineupInfo) bridgeMethod = 'name';
            }

            // If cross-referenced (not direct), mark lineup API ID as processed to prevent ghost duplicates
            if (lineupInfo && lineupInfo.apiId !== apiPlayerId) {
              processedApiIds.add(lineupInfo.apiId);
            }
            const isStarter = lineupInfo?.isStarter ?? false;
            const gridPosition = lineupInfo?.gridPosition ?? null;

            // Skip bench players with 0 minutes who are NOT in the lineup
            if (minutes === 0 && !lineupInfo) continue;

            // Try to match player: 1) Dual-ID lookup 2) Name match (with shirt bonus) 3) null
            let ourPlayer = mappings.playerMap.get(apiPlayerId);
            const apiPlayerName = lineupInfo?.name ?? pd.player.name ?? `Player ${apiPlayerId}`;

            if (!ourPlayer) {
              // Try name matching within the club squad (pass shirt number for bonus scoring)
              const clubPlayers = mappings.clubPlayersMap.get(clubId);
              if (clubPlayers) {
                const sn = lineupInfo?.shirtNumber ?? undefined;
                ourPlayer = nameMatchPlayer(apiPlayerName, clubPlayers, sn) ?? undefined;
                if (ourPlayer) nameMatchCount++;
              }
            }

            // Auto-reconcile: if matched by name/shirt but API ID differs from known external IDs
            if (ourPlayer && !mappings.playerMap.has(apiPlayerId)) {
              newExternalIds.push({ player_id: ourPlayer.id, external_id: apiPlayerId });
            }

            if (ourPlayer) matchedCount++;
            else unmatchedCount++;

            const position = ourPlayer?.position ?? (matchPosition || 'MID');
            const goals = stat.goals.total ?? 0;
            const assists = stat.goals.assists ?? 0;
            const goalsConceded = stat.goals.conceded ?? 0;
            const yellowCard = (stat.cards.yellow ?? 0) > 0;
            const redCard = (stat.cards.red ?? 0) > 0;
            const saves = stat.goals.saves ?? 0;

            const rating = stat.games.rating ? parseFloat(stat.games.rating) : null;
            // Always use API rating × 10 (range ~55-100). Fallback: scale formula to same range.
            const fantasyPoints = rating
              ? Math.round(rating * 10)
              : scaleFormulaToRating(calcFantasyPoints(
                  position, minutes, goals, assists,
                  isCleanSheet && minutes >= 60, goalsConceded,
                  yellowCard, redCard, saves, 0,
                ));

            playerStats.push({
              fixture_id: fixture.id,
              player_id: ourPlayer?.id ?? null,
              club_id: clubId,
              minutes_played: minutes,
              goals,
              assists,
              clean_sheet: isCleanSheet && minutes >= 60,
              goals_conceded: goalsConceded,
              yellow_card: yellowCard,
              red_card: redCard,
              saves,
              bonus: 0,
              fantasy_points: fantasyPoints,
              rating,
              match_position: matchPosition,
              is_starter: isStarter,
              grid_position: gridPosition,
              api_football_player_id: apiPlayerId,
              player_name_api: apiPlayerName,
            });
          }
        }

        // Add lineup players who had NO stats entry (e.g. unused subs)
        for (const teamLineup of lineupsData.response) {
          const clubId = mappings.clubMap.get(teamLineup.team.id);
          if (!clubId) continue;

          const isHome = fixture.home_club_id === clubId;
          const goalsAgainst = apiMatch
            ? (isHome ? apiMatch.goals.away : apiMatch.goals.home) ?? 0
            : 0;
          const isCleanSheet = goalsAgainst === 0;

          const allLineupPlayers = [
            ...(teamLineup.startXI ?? []).map(e => ({ ...e, isStarter: true })),
            ...(teamLineup.substitutes ?? []).map(e => ({ ...e, isStarter: false })),
          ];

          for (const entry of allLineupPlayers) {
            if (processedApiIds.has(entry.player.id)) continue;
            processedApiIds.add(entry.player.id);

            let ourPlayer = mappings.playerMap.get(entry.player.id);
            if (!ourPlayer) {
              const clubPlayers = mappings.clubPlayersMap.get(clubId);
              if (clubPlayers) {
                ourPlayer = nameMatchPlayer(entry.player.name, clubPlayers, entry.player.number) ?? undefined;
                if (ourPlayer) nameMatchCount++;
              }
            }

            // Auto-reconcile: persist newly discovered fixture API IDs
            if (ourPlayer && !mappings.playerMap.has(entry.player.id)) {
              newExternalIds.push({ player_id: ourPlayer.id, external_id: entry.player.id });
            }

            if (ourPlayer) matchedCount++;
            else unmatchedCount++;

            playerStats.push({
              fixture_id: fixture.id,
              player_id: ourPlayer?.id ?? null,
              club_id: clubId,
              minutes_played: 0,
              goals: 0,
              assists: 0,
              clean_sheet: isCleanSheet,
              goals_conceded: 0,
              yellow_card: false,
              red_card: false,
              saves: 0,
              bonus: 0,
              fantasy_points: 0,
              rating: null,
              match_position: entry.player.pos ? mapPosition(entry.player.pos) : null,
              is_starter: entry.isStarter,
              grid_position: entry.isStarter ? entry.player.grid : null,
              api_football_player_id: entry.player.id,
              player_name_api: entry.player.name,
            });
          }
        }

        // Process substitution events
        for (const evt of eventsData.response) {
          if (evt.type !== 'subst') continue;
          if (evt.time?.elapsed == null) continue;
          if (!evt.player?.id || !evt.assist?.id) continue;
          const clubId = mappings.clubMap.get(evt.team.id);
          if (!clubId) continue;

          // In API-Football subst events: player = OUT, assist = IN
          const playerOutApiId = evt.player.id;
          const playerInApiId = evt.assist.id;

          const playerOut = mappings.playerMap.get(playerOutApiId);
          const playerIn = mappings.playerMap.get(playerInApiId);

          allSubstitutions.push({
            fixture_id: fixture.id,
            club_id: clubId,
            minute: evt.time.elapsed,
            extra_minute: evt.time.extra,
            player_in_id: playerIn?.id ?? null,
            player_out_id: playerOut?.id ?? null,
            player_in_api_id: playerInApiId,
            player_out_api_id: playerOutApiId,
            player_in_name: evt.assist.name ?? `Player ${playerInApiId}`,
            player_out_name: evt.player.name ?? `Player ${playerOutApiId}`,
          });
        }
      }

      return { fixtureResults, playerStats, allSubstitutions, matchedCount, unmatchedCount, nameMatchCount, shirtBridgeCount, newExternalIds };
    });

    if (!statsResult) {
      await logStep(activeGw, 'fetch_stats', 'error');
      return NextResponse.json(
        { error: 'Failed to fetch stats', gameweek: activeGw, steps },
        { status: 500 },
      );
    }

    // Structural dedup: remove ghost starters (dual-ID entries with 0 min, null rating)
    // Uses the football rule that a team has exactly 11 starters — catches ALL edge cases
    const dedupedStats = deduplicateGhostStarters(statsResult.playerStats);
    const ghostsRemoved = statsResult.playerStats.length - dedupedStats.length;

    await logStep(activeGw, 'fetch_stats', 'success', {
      fixtures: statsResult.fixtureResults.length,
      playerStats: dedupedStats.length,
      matched: statsResult.matchedCount,
      unmatched: statsResult.unmatchedCount,
      nameMatched: statsResult.nameMatchCount,
      shirtBridged: statsResult.shirtBridgeCount,
      ghostsRemoved,
    });

    // ---- 7. Import via RPC ----
    const { result: importResult } = await runStep('import_data', async () => {
      const { data, error } = await supabaseAdmin.rpc(
        'cron_process_gameweek',
        {
          p_gameweek: activeGw,
          p_fixture_results: statsResult.fixtureResults,
          p_player_stats: dedupedStats,
        },
      );
      if (error) throw new Error(error.message);
      return data as {
        success: boolean;
        fixtures_imported: number;
        stats_imported: number;
        scores_synced: number;
      };
    });

    await logStep(
      activeGw,
      'import_data',
      importResult ? 'success' : 'error',
      importResult
        ? {
            fixtures: importResult.fixtures_imported,
            stats: importResult.stats_imported,
            scores: importResult.scores_synced,
          }
        : undefined,
    );

    // ---- 7b. Save substitution events ----
    if (statsResult.allSubstitutions.length > 0) {
      await runStep('save_substitutions', async () => {
        const { error: subErr } = await supabaseAdmin
          .from('fixture_substitutions')
          .upsert(statsResult.allSubstitutions, {
            onConflict: 'fixture_id,club_id,minute,player_in_api_id',
          });
        if (subErr) throw new Error(subErr.message);
        return { saved: statsResult.allSubstitutions.length };
      });

      await logStep(activeGw, 'save_substitutions', 'success', {
        count: statsResult.allSubstitutions.length,
      });
    }

    // ---- 7c. Auto-reconcile: persist newly discovered fixture API IDs ----
    if (statsResult.newExternalIds.length > 0) {
      // Deduplicate by player_id (keep first occurrence)
      const seen = new Set<string>();
      const uniqueIds = statsResult.newExternalIds.filter(e => {
        if (seen.has(e.player_id)) return false;
        seen.add(e.player_id);
        return true;
      });

      const { error: reconcileErr } = await supabaseAdmin
        .from('player_external_ids')
        .upsert(
          uniqueIds.map(e => ({
            player_id: e.player_id,
            source: 'api_football_fixture',
            external_id: String(e.external_id),
          })),
          { onConflict: 'player_id,source' },
        );

      if (reconcileErr) {
        console.error(`[AUTO-RECONCILE] Error: ${reconcileErr.message}`);
      }

      await logStep(activeGw, 'auto_reconcile', reconcileErr ? 'error' : 'success', {
        persisted: uniqueIds.length,
        error: reconcileErr?.message,
      });
    }

    // ============================================
    // PHASE B: GW Finalization (only when ALL fixtures done)
    // ============================================
    let eventsScored = 0;
    let eventsClosed = 0;
    let eventsTransitioned = 0;
    const nextGw = activeGw + 1;
    let nextGwEventsCreated = 0;

    if (!allFixturesDone) {
      steps.push({ step: 'phase_b_skipped', status: 'skipped', details: { reason: `${fixtureCheck.finished}/${fixtureCheck.total} finished`, newlyProcessed: fixturesToProcess.length }, duration_ms: 0 });
      await logStep(activeGw, 'phase_b_skipped', 'skipped', {
        finished: fixtureCheck.finished,
        total: fixtureCheck.total,
        newlyProcessed: fixturesToProcess.length,
      });
    }

    if (allFixturesDone) {
    // ---- 8 & 9. Score events ----

    await runStep('score_events', async () => {
      for (const club of clubsToProcess) {
        const { data: events } = await supabaseAdmin
          .from('events')
          .select('id, status, scored_at, current_entries')
          .eq('club_id', club.id)
          .eq('gameweek', activeGw);

        for (const evt of events ?? []) {
          if (evt.scored_at) continue; // already scored

          // Transition registering/late-reg → running before scoring
          if (evt.status === 'registering' || evt.status === 'late-reg') {
            await supabaseAdmin
              .from('events')
              .update({ status: 'running' })
              .eq('id', evt.id);
            eventsTransitioned++;
          }

          if ((evt.current_entries ?? 0) === 0) {
            // No entries — close directly
            const { error } = await supabaseAdmin
              .from('events')
              .update({
                status: 'ended',
                scored_at: new Date().toISOString(),
              })
              .eq('id', evt.id);
            if (!error) eventsClosed++;
          } else {
            // Has entries — score via RPC (score_event handles NULL auth.uid())
            const { data, error } = await supabaseAdmin.rpc('score_event', {
              p_event_id: evt.id,
            });
            const result = data as {
              success: boolean;
              error?: string;
            } | null;
            if (!error && result?.success) eventsScored++;
          }
        }
      }
      return { scored: eventsScored, closed: eventsClosed, transitioned: eventsTransitioned };
    });

    await logStep(activeGw, 'score_events', eventsScored + eventsClosed > 0 ? 'success' : 'skipped', {
      scored: eventsScored,
      closed: eventsClosed,
      transitioned: eventsTransitioned,
    });

    // ---- 9a. Recalculate fan rankings for scored event participants ----
    if (eventsScored > 0) {
      await runStep('fan_rank_update', async () => {
        let ranksUpdated = 0;
        for (const club of clubsToProcess) {
          // Get all scored events for this GW
          const { data: scoredEvents } = await supabaseAdmin
            .from('events')
            .select('id')
            .eq('club_id', club.id)
            .eq('gameweek', activeGw)
            .not('scored_at', 'is', null);

          if (!scoredEvents || scoredEvents.length === 0) continue;

          // Get unique participants across all scored events
          const eventIds = scoredEvents.map(e => e.id);
          const { data: lineups } = await supabaseAdmin
            .from('lineups')
            .select('user_id')
            .in('event_id', eventIds);

          const uniqueUsers = Array.from(new Set((lineups ?? []).map(l => l.user_id)));

          // Recalculate fan rank for each participant
          for (const uid of uniqueUsers) {
            const { error } = await supabaseAdmin.rpc('calculate_fan_rank', {
              p_user_id: uid,
              p_club_id: club.id,
            });
            if (!error) ranksUpdated++;
          }
        }
        return { ranksUpdated };
      });

      // logStep is handled by runStep — omit duplicate unconditional log
    }

    // ---- 9b. Resolve predictions ----
    // NOTE: resolve_gameweek_predictions RPC requires auth.uid() != NULL (admin guard).
    // supabaseAdmin uses service_role key where auth.uid() = NULL.
    // The RPC returns {ok: false, error: "Not authenticated"} — this is a known limitation.
    // TODO: Fix RPC to allow NULL auth.uid() (service role) or remove admin guard for cron usage.
    const { result: predResult } = await runStep('resolve_predictions', async () => {
      const { data, error } = await supabaseAdmin.rpc('resolve_gameweek_predictions', {
        p_gameweek: activeGw,
      });
      if (error) throw new Error(error.message);
      const result = data as { ok: boolean; resolved?: number; correct?: number; wrong?: number; error?: string } | null;
      if (!result?.ok) throw new Error(result?.error ?? 'resolve_predictions failed');
      return { resolved: result.resolved, correct: result.correct, wrong: result.wrong };
    });

    await logStep(activeGw, 'resolve_predictions', predResult ? 'success' : 'error', predResult ?? { error: 'auth.uid() is NULL from service role — RPC requires admin auth' });

    // ---- 9c. DPC of the Week ----
    // NOTE: calculate_dpc_of_week RPC requires auth.uid() != NULL (RAISE EXCEPTION).
    // supabaseAdmin uses service_role key where auth.uid() = NULL — this always throws.
    // TODO: Fix RPC to allow NULL auth.uid() (service role) for cron usage.
    const { result: dpcResult } = await runStep('dpc_of_week', async () => {
      const { data, error } = await supabaseAdmin.rpc('calculate_dpc_of_week', {
        p_gameweek: activeGw,
      });
      if (error) throw new Error(error.message);
      const result = data as { success: boolean; player_id?: string; error?: string } | null;
      if (!result?.success) throw new Error(result?.error ?? 'dpc_of_week failed');
      return { playerId: result.player_id };
    });

    await logStep(activeGw, 'dpc_of_week', dpcResult ? 'success' : 'error', dpcResult ?? { error: 'auth.uid() is NULL from service role — RPC raises exception' });

    // ---- 10. Clone events for next GW ----
    if (nextGw <= 38) {
      await runStep('clone_events', async () => {
        for (const club of clubsToProcess) {
          // Idempotency check
          const { data: existing } = await supabaseAdmin
            .from('events')
            .select('id')
            .eq('club_id', club.id)
            .eq('gameweek', nextGw)
            .limit(1);

          if (existing && existing.length > 0) continue;

          // Load current GW events as templates
          const { data: templates } = await supabaseAdmin
            .from('events')
            .select(
              'name, type, format, entry_fee, prize_pool, max_entries, club_id, created_by, sponsor_name, sponsor_logo, event_tier, tier_bonuses, min_tier, min_subscription_tier, salary_cap',
            )
            .eq('club_id', club.id)
            .eq('gameweek', activeGw);

          if (!templates || templates.length === 0) continue;

          // Derive timing from next GW fixtures
          const { data: nextFixtures } = await supabaseAdmin
            .from('fixtures')
            .select('played_at')
            .eq('gameweek', nextGw);

          let startsAt: string;
          let locksAt: string;
          let endsAt: string;

          const fixturesWithTime = (nextFixtures ?? []).filter(
            (f: { played_at: string | null }) => f.played_at,
          );

          if (fixturesWithTime.length > 0) {
            const times = fixturesWithTime.map(
              (f: { played_at: string | null }) =>
                new Date(f.played_at!).getTime(),
            );
            const earliest = Math.min(...times);
            const latest = Math.max(...times);
            startsAt = new Date(earliest).toISOString();
            locksAt = new Date(earliest).toISOString();
            endsAt = new Date(latest + 3 * 60 * 60 * 1000).toISOString();
          } else {
            const farFuture = new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000,
            ).toISOString();
            startsAt = farFuture;
            locksAt = farFuture;
            endsAt = farFuture;
          }

          const clones = templates.map((t: Record<string, unknown>) => ({
            name: (t.name as string)
              .replace(/Spieltag \d+/i, `Spieltag ${nextGw}`)
              .replace(/GW\s*\d+/i, `GW ${nextGw}`),
            type: t.type,
            format: t.format,
            gameweek: nextGw,
            entry_fee: t.entry_fee,
            prize_pool: t.prize_pool,
            max_entries: t.max_entries,
            club_id: t.club_id,
            created_by: t.created_by,
            sponsor_name: t.sponsor_name,
            sponsor_logo: t.sponsor_logo,
            event_tier: t.event_tier,
            tier_bonuses: t.tier_bonuses,
            min_tier: t.min_tier,
            min_subscription_tier: t.min_subscription_tier,
            salary_cap: t.salary_cap,
            starts_at: startsAt,
            locks_at: locksAt,
            ends_at: endsAt,
            status: 'registering',
            current_entries: 0,
          }));

          const { error } = await supabaseAdmin.from('events').insert(clones);
          if (!error) nextGwEventsCreated += clones.length;
        }
        return { created: nextGwEventsCreated };
      });

      await logStep(activeGw, 'clone_events', nextGwEventsCreated > 0 ? 'success' : 'skipped', {
        nextGw,
        created: nextGwEventsCreated,
      });
    }

    // ---- 11. Advance active_gameweek ----
    // Direct UPDATE via supabaseAdmin (bypasses RLS, no auth.uid() needed)
    // Guard: never advance beyond GW 38
    if (nextGw <= 38) {
      await runStep('advance_gameweek', async () => {
        for (const club of clubsToProcess) {
          const { error } = await supabaseAdmin
            .from('clubs')
            .update({ active_gameweek: nextGw })
            .eq('id', club.id);
          if (error) throw new Error(`Club ${club.id}: ${error.message}`);
        }
        return { from: activeGw, to: nextGw };
      });
    } else {
      steps.push({ step: 'advance_gameweek', status: 'skipped', duration_ms: 0 });
    }

    // logStep for advance_gameweek is tracked via runStep's steps array

    // ---- 12. Recalc perf ----
    const { result: perfResult } = await runStep('recalc_perf', async () => {
      const { data, error } = await supabaseAdmin.rpc('cron_recalc_perf');
      if (error) throw new Error(error.message);
      return data as { success: boolean; perf_updated: number; agg_updated: number };
    });

    await logStep(activeGw, 'recalc_perf', perfResult ? 'success' : 'error', {
      perf_updated: perfResult?.perf_updated ?? 0,
      agg_updated: perfResult?.agg_updated ?? 0,
    });

    } // END Phase B (allFixturesDone)

    // ---- 13. Sync player activity status ----
    const { result: statusResult } = await runStep('sync_activity_status', async () => {
      // Get current max finished GW
      const { data: maxGwData } = await supabaseAdmin
        .from('fixtures')
        .select('gameweek')
        .in('status', ['FT', 'finished', 'simulated'])
        .order('gameweek', { ascending: false })
        .limit(1)
        .single();

      const currentGw = maxGwData?.gameweek ?? 0;
      if (currentGw === 0) return { marked_doubtful: 0, reactivated: 0, current_gw: 0 };

      // Players who haven't appeared in 5+ GWs but are still 'fit' -> mark as 'doubtful'
      const { data: updated, error } = await supabaseAdmin
        .from('players')
        .update({ status: 'doubtful' })
        .eq('status', 'fit')
        .lt('last_appearance_gw', currentGw - 5)
        .gt('matches', 0)  // only players who DID play at some point
        .select('id');

      if (error) throw new Error(error.message);

      // Players who DID appear in the latest GW but aren't 'fit' -> set back to 'fit'
      const { data: reactivated, error: err2 } = await supabaseAdmin
        .from('players')
        .update({ status: 'fit' })
        .neq('status', 'fit')
        .gte('last_appearance_gw', currentGw - 2)  // appeared in last 2 GWs
        .select('id');

      if (err2) throw new Error(err2.message);

      return {
        marked_doubtful: updated?.length ?? 0,
        reactivated: reactivated?.length ?? 0,
        current_gw: currentGw,
      };
    });

    await logStep(activeGw, 'sync_activity_status', statusResult ? 'success' : 'error', {
      marked_doubtful: statusResult?.marked_doubtful ?? 0,
      reactivated: statusResult?.reactivated ?? 0,
    });

    // ---- Integrity Validation ----
    if (statsResult) {
      console.warn(`[INTEGRITY] GW${activeGw} Match Distribution: direct=${statsResult.matchedCount - statsResult.nameMatchCount - statsResult.shirtBridgeCount}, shirt_bridge=${statsResult.shirtBridgeCount}, name=${statsResult.nameMatchCount}, unmatched=${statsResult.unmatchedCount}, ghosts_removed=${ghostsRemoved}`);

      if (statsResult.unmatchedCount > 0) {
        const nullPlayerStats = dedupedStats.filter(s => s.player_id === null);
        console.warn(`[INTEGRITY] ${nullPlayerStats.length} stats with null player_id (unmatched players)`);
      }
    }

    // ---- Summary ----
    const totalDuration = Date.now() - runStart;
    await logStep(
      activeGw,
      'complete',
      'success',
      {
        total_duration_ms: totalDuration,
        fixtures_imported: importResult?.fixtures_imported ?? 0,
        stats_imported: importResult?.stats_imported ?? 0,
        scores_synced: importResult?.scores_synced ?? 0,
        events_scored: eventsScored,
        events_closed: eventsClosed,
        next_gw_events_created: nextGwEventsCreated,
        next_gameweek: nextGw,
      },
      totalDuration,
    );

    return NextResponse.json({
      success: true,
      gameweek: activeGw,
      phase: allFixturesDone ? 'full' : 'partial',
      newlyProcessed: fixturesToProcess.length,
      nextGameweek: allFixturesDone ? nextGw : activeGw,
      duration_ms: totalDuration,
      fixturesImported: importResult?.fixtures_imported ?? 0,
      statsImported: importResult?.stats_imported ?? 0,
      scoresSynced: importResult?.scores_synced ?? 0,
      eventsScored,
      eventsClosed,
      nextGwEventsCreated,
      steps,
    });
  } catch (error) {
    const err = error instanceof Error ? error.message : 'Unknown error';
    await logStep(activeGw, 'fatal', 'error', { error: err }, Date.now() - runStart);
    return NextResponse.json(
      { error: err, gameweek: activeGw, steps },
      { status: 500 },
    );
  }
}
