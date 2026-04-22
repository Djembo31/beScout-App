/**
 * Slice 141 — TM-Club-ID-Discovery-Script (LOCAL only)
 *
 * Für jeden Club ohne `club_external_ids(source='transfermarkt')`:
 * - Nimm bis zu 3 Player mit `player_external_ids.source='transfermarkt'`
 * - Fetch Spieler-Profil-HTML via Playwright (lokaler IP umgeht Cloudflare-Vercel-Block)
 * - Parse `current_club_tm_id` aus dem Data-Header-Block
 * - Fuzzy-Match parsedClubName vs clubs.name (normalized, ≥ 1 Token-Overlap)
 * - UPSERT `club_external_ids { club_id, source:'transfermarkt', external_id: tmClubId }`
 *
 * Pre-Condition für B3 (TM-Squad-Page-Scraper).
 *
 * Usage:
 *   npx tsx scripts/tm-club-id-discovery.ts                     # alle Clubs, 500ms Rate
 *   npx tsx scripts/tm-club-id-discovery.ts --league="Bundesliga"
 *   npx tsx scripts/tm-club-id-discovery.ts --dry-run           # kein UPSERT
 *   npx tsx scripts/tm-club-id-discovery.ts --rate=1000         # langsamer
 *   npx tsx scripts/tm-club-id-discovery.ts --only-unmapped=false  # auch schon-gemappte re-check
 *   npx tsx scripts/tm-club-id-discovery.ts --headless=false    # sichtbarer Browser
 */

import { chromium, type Browser, type Page } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { parseCurrentClubTmId } from '../src/lib/scrapers/transfermarkt-profile';
import { normalizeName } from '../src/lib/scrapers/transfermarkt-search';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
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
const rateMs = Math.max(300, parseInt(args.rate ?? '500', 10));
const headless = args.headless !== 'false';
const dryRun = args['dry-run'] === 'true';
const onlyUnmapped = args['only-unmapped'] !== 'false';
const playersPerClub = Math.max(1, Math.min(5, parseInt(args['players-per-club'] ?? '3', 10)));

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ClubCandidate = {
  clubId: string;
  clubName: string;
  clubShort: string | null;
  leagueShort: string;
  playerTmIds: Array<{ playerId: string; tmId: string; lastName: string }>;
};

async function loadClubCandidates(filterLeague: string | undefined): Promise<ClubCandidate[]> {
  // 1. Load all clubs (optional league filter) + already-mapped set
  let clubQuery = supabase
    .from('clubs')
    .select('id, name, short, league_id, leagues!inner(short, name)');
  if (filterLeague) {
    clubQuery = clubQuery.eq('leagues.name', filterLeague);
  }
  const { data: clubs, error: clubErr } = await clubQuery;
  if (clubErr) throw new Error(`clubs fetch: ${clubErr.message}`);

  const { data: mapped, error: mappedErr } = await supabase
    .from('club_external_ids')
    .select('club_id')
    .eq('source', 'transfermarkt');
  if (mappedErr) throw new Error(`club_external_ids fetch: ${mappedErr.message}`);

  const mappedClubs = new Set((mapped ?? []).map((r) => r.club_id as string));

  const candidates: Array<{
    clubId: string;
    clubName: string;
    clubShort: string | null;
    leagueShort: string;
  }> = [];
  for (const c of (clubs ?? []) as unknown as Array<{
    id: string;
    name: string;
    short: string | null;
    league_id: string;
    leagues: { short: string; name: string };
  }>) {
    if (onlyUnmapped && mappedClubs.has(c.id)) continue;
    candidates.push({
      clubId: c.id,
      clubName: c.name,
      clubShort: c.short,
      leagueShort: c.leagues.short,
    });
  }

  if (candidates.length === 0) return [];

  // 2. For each club, load up to playersPerClub TM-mapped players
  const result: ClubCandidate[] = [];
  const clubIds = candidates.map((c) => c.clubId);
  const CHUNK = 50;
  const playersByClub = new Map<string, Array<{ playerId: string; tmId: string; lastName: string }>>();

  for (let i = 0; i < clubIds.length; i += CHUNK) {
    const slice = clubIds.slice(i, i + CHUNK);
    // player_external_ids.source='transfermarkt' joined with players filtered to these clubs.
    // Priorize Players with shirt_number NOT NULL (aktive Kader-Spieler) to reduce retired/loan edge cases.
    const { data: rows, error } = await supabase
      .from('player_external_ids')
      .select('player_id, external_id, players!inner(last_name, club_id, shirt_number)')
      .eq('source', 'transfermarkt')
      .in('players.club_id', slice)
      .order('player_id')
      .limit(10_000);
    if (error) throw new Error(`player_external_ids fetch: ${error.message}`);

    for (const r of (rows ?? []) as unknown as Array<{
      player_id: string;
      external_id: string;
      players: { last_name: string; club_id: string; shirt_number: number | null };
    }>) {
      const p = r.players;
      if (!p) continue;
      const arr = playersByClub.get(p.club_id) ?? [];
      if (arr.length >= playersPerClub) continue;
      // Prefer active shirt_number — insert at front; else push
      const entry = { playerId: r.player_id, tmId: r.external_id, lastName: p.last_name };
      if (p.shirt_number != null && p.shirt_number > 0) {
        arr.unshift(entry);
      } else {
        arr.push(entry);
      }
      playersByClub.set(p.club_id, arr.slice(0, playersPerClub));
    }
  }

  for (const c of candidates) {
    const players = playersByClub.get(c.clubId) ?? [];
    result.push({ ...c, playerTmIds: players });
  }

  return result;
}

async function fetchProfileHtml(page: Page, tmPlayerId: string): Promise<string> {
  const url = `https://www.transfermarkt.de/spieler/profil/spieler/${tmPlayerId}`;
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  if (!resp) throw new Error('no response');
  const status = resp.status();
  if (status === 429) throw new Error('rate-limited-429');
  if (!resp.ok()) throw new Error(`HTTP ${status}`);
  return page.content();
}

function fuzzyMatch(parsedName: string, clubName: string, clubShort: string | null): boolean {
  const np = normalizeName(parsedName);
  const nc = normalizeName(clubName);
  const ns = clubShort ? normalizeName(clubShort) : '';
  if (!np || !nc) return false;

  // Token-basierte Überlappung: min 1 Token ≥ 3 Zeichen muss in beiden Strings sein.
  // normalizeName strippt alles außer a-z → wir splitten das Original-Word-weise VOR Normalize.
  const tokens = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/ı/g, 'i')
      .split(/[^a-z]+/)
      .filter((t) => t.length >= 3);

  const parsedTokens = new Set(tokens(parsedName));
  const clubTokens = new Set([...tokens(clubName), ...tokens(clubShort ?? '')]);

  for (const t of parsedTokens) {
    if (clubTokens.has(t)) return true;
  }

  // Last-resort: substring-Check auf normalizeName (ohne Wort-Grenzen)
  if (np.includes(nc) || nc.includes(np)) return true;
  if (ns && (np.includes(ns) || ns.includes(np))) return true;

  return false;
}

async function main(): Promise<void> {
  console.log('\n=== TM Club-ID Discovery (Slice 141) ===');
  console.log(
    `league=${league ?? '(all)'} rate=${rateMs}ms dry-run=${dryRun} only-unmapped=${onlyUnmapped} players-per-club=${playersPerClub}\n`,
  );

  const candidates = await loadClubCandidates(league);
  console.log(`Loaded ${candidates.length} clubs to discover TM-IDs for.\n`);

  if (candidates.length === 0) {
    console.log('Nothing to do (all clubs already mapped, or league filter too narrow).');
    return;
  }

  // Pre-flight: clubs with zero TM-mapped players are immediately lost cases
  const noPlayerCount = candidates.filter((c) => c.playerTmIds.length === 0).length;
  if (noPlayerCount > 0) {
    console.log(
      `⚠️  ${noPlayerCount} clubs have no player_external_ids(source='transfermarkt') — skipped.`,
    );
  }

  const browser: Browser = await chromium.launch({ headless });
  const ctx = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'de-DE',
    extraHTTPHeaders: { 'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8' },
  });
  const page = await ctx.newPage();

  let mapped = 0;
  let skipMismatch = 0;
  let skipExhausted = 0;
  let errored = 0;
  const errors: string[] = [];
  const runStart = Date.now();

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const prefix = `[${i + 1}/${candidates.length}]`;
    const label = `${c.leagueShort} ${c.clubShort ?? c.clubName}`;

    if (c.playerTmIds.length === 0) {
      skipExhausted++;
      console.log(`${prefix} ∅ ${label} — no TM-mapped players`);
      continue;
    }

    let success = false;
    for (let pi = 0; pi < c.playerTmIds.length && !success; pi++) {
      const p = c.playerTmIds[pi];
      try {
        if (mapped + skipMismatch + errored > 0) await sleep(rateMs);
        const html = await fetchProfileHtml(page, p.tmId);
        const parsed = parseCurrentClubTmId(html);

        if (!parsed) {
          console.log(`${prefix}   ${label} · try ${p.lastName} (tm=${p.tmId}) → no club in header`);
          continue;
        }

        const matched = fuzzyMatch(parsed.clubName, c.clubName, c.clubShort);
        if (!matched) {
          console.log(
            `${prefix}   ${label} · try ${p.lastName} → parsed="${parsed.clubName}" NOT matching "${c.clubName}"`,
          );
          continue;
        }

        // Match! UPSERT (unless dry-run)
        if (dryRun) {
          console.log(
            `${prefix} ✓ ${label} (DRY) — via ${p.lastName}: tmClubId=${parsed.tmClubId} slug="${parsed.slug}" name="${parsed.clubName}"`,
          );
        } else {
          const { error: upErr } = await supabase
            .from('club_external_ids')
            .upsert(
              {
                club_id: c.clubId,
                source: 'transfermarkt',
                external_id: String(parsed.tmClubId),
              },
              { onConflict: 'club_id,source' },
            );
          if (upErr) {
            errored++;
            errors.push(`${label} (UPSERT): ${upErr.message}`);
            console.log(`${prefix} ! ${label} — UPSERT ${upErr.message}`);
            break;
          }
          console.log(
            `${prefix} ✓ ${label} — via ${p.lastName}: tmClubId=${parsed.tmClubId} slug="${parsed.slug}" name="${parsed.clubName}"`,
          );
        }
        mapped++;
        success = true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === 'rate-limited-429') {
          errored++;
          errors.push(`${label}: 429 — aborting to avoid ban`);
          console.log(`${prefix} ! ${label} — 429 rate-limit, aborting run`);
          await browser.close();
          printSummary();
          process.exit(1);
        }
        console.log(`${prefix}   ${label} · try ${p.lastName} (tm=${p.tmId}) → ${msg}`);
      }
    }

    if (!success) {
      if (c.playerTmIds.some(() => true)) {
        skipMismatch++;
      } else {
        skipExhausted++;
      }
    }
  }

  await browser.close();

  function printSummary(): void {
    const durationMs = Date.now() - runStart;
    console.log(`\n=== Result ===`);
    console.log(`duration:        ${(durationMs / 1000).toFixed(1)}s`);
    console.log(`candidates:      ${candidates.length}`);
    console.log(`mapped:          ${mapped}${dryRun ? ' (dry-run)' : ''}`);
    console.log(`skip_mismatch:   ${skipMismatch}  (parsed club did not match DB club name)`);
    console.log(`skip_exhausted:  ${skipExhausted}  (no TM-mapped players or all failed)`);
    console.log(`errored:         ${errored}`);
    if (errors.length > 0) {
      console.log(`\nError sample:`);
      for (const e of errors.slice(0, 5)) console.log(`  ${e}`);
    }
  }

  printSummary();
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
