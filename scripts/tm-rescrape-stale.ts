/**
 * Transfermarkt Re-Scraper fuer `mv_source='transfermarkt_stale'` Spieler (Slice 082).
 *
 * Zielt gezielt auf Stale-Flags aus Slice 081 (a/b/c) — re-scrapet nur Spieler
 * die als verdaechtig markiert sind. Bei Success wird mv_source auf
 * 'transfermarkt_verified' gesetzt. Bei Failure bleibt stale (Retry naechstes Run).
 *
 * Laeuft lokal mit Playwright um Cloudflare-Block auf Vercel-IPs zu umgehen.
 *
 * Usage:
 *   npx tsx scripts/tm-rescrape-stale.ts --league="Bundesliga" --limit=100
 *   npx tsx scripts/tm-rescrape-stale.ts --league="2. Bundesliga" --limit=300
 *   npx tsx scripts/tm-rescrape-stale.ts --dry-run=true --limit=10
 *
 * CLI Flags:
 *   --league=<name>   Liga-Filter (z.B. "Bundesliga"). Wenn leer: alle Ligen.
 *   --limit=<n>       Maximale Spieler pro Lauf (default 100).
 *   --rate=<ms>       Rate-Limit zwischen Requests (default 2500ms).
 *   --dry-run=true    Zeigt Plan, schreibt nicht.
 *   --headless=false  Browser sichtbar (fuer Debug).
 */

import { chromium, type Browser, type Page } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import {
  parseMarketValue,
  parseContractEnd,
} from '../src/lib/scrapers/transfermarkt-profile';

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

if (args.help !== undefined) {
  console.log(`
Usage: npx tsx scripts/tm-rescrape-stale.ts [options]

Options:
  --league=<name>    Liga-Filter (z.B. "Bundesliga"). Leer = alle.
  --limit=<n>        Max Spieler pro Lauf (default 100)
  --rate=<ms>        Rate-Limit (default 2500ms)
  --dry-run=true     Plan zeigen, nicht schreiben
  --headless=false   Browser sichtbar (Debug)
  --help             Diese Hilfe
`);
  process.exit(0);
}

const league = args.league;
const limit = Math.max(1, parseInt(args.limit ?? '100', 10));
const rateMs = Math.max(500, parseInt(args.rate ?? '2500', 10));
const headless = args.headless !== 'false';
const dryRun = args['dry-run'] === 'true';

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type StalePlayer = {
  player_id: string;
  tm_id: string;
  first_name: string;
  last_name: string;
  club_name: string;
  club_id: string;
  current_mv: number;
  current_contract: string | null;
};

async function loadStalePlayers(filterLeague: string | undefined, n: number): Promise<StalePlayer[]> {
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

  // Clubs in league (if filtered)
  let clubFilter: string[] | null = null;
  if (leagueId) {
    const { data: clubs } = await supabase
      .from('clubs')
      .select('id')
      .eq('league_id', leagueId);
    clubFilter = (clubs ?? []).map((c) => c.id as string);
    if (clubFilter.length === 0) return [];
  }

  // Pull stale players with TM-mapping. Paginate via .range() (PostgREST 1000-cap).
  const result: StalePlayer[] = [];
  const PAGE = 500;
  let offset = 0;

  while (result.length < n) {
    let q = supabase
      .from('players')
      .select('id, first_name, last_name, club_id, market_value_eur, contract_end, mv_source, clubs!inner(name, league_id)')
      .eq('mv_source', 'transfermarkt_stale');

    if (clubFilter) q = q.in('club_id', clubFilter);
    q = q.range(offset, offset + PAGE - 1);

    const { data, error } = await q;
    if (error) throw new Error(`players query: ${error.message}`);
    if (!data || data.length === 0) break;

    // Fetch TM-IDs for this batch. IMPORTANT: Chunk `.in()` to <=100 UUIDs.
    // Supabase PostgREST GET-URL hat eff. Limit bei ~14KB. 400 UUIDs × 36 chars = silent fail.
    const playerIds = data.map((p) => p.id as string);
    const tmIdByPlayer = new Map<string, string>();
    const UUID_CHUNK = 100;
    for (let i = 0; i < playerIds.length; i += UUID_CHUNK) {
      const batch = playerIds.slice(i, i + UUID_CHUNK);
      const { data: mappings, error: mErr } = await supabase
        .from('player_external_ids')
        .select('player_id, external_id')
        .eq('source', 'transfermarkt')
        .in('player_id', batch);
      if (mErr) throw new Error(`player_external_ids query: ${mErr.message}`);
      for (const m of mappings ?? []) {
        tmIdByPlayer.set(m.player_id as string, m.external_id as string);
      }
    }

    for (const p of data as unknown as Array<{
      id: string;
      first_name: string;
      last_name: string;
      club_id: string;
      market_value_eur: number;
      contract_end: string | null;
      clubs: { name: string; league_id: string };
    }>) {
      if (result.length >= n) break;
      const tmId = tmIdByPlayer.get(p.id);
      if (!tmId) continue; // no TM mapping — can't re-scrape

      result.push({
        player_id: p.id,
        tm_id: tmId,
        first_name: p.first_name,
        last_name: p.last_name,
        club_name: p.clubs.name,
        club_id: p.club_id,
        current_mv: p.market_value_eur,
        current_contract: p.contract_end,
      });
    }

    if (data.length < PAGE) break;
    offset += PAGE;
  }

  return result;
}

async function scrapeOne(page: Page, sp: StalePlayer): Promise<{ mv: number | null; contract: string | null }> {
  const url = `https://www.transfermarkt.de/spieler/profil/spieler/${sp.tm_id}`;
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (!resp || !resp.ok()) throw new Error(`HTTP ${resp?.status() ?? '??'}`);
  const html = await page.content();
  return {
    mv: parseMarketValue(html),
    contract: parseContractEnd(html),
  };
}

async function main(): Promise<void> {
  console.log(`\n=== TM Re-Scrape Stale (Slice 082) ===`);
  console.log(`league=${league ?? '(all)'} limit=${limit} rate=${rateMs}ms dry=${dryRun} headless=${headless}\n`);

  const players = await loadStalePlayers(league, limit);
  console.log(`Loaded ${players.length} stale players with TM-mapping.\n`);

  if (players.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  if (dryRun) {
    console.log('DRY-RUN — first 10 candidates:');
    for (const p of players.slice(0, 10)) {
      console.log(`  ${p.first_name} ${p.last_name} [${p.club_name}] — current MV=€${p.current_mv / 1_000_000}M, contract=${p.current_contract}`);
    }
    console.log(`\nTotal candidates: ${players.length}. Run without --dry-run to execute.`);
    return;
  }

  const browser: Browser = await chromium.launch({ headless });
  const ctx = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'de-DE',
    extraHTTPHeaders: { 'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8' },
  });
  const page = await ctx.newPage();

  let verified = 0;
  let mvChanged = 0;
  let contractChanged = 0;
  let parseFailed = 0;
  let errored = 0;
  const errors: string[] = [];
  const runStart = Date.now();

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const prefix = `[${i + 1}/${players.length}]`;
    try {
      if (i > 0) await sleep(rateMs);

      // Re-check mv_source (concurrent admin CSV import safety)
      const { data: fresh } = await supabase
        .from('players')
        .select('mv_source')
        .eq('id', p.player_id)
        .maybeSingle();
      if (!fresh || fresh.mv_source !== 'transfermarkt_stale') {
        console.log(`${prefix} ∅ ${p.last_name} — no longer stale, skip`);
        continue;
      }

      const { mv, contract } = await scrapeOne(page, p);

      if (mv === null || mv <= 0) {
        parseFailed++;
        console.log(`${prefix} ∅ ${p.last_name} — MV parse failed, stays stale`);
        continue;
      }

      const updates: Record<string, unknown> = {
        market_value_eur: mv,
        mv_source: 'transfermarkt_verified',
        updated_at: new Date().toISOString(),
      };
      if (contract !== null) updates.contract_end = contract;

      if (mv !== p.current_mv) mvChanged++;
      if (contract !== null && contract !== p.current_contract) contractChanged++;

      const { error: upErr } = await supabase
        .from('players')
        .update(updates)
        .eq('id', p.player_id);

      if (upErr) {
        errored++;
        errors.push(`${p.last_name}: UPDATE ${upErr.message}`);
        console.log(`${prefix} ! ${p.last_name} — ${upErr.message}`);
        continue;
      }

      verified++;
      const mvDelta = `€${Math.round(p.current_mv / 1_000_000)}M → €${Math.round(mv / 1_000_000)}M`;
      const contractDelta = contract && contract !== p.current_contract ? ` | contract: ${p.current_contract ?? '—'} → ${contract}` : '';
      console.log(`${prefix} ✓ ${p.first_name} ${p.last_name} [${p.club_name}] ${mvDelta}${contractDelta}`);
    } catch (err) {
      errored++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${p.last_name}: ${msg}`);
      console.log(`${prefix} ! ${p.last_name} — ${msg}`);
    }
  }

  await browser.close();

  const durationMs = Date.now() - runStart;
  console.log(`\n=== Result ===`);
  console.log(`duration:         ${(durationMs / 1000).toFixed(1)}s`);
  console.log(`verified:         ${verified}`);
  console.log(`  mv changed:     ${mvChanged}`);
  console.log(`  contract new:   ${contractChanged}`);
  console.log(`parse_failed:     ${parseFailed} (remain stale)`);
  console.log(`errored:          ${errored}`);
  if (errors.length > 0) {
    console.log(`\nError sample:`);
    for (const e of errors.slice(0, 5)) console.log(`  ${e}`);
  }

  // Post-run coverage summary
  let covSummary = '';
  if (league) {
    const { data: leagueData } = await supabase.from('leagues').select('id').eq('name', league).maybeSingle();
    if (leagueData) {
      const { data: clubs } = await supabase.from('clubs').select('id').eq('league_id', leagueData.id);
      const clubIds = (clubs ?? []).map((c) => c.id as string);
      if (clubIds.length > 0) {
        const { count: verifiedCount } = await supabase
          .from('players')
          .select('*', { count: 'exact', head: true })
          .eq('mv_source', 'transfermarkt_verified')
          .in('club_id', clubIds);
        const { count: staleCount } = await supabase
          .from('players')
          .select('*', { count: 'exact', head: true })
          .eq('mv_source', 'transfermarkt_stale')
          .in('club_id', clubIds);
        covSummary = `\n${league} coverage: verified=${verifiedCount ?? 0}, stale remaining=${staleCount ?? 0}`;
      }
    }
  }
  if (covSummary) console.log(covSummary);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
