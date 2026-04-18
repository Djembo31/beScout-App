/**
 * Transfermarkt Player-Profile HTML Parser
 *
 * Extracted from src/app/api/cron/sync-transfermarkt-batch/route.ts (Slice 064).
 * Moved to lib for Next-Route-Handler-Type-Compat (Slice 069 healing).
 */

/** Parse Transfermarkt Marktwert aus Profil-HTML.
 *  HTML-Samples:
 *    "Marktwert" ... "€ 1,50 Mio." → 1_500_000
 *    "€ 800 Tsd." → 800_000
 *    "€ 2,75 Mio." → 2_750_000
 */
export function parseMarketValue(html: string): number | null {
  const mvBlock = html.match(
    /data-header__box--marketvalue[\s\S]{0,500}?<a[^>]*>([\s\S]{0,150}?)<\/a>/,
  );
  const candidate = mvBlock?.[1] ?? html;

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
