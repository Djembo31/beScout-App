/**
 * Transfermarkt Profile Scraper — LOCAL Playwright version
 *
 * Equivalent to /api/cron/sync-transfermarkt-batch but from local IP
 * to bypass Cloudflare's Vercel-IP block.
 *
 * Usage:
 *   npx tsx scripts/tm-profile-local.ts --league="TFF 1. Lig" --limit=500
 *   npx tsx scripts/tm-profile-local.ts --limit=1000   (all leagues)
 *
 * Iterates mapped players (player_external_ids.source='transfermarkt')
 * whose players.market_value_eur IS NULL or 0, fetches profile HTML,
 * parses market-value + contract-end, updates players table.
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
  console.error('Missing env');
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
const limit = Math.max(1, parseInt(args.limit ?? '50', 10));
const rateMs = Math.max(500, parseInt(args.rate ?? '2500', 10));
const headless = args.headless !== 'false';
const forceRefresh = args.force === 'true';

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type Mapping = {
  player_id: string;
  tm_id: string;
  first_name: string;
  last_name: string;
  club_name: string;
  current_mv: number | null;
  current_contract: string | null;
};

async function loadMappedPlayers(filterLeague: string | undefined, n: number): Promise<Mapping[]> {
  let leagueId: string | null = null;
  if (filterLeague) {
    const { data } = await supabase
      .from('leagues')
      .select('id')
      .eq('name', filterLeague)
      .maybeSingle();
    if (!data) throw new Error(`League not found: ${filterLeague}`);
    leagueId = data.id;
  }

  // 1. Load candidate player_ids filtered by league (chunked via clubs)
  let candidatePlayerIds: string[] = [];
  if (leagueId) {
    const { data: clubs } = await supabase
      .from('clubs')
      .select('id')
      .eq('league_id', leagueId);
    const clubIds = (clubs ?? []).map((c) => c.id);
    const CHUNK = 50;
    for (let i = 0; i < clubIds.length; i += CHUNK) {
      const slice = clubIds.slice(i, i + CHUNK);
      const { data: ps } = await supabase
        .from('players')
        .select('id')
        .in('club_id', slice)
        .eq('is_liquidated', false)
        .not('shirt_number', 'is', null)
        .limit(2000);
      for (const p of ps ?? []) candidatePlayerIds.push(p.id as string);
    }
  }

  // 2. Fetch mappings — chunk by player_id IN() if league-filtered, else full scan
  const mappings: Mapping[] = [];
  const clubCache = new Map<string, string>();

  const fetchBatch = async (
    playerIdChunk: string[] | null,
    rangeStart = 0,
    rangeEnd = 999,
  ): Promise<number> => {
    let q = supabase
      .from('player_external_ids')
      .select(
        'player_id, external_id, players!inner(id, first_name, last_name, club_id, market_value_eur, contract_end, clubs!inner(name, league_id))',
      )
      .eq('source', 'transfermarkt');
    if (playerIdChunk) q = q.in('player_id', playerIdChunk);
    q = q.range(rangeStart, rangeEnd);
    const { data, error } = await q;
    if (error) throw new Error(error.message);

    for (const r of (data ?? []) as unknown as Array<{
      player_id: string;
      external_id: string;
      players: {
        first_name: string;
        last_name: string;
        club_id: string;
        market_value_eur: number | null;
        contract_end: string | null;
        clubs: { name: string; league_id: string };
      };
    }>) {
      const p = r.players;
      if (!p) continue;
      if (leagueId && p.clubs.league_id !== leagueId) continue;
      if (!forceRefresh) {
        const hasMv = p.market_value_eur !== null && p.market_value_eur > 0;
        const hasContract = p.contract_end !== null;
        if (hasMv && hasContract) continue;
      }
      clubCache.set(p.club_id, p.clubs.name);
      mappings.push({
        player_id: r.player_id,
        tm_id: r.external_id,
        first_name: p.first_name,
        last_name: p.last_name,
        club_name: p.clubs.name,
        current_mv: p.market_value_eur,
        current_contract: p.contract_end,
      });
      if (mappings.length >= n) return data.length;
    }
    return data?.length ?? 0;
  };

  if (candidatePlayerIds.length > 0) {
    const CHUNK = 100;
    for (let i = 0; i < candidatePlayerIds.length && mappings.length < n; i += CHUNK) {
      await fetchBatch(candidatePlayerIds.slice(i, i + CHUNK));
    }
  } else {
    // Full-scan: paginate via .range() since PostgREST caps single query at 1000 rows
    const PAGE = 1000;
    let offset = 0;
    while (mappings.length < n) {
      const fetched = await fetchBatch(null, offset, offset + PAGE - 1);
      if (fetched < PAGE) break;
      offset += PAGE;
    }
  }

  return mappings;
}

async function scrapeOne(page: Page, m: Mapping): Promise<{ mv: number | null; contract: string | null }> {
  const url = `https://www.transfermarkt.de/spieler/profil/spieler/${m.tm_id}`;
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (!resp || !resp.ok()) throw new Error(`HTTP ${resp?.status() ?? '??'}`);
  const html = await page.content();
  return {
    mv: parseMarketValue(html),
    contract: parseContractEnd(html),
  };
}

async function main(): Promise<void> {
  console.log(`\n=== TM Profile Local ===`);
  console.log(`league=${league ?? '(all)'} limit=${limit} rate=${rateMs}ms force=${forceRefresh}\n`);

  const mappings = await loadMappedPlayers(league, limit);
  console.log(`Loaded ${mappings.length} mapped players needing scrape.\n`);

  if (mappings.length === 0) {
    console.log('Nothing to do.');
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

  let mvUpdated = 0;
  let contractUpdated = 0;
  let bothEmpty = 0;
  let errored = 0;
  const errors: string[] = [];
  const runStart = Date.now();

  for (let i = 0; i < mappings.length; i++) {
    const m = mappings[i];
    const prefix = `[${i + 1}/${mappings.length}]`;
    try {
      if (i > 0) await sleep(rateMs);
      const { mv, contract } = await scrapeOne(page, m);

      const updates: Record<string, unknown> = {};
      if (mv !== null && mv > 0 && m.current_mv !== mv) {
        updates.market_value_eur = mv;
        mvUpdated++;
      }
      if (contract !== null && m.current_contract !== contract) {
        updates.contract_end = contract;
        contractUpdated++;
      }

      if (Object.keys(updates).length === 0) {
        bothEmpty++;
        console.log(`${prefix} ∅ ${m.first_name} ${m.last_name} — no new data`);
        continue;
      }

      updates.updated_at = new Date().toISOString();
      const { error: upErr } = await supabase
        .from('players')
        .update(updates)
        .eq('id', m.player_id);

      if (upErr) {
        errored++;
        errors.push(`${m.last_name}: UPDATE ${upErr.message}`);
        console.log(`${prefix} ! ${m.last_name} — ${upErr.message}`);
        continue;
      }

      const parts: string[] = [];
      if (updates.market_value_eur) parts.push(`MV=€${((updates.market_value_eur as number) / 1000).toFixed(0)}k`);
      if (updates.contract_end) parts.push(`contract=${updates.contract_end}`);
      console.log(`${prefix} ✓ ${m.first_name} ${m.last_name} — ${parts.join(' ')}`);
    } catch (err) {
      errored++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${m.last_name}: ${msg}`);
      console.log(`${prefix} ! ${m.last_name} — ${msg}`);
    }
  }

  await browser.close();

  const durationMs = Date.now() - runStart;
  console.log(`\n=== Result ===`);
  console.log(`duration:         ${(durationMs / 1000).toFixed(1)}s`);
  console.log(`mv_updated:       ${mvUpdated}`);
  console.log(`contract_updated: ${contractUpdated}`);
  console.log(`unchanged:        ${bothEmpty}`);
  console.log(`errored:          ${errored}`);
  if (errors.length > 0) {
    console.log(`\nError sample:`);
    for (const e of errors.slice(0, 5)) console.log(`  ${e}`);
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
