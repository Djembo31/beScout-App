/**
 * Transfermarkt Player-Search HTML Parser + Scorer
 *
 * Extracted from src/app/api/cron/transfermarkt-search-batch/route.ts (Slice 068).
 * Moved to lib for Next-Route-Handler-Type-Compat (Slice 069 healing).
 */

export type SearchMatch = {
  transfermarkt_id: string;
  slug: string;
  display_name: string;
  context: string;
};

/** Normalize name for matching (lowercase, strip diacritics, remove non-alpha) */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z]/g, '');
}

/** Parse Transfermarkt search result HTML. Extract all player-row candidates. */
export function parseSearchResults(html: string): SearchMatch[] {
  const matches: SearchMatch[] = [];
  const regex = /<a[^>]+href="\/([^"]+)\/profil\/spieler\/(\d+)"[^>]*>([^<]+)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    const [fullMatch, slug, id, displayName] = m;
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
  if (normSlug.includes(normLast) && normLast.length >= 3) score += 40;
  else if (normDisplay.includes(normLast) && normLast.length >= 3) score += 35;
  if (normFirst.length >= 3 && (normSlug.includes(normFirst) || normDisplay.includes(normFirst))) {
    score += 20;
  }
  if (normClubName.length >= 4 && normContext.includes(normClubName)) score += 30;
  else if (normClubShort.length >= 3 && normContext.includes(normClubShort)) score += 15;

  return score;
}
