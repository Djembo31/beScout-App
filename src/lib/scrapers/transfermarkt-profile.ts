/**
 * Transfermarkt Player-Profile HTML Parser
 *
 * Extracted from src/app/api/cron/sync-transfermarkt-batch/route.ts (Slice 064).
 * Moved to lib for Next-Route-Handler-Type-Compat (Slice 069 healing).
 */

/** Parse Transfermarkt Marktwert aus Profil-HTML.
 *
 *  TM hat 2026-04 das Markup umgestellt:
 *    NEU (primary): class="data-header__market-value-wrapper">80,00 <span class="waehrung">Mio. €</span>
 *    ALT (legacy fallback): data-header__box--marketvalue ... <a>€ 1,50 Mio.</a>
 *
 *  Return: EUR als Integer, oder null wenn kein MV erkennbar.
 */
export function parseMarketValue(html: string): number | null {
  // Slice 098b: Explicit "TM hat keinen MV" Detection
  // HTML-Meta: `<meta content="... Marktwert: - ➤ *"` — TM signalisiert explicit "no MV"
  // Treatment: return 0 (nicht null), damit Caller als verified (0) anstatt stale-parse-fail behandelt.
  // Nur matchen wenn kein Data-Header-Wrapper UND kein "Mio./Tsd." im MV-Context existiert.
  if (/Marktwert:\s*-\s+[➤>]/.test(html) && !/data-header__market-value-wrapper/.test(html)) {
    return 0;
  }

  // Primary: neues Markup seit 2026-04
  // Akzeptiert € als Unicode, &#8364; entity, oder &euro;
  const primary = html.match(
    /data-header__market-value-wrapper["'][^>]*>\s*([\d.,]+)\s*<span[^>]*class="waehrung"[^>]*>\s*(Mio|Tsd)\./,
  );
  if (primary) {
    const num = parseFloat(primary[1].replace(/\./g, '').replace(',', '.'));
    const unit = primary[2];
    if (!Number.isFinite(num)) return null;
    return Math.round(num * (unit === 'Mio' ? 1_000_000 : 1_000));
  }

  // Fallback 1: plain-Zahl ohne Einheit in neuem Wrapper (seltener Fall: < 1000 €)
  const primaryPlain = html.match(
    /data-header__market-value-wrapper["'][^>]*>\s*([\d.,]+)\s*<span[^>]*class="waehrung"[^>]*>/,
  );
  if (primaryPlain) {
    const num = parseFloat(primaryPlain[1].replace(/\./g, '').replace(',', '.'));
    if (Number.isFinite(num)) return Math.round(num);
  }

  // Fallback 2: altes Markup (legacy — falls TM in einzelnen Regionen/Caches noch alt)
  // + globaler HTML-Fallback (für HTMLs ohne Wrapper, z.B. Slack-Preview, Feed-Snippets, Tests)
  const mvBlock = html.match(
    /data-header__box--marketvalue[\s\S]{0,500}?<a[^>]*>([\s\S]{0,150}?)<\/a>/,
  );
  const candidate = mvBlock?.[1] ?? html;

  const mioMatch = candidate.match(/€\s*([\d.,]+)\s*Mio/);
  if (mioMatch) {
    const num = parseFloat(mioMatch[1].replace(/\./g, '').replace(',', '.'));
    if (Number.isFinite(num)) return Math.round(num * 1_000_000);
  }
  const tsdMatch = candidate.match(/€\s*([\d.,]+)\s*Tsd/);
  if (tsdMatch) {
    const num = parseFloat(tsdMatch[1].replace(/\./g, '').replace(',', '.'));
    if (Number.isFinite(num)) return Math.round(num * 1_000);
  }

  return null;
}

/** Parse Contract-End aus Transfermarkt HTML.
 *  HTML-Sample: "Vertrag bis:</span> <span class=\"...\">30.06.2026</span>"
 *  Return: ISO-Date YYYY-MM-DD oder null
 */
export function parseContractEnd(html: string): string | null {
  const match = html.match(/Vertrag bis[\s\S]{0,200}?(\d{2})\.(\d{2})\.(\d{4})/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
}

/** Parse Nationalitaet aus Transfermarkt Profil-HTML.
 *
 *  TM zeigt Nationalitaet in 2 Bloecken:
 *  (a) Header-Data-Block (primary, itemprop="nationality"):
 *      <span itemprop="nationality" class="data-header__content">
 *        <img title="Nigeria" alt="Nigeria" class="flaggenrahmen"/> Nigeria
 *      </span>
 *  (b) Info-Table Fallback:
 *      Staatsbürgerschaft: ... <img title="Nigeria" class="flaggenrahmen"/>
 *
 *  Bei Doppel-Staatsbuergerschaft liegen zwei aufeinanderfolgende img title="..." —
 *  wir nehmen die erste (primary).
 *
 *  HTML-Entity "ü" kann als &uuml; kommen (je nach TM-Rendering).
 *
 *  Return: englischer Full-Name wie "Nigeria", "Germany", "Cote d'Ivoire"
 *  oder null wenn kein Block erkennbar.
 */
export function parseNationality(html: string): string | null {
  // Strategy 1: itemprop="nationality" Block (modernes Markup)
  const m1 = html.match(/itemprop="nationality"[\s\S]{0,400}?<img[^>]*title="([^"]+)"/);
  if (m1 && m1[1].trim()) return m1[1].trim();

  // Strategy 2: Staatsbürgerschaft-Label (Info-Table Fallback, entity-agnostic)
  const m2 = html.match(/Staatsb(?:&uuml;|ü)rgerschaft:[\s\S]{0,400}?<img[^>]*title="([^"]+)"/);
  if (m2 && m2[1].trim()) return m2[1].trim();

  return null;
}

/** Parse TM-Club-ID des aktuellen Vereins aus Spieler-Profil-HTML.
 *
 *  TM-Profil hat im Data-Header einen eindeutig markierten Link zum
 *  aktuell aktiven Verein:
 *    <a href="/besiktas-jk/startseite/verein/114" class="data-header__box__club-link">
 *
 *  Strategie:
 *   1. **Primary-Anker**: `class="data-header__box__club-link"` — eindeutig
 *      der "aktueller Verein" Link, unabhängig von Position im HTML.
 *   2. **Fallback**: `<a ... title="<clubname>" href="...startseite/verein/<id>"...>Clubname</a>`
 *      im INFO-TABELLE-Block (Zeile ~1000). Title-Attribut bevorzugt.
 *   3. **Letzter Fallback**: First `/startseite/verein/` link — strictly gated
 *      auf Match VOR dem "Weitere Vereine:" Marker oder vor 70k-char-Limit.
 *
 *  Edge: Vereinsloser Spieler → kein data-header__box__club-link → return null.
 *  Caller muss dann fuzzy-matchen mit Club-Name (Guard gegen False-Positive).
 *
 *  Return:
 *    - tmClubId: number
 *    - clubName: string (aus title-Attribut wenn vorhanden, sonst slug-Capitalize)
 *    - slug: string (z.B. "besiktas-jk", für Squad-URL-Konstruktion in B3)
 *    - null wenn kein Link gefunden
 */
export function parseCurrentClubTmId(
  html: string,
): { tmClubId: number; clubName: string; slug: string } | null {
  const slugToName = (slug: string): string =>
    slug
      .split('-')
      .map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
      .join(' ');

  const build = (
    slug: string,
    tmClubId: number,
    clubNameRaw: string | undefined,
  ): { tmClubId: number; clubName: string; slug: string } | null => {
    if (!Number.isFinite(tmClubId) || tmClubId <= 0) return null;
    const clubName = clubNameRaw && clubNameRaw.trim().length > 0 ? clubNameRaw.trim() : slugToName(slug);
    return { tmClubId, clubName, slug };
  };

  // Primary: data-header__box__club-link class anchor (eindeutig)
  //   <a href="/besiktas-jk/startseite/verein/114" class="data-header__box__club-link">
  const primary = html.match(
    /href="\/([a-z0-9-]+)\/startseite\/verein\/(\d+)"[^>]*class="[^"]*data-header__box__club-link[^"]*"/,
  );
  if (primary) {
    return build(primary[1], parseInt(primary[2], 10), undefined);
  }

  // Fallback 1: title-attributed info-table link
  //   <a title="Besiktas JK" href="/besiktas-istanbul/startseite/verein/114">Besiktas</a>
  const withTitle = html.match(
    /<a\s+title="([^"]+)"\s+href="\/([a-z0-9-]+)\/startseite\/verein\/(\d+)"/,
  );
  if (withTitle) {
    return build(withTitle[2], parseInt(withTitle[3], 10), withTitle[1]);
  }

  // Fallback 2: first /startseite/verein/ link BEFORE "Weitere Vereine" footer marker.
  // Footer heißt in TM-DE: "Weitere Stationen" oder "Karriere" oder "Leihen" Sektion.
  const footerIdx = html.search(/Weitere Stationen|Leihvereine|Karriereverlauf/i);
  const scope = footerIdx > 0 ? html.slice(0, footerIdx) : html.slice(0, 70_000);
  const lastResort = scope.match(
    /href="\/([a-z0-9-]+)\/startseite\/verein\/(\d+)"([^>]*)/,
  );
  if (lastResort) {
    const titleMatch = lastResort[3].match(/title="([^"]+)"/);
    return build(lastResort[1], parseInt(lastResort[2], 10), titleMatch?.[1]);
  }

  return null;
}

/** Parse Trikotnummer aus Transfermarkt Profil-HTML.
 *  TM zeigt Trikotnummer oft im Header-Bereich: <span class="data-header__shirt-number">9</span>
 *  Alternative HTMLs:
 *   - <span class="dataRN">9</span>
 *   - Aus "Rückennummer: 9" Text
 *  Return: number or null
 */
export function parseShirtNumber(html: string): number | null {
  // Primary: modern header markup
  const m1 = html.match(/data-header__shirt-number["'][^>]*>\s*#?(\d{1,3})\s*</);
  if (m1) {
    const n = parseInt(m1[1], 10);
    if (Number.isFinite(n) && n > 0 && n < 100) return n;
  }

  // Fallback: alte dataRN
  const m2 = html.match(/class="dataRN"[^>]*>\s*#?(\d{1,3})\s*</);
  if (m2) {
    const n = parseInt(m2[1], 10);
    if (Number.isFinite(n) && n > 0 && n < 100) return n;
  }

  // Fallback: text-based "Rückennummer: 9"
  const m3 = html.match(/R(?:u|ü)ckennummer[^<>]{0,30}?(\d{1,3})/);
  if (m3) {
    const n = parseInt(m3[1], 10);
    if (Number.isFinite(n) && n > 0 && n < 100) return n;
  }

  return null;
}
