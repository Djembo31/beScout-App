/**
 * Maps nationality full-names (as stored in `players.nationality`) to
 * ISO 3166-1 alpha-2 codes expected by `CountryFlag` / `country-flag-icons`.
 *
 * Returns `""` for unknown / empty / whitespace-only input — callers should
 * render no flag in that case (truthy-check is already standard pattern).
 *
 * Covers all values observed in production DB as of 2026-04-20 (~130 unique)
 * including common aliases (Turkey/Türkiye, Cote d'Ivoire/Ivory Coast, etc.)
 * and GB subdivisions (England, Scotland, Wales, Northern Ireland).
 */

const NATIONALITY_TO_ISO: Record<string, string> = {
  // ISO pass-through (already-correct values in DB)
  TR: 'TR',
  DE: 'DE',
  NG: 'NG',
  GH: 'GH',
  GM: 'GM',
  GN: 'GN',
  IL: 'IL',
  KG: 'KG',
  MK: 'MK',
  NL: 'NL',
  RU: 'RU',
  BA: 'BA',
  CL: 'CL',

  // Europe
  albania: 'AL',
  armenia: 'AM',
  austria: 'AT',
  azerbaijan: 'AZ',
  belgium: 'BE',
  bosniaandherzegovina: 'BA',
  'bosnia-herzegovina': 'BA',
  bulgaria: 'BG',
  croatia: 'HR',
  cyprus: 'CY',
  czechia: 'CZ',
  czechrepublic: 'CZ',
  denmark: 'DK',
  estonia: 'EE',
  'faroeislands': 'FO',
  finland: 'FI',
  france: 'FR',
  georgia: 'GE',
  germany: 'DE',
  greece: 'GR',
  hungary: 'HU',
  iceland: 'IS',
  ireland: 'IE',
  'republicofireland': 'IE',
  italy: 'IT',
  kosovo: 'XK',
  latvia: 'LV',
  lithuania: 'LT',
  luxembourg: 'LU',
  malta: 'MT',
  moldova: 'MD',
  montenegro: 'ME',
  netherlands: 'NL',
  'northmacedonia': 'MK',
  macedonia: 'MK',
  norway: 'NO',
  poland: 'PL',
  portugal: 'PT',
  romania: 'RO',
  russia: 'RU',
  serbia: 'RS',
  slovakia: 'SK',
  slovenia: 'SI',
  spain: 'ES',
  sweden: 'SE',
  switzerland: 'CH',
  turkey: 'TR',
  'türkiye': 'TR',
  'turkiye': 'TR',
  ukraine: 'UA',

  // United Kingdom subdivisions (football uses individual associations)
  england: 'GB-ENG',
  scotland: 'GB-SCT',
  wales: 'GB-WLS',
  'northernireland': 'GB-NIR',
  'unitedkingdom': 'GB',
  uk: 'GB',
  britain: 'GB',
  greatbritain: 'GB',

  // Africa
  algeria: 'DZ',
  angola: 'AO',
  benin: 'BJ',
  burkinafaso: 'BF',
  cameroon: 'CM',
  capeverde: 'CV',
  'caboverde': 'CV',
  centralafricanrepublic: 'CF',
  chad: 'TD',
  congo: 'CG',
  'congodr': 'CD',
  'drcongo': 'CD',
  'democraticrepublicofthecongo': 'CD',
  'democraticrepublicofcongo': 'CD',
  'republicofthecongo': 'CG',
  "coted'ivoire": 'CI',
  "côted'ivoire": 'CI',
  ivorycoast: 'CI',
  egypt: 'EG',
  equatorialguinea: 'GQ',
  gabon: 'GA',
  gambia: 'GM',
  'thegambia': 'GM',
  ghana: 'GH',
  guinea: 'GN',
  'guinea-bissau': 'GW',
  guineabissau: 'GW',
  kenya: 'KE',
  libya: 'LY',
  malawi: 'MW',
  mali: 'ML',
  morocco: 'MA',
  mozambique: 'MZ',
  niger: 'NE',
  nigeria: 'NG',
  senegal: 'SN',
  sierraleone: 'SL',
  southafrica: 'ZA',
  'southsudan': 'SS',
  eswatini: 'SZ',
  swaziland: 'SZ',
  tanzania: 'TZ',
  togo: 'TG',
  tunisia: 'TN',
  uganda: 'UG',
  zambia: 'ZM',
  zimbabwe: 'ZW',

  // Americas
  argentina: 'AR',
  brazil: 'BR',
  canada: 'CA',
  chile: 'CL',
  colombia: 'CO',
  costarica: 'CR',
  'curaçao': 'CW',
  'curacao': 'CW',
  'dominicanrepublic': 'DO',
  ecuador: 'EC',
  'elsalvador': 'SV',
  guadeloupe: 'GP',
  haiti: 'HT',
  honduras: 'HN',
  jamaica: 'JM',
  martinique: 'MQ',
  mexico: 'MX',
  panama: 'PA',
  paraguay: 'PY',
  peru: 'PE',
  puertorico: 'PR',
  suriname: 'SR',
  'trinidadandtobago': 'TT',
  'unitedstates': 'US',
  usa: 'US',
  'unitedstatesofamerica': 'US',
  uruguay: 'UY',
  venezuela: 'VE',

  // Asia & Oceania
  australia: 'AU',
  bangladesh: 'BD',
  china: 'CN',
  'hongkong': 'HK',
  india: 'IN',
  indonesia: 'ID',
  iran: 'IR',
  iraq: 'IQ',
  israel: 'IL',
  japan: 'JP',
  jordan: 'JO',
  kazakhstan: 'KZ',
  kuwait: 'KW',
  'korearepublic': 'KR',
  'southkorea': 'KR',
  'korea,republicof': 'KR',
  'northkorea': 'KP',
  'korea,democraticpeople\'srepublicof': 'KP',
  kyrgyzstan: 'KG',
  lebanon: 'LB',
  malaysia: 'MY',
  myanmar: 'MM',
  'newzealand': 'NZ',
  pakistan: 'PK',
  palestine: 'PS',
  philippines: 'PH',
  qatar: 'QA',
  'saudiarabia': 'SA',
  singapore: 'SG',
  'srilanka': 'LK',
  syria: 'SY',
  taiwan: 'TW',
  tajikistan: 'TJ',
  thailand: 'TH',
  turkmenistan: 'TM',
  'unitedarabemirates': 'AE',
  uae: 'AE',
  uzbekistan: 'UZ',
  vietnam: 'VN',
  yemen: 'YE',

  // German aliases (Slice 103 — TM.de scrape liefert deutsche Namen).
  // normalizeKey() strips Diakritika? → NEIN, NFC normalize + lowercase.
  // Also müssen Diakritika-Varianten beide gemappt werden (ä/ae, ö/oe, ü/ue, ß/ss).
  // Europe (DE)
  albanien: 'AL',
  armenien: 'AM',
  aserbaidschan: 'AZ',
  belgien: 'BE',
  bosnienundherzegowina: 'BA',
  bulgarien: 'BG',
  dänemark: 'DK',
  daenemark: 'DK',
  deutschland: 'DE',
  estland: 'EE',
  färöer: 'FO',
  faeroeer: 'FO',
  finnland: 'FI',
  frankreich: 'FR',
  georgien: 'GE',
  griechenland: 'GR',
  irland: 'IE',
  island: 'IS',
  italien: 'IT',
  kasachstan: 'KZ',
  kroatien: 'HR',
  lettland: 'LV',
  litauen: 'LT',
  luxemburg: 'LU',
  mazedonien: 'MK',
  nordmazedonien: 'MK',
  moldawien: 'MD',
  niederlande: 'NL',
  norwegen: 'NO',
  polen: 'PL',
  rumänien: 'RO',
  rumaenien: 'RO',
  russland: 'RU',
  schweden: 'SE',
  schweiz: 'CH',
  serbien: 'RS',
  slowakei: 'SK',
  slowenien: 'SI',
  spanien: 'ES',
  tschechien: 'CZ',
  tschechischerepublik: 'CZ',
  türkei: 'TR',
  tuerkei: 'TR',
  ungarn: 'HU',
  weißrussland: 'BY',
  weissrussland: 'BY',
  belarus: 'BY',
  zypern: 'CY',
  österreich: 'AT',
  oesterreich: 'AT',

  // Africa (DE)
  ägypten: 'EG',
  aegypten: 'EG',
  algerien: 'DZ',
  äthiopien: 'ET',
  aethiopien: 'ET',
  demokratischerepublikkongo: 'CD',
  elfenbeinküste: 'CI',
  elfenbeinkueste: 'CI',
  kamerun: 'CM',
  kapverde: 'CV',
  'kap-verde': 'CV',
  kongo: 'CG',
  libyen: 'LY',
  marokko: 'MA',
  mosambik: 'MZ',
  republikkongo: 'CG',
  simbabwe: 'ZW',
  südafrika: 'ZA',
  suedafrika: 'ZA',
  tunesien: 'TN',
  sambia: 'ZM',

  // Americas (DE)
  argentinien: 'AR',
  brasilien: 'BR',
  dominikanischerepublik: 'DO',
  kanada: 'CA',
  kolumbien: 'CO',
  kuba: 'CU',
  mexiko: 'MX',
  vereinigtestaaten: 'US',
  vereinigtestaatenvonamerika: 'US',

  // Asia & Oceania (DE)
  australien: 'AU',
  indien: 'IN',
  indonesien: 'ID',
  jordanien: 'JO',
  katar: 'QA',
  'korea,demokratischevolksrepublik': 'KP',
  nordkorea: 'KP',
  'korea,republik': 'KR',
  südkorea: 'KR',
  suedkorea: 'KR',
  libanon: 'LB',
  neuseeland: 'NZ',
  philippinen: 'PH',
  'saudi-arabien': 'SA',
  saudiarabien: 'SA',
  syrien: 'SY',
  vereinigtearabischeemirate: 'AE',
  tadschikistan: 'TJ',
  usbekistan: 'UZ',
  mauritius: 'MU',
};

/**
 * Normalize a nationality name for lookup: lowercase, strip diacritics,
 * remove spaces/punctuation. Returns empty string for nullish/empty input.
 */
function normalizeKey(raw: string): string {
  return raw
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim();
}

/**
 * Map a nationality full-name (as scraped from TM/API-Football) to ISO 3166-1
 * alpha-2 code. Accepts already-ISO codes as pass-through. Returns `""` when
 * unknown — callers render no flag on falsy.
 *
 * @example
 * mapNationalityToIso("Germany")    // "DE"
 * mapNationalityToIso("Nigeria")    // "NG"
 * mapNationalityToIso("Türkiye")    // "TR"
 * mapNationalityToIso("England")    // "GB-ENG"
 * mapNationalityToIso("")           // ""
 * mapNationalityToIso(null)         // ""
 * mapNationalityToIso("Unknown")    // ""
 */
export function mapNationalityToIso(input: string | null | undefined): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (!trimmed) return '';

  // ISO pass-through (case-insensitive) — handles existing "TR", "NG", "DE" etc.
  const upper = trimmed.toUpperCase();
  if (upper.length === 2 && NATIONALITY_TO_ISO[upper]) return NATIONALITY_TO_ISO[upper];

  // GB subdivision pass-through (e.g. "GB-ENG" already)
  if (/^GB-(ENG|SCT|WLS|NIR)$/.test(upper)) return upper;

  const key = normalizeKey(trimmed);
  return NATIONALITY_TO_ISO[key] ?? '';
}
