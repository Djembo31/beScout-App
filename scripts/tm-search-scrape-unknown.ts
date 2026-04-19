/**
 * Transfermarkt Search + Scrape fuer unknown players.
 *
 * Fuer Spieler mit `mv_source='unknown'` + aktiv (matches > 0 OR last_appearance_gw > 0):
 * 1. Falls kein TM-Mapping: search auf transfermarkt.de via Playwright
 * 2. Falls best match score >= 50: insert player_external_ids mapping
 * 3. Scrape profile → UPDATE mv + contract + mv_source='transfermarkt_verified'
 *
 * Local-only (Cloudflare blockt Vercel-IPs).
 *
 * Usage:
 *   npx tsx scripts/tm-search-scrape-unknown.ts --league="Bundesliga" --limit=200
 *   npx tsx scripts/tm-search-scrape-unknown.ts --dry-run=true --limit=10
 */

import { chromium, type Browser, type Page } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import {
  parseMarketValue,
  parseContractEnd,
  parseShirtNumber,
} from '../src/lib/scrapers/transfermarkt-profile';
import { parseSearchResults, scoreMatch } from '../src/lib/scrapers/transfermarkt-search';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...rest] = a.replace(/^--/, '').split('=');
    return [k, rest.join('=')];
  }),
) as Record<string, string>;

const league = args.league;
const limit = Math.max(1, parseInt(args.limit ?? '100', 10));
const rateMs = Math.max(500, parseInt(args.rate ?? '3000', 10));
const headless = args.headless !== 'false';
const dryRun = args['dry-run'] === 'true';
// Mit Trikot-Check (Shirt-Mismatch = SKIP) können wir den Threshold auf 30 senken
// — false-positives werden durch shirt-compare abgefangen.
const scoreThreshold = parseInt(args.threshold ?? '30', 10);
// --mv-source filter (default 'unknown', alternative 'transfermarkt_stale')
const mvSource = args['mv-source'] ?? 'unknown';

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type UnknownPlayer = {
  player_id: string;
  first_name: string;
  last_name: string;
  club_id: string;
  club_name: string;
  club_short: string | null;
  current_mv: number;
  current_contract: string | null;
  shirt_number: number | null;
};

async function loadUnknownActivePlayers(filterLeague: string | undefined, n: number): Promise<UnknownPlayer[]> {
  let leagueId: string | null = null;
  if (filterLeague) {
    const { data, error } = await supabase
      .from('leagues')
      .select('id')
      .eq('name', filterLeague)
      .maybeSingle();
    if (error || !data) throw new Error(`League not found: ${filterLeague}`);
    leagueId = data.id;
  }

  let clubFilter: string[] | null = null;
  if (leagueId) {
    const { data: clubs } = await supabase
      .from('clubs')
      .select('id')
      .eq('league_id', leagueId);
    clubFilter = (clubs ?? []).map((c) => c.id as string);
    if (clubFilter.length === 0) return [];
  }

  // Pull unknown active players. Paginate.
  const raw: Array<{
    id: string;
    first_name: string;
    last_name: string;
    club_id: string;
    market_value_eur: number;
    contract_end: string | null;
    shirt_number: number | null;
    clubs: { name: string; short: string | null };
  }> = [];
  const PAGE = 500;
  let offset = 0;

  while (raw.length < n * 3) {
    let q = supabase
      .from('players')
      .select('id, first_name, last_name, club_id, market_value_eur, contract_end, shirt_number, matches, last_appearance_gw, clubs!inner(name, short)')
      .eq('mv_source', mvSource)
      .or('matches.gt.0,last_appearance_gw.gt.0');

    if (clubFilter) q = q.in('club_id', clubFilter);
    q = q.range(offset, offset + PAGE - 1);

    const { data, error } = await q;
    if (error) throw new Error(`players query: ${error.message}`);
    if (!data || data.length === 0) break;

    raw.push(...(data as unknown as typeof raw));

    if (data.length < PAGE) break;
    offset += PAGE;
  }

  // Check for existing TM-mapping — skip those. Chunk .in()
  const allIds = raw.map(r => r.id);
  const mapped = new Set<string>();
  const CHUNK = 100;
  for (let i = 0; i < allIds.length; i += CHUNK) {
    const batch = allIds.slice(i, i + CHUNK);
    const { data: m } = await supabase
      .from('player_external_ids')
      .select('player_id')
      .eq('source', 'transfermarkt')
      .in('player_id', batch);
    for (const row of m ?? []) mapped.add(row.player_id as string);
  }

  const result: UnknownPlayer[] = [];
  for (const p of raw) {
    if (result.length >= n) break;
    if (mapped.has(p.id)) continue; // skip if mapping exists
    result.push({
      player_id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      club_id: p.club_id,
      club_name: p.clubs.name,
      club_short: p.clubs.short,
      current_mv: p.market_value_eur,
      current_contract: p.contract_end,
      shirt_number: p.shirt_number,
    });
  }
  return result;
}

async function searchPlayer(page: Page, query: string): Promise<string> {
  const url = `https://www.transfermarkt.de/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(query)}`;
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (!resp || !resp.ok()) throw new Error(`search HTTP ${resp?.status() ?? '??'}`);
  return await page.content();
}

async function scrapeProfile(page: Page, tmId: string): Promise<{ mv: number | null; contract: string | null; shirt: number | null }> {
  const url = `https://www.transfermarkt.de/spieler/profil/spieler/${tmId}`;
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (!resp || !resp.ok()) throw new Error(`profile HTTP ${resp?.status() ?? '??'}`);
  const html = await page.content();
  return {
    mv: parseMarketValue(html),
    contract: parseContractEnd(html),
    shirt: parseShirtNumber(html),
  };
}

async function main() {
  console.log(`\n=== TM Search+Scrape Unknown (Phase 3) ===`);
  console.log(`league=${league ?? 'ALL'} limit=${limit} rate=${rateMs}ms dry=${dryRun} threshold=${scoreThreshold}\n`);

  const candidates = await loadUnknownActivePlayers(league, limit);
  console.log(`Loaded ${candidates.length} unknown active players (no TM mapping).\n`);

  if (candidates.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  if (dryRun) {
    console.log('DRY-RUN — first 10 candidates:');
    for (const p of candidates.slice(0, 10)) {
      console.log(`  ${p.first_name} ${p.last_name} [${p.club_name}]`);
    }
    return;
  }

  const browser: Browser = await chromium.launch({ headless });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    locale: 'de-DE',
  });
  const page = await ctx.newPage();

  let mapped = 0;
  let verified = 0;
  let noMatch = 0;
  let errored = 0;
  const startTs = Date.now();

  for (let i = 0; i < candidates.length; i++) {
    const p = candidates[i];
    const label = `[${i + 1}/${candidates.length}]`;
    try {
      // 1. Search — primary: full name. Fallback: last_name only (for initials or sparse first_name).
      const fullQuery = `${p.first_name} ${p.last_name}`.trim();
      let results = parseSearchResults(await searchPlayer(page, fullQuery));
      let queryUsed = fullQuery;

      if (results.length === 0 && p.last_name && p.last_name.length >= 3) {
        await sleep(600);
        results = parseSearchResults(await searchPlayer(page, p.last_name));
        queryUsed = p.last_name + ' (last-name fallback)';
      }

      if (results.length === 0) {
        console.log(`${label} ∅ ${fullQuery} — no search results`);
        noMatch++;
        await sleep(rateMs);
        continue;
      }

      // 2. Score + pick best
      let best: typeof results[0] | null = null;
      let bestScore = 0;
      for (const r of results) {
        const s = scoreMatch(r, { first_name: p.first_name, last_name: p.last_name }, { name: p.club_name, short: p.club_short });
        if (s > bestScore) {
          bestScore = s;
          best = r;
        }
      }

      if (!best || bestScore < scoreThreshold) {
        console.log(`${label} ∅ ${queryUsed} — best score ${bestScore} < ${scoreThreshold}`);
        noMatch++;
        await sleep(rateMs);
        continue;
      }

      // 3. Scrape profile BEFORE mapping — to verify shirt-number match.
      await sleep(rateMs);
      const { mv, contract, shirt } = await scrapeProfile(page, best.transfermarkt_id);

      // 4. Trikot-Check: Wenn DB-Shirt + TM-Shirt beide existieren, MUESSEN sie matchen.
      //    Mismatch → skip (false-positive schutz). Log fuer manual review.
      const dbShirt = p.shirt_number;
      if (dbShirt !== null && dbShirt > 0 && shirt !== null && shirt !== dbShirt) {
        console.log(`${label} ⚠ ${fullQuery} [${p.club_name}] SHIRT-MISMATCH db=${dbShirt} tm=${shirt} tmId=${best.transfermarkt_id} score=${bestScore} — SKIP`);
        noMatch++;
        await sleep(rateMs);
        continue;
      }

      // 5. Insert mapping (shirt match oder beide null)
      await supabase.from('player_external_ids').upsert({
        player_id: p.player_id,
        source: 'transfermarkt',
        external_id: best.transfermarkt_id,
      }, { onConflict: 'player_id,source' });
      mapped++;

      // 6. UPDATE player
      const updatePayload: { mv_source: string; updated_at: string; market_value_eur?: number; contract_end?: string | null } = {
        mv_source: 'transfermarkt_verified',
        updated_at: new Date().toISOString(),
      };
      if (mv !== null) updatePayload.market_value_eur = mv;
      if (contract !== null) updatePayload.contract_end = contract;

      await supabase.from('players').update(updatePayload).eq('id', p.player_id);
      verified++;

      const mvStr = mv !== null ? `€${(mv / 1_000_000).toFixed(1)}M` : '?';
      const contractStr = contract ? contract : '?';
      const shirtStr = shirt !== null && dbShirt !== null ? `shirt✓${shirt}` : shirt !== null ? `shirt?${shirt}` : '';
      console.log(`${label} ✓ ${fullQuery} [${p.club_name}] score=${bestScore} ${shirtStr} tmId=${best.transfermarkt_id} mv=${mvStr} contract=${contractStr}`);

      await sleep(rateMs);
    } catch (err) {
      errored++;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`${label} ! ${p.first_name} ${p.last_name} — ${msg}`);
    }
  }

  const elapsedS = ((Date.now() - startTs) / 1000).toFixed(0);
  await browser.close();

  console.log(`\n${league ?? 'ALL'} Summary: ${verified} verified, ${mapped} mapped (total), ${noMatch} no-match, ${errored} errored. ${elapsedS}s`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
