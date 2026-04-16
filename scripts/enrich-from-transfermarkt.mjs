#!/usr/bin/env node
/**
 * TRANSFERMARKT ENRICHMENT SCRIPT
 *
 * Parses scraped Transfermarkt squad pages (.firecrawl/transfermarkt/*.md)
 * and updates BeScout DB with:
 *   - nationality
 *   - market_value_eur (in EUR, not cents)
 *   - contract_end
 *
 * Usage:
 *   node scripts/enrich-from-transfermarkt.mjs --league=BL2
 *   node scripts/enrich-from-transfermarkt.mjs --league=BL2 --dry-run
 */

import { readFileSync, readdirSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// ============================================
// ENV
// ============================================
const envFile = readFileSync('.env.local', 'utf-8');
const env = {};
for (const line of envFile.split('\n')) {
  const clean = line.replace(/\r$/, '');
  const eqIdx = clean.indexOf('=');
  if (eqIdx < 1 || clean.startsWith('#')) continue;
  env[clean.slice(0, eqIdx).trim()] = clean.slice(eqIdx + 1).trim();
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing SUPABASE env'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const DRY_RUN = process.argv.includes('--dry-run');
const LEAGUE_PREFIX = process.argv.find(a => a.startsWith('--league='))?.split('=')[1]?.toLowerCase() ?? 'bl2';

// Map league prefix to firecrawl file prefix and DB league name
const LEAGUE_MAP = {
  bl2: { filePrefix: 'bl2-', leagueName: '2. Bundesliga' },
  bl1: { filePrefix: 'bl1-', leagueName: 'Bundesliga' },
  pl: { filePrefix: 'pl-', leagueName: 'Premier League' },
  ll: { filePrefix: 'll-', leagueName: 'La Liga' },
  sa: { filePrefix: 'sa-', leagueName: 'Serie A' },
  sl: { filePrefix: 'sl-', leagueName: 'Süper Lig' },
  tff: { filePrefix: 'tff-', leagueName: 'TFF 1. Lig' },
};

// ============================================
// TM PARSER
// ============================================

function parseMarketValue(text) {
  // "€800k" → 800000, "€4.00m" → 4000000, "€45.23m" → 45230000
  const m = text.match(/€([\d.]+)(k|m)/i);
  if (!m) return 0;
  const num = parseFloat(m[1]);
  return m[2].toLowerCase() === 'm' ? Math.round(num * 1_000_000) : Math.round(num * 1_000);
}

function parseContractEnd(text) {
  // "Jun 30, 2027" → "2027-06-30"
  const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
  const m = text.match(/(\w{3})\s+(\d{1,2}),\s+(\d{4})/);
  if (!m) return null;
  const month = months[m[1].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${month}-${m[2].padStart(2, '0')}`;
}

function normalizeForMatch(text) {
  return text.toLowerCase()
    // Turkish
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g')
    // German
    .replace(/ä/g, 'ae').replace(/ß/g, 'ss')
    // Nordic (Danish, Norwegian, Icelandic)
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .replace(/ð/g, 'd').replace(/þ/g, 'th')
    // Portuguese/Spanish
    .replace(/ñ/g, 'n')
    // Strip combining diacritics (é→e, č→c, etc.)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    // Strip apostrophes, hyphens
    .replace(/[''`\-]/g, '')
    .trim();
}

/** Extract name tokens for token-based matching */
function nameTokens(name) {
  return normalizeForMatch(name).split(/[\s\-]+/).filter(t => t.length >= 2);
}

/**
 * Smart player matcher — scores candidates and picks the best unique match.
 * Strategies (descending confidence):
 *   100: Exact normalized full name
 *    90: Last name exact + first name initial matches
 *    85: Last name exact + age within ±1
 *    80: Last name exact + unique in club
 *    75: Shirt number match + at least 1 name token overlap
 *    70: ≥2 name tokens in common (handles reversed/abbreviated names)
 *    65: Long last name (≥5) substring match
 */
function findBestMatch(tmPlayer, dbPlayers) {
  const tmNorm = tmPlayer.nameNormalized;
  const tmTokens = nameTokens(tmPlayer.name);
  const tmLastToken = tmTokens[tmTokens.length - 1] ?? '';
  const tmFirstToken = tmTokens[0] ?? '';
  const tmFirstInitial = tmFirstToken.charAt(0);

  let bestMatch = null;
  let bestScore = 0;
  let ambiguous = false;

  for (const dbP of dbPlayers) {
    const dbFull = normalizeForMatch(`${dbP.first_name} ${dbP.last_name}`);
    const dbLastNorm = normalizeForMatch(dbP.last_name);
    const dbFirstNorm = normalizeForMatch(dbP.first_name);
    const dbTokens = nameTokens(`${dbP.first_name} ${dbP.last_name}`);
    let score = 0;

    // Strategy 1: Exact normalized full name
    if (dbFull === tmNorm) {
      score = 100;
    }
    // Strategy 2: Last name exact + first initial
    else if (dbLastNorm === tmLastToken && dbFirstNorm.charAt(0) === tmFirstInitial) {
      score = 90;
    }
    // Also try reversed: TM "Díaz Luis" vs DB first="Luis" last="Díaz"
    else if (dbLastNorm === tmFirstToken && dbFirstNorm.charAt(0) === tmLastToken.charAt(0)) {
      score = 88;
    }
    // Strategy 3: Last name exact + similar age
    else if (dbLastNorm === tmLastToken && tmPlayer.age && dbP.age && Math.abs(dbP.age - tmPlayer.age) <= 1) {
      score = 85;
    }
    // Strategy 4: Shirt number match + at least 1 name token overlap
    else if (tmPlayer.shirtNumber && dbP.shirt_number === tmPlayer.shirtNumber) {
      const overlap = dbTokens.filter(t => tmTokens.includes(t)).length;
      if (overlap >= 1) score = 75;
    }
    // Strategy 5: ≥2 name tokens in common
    else {
      const overlap = dbTokens.filter(t => t.length >= 3 && tmTokens.some(tt => tt === t || (tt.length >= 5 && t.length >= 5 && (tt.includes(t) || t.includes(tt))))).length;
      if (overlap >= 2) score = 70;
      // Strategy 6: Long last name substring
      else if (tmLastToken.length >= 5 && (dbLastNorm.includes(tmLastToken) || tmLastToken.includes(dbLastNorm))) {
        score = 65;
      }
      // Strategy 7: Single-name player (mononym)
      else if (tmTokens.length === 1 && tmLastToken.length >= 4 && (dbLastNorm === tmLastToken || dbFirstNorm === tmLastToken)) {
        score = 60;
      }
      // Strategy 8: DB has initial "M." — compare against TM first name starting with same letter
      else if (dbFirstNorm.length <= 2 && dbFirstNorm.charAt(0) === tmFirstInitial && dbLastNorm === tmLastToken) {
        score = 90;
      }
      // Strategy 9: TM first name is initial "L." matching DB full first name
      else if (tmFirstToken.length <= 2 && tmFirstInitial === dbFirstNorm.charAt(0) && tmLastToken === dbLastNorm) {
        score = 90;
      }
      // Strategy 10: DB last name is substring of TM last name or vice versa (hyphenated: "Amaimouni" ⊂ "Amaimouni-Echghouyab")
      else if (dbLastNorm.length >= 5 && tmLastToken.length >= 5 && (dbLastNorm.startsWith(tmLastToken) || tmLastToken.startsWith(dbLastNorm))) {
        score = 78;
      }
      // Strategy 11: DB splits "Al Dakhil" into first="A. Al" last="Dakhil" — recombine and match
      else if (dbFirstNorm.includes(' ')) {
        const dbRecombined = normalizeForMatch(`${dbP.first_name.replace(/^[A-Z]\.\s*/, '')} ${dbP.last_name}`);
        const tmRecombined = normalizeForMatch(tmPlayer.name.split(' ').slice(1).join(' '));
        if (dbRecombined === tmRecombined || tmLastToken === normalizeForMatch(dbP.last_name)) {
          score = 82;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = dbP;
      ambiguous = false;
    } else if (score > 0 && score === bestScore && dbP.id !== bestMatch?.id) {
      ambiguous = true; // Two candidates with same score
    }
  }

  if (ambiguous && bestScore < 85) return null; // Don't guess when ambiguous and low confidence
  return bestScore >= 60 ? bestMatch : null;
}

function parseSquadPage(content) {
  const players = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    // Find player name pattern: [Full Name](url)
    const nameMatch = lines[i].match(/\[([^\]]+)\]\(https:\/\/www\.transfermarkt\.us\/[^/]+\/profil\/spieler\/\d+\)/);
    if (!nameMatch) continue;

    const fullName = nameMatch[1];

    // Try to find shirt number from preceding lines (format: | 1 | or | 22 |)
    let shirtNumber = null;
    for (let k = Math.max(0, i - 4); k < i; k++) {
      const numMatch = lines[k].match(/^\|\s*(\d{1,2})\s*\|/);
      if (numMatch) { shirtNumber = parseInt(numMatch[1]); break; }
    }

    // Look at the NEXT line(s) for the data row
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const line = lines[j];

      // Data row pattern: | Position | | Date (Age) | ![Nat](url) | Height | Foot | Joined | From | Contract | [€Value](url) |
      // Must have position keyword and market value
      const hasPosition = /Goalkeeper|Centre-Back|Left-Back|Right-Back|Defensive Midfield|Central Midfield|Right Midfield|Left Midfield|Attacking Midfield|Left Winger|Right Winger|Centre-Forward|Second Striker/.test(line);
      if (!hasPosition) continue;

      // Extract nationality from ![Country](url) — can be multiple (dual nationality)
      const natMatches = [...line.matchAll(/!\[([^\]]+)\]\(https:\/\/tmssl/g)];
      const nationalities = natMatches.map(m => m[1]).filter(n => n !== 'Loading ...');

      // Extract contract end
      const contractMatch = line.match(/\|\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4})\s*\|/);
      const contractEnd = contractMatch ? parseContractEnd(contractMatch[1]) : null;

      // Extract market value
      const valueMatch = line.match(/\[€([\d.]+(?:k|m))\]/i);
      const marketValue = valueMatch ? parseMarketValue(`€${valueMatch[1]}`) : 0;

      // Extract position
      const posMatch = line.match(/\|\s*(Goalkeeper|Centre-Back|Left-Back|Right-Back|Defensive Midfield|Central Midfield|Right Midfield|Left Midfield|Attacking Midfield|Left Winger|Right Winger|Centre-Forward|Second Striker)/);
      const tmPosition = posMatch ? posMatch[1] : null;

      // Extract date of birth / age
      const ageMatch = line.match(/(\w+ \d{1,2}, \d{4}) \((\d+)\)/);
      const age = ageMatch ? parseInt(ageMatch[2]) : null;

      // Extract height
      const heightMatch = line.match(/(\d,\d{2})m/);
      const height = heightMatch ? heightMatch[1].replace(',', '.') : null;

      players.push({
        name: fullName,
        nameNormalized: normalizeForMatch(fullName),
        nationality: nationalities[0] ?? '',
        dualNationality: nationalities[1] ?? null,
        contractEnd,
        marketValue,
        tmPosition,
        age,
        shirtNumber,
        height: height ? parseFloat(height) : null,
      });
      break;
    }
  }

  return players;
}

// ============================================
// CLUB NAME MAPPING (TM file name → DB club name)
// ============================================

function extractClubFromFilename(filename) {
  // bl2-fc-schalke-04.md → fc-schalke-04
  return filename.replace(/^bl2-|^bl1-|^pl-|^ll-|^sa-|^sl-|^tff-/, '').replace(/\.md$/, '');
}

// ============================================
// MAIN
// ============================================

async function main() {
  const config = LEAGUE_MAP[LEAGUE_PREFIX];
  if (!config) { console.error(`Unknown league: ${LEAGUE_PREFIX}`); process.exit(1); }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  TRANSFERMARKT ENRICHMENT: ${config.leagueName} ${DRY_RUN ? '(DRY RUN)' : ''}`);
  console.log(`${'='.repeat(60)}\n`);

  // Load all clubs for this league from DB
  const { data: dbClubs } = await supabase
    .from('clubs')
    .select('id, name, slug')
    .eq('league', config.leagueName)
    .order('name');

  if (!dbClubs?.length) { console.error('No clubs found for league'); process.exit(1); }

  // Build slug → club map for matching
  const clubBySlug = new Map();
  for (const c of dbClubs) {
    clubBySlug.set(c.slug, c);
    // Also index by normalized name for fuzzy matching
    clubBySlug.set(normalizeForMatch(c.name), c);
  }

  // Find scraped files
  const tmDir = '.firecrawl/transfermarkt';
  const files = readdirSync(tmDir).filter(f => f.startsWith(config.filePrefix) && f.endsWith('.md'));

  // Also include schalke04.md (special case — scraped before batch)
  if (config.filePrefix === 'bl2-' && !files.includes('bl2-fc-schalke-04.md')) {
    // Check if schalke04.md exists
    try {
      readFileSync(`${tmDir}/schalke04.md`);
      files.push('schalke04.md');
    } catch {}
  }

  console.log(`Found ${files.length} scraped files, ${dbClubs.length} clubs in DB\n`);

  let totalUpdated = 0;
  let totalMatched = 0;
  let totalUnmatched = 0;

  for (const file of files) {
    const content = readFileSync(`${tmDir}/${file}`, 'utf-8');
    const tmPlayers = parseSquadPage(content);

    // Extract club name from file — try to match to DB
    const fileSlug = extractClubFromFilename(file);

    // Find matching DB club
    let dbClub = clubBySlug.get(fileSlug);
    if (!dbClub) {
      // Try normalized name matching
      for (const [key, club] of clubBySlug) {
        if (fileSlug.includes(normalizeForMatch(club.name).replace(/\s+/g, '-').slice(0, 10))) {
          dbClub = club;
          break;
        }
      }
    }

    if (!dbClub) {
      // Fallback: extract from page content
      const titleMatch = content.match(/^# (.+)$/m);
      if (titleMatch) {
        const titleNorm = normalizeForMatch(titleMatch[1]);
        for (const [key, club] of clubBySlug) {
          if (titleNorm.includes(normalizeForMatch(club.name).slice(0, 8))) {
            dbClub = club;
            break;
          }
        }
      }
    }

    if (!dbClub) {
      console.log(`  ⚠ Could not match file ${file} to any DB club — skipping`);
      continue;
    }

    // Load DB players for this club
    const { data: dbPlayers } = await supabase
      .from('players')
      .select('id, first_name, last_name, nationality, market_value_eur, contract_end, age, shirt_number')
      .eq('club_id', dbClub.id);

    let clubUpdated = 0;
    let clubMatched = 0;
    let clubUnmatched = 0;
    const unmatchedNames = [];

    for (const tmPlayer of tmPlayers) {
      const dbPlayer = findBestMatch(tmPlayer, dbPlayers ?? []);

      if (!dbPlayer) {
        clubUnmatched++;
        const mvStr = tmPlayer.marketValue > 0 ? (tmPlayer.marketValue >= 1000000 ? (tmPlayer.marketValue/1000000).toFixed(1)+'m' : (tmPlayer.marketValue/1000)+'k') : '?';
        unmatchedNames.push(`${tmPlayer.name} (#${tmPlayer.shirtNumber ?? '?'}, ${tmPlayer.tmPosition ?? '?'}, €${mvStr})`);

        // AUTO-INSERT high-value unmatched players (main squad)
        if (!DRY_RUN && tmPlayer.marketValue >= 500000) {
          const nameParts = tmPlayer.name.split(' ');
          const lastName = nameParts[nameParts.length - 1] ?? tmPlayer.name;
          const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';
          const posMap = { 'Goalkeeper': 'GK', 'Centre-Back': 'DEF', 'Left-Back': 'DEF', 'Right-Back': 'DEF',
            'Defensive Midfield': 'MID', 'Central Midfield': 'MID', 'Right Midfield': 'MID', 'Left Midfield': 'MID',
            'Attacking Midfield': 'MID', 'Left Winger': 'ATT', 'Right Winger': 'ATT', 'Centre-Forward': 'ATT', 'Second Striker': 'ATT' };
          const pos = posMap[tmPlayer.tmPosition] ?? 'MID';

          const { data: newP, error: insErr } = await supabase.from('players').insert({
            first_name: firstName || lastName,
            last_name: lastName,
            club: dbClub.name,
            club_id: dbClub.id,
            position: pos,
            shirt_number: tmPlayer.shirtNumber,
            age: tmPlayer.age ?? 0,
            nationality: tmPlayer.nationality ?? '',
            market_value_eur: tmPlayer.marketValue,
            contract_end: tmPlayer.contractEnd,
            status: 'fit',
            ipo_price: 10000,
            floor_price: 10000,
            dpc_total: 0,
            dpc_available: 0,
            max_supply: 10000,
          }).select('id').single();

          if (!insErr) {
            console.log(`      ✅ INSERTED: ${tmPlayer.name} (€${mvStr})`);
            clubUpdated++;
          } else if (insErr.code !== '23505') {
            console.log(`      ❌ INSERT FAILED: ${tmPlayer.name} — ${insErr.message}`);
          }
        }
        continue;
      }

      clubMatched++;

      // Build update — TM is source of truth for market value, contract, nationality
      const update = {};

      if (tmPlayer.nationality && (!dbPlayer.nationality || dbPlayer.nationality === '')) {
        update.nationality = tmPlayer.nationality;
      }

      // Market value: always update from TM (it's the authoritative source)
      if (tmPlayer.marketValue > 0) {
        update.market_value_eur = tmPlayer.marketValue;
      }

      // Contract: always update from TM
      if (tmPlayer.contractEnd) {
        update.contract_end = tmPlayer.contractEnd;
      }

      if (tmPlayer.age && (!dbPlayer.age || dbPlayer.age === 0)) {
        update.age = tmPlayer.age;
      }

      if (Object.keys(update).length === 0) continue;

      if (DRY_RUN) {
        console.log(`    [DRY] ${tmPlayer.name}: ${JSON.stringify(update)}`);
        clubUpdated++;
      } else {
        const { error } = await supabase.from('players').update(update).eq('id', dbPlayer.id);
        if (!error) clubUpdated++;
        else console.error(`    ❌ ${tmPlayer.name}: ${error.message}`);
      }
    }

    const status = clubUnmatched === 0 ? '✅' : '⚠';
    console.log(`  ${status} ${dbClub.name.padEnd(30)} TM: ${tmPlayers.length} | DB: ${dbPlayers?.length ?? 0} | Matched: ${clubMatched} | Updated: ${clubUpdated} | Unmatched: ${clubUnmatched}`);
    if (unmatchedNames.length > 0) {
      for (const n of unmatchedNames) console.log(`      ❓ ${n}`);
    }

    totalUpdated += clubUpdated;
    totalMatched += clubMatched;
    totalUnmatched += clubUnmatched;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  DONE — ${totalMatched} matched, ${totalUpdated} updated, ${totalUnmatched} unmatched`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
