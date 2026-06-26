// Slice 392 (E-3) — Kuratierte Länder-Liste für den nation_in-Aufstellungs-Picker.
//
// CEO-Entscheid (Anil 2026-06-26): feste kuratierte Liste statt DB-distinct.
// Daten-informiert zusammengestellt (Verteilung players.nationality_iso, 2026-06-26):
//   - Kern = alle real vorkommenden Codes mit n>=10 (53 Stück, TR 762 … MK 10).
//   - + bekannte Fußballnationen knapp drunter (MX/AU/EG/EC/CL/DZ/AO/GB-NIR),
//     damit kein realistisch filterbares Land fehlt.
// Long-Tail (n<=9, meist Einzelfälle wie Färöer/Malawi/Curaçao) bewusst weggelassen.
// Bei Bedarf erweiterbar — Codes müssen players.nationality_iso (Slice 391) entsprechen.
//
// Namen NICHT hier gepflegt — Runtime via Intl.DisplayNames(locale) (DE+TR built-in).
// Nur ISO-Sonderfälle, die Intl nicht kennt, stehen im Override-Record unten.

export const FOOTBALL_NATIONS: readonly string[] = [
  // Kern n>=10
  'TR', 'DE', 'ES', 'GB-ENG', 'IT', 'FR', 'BR', 'NL', 'AR', 'PT',
  'DK', 'BE', 'CH', 'NG', 'AT', 'HR', 'PL', 'SE', 'SN', 'RS',
  'US', 'MA', 'CI', 'NO', 'GH', 'JP', 'UY', 'BA', 'GB-SCT', 'AL',
  'CO', 'RO', 'GR', 'CM', 'XK', 'ML', 'SI', 'CZ', 'UA', 'GM',
  'BG', 'SK', 'IE', 'RU', 'FI', 'CD', 'IS', 'GB-WLS', 'KR', 'GN',
  'HU', 'TN', 'MK',
  // Ergänzte bekannte Fußballnationen (n<10, kuratiert)
  'GB-NIR', 'MX', 'AU', 'EG', 'EC', 'CL', 'DZ', 'AO',
] as const;

// ISO-Codes, die Intl.DisplayNames nicht (zuverlässig) auflöst → manuelle DE/TR-Namen.
// GB-Subdivisionen (Football-Verbände) + XK (Kosovo, user-assigned ISO).
export const NATION_NAME_OVERRIDES: Record<string, { de: string; tr: string }> = {
  'GB-ENG': { de: 'England', tr: 'İngiltere' },
  'GB-SCT': { de: 'Schottland', tr: 'İskoçya' },
  'GB-WLS': { de: 'Wales', tr: 'Galler' },
  'GB-NIR': { de: 'Nordirland', tr: 'Kuzey İrlanda' },
  'XK': { de: 'Kosovo', tr: 'Kosova' },
};

/**
 * Lokalisierter Anzeigename eines ISO-Nation-Codes.
 * Override (GB-Subdivisionen, XK) gewinnt vor Intl.DisplayNames; Fallback = Code.
 */
export function nationDisplayName(code: string, locale: string): string {
  const override = NATION_NAME_OVERRIDES[code];
  if (override) return locale.startsWith('tr') ? override.tr : override.de;
  try {
    const dn = new Intl.DisplayNames([locale], { type: 'region' });
    return dn.of(code) ?? code;
  } catch {
    return code;
  }
}
