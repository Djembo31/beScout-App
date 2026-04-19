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
