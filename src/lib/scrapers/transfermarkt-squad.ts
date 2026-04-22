/**
 * Slice 144 — Transfermarkt Squad-Page HTML Parser
 *
 * URL pattern: https://www.transfermarkt.de/<slug>/startseite/verein/<tm-club-id>
 *
 * Returns one entry per player-row inside the squad table. Squad-page does NOT
 * expose contract_end (that's only on player profile). MV, Shirt, Position and
 * Nationality ARE in the table.
 *
 * Row-Shape (example, TM 2026-04):
 *   <tr class="odd|even">
 *     <td class="zentriert rueckennummer bg_<Position>" title="<Position>">
 *       <div class=rn_nummer>1</div>
 *     </td>
 *     <td class="posrela">...
 *       <table class="inline-table">
 *         <tr><td><img/></td>
 *             <td class="hauptlink">
 *               <a href="/<slug>/profil/spieler/<id>">Name</a>
 *             </td></tr>
 *         <tr><td>Torwart</td></tr>
 *       </table>
 *     </td>
 *     <td class="zentriert">DD.MM.YYYY (age)</td>
 *     <td class="zentriert"><img class="flaggenrahmen" title="<Nationality>"/></td>
 *     <td class="rechts hauptlink"><a>15,00 Mio. €</a></td>
 *   </tr>
 *
 * Loan-section heuristic: TM renders an `<h2>Leihspieler</h2>` or similar marker
 * before the loans. Slice 144 Decision (Anil 2026-04-22): treat loans as
 * CURRENT-club members (they play there this season). Parser doesn't filter,
 * caller decides.
 */

export type SquadEntry = {
  tmPlayerId: number;
  tmSlug: string;
  displayName: string;
  shirtNumber: number | null;
  position: string | null;
  nationality: string | null;
  marketValueEur: number | null;
};

/**
 * Parse MV string "15,00 Mio. €" / "250,00 Tsd. €" / "-" → integer Euro.
 * Returns null when "-" or unparseable.
 */
function parseMvText(text: string): number | null {
  const cleaned = text.replace(/&[a-z]+;|&#\d+;/gi, ' ').trim();
  if (cleaned === '-' || cleaned === '') return null;
  const m = cleaned.match(/([\d.,]+)\s*(Mio|Tsd)\.?\s*€?/);
  if (!m) return null;
  const num = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(num)) return null;
  return Math.round(num * (m[2] === 'Mio' ? 1_000_000 : 1_000));
}

/**
 * Extract all squad-row HTML blocks. Each row starts at `<tr class="odd|even">`
 * and ends at the matching `</tr>` — respecting nested `<tr>`s inside
 * `<table class="inline-table">` (TM embeds a 2×2 mini-table per squad cell
 * for player photo + name + position).
 *
 * Row-boundary heuristic: balance of `<tr` vs `</tr` must be zero before we
 * close the outer row.
 */
function extractSquadRows(html: string): string[] {
  const rows: string[] = [];
  const startPattern = /<tr class="(?:odd|even)">/g;

  let match: RegExpExecArray | null;
  while ((match = startPattern.exec(html)) !== null) {
    const start = match.index + match[0].length;
    let depth = 1;
    let cursor = start;
    const step = /<tr[\s>]|<\/tr>/g;
    step.lastIndex = start;
    let tokenMatch: RegExpExecArray | null;
    while ((tokenMatch = step.exec(html)) !== null) {
      if (tokenMatch[0] === '</tr>') {
        depth--;
        if (depth === 0) {
          cursor = tokenMatch.index;
          break;
        }
      } else {
        depth++;
      }
    }
    const body = html.slice(start, cursor);

    // Squad-row heuristic: must contain rn_nummer cell + profile link.
    if (!/class=rn_nummer|class="rn_nummer"/i.test(body)) continue;
    if (!/\/profil\/spieler\/\d+/.test(body)) continue;
    rows.push(body);
  }
  return rows;
}

/**
 * Parse one squad-row into a SquadEntry. Returns null when the row is malformed
 * (missing required fields: tmPlayerId, tmSlug, displayName).
 */
function parseRow(rowHtml: string): SquadEntry | null {
  // Profile link — slug + tm_id + displayName from anchor text
  const profileLink = rowHtml.match(
    /<a\s+href="\/([a-z0-9-]+)\/profil\/spieler\/(\d+)"[^>]*>\s*([^<]+?)\s*<\/a>/,
  );
  if (!profileLink) return null;

  const tmSlug = profileLink[1];
  const tmPlayerId = parseInt(profileLink[2], 10);
  const displayName = profileLink[3].replace(/\s+/g, ' ').trim();
  if (!Number.isFinite(tmPlayerId) || tmPlayerId <= 0 || !displayName) return null;

  // Shirt number — inside <div class=rn_nummer>N</div>
  const shirtMatch = rowHtml.match(/class=(?:"rn_nummer"|rn_nummer)[^>]*>\s*(\d{1,3})\s*</);
  const shirtNumber = shirtMatch ? parseInt(shirtMatch[1], 10) : null;

  // Position — from title="<Pos>" on the rueckennummer cell
  const positionMatch = rowHtml.match(/class="[^"]*rueckennummer[^"]*"\s+title="([^"]+)"/);
  const position = positionMatch ? positionMatch[1] : null;

  // Nationality — first flaggenrahmen <img> tag, then extract title inside it.
  // TM-order varies: title may come before OR after class="flaggenrahmen", so
  // a single regex with fixed order misses half the rows.
  let nationality: string | null = null;
  const flagImg = rowHtml.match(/<img[^>]*class="[^"]*flaggenrahmen[^"]*"[^>]*\/?>/);
  if (flagImg) {
    const titleInImg = flagImg[0].match(/title="([^"]+)"/);
    if (titleInImg) nationality = titleInImg[1];
  }

  // Market value — inner text of <td class="rechts hauptlink"> … <a>TEXT</a>
  // We scope to the LAST hauptlink-link in the row (MV is usually last column).
  const mvMatch = rowHtml.match(
    /<td class="rechts hauptlink"[^>]*>\s*<a[^>]*>\s*([^<]+?)\s*<\/a>/,
  );
  const marketValueEur = mvMatch ? parseMvText(mvMatch[1]) : null;

  return {
    tmPlayerId,
    tmSlug,
    displayName,
    shirtNumber: shirtNumber !== null && shirtNumber > 0 && shirtNumber < 100 ? shirtNumber : null,
    position,
    nationality,
    marketValueEur,
  };
}

/**
 * Parse a TM squad-page HTML blob into an array of SquadEntry.
 * Empty array = no rows matched (Cloudflare-challenge-page, malformed, or
 * legitimate empty squad). Caller decides what to do with 0-len.
 */
export function parseSquadTable(html: string): SquadEntry[] {
  const rows = extractSquadRows(html);
  const entries: SquadEntry[] = [];
  for (const row of rows) {
    const entry = parseRow(row);
    if (entry) entries.push(entry);
  }
  return entries;
}
