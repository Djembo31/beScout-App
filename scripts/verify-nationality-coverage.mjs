#!/usr/bin/env node
/**
 * Slice 102 verification: checks how many DB nationality values map to valid ISO.
 * Output: per-value mapping (name, count, iso-result) for coverage evidence.
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = readFileSync('.env.local', 'utf-8');
const env = {};
for (const line of envFile.split('\n')) {
  const clean = line.replace(/\r$/, '');
  const eqIdx = clean.indexOf('=');
  if (eqIdx < 1 || clean.startsWith('#')) continue;
  env[clean.slice(0, eqIdx).trim()] = clean.slice(eqIdx + 1).trim();
}

// Inline copy of mapper logic (duplicates src/lib/utils/countryNameToIso.ts).
// Kept minimal; used only for proof-gen in worklog/proofs/.
const LOOKUP = {
  TR: 'TR', DE: 'DE', NG: 'NG', GH: 'GH', GM: 'GM', GN: 'GN', IL: 'IL',
  KG: 'KG', MK: 'MK', NL: 'NL', RU: 'RU', BA: 'BA', CL: 'CL',
  albania: 'AL', armenia: 'AM', austria: 'AT', azerbaijan: 'AZ',
  belgium: 'BE', bosniaandherzegovina: 'BA', 'bosnia-herzegovina': 'BA',
  bulgaria: 'BG', croatia: 'HR', cyprus: 'CY', czechia: 'CZ',
  czechrepublic: 'CZ', denmark: 'DK', estonia: 'EE', faroeislands: 'FO',
  finland: 'FI', france: 'FR', georgia: 'GE', germany: 'DE', greece: 'GR',
  hungary: 'HU', iceland: 'IS', ireland: 'IE', republicofireland: 'IE',
  italy: 'IT', kosovo: 'XK', latvia: 'LV', lithuania: 'LT',
  luxembourg: 'LU', moldova: 'MD', montenegro: 'ME', netherlands: 'NL',
  northmacedonia: 'MK', macedonia: 'MK', norway: 'NO', poland: 'PL',
  portugal: 'PT', romania: 'RO', russia: 'RU', serbia: 'RS',
  slovakia: 'SK', slovenia: 'SI', spain: 'ES', sweden: 'SE',
  switzerland: 'CH', turkey: 'TR', 'türkiye': 'TR', turkiye: 'TR',
  ukraine: 'UA',
  england: 'GB-ENG', scotland: 'GB-SCT', wales: 'GB-WLS',
  northernireland: 'GB-NIR', unitedkingdom: 'GB', uk: 'GB',
  britain: 'GB', greatbritain: 'GB',
  algeria: 'DZ', angola: 'AO', benin: 'BJ', burkinafaso: 'BF',
  cameroon: 'CM', capeverde: 'CV', caboverde: 'CV',
  centralafricanrepublic: 'CF', chad: 'TD', congo: 'CG', congodr: 'CD',
  drcongo: 'CD', democraticrepublicofthecongo: 'CD',
  democraticrepublicofcongo: 'CD', republicofthecongo: 'CG',
  "coted'ivoire": 'CI', "côted'ivoire": 'CI', ivorycoast: 'CI',
  egypt: 'EG', equatorialguinea: 'GQ', gabon: 'GA', gambia: 'GM',
  thegambia: 'GM', ghana: 'GH', guinea: 'GN', 'guinea-bissau': 'GW',
  guineabissau: 'GW', kenya: 'KE', libya: 'LY', malawi: 'MW',
  mali: 'ML', morocco: 'MA', mozambique: 'MZ', niger: 'NE',
  nigeria: 'NG', senegal: 'SN', sierraleone: 'SL', southafrica: 'ZA',
  southsudan: 'SS', eswatini: 'SZ', swaziland: 'SZ', tanzania: 'TZ',
  togo: 'TG', tunisia: 'TN', uganda: 'UG', zambia: 'ZM', zimbabwe: 'ZW',
  argentina: 'AR', brazil: 'BR', canada: 'CA', chile: 'CL',
  colombia: 'CO', costarica: 'CR', 'curaçao': 'CW', curacao: 'CW',
  dominicanrepublic: 'DO', ecuador: 'EC', elsalvador: 'SV',
  guadeloupe: 'GP', haiti: 'HT', honduras: 'HN', jamaica: 'JM',
  martinique: 'MQ', mexico: 'MX', panama: 'PA', paraguay: 'PY',
  peru: 'PE', puertorico: 'PR', suriname: 'SR',
  trinidadandtobago: 'TT', unitedstates: 'US', usa: 'US',
  unitedstatesofamerica: 'US', uruguay: 'UY', venezuela: 'VE',
  australia: 'AU', bangladesh: 'BD', china: 'CN', hongkong: 'HK',
  india: 'IN', indonesia: 'ID', iran: 'IR', iraq: 'IQ', israel: 'IL',
  japan: 'JP', jordan: 'JO', kazakhstan: 'KZ', kuwait: 'KW',
  korearepublic: 'KR', southkorea: 'KR', 'korea,republicof': 'KR',
  northkorea: 'KP', "korea,democraticpeople'srepublicof": 'KP',
  kyrgyzstan: 'KG', lebanon: 'LB', malaysia: 'MY', myanmar: 'MM',
  newzealand: 'NZ', pakistan: 'PK', palestine: 'PS', philippines: 'PH',
  qatar: 'QA', saudiarabia: 'SA', singapore: 'SG', srilanka: 'LK',
  syria: 'SY', taiwan: 'TW', tajikistan: 'TJ', thailand: 'TH',
  turkmenistan: 'TM', unitedarabemirates: 'AE', uae: 'AE',
  uzbekistan: 'UZ', vietnam: 'VN', yemen: 'YE',
};

function mapToIso(input) {
  if (!input) return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  const upper = trimmed.toUpperCase();
  if (upper.length === 2 && LOOKUP[upper]) return LOOKUP[upper];
  if (/^GB-(ENG|SCT|WLS|NIR)$/.test(upper)) return upper;
  const key = trimmed.normalize('NFC').toLowerCase().replace(/\s+/g, '').trim();
  return LOOKUP[key] ?? '';
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Paginated select — PostgREST caps .select() at 1000 rows (see common-errors §1)
const PAGE = 1000;
const data = [];
for (let offset = 0; ; offset += PAGE) {
  const { data: batch, error } = await supabase
    .from('players')
    .select('nationality')
    .range(offset, offset + PAGE - 1);
  if (error) throw new Error(error.message);
  data.push(...batch);
  if (batch.length < PAGE) break;
}

const counts = {};
for (const row of data) {
  const n = row.nationality ?? '[NULL]';
  counts[n] = (counts[n] ?? 0) + 1;
}

const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

let mapped = 0, unmapped = 0, empty = 0;
const unmappedList = [];
for (const [name, n] of entries) {
  if (name === '[NULL]' || name === '') {
    empty += n;
    continue;
  }
  const iso = mapToIso(name);
  if (iso) mapped += n;
  else {
    unmapped += n;
    unmappedList.push([name, n]);
  }
}

const total = data.length;
console.log('='.repeat(60));
console.log(' NATIONALITY MAPPING COVERAGE');
console.log('='.repeat(60));
console.log(`Total players: ${total}`);
console.log(`Mapped to ISO: ${mapped} (${(100 * mapped / total).toFixed(1)}%)`);
console.log(`Empty/NULL:    ${empty} (${(100 * empty / total).toFixed(1)}%)`);
console.log(`Unmapped:      ${unmapped} (${(100 * unmapped / total).toFixed(1)}%)`);
console.log('');
if (unmappedList.length > 0) {
  console.log('Unmapped values (need mapper extension):');
  for (const [name, n] of unmappedList) {
    console.log(`  "${name}" (${n} players)`);
  }
}
console.log('');
console.log('Sample mapping (top 20 DB values):');
for (const [name, n] of entries.slice(0, 20)) {
  if (name === '[NULL]' || name === '') continue;
  const iso = mapToIso(name);
  const status = iso ? `→ ${iso}` : '✗ UNMAPPED';
  console.log(`  ${name.padEnd(30)} ${n.toString().padStart(4)}  ${status}`);
}
