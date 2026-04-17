/**
 * Slice 068 — Transfermarkt Name-Search-Scraper
 *
 * Fuer Players ohne transfermarkt-external_id: schnellsuche auf transfermarkt.de,
 * fuzzy-match auf last_name + club, extract transfermarkt-id aus Result-Row,
 * speichere in player_external_ids. Follow-up-Scraper (064) kann dann Market-Values holen.
 *
 * Target: 3938 Players ohne tm-mapping (927 davon mit missing market_value — Priority).
 *
 * Batch: 30 players/call (search-HTML groesser als profile-HTML).
 * Rate-Limit: 3s zwischen Requests.
 * Cron: jede Stunde (30 players = ~1.5min → 5min maxDuration safe).
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const TM_RATE_LIMIT_MS = 3000;
const BATCH_SIZE = 30;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Normalize name for matching (lowercase, strip diacritics, remove non-alpha) */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z]/g, '');
}

type SearchMatch = {
  transfermarkt_id: string;
  slug: string;
  display_name: string;
  context: string;
};

/** Parse Transfermarkt search result HTML. Extract all player-row candidates. */
export function parseSearchResults(html: string): SearchMatch[] {
  const matches: SearchMatch[] = [];
  const regex = /<a[^>]+href="\/([^"]+)\/profil\/spieler\/(\d+)"[^>]*>([^<]+)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    const [fullMatch, slug, id, displayName] = m;
    // Grab ±500 chars context for club-matching
    const start = Math.max(0, (m.index ?? 0) - 200);
    const end = Math.min(html.length, (m.index ?? 0) + fullMatch.length + 500);
    matches.push({
      transfermarkt_id: id,
      slug,
      display_name: displayName.trim(),
      context: html.slice(start, end),
    });
  }
  return matches;
}

/** Score a match against player data. Higher = better. Threshold: 50+ for accept. */
export function scoreMatch(
  match: SearchMatch,
  player: { first_name: string; last_name: string },
  club: { name: string; short: string | null },
): number {
  const normLast = normalizeName(player.last_name);
  const normFirst = normalizeName(player.first_name);
  const normClubName = normalizeName(club.name);
  const normClubShort = club.short ? normalizeName(club.short) : '';

  const normSlug = normalizeName(match.slug);
  const normDisplay = normalizeName(match.display_name);
  const normContext = normalizeName(match.context);

  let score = 0;
  // Strong last-name match
  if (normSlug.includes(normLast) && normLast.length >= 3) score += 40;
  else if (normDisplay.includes(normLast) && normLast.length >= 3) score += 35;
  // First-name bonus
  if (normFirst.length >= 3 && (normSlug.includes(normFirst) || normDisplay.includes(normFirst))) {
    score += 20;
  }
  // Club presence in context (±500 chars around the link)
  if (normClubName.length >= 4 && normContext.includes(normClubName)) score += 30;
  else if (normClubShort.length >= 3 && normContext.includes(normClubShort)) score += 15;

  return score;
}

type PlayerToSearch = {
  id: string;
  first_name: string;
  last_name: string;
  club_id: string;
  club_name: string;
  club_short: string | null;
};

export async function GET(request: Request): Promise<NextResponse> {
  const runStart = Date.now();

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 });
  }

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? String(BATCH_SIZE), 10), BATCH_SIZE);
  const mvPriority = url.searchParams.get('mv_priority') !== 'false';

  // Load target players: no tm-mapping + (optional) missing market-value
  const { data: candidates, error: fetchErr } = await supabaseAdmin
    .rpc('exec', {})
    .select()
    .limit(0); // placeholder for TS

  // Direct query via from()
  const { data: rawPlayers, error: err } = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, club_id, market_value_eur, shirt_number, clubs!inner(name, short)')
    .not('shirt_number', 'is', null)
    .order(mvPriority ? 'market_value_eur' : 'id', { ascending: true, nullsFirst: true })
    .limit(limit * 5); // oversample — we filter-out tm-mapped rows below

  if (err) {
    return NextResponse.json({ error: `players fetch: ${err.message}` }, { status: 500 });
  }

  // Fetch existing tm-mapping player_ids (for filtering)
  const { data: mapped } = await supabaseAdmin
    .from('player_external_ids')
    .select('player_id')
    .eq('source', 'transfermarkt');

  const mappedSet = new Set((mapped ?? []).map((r: { player_id: string }) => r.player_id));

  const players: PlayerToSearch[] = [];
  for (const row of (rawPlayers ?? []) as unknown as Array<{
    id: string;
    first_name: string;
    last_name: string;
    club_id: string;
    clubs: { name: string; short: string | null };
  }>) {
    if (mappedSet.has(row.id)) continue;
    players.push({
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      club_id: row.club_id,
      club_name: row.clubs.name,
      club_short: row.clubs.short,
    });
    if (players.length >= limit) break;
  }

  let found = 0;
  let notFound = 0;
  let errored = 0;
  const errors: string[] = [];
  const foundSample: Array<{ name: string; tm_id: string; score: number }> = [];

  for (const player of players) {
    try {
      await sleep(TM_RATE_LIMIT_MS);

      const query = encodeURIComponent(`${player.last_name} ${player.first_name}`.trim());
      const searchUrl = `https://www.transfermarkt.de/schnellsuche/ergebnis/schnellsuche?query=${query}`;

      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'de-DE,de;q=0.9',
        },
      });

      if (!res.ok) {
        errored++;
        errors.push(`${player.last_name}: HTTP ${res.status}`);
        continue;
      }

      const html = await res.text();
      const searchMatches = parseSearchResults(html);

      let bestMatch: SearchMatch | null = null;
      let bestScore = 0;
      for (const m of searchMatches) {
        const s = scoreMatch(m, player, { name: player.club_name, short: player.club_short });
        if (s > bestScore) {
          bestScore = s;
          bestMatch = m;
        }
      }

      if (bestMatch && bestScore >= 50) {
        // Insert external_id
        const { error: insErr } = await supabaseAdmin
          .from('player_external_ids')
          .insert({
            player_id: player.id,
            external_id: bestMatch.transfermarkt_id,
            source: 'transfermarkt',
          });

        if (insErr) {
          errored++;
          errors.push(`${player.last_name}: INSERT ${insErr.message}`);
        } else {
          found++;
          if (foundSample.length < 10) {
            foundSample.push({
              name: `${player.first_name} ${player.last_name}`,
              tm_id: bestMatch.transfermarkt_id,
              score: bestScore,
            });
          }
        }
      } else {
        notFound++;
      }
    } catch (err) {
      errored++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${player.last_name}: ${msg}`);
    }
  }

  const durationMs = Date.now() - runStart;

  try {
    await supabaseAdmin.from('cron_sync_log').insert({
      gameweek: 0,
      step: 'transfermarkt-search-batch',
      status: errored === 0 ? 'success' : 'partial',
      details: {
        batch_size: players.length,
        found,
        not_found: notFound,
        errored,
        found_sample: foundSample,
        error_sample: errors.slice(0, 5),
      },
      duration_ms: durationMs,
    });
  } catch (e) {
    console.error('[transfermarkt-search-batch] cron_sync_log insert failed:', e);
  }

  return NextResponse.json({
    success: errored === 0,
    duration_ms: durationMs,
    stats: {
      batch_size: players.length,
      found,
      not_found: notFound,
      errored,
      found_sample: foundSample,
      error_sample: errors.slice(0, 5),
    },
  });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;
