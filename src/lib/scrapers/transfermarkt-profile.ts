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
  const mvBlock = html.match(
    /data-header__box--marketvalue[\s\S]{0,500}?<a[^>]*>([\s\S]{0,150}?)<\/a>/,
  );
  const candidate = mvBlock?.[1];
  if (candidate) {
    const mioMatch = candidate.match(/€\s*([\d.,]+)\s*Mio/);
    if (mioMatch) {
      const num = parseFloat(mioMatch[1].replace(/\./g, '').replace(',', '.'));
      return Math.round(num * 1_000_000);
    }
    const tsdMatch = candidate.match(/€\s*([\d.,]+)\s*Tsd/);
    if (tsdMatch) {
      const num = parseFloat(tsdMatch[1].replace(/\./g, '').replace(',', '.'));
      return Math.round(num * 1_000);
    }
    const plainMatch = candidate.match(/€\s*([\d.,]+)(?!\s*(Mio|Tsd))/);
    if (plainMatch) {
      const num = parseFloat(plainMatch[1].replace(/\./g, '').replace(',', '.'));
      return Math.round(num);
    }
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
