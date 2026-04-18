/**
 * Transfermarkt Search Scraper — LOCAL Playwright version
 *
 * Runs the equivalent of /api/cron/transfermarkt-search-batch but from the
 * local machine's IP, bypassing Cloudflare's Vercel-IP block.
 *
 * Usage:
 *   npx tsx scripts/tm-search-local.ts --league="TFF 1. Lig" --limit=5
 *   npx tsx scripts/tm-search-local.ts --league="TFF 1. Lig" --limit=300
 *
 * Strategy: filters unmapped players via shirt_number NOT NULL (stammkader-like),
 * opens transfermarkt-schnellsuche per name, parses results, scores, writes
 * best match (score >= threshold) into player_external_ids.
 */

import { chromium, type Browser, type Page } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import {
  parseSearchResults,
  scoreMatch,
  type SearchMatch,
} from '../src/lib/scrapers/transfermarkt-search';

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

// CLI args
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...rest] = a.replace(/^--/, '').split('=');
    return [k, rest.join('=')];
  }),
) as Record<string, string>;

const league = args.league ?? 'TFF 1. Lig';
const limit = Math.max(1, parseInt(args.limit ?? '5', 10));
const threshold = Math.max(30, parseInt(args.threshold ?? '50', 10));
const rateMs = Math.max(500, parseInt(args.rate ?? '3000', 10));
const headless = args.headless !== 'false';

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type PlayerToSearch = {
  id: string;
  first_name: string;
  last_name: string;
  club_id: string;
  club_name: string;
  club_short: string | null;
  shirt_number: number | null;
};

async function loadUnmappedPlayers(targetLeague: string, n: number): Promise<PlayerToSearch[]> {
  const { data: leagueRow, error: leagueErr } = await supabase
    .from('leagues')
    .select('id')
    .eq('name', targetLeague)
    .maybeSingle();

  if (leagueErr || !leagueRow) {
    throw new Error(`League not found: ${targetLeague} (${leagueErr?.message})`);
  }

  const { data: clubs, error: clubsErr } = await supabase
    .from('clubs')
    .select('id, name, short')
    .eq('league_id', leagueRow.id);

  if (clubsErr || !clubs) {
    throw new Error(`clubs fetch: ${clubsErr?.message}`);
  }

  const clubMap = new Map(clubs.map((c) => [c.id, { name: c.name, short: c.short }]));
  const clubIds = clubs.map((c) => c.id);

  const { data: mapped } = await supabase
    .from('player_external_ids')
    .select('player_id')
    .eq('source', 'transfermarkt');

  const mappedSet = new Set((mapped ?? []).map((r) => r.player_id));

  // Chunk club_ids (PostgREST IN() over HTTP can get long — chunk of 50)
  const players: PlayerToSearch[] = [];
  const CHUNK = 50;
  for (let i = 0; i < clubIds.length && players.length < n; i += CHUNK) {
    const slice = clubIds.slice(i, i + CHUNK);
    const { data: rows, error } = await supabase
      .from('players')
      .select('id, first_name, last_name, club_id, shirt_number')
      .in('club_id', slice)
      .eq('is_liquidated', false)
      .not('shirt_number', 'is', null)
      .order('last_name', { ascending: true })
      .limit(2000);

    if (error) throw new Error(`players fetch: ${error.message}`);

    for (const row of rows ?? []) {
      if (mappedSet.has(row.id)) continue;
      const club = clubMap.get(row.club_id as string);
      if (!club) continue;
      players.push({
        id: row.id as string,
        first_name: row.first_name as string,
        last_name: row.last_name as string,
        club_id: row.club_id as string,
        club_name: club.name,
        club_short: club.short,
        shirt_number: row.shirt_number as number | null,
      });
      if (players.length >= n) break;
    }
  }

  return players;
}

async function searchOne(page: Page, player: PlayerToSearch): Promise<SearchMatch | null> {
  const query = encodeURIComponent(`${player.first_name} ${player.last_name}`.trim());
  const url = `https://www.transfermarkt.de/schnellsuche/ergebnis/schnellsuche?query=${query}`;

  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (!resp || !resp.ok()) {
    throw new Error(`HTTP ${resp?.status() ?? '??'}`);
  }

  const html = await page.content();
  const results = parseSearchResults(html);

  let best: SearchMatch | null = null;
  let bestScore = 0;
  for (const m of results) {
    const s = scoreMatch(m, player, { name: player.club_name, short: player.club_short });
    if (s > bestScore) {
      bestScore = s;
      best = m;
    }
  }

  if (best && bestScore >= threshold) {
    return best;
  }
  return null;
}

async function main(): Promise<void> {
  console.log(`\n=== TM Search Local ===`);
  console.log(`league=${league} limit=${limit} threshold=${threshold} rate=${rateMs}ms headless=${headless}\n`);

  const players = await loadUnmappedPlayers(league, limit);
  console.log(`Loaded ${players.length} unmapped players.\n`);

  if (players.length === 0) {
    console.log('Nothing to do. Exit.');
    return;
  }

  const browser: Browser = await chromium.launch({ headless });
  const ctx = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'de-DE',
    extraHTTPHeaders: {
      'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
    },
  });
  const page = await ctx.newPage();

  let found = 0;
  let notFound = 0;
  let errored = 0;
  const errors: string[] = [];
  const matches: Array<{ name: string; tm_id: string; club: string }> = [];

  const runStart = Date.now();

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const prefix = `[${i + 1}/${players.length}]`;
    try {
      if (i > 0) await sleep(rateMs);
      const match = await searchOne(page, p);

      if (!match) {
        notFound++;
        console.log(`${prefix} ✗ ${p.first_name} ${p.last_name} (${p.club_name}) — no match >=${threshold}`);
        continue;
      }

      const { error: insErr } = await supabase.from('player_external_ids').insert({
        player_id: p.id,
        external_id: match.transfermarkt_id,
        source: 'transfermarkt',
      });

      if (insErr) {
        // Duplicate-key (player already mapped between runs) = OK, count as found
        if ((insErr.message ?? '').includes('duplicate')) {
          found++;
          console.log(`${prefix} ≈ ${p.first_name} ${p.last_name} — already mapped`);
        } else {
          errored++;
          errors.push(`${p.last_name}: INSERT ${insErr.message}`);
          console.log(`${prefix} ! ${p.last_name} — INSERT failed: ${insErr.message}`);
        }
        continue;
      }

      found++;
      matches.push({
        name: `${p.first_name} ${p.last_name}`,
        tm_id: match.transfermarkt_id,
        club: p.club_name,
      });
      console.log(`${prefix} ✓ ${p.first_name} ${p.last_name} → tm=${match.transfermarkt_id} (${match.display_name})`);
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
  console.log(`duration: ${(durationMs / 1000).toFixed(1)}s`);
  console.log(`found:    ${found}`);
  console.log(`notFound: ${notFound}`);
  console.log(`errored:  ${errored}`);
  if (errors.length > 0) {
    console.log(`\nError sample:`);
    for (const e of errors.slice(0, 5)) console.log(`  ${e}`);
  }
  if (matches.length > 0) {
    console.log(`\nMatched sample:`);
    for (const m of matches.slice(0, 5)) console.log(`  ${m.name} → tm=${m.tm_id}`);
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
