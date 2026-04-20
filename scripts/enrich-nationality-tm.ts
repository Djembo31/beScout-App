/**
 * Transfermarkt Nationality Enrichment (Slice 103 Phase 1).
 *
 * Scrapet TM-Profile für Spieler mit TM-Mapping aber ohne nationality.
 * Schreibt Full-Name-Nationality (z.B. "Nigeria", "Germany") in players.nationality.
 * Display-Layer (Slice 102 countryNameToIso) übernimmt ISO-Konversion.
 *
 * Läuft lokal via Playwright um Cloudflare-Block auf Vercel-IPs zu umgehen.
 *
 * Usage:
 *   npx tsx scripts/enrich-nationality-tm.ts               # Alle non-TFF1 mit TM-Mapping
 *   npx tsx scripts/enrich-nationality-tm.ts --limit=10    # Kleiner Batch zum Testen
 *   npx tsx scripts/enrich-nationality-tm.ts --dry-run=true
 *
 * CLI Flags:
 *   --limit=<n>       Max Spieler pro Lauf (default = all)
 *   --rate=<ms>       Rate-Limit zwischen Requests (default 3500ms)
 *   --dry-run=true    Plan zeigen, nicht schreiben
 *   --headless=false  Browser sichtbar (Debug)
 */

import { chromium, type Browser, type Page } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { parseNationality } from '../src/lib/scrapers/transfermarkt-profile';

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

const limit = args.limit ? Math.max(1, parseInt(args.limit, 10)) : Infinity;
const rateMs = Math.max(500, parseInt(args.rate ?? '3500', 10));
const headless = args.headless !== 'false';
const dryRun = args['dry-run'] === 'true';
// Slice 105: TFF1-Sperrgebiet Freigabe-Flag. Default false für Backward-Compat.
const includeTff1 = args['include-tff1'] === 'true';
// Slice 105: --only-tff1=true scoped exklusiv auf TFF1 (nur wenn nach Slice 103 non-TFF1 bereits verarbeitet).
const onlyTff1 = args['only-tff1'] === 'true';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type Candidate = {
  player_id: string;
  tm_id: string;
  first_name: string;
  last_name: string;
  club_name: string;
  league_short: string;
};

async function loadCandidates(): Promise<Candidate[]> {
  // Paginated: join players + player_external_ids(transfermarkt) + clubs + leagues
  // Filter: missing nationality + non-TFF1 + has TM-mapping
  const PAGE = 1000;
  const out: Candidate[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('players')
      .select(
        `id, first_name, last_name, nationality, matches, last_appearance_gw,
         clubs:club_id(name, leagues:league_id(short)),
         player_external_ids!inner(source, external_id)`,
      )
      .or('nationality.is.null,nationality.eq.')
      .eq('player_external_ids.source', 'transfermarkt')
      .range(offset, offset + PAGE - 1);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    for (const row of data) {
      const clubs = row.clubs as unknown as { name: string; leagues: { short: string } | null } | null;
      const leagueShort = clubs?.leagues?.short ?? '';
      // Slice 105: TFF1-Filter
      if (leagueShort === 'TFF1' && !includeTff1 && !onlyTff1) continue;
      if (onlyTff1 && leagueShort !== 'TFF1') continue;

      const externalIds = row.player_external_ids as unknown as Array<{ source: string; external_id: string }>;
      const tmEntry = externalIds.find((e) => e.source === 'transfermarkt');
      if (!tmEntry) continue;

      out.push({
        player_id: row.id,
        tm_id: tmEntry.external_id,
        first_name: row.first_name,
        last_name: row.last_name,
        club_name: clubs?.name ?? '?',
        league_short: leagueShort,
      });
    }

    if (data.length < PAGE) break;
  }
  return out;
}

async function scrapeOne(page: Page, c: Candidate): Promise<string | null> {
  const url = `https://www.transfermarkt.de/spieler/profil/spieler/${c.tm_id}`;
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (!resp || !resp.ok()) throw new Error(`HTTP ${resp?.status() ?? '??'}`);
  const html = await page.content();
  return parseNationality(html);
}

async function main(): Promise<void> {
  console.log(`\n=== TM Nationality Enrichment (Slice 103 Phase 1) ===`);
  console.log(`limit=${limit === Infinity ? 'all' : limit} rate=${rateMs}ms dry=${dryRun} headless=${headless}\n`);

  const all = await loadCandidates();
  const players = all.slice(0, limit === Infinity ? all.length : limit);
  const scope = onlyTff1 ? 'TFF1-only' : includeTff1 ? 'all leagues incl. TFF1' : 'non-TFF1';
  console.log(`Loaded ${all.length} candidates (${scope}, missing nationality, TM-mapped). Running ${players.length}.\n`);

  if (players.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  if (dryRun) {
    console.log('DRY-RUN — first 10 candidates:');
    for (const p of players.slice(0, 10)) {
      console.log(`  ${p.first_name} ${p.last_name} [${p.club_name}, ${p.league_short}] tm_id=${p.tm_id}`);
    }
    console.log(`\nTotal: ${players.length}. Run without --dry-run to execute.`);
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

  let updated = 0;
  let parseEmpty = 0;
  let errored = 0;
  const errors: string[] = [];
  const runStart = Date.now();

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const prefix = `[${i + 1}/${players.length}]`;
    try {
      if (i > 0) await sleep(rateMs);

      const nationality = await scrapeOne(page, p);
      if (!nationality) {
        parseEmpty++;
        console.log(`${prefix} ⚠ ${p.first_name} ${p.last_name} [${p.club_name}] — no nationality block found`);
        continue;
      }

      const { error } = await supabase
        .from('players')
        .update({ nationality, updated_at: new Date().toISOString() })
        .eq('id', p.player_id);

      if (error) {
        errored++;
        const msg = `${prefix} ✗ ${p.first_name} ${p.last_name}: DB-UPDATE failed — ${error.message}`;
        errors.push(msg);
        console.error(msg);
        continue;
      }

      updated++;
      console.log(`${prefix} ✅ ${p.first_name} ${p.last_name} [${p.club_name}, ${p.league_short}] → ${nationality}`);
    } catch (err) {
      errored++;
      const msg = `${prefix} ✗ ${p.first_name} ${p.last_name}: ${(err as Error).message}`;
      errors.push(msg);
      console.error(msg);
    }
  }

  await browser.close();

  const elapsed = ((Date.now() - runStart) / 1000).toFixed(0);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  TM NATIONALITY ENRICHMENT DONE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`  Processed:  ${players.length}`);
  console.log(`  ✅ Updated:  ${updated}`);
  console.log(`  ⚠ Empty:    ${parseEmpty} (TM-page ohne Staatsbürgerschaft-Block)`);
  console.log(`  ✗ Errors:   ${errored}`);
  console.log(`  Time:       ${elapsed}s`);
  console.log(`${'='.repeat(60)}\n`);

  if (errors.length > 0) {
    console.log(`First 10 errors:`);
    for (const e of errors.slice(0, 10)) console.log(`  ${e}`);
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
