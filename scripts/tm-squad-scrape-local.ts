/**
 * Slice 144 — TM-Squad-Page-Scraper (LOCAL)
 *
 * Für jeden Club mit `club_external_ids(source='transfermarkt')`:
 *  1. Fetch https://www.transfermarkt.de/<slug>/startseite/verein/<tm-id>
 *  2. parseSquadTable → [{ tmPlayerId, tmSlug, displayName, shirtNumber,
 *     position, nationality, marketValueEur }]
 *  3. Match existing players via player_external_ids(source='transfermarkt',
 *     external_id=tmPlayerId)
 *  4. For matched players:
 *     - UPDATE shirt_number + market_value_eur (wenn neu) + last_squad_check
 *     - Cross-club detection: player.club_id !== currentClub → log + skip
 *       unless --allow-transfers
 *  5. For unmatched (TM-player not in DB): log as "unknown_player" — Insert-
 *     path liegt bei sync-players-daily (API-Football), nicht hier.
 *
 * Scope Decision Slice 144 (Anil 2026-04-22): Leihspieler werden als
 * Squad-Member des Leih-Clubs gezählt (sie spielen dort diese Saison).
 * Parser-seitig werden alle `<tr class="odd|even">` mit rn_nummer genommen —
 * TM rendert Leih-Sektion in gleicher Tabellenstruktur.
 *
 * Usage:
 *   npx tsx scripts/tm-squad-scrape-local.ts --league="Süper Lig"
 *   npx tsx scripts/tm-squad-scrape-local.ts --dry-run
 *   npx tsx scripts/tm-squad-scrape-local.ts --allow-transfers --rate=2000
 */

import { chromium, type Browser, type Page } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { parseSquadTable, type SquadEntry } from '../src/lib/scrapers/transfermarkt-squad';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...rest] = a.replace(/^--/, '').split('=');
    return [k, rest.length > 0 ? rest.join('=') : 'true'];
  }),
) as Record<string, string>;

const league = args.league;
const rateMs = Math.max(1000, parseInt(args.rate ?? '2000', 10));
const headless = args.headless !== 'false';
const dryRun = args['dry-run'] === 'true';
const allowTransfers = args['allow-transfers'] === 'true';

type ClubCandidate = {
  clubId: string;
  clubName: string;
  clubShort: string | null;
  leagueShort: string;
  tmSlug: string;
  tmClubId: string;
};

type ExistingPlayer = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  shirt_number: number | null;
  market_value_eur: number | null;
  club_id: string | null;
  mv_source: string | null;
};

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadClubCandidates(filterLeague: string | undefined): Promise<ClubCandidate[]> {
  let q = supabase
    .from('club_external_ids')
    .select('external_id, clubs!club_id(id, name, short, slug, leagues!league_id(short, name))')
    .eq('source', 'transfermarkt');
  const { data, error } = await q;
  if (error) throw new Error(`club_external_ids fetch: ${error.message}`);

  const candidates: ClubCandidate[] = [];
  for (const r of (data ?? []) as unknown as Array<{
    external_id: string;
    clubs: {
      id: string;
      name: string;
      short: string | null;
      slug: string;
      leagues: { short: string; name: string };
    };
  }>) {
    const c = r.clubs;
    if (!c) continue;
    if (filterLeague && c.leagues.name !== filterLeague) continue;
    candidates.push({
      clubId: c.id,
      clubName: c.name,
      clubShort: c.short,
      leagueShort: c.leagues.short,
      tmSlug: c.slug,
      tmClubId: r.external_id,
    });
  }
  return candidates.sort((a, b) =>
    a.leagueShort.localeCompare(b.leagueShort) || a.clubName.localeCompare(b.clubName),
  );
}

async function loadTmMappedPlayers(): Promise<Map<number, ExistingPlayer>> {
  const byTmId = new Map<number, ExistingPlayer>();
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('player_external_ids')
      .select(
        'external_id, players!inner(id, first_name, last_name, shirt_number, market_value_eur, club_id, mv_source)',
      )
      .eq('source', 'transfermarkt')
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(`player_external_ids fetch: ${error.message}`);
    const rows = data ?? [];
    for (const r of rows as unknown as Array<{ external_id: string; players: ExistingPlayer }>) {
      const tmId = parseInt(r.external_id, 10);
      if (!Number.isFinite(tmId) || !r.players) continue;
      byTmId.set(tmId, r.players);
    }
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  return byTmId;
}

async function fetchSquadHtml(page: Page, tmSlug: string, tmClubId: string): Promise<string> {
  const url = `https://www.transfermarkt.de/${tmSlug}/startseite/verein/${tmClubId}`;
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  if (!resp) throw new Error('no response');
  const status = resp.status();
  if (status === 429) throw new Error('rate-limited-429');
  if (!resp.ok()) throw new Error(`HTTP ${status}`);
  return page.content();
}

type Stats = {
  clubs_processed: number;
  clubs_empty_squad: number;
  clubs_errored: number;
  players_matched: number;
  players_updated_shirt: number;
  players_updated_mv: number;
  players_transfer_detected: number;
  players_transfer_applied: number;
  players_unknown: number;
};

async function processClub(
  page: Page,
  club: ClubCandidate,
  byTmId: Map<number, ExistingPlayer>,
  stats: Stats,
  now: string,
): Promise<void> {
  const prefix = `[${club.leagueShort} ${club.clubShort ?? club.clubName}]`;
  let html: string;
  try {
    html = await fetchSquadHtml(page, club.tmSlug, club.tmClubId);
  } catch (err) {
    stats.clubs_errored++;
    console.log(`${prefix} ! fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    if (err instanceof Error && err.message === 'rate-limited-429') throw err;
    return;
  }

  const entries = parseSquadTable(html);
  if (entries.length === 0) {
    stats.clubs_empty_squad++;
    console.log(`${prefix} ∅ empty squad (possible CF-challenge or malformed)`);
    return;
  }
  stats.clubs_processed++;
  console.log(`${prefix} ${entries.length} squad entries`);

  for (const e of entries) {
    const existing = byTmId.get(e.tmPlayerId);
    if (!existing) {
      stats.players_unknown++;
      console.log(`  ? unknown tm-player ${e.tmPlayerId} "${e.displayName}" — insert via sync-players-daily`);
      continue;
    }

    stats.players_matched++;

    // Cross-club detection
    if (existing.club_id !== club.clubId) {
      stats.players_transfer_detected++;
      if (!allowTransfers) {
        // Slice 144c: TM kennt den Player noch (nur in anderem Club) —
        // last_squad_check muss gesetzt werden, sonst erscheint der Spieler
        // spaeter als "nie gescraped" fuer Retired-Detection. Andere Fields
        // (shirt/mv/club_id) NICHT ueberschreiben — das waere Transfer-Apply
        // durch die Hintertuer.
        if (dryRun) {
          console.log(
            `  ⟷ transfer-detected ${existing.last_name} ${e.tmPlayerId}: DB=${existing.club_id} → TM=${club.clubId} (dry: would set last_squad_check only)`,
          );
          continue;
        }
        const { error: transferSkipError } = await supabase
          .from('players')
          .update({ last_squad_check: now })
          .eq('id', existing.id);
        if (transferSkipError) {
          console.log(`  ! UPDATE ${existing.last_name} (last_squad_check): ${transferSkipError.message}`);
        } else {
          console.log(
            `  ⟷ transfer-detected ${existing.last_name} ${e.tmPlayerId}: DB=${existing.club_id} → TM=${club.clubId} (metadata skipped; last_squad_check set; use --allow-transfers fuer Full-Apply)`,
          );
        }
        continue;
      }
      stats.players_transfer_applied++;
      console.log(
        `  ⟷ transfer-applied ${existing.last_name} ${e.tmPlayerId}: → ${club.clubShort ?? club.clubName}`,
      );
    }

    // Build update payload
    const updates: Record<string, unknown> = { last_squad_check: now };
    if (e.shirtNumber !== null && existing.shirt_number !== e.shirtNumber) {
      updates.shirt_number = e.shirtNumber;
      stats.players_updated_shirt++;
    }
    if (
      e.marketValueEur !== null &&
      e.marketValueEur > 0 &&
      existing.market_value_eur !== e.marketValueEur &&
      // Respect Slice 081 mv_source policy: don't overwrite `_stale` with
      // squad-table value (might be legacy snapshot). Only overwrite when
      // existing mv_source is unknown / api / squad-verified.
      existing.mv_source !== 'transfermarkt_stale'
    ) {
      updates.market_value_eur = e.marketValueEur;
      stats.players_updated_mv++;
    }
    if (allowTransfers && existing.club_id !== club.clubId) {
      updates.club_id = club.clubId;
    }

    if (dryRun) {
      const changed = Object.keys(updates).filter((k) => k !== 'last_squad_check');
      if (changed.length > 0) {
        console.log(
          `  (dry) ${existing.last_name} #${existing.id.slice(0, 8)} would update ${changed.join(', ')}`,
        );
      }
      continue;
    }

    const { error } = await supabase
      .from('players')
      .update(updates)
      .eq('id', existing.id);
    if (error) {
      console.log(`  ! UPDATE ${existing.last_name}: ${error.message}`);
    }
  }
}

async function main(): Promise<void> {
  console.log('\n=== TM Squad Scraper (Slice 144) ===');
  console.log(
    `league=${league ?? '(all)'} rate=${rateMs}ms dry-run=${dryRun} allow-transfers=${allowTransfers}\n`,
  );

  const candidates = await loadClubCandidates(league);
  console.log(`Loaded ${candidates.length} clubs with TM-mapping.\n`);
  if (candidates.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  console.log('Loading existing transfermarkt-mapped players...');
  const byTmId = await loadTmMappedPlayers();
  console.log(`Loaded ${byTmId.size} TM-mapped players from DB.\n`);

  const browser: Browser = await chromium.launch({ headless });
  const ctx = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'de-DE',
    extraHTTPHeaders: { 'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8' },
  });
  const page = await ctx.newPage();

  const stats: Stats = {
    clubs_processed: 0,
    clubs_empty_squad: 0,
    clubs_errored: 0,
    players_matched: 0,
    players_updated_shirt: 0,
    players_updated_mv: 0,
    players_transfer_detected: 0,
    players_transfer_applied: 0,
    players_unknown: 0,
  };
  const runStart = Date.now();
  const now = new Date().toISOString();

  try {
    for (let i = 0; i < candidates.length; i++) {
      if (i > 0) await sleep(rateMs);
      await processClub(page, candidates[i], byTmId, stats, now);
    }
  } catch (err) {
    console.error('FATAL during loop:', err instanceof Error ? err.message : String(err));
  } finally {
    await browser.close();
  }

  const durationMs = Date.now() - runStart;
  console.log('\n=== Result ===');
  console.log(`duration:                   ${(durationMs / 1000).toFixed(1)}s`);
  console.log(`clubs_processed:            ${stats.clubs_processed} / ${candidates.length}`);
  console.log(`clubs_empty_squad:          ${stats.clubs_empty_squad}`);
  console.log(`clubs_errored:              ${stats.clubs_errored}`);
  console.log(`players_matched:            ${stats.players_matched}`);
  console.log(`players_updated_shirt:      ${stats.players_updated_shirt}${dryRun ? ' (dry)' : ''}`);
  console.log(`players_updated_mv:         ${stats.players_updated_mv}${dryRun ? ' (dry)' : ''}`);
  console.log(`players_transfer_detected:  ${stats.players_transfer_detected}`);
  console.log(`players_transfer_applied:   ${stats.players_transfer_applied}${dryRun || !allowTransfers ? ' (dry/off)' : ''}`);
  console.log(`players_unknown:            ${stats.players_unknown}`);

  // Audit row
  if (!dryRun) {
    try {
      await supabase.from('cron_sync_log').insert({
        gameweek: 0,
        step: 'tm-squad-scrape-local',
        status: stats.clubs_errored === 0 ? 'success' : 'partial',
        details: stats as unknown as Record<string, unknown>,
        duration_ms: durationMs,
      });
    } catch (err) {
      console.error('cron_sync_log insert failed:', err);
    }
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
