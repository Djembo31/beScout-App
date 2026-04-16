#!/usr/bin/env node
/**
 * STADIUM VERIFICATION & FIX
 *
 * Extracts stadium names from scraped Transfermarkt pages,
 * compares to DB, and fixes mismatches.
 *
 * Usage:
 *   node scripts/verify-stadiums.mjs           # Report only
 *   node scripts/verify-stadiums.mjs --fix     # Fix mismatches
 */

import { readFileSync, readdirSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = readFileSync('.env.local', 'utf-8');
const env = {};
for (const line of envFile.split('\n')) {
  const clean = line.replace(/\r$/, '');
  const eqIdx = clean.indexOf('=');
  if (eqIdx < 1 || clean.startsWith('#')) continue;
  env[clean.slice(0, eqIdx).trim()] = clean.slice(eqIdx + 1).trim();
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const FIX = process.argv.includes('--fix');

function normalizeForMatch(text) {
  return text.toLowerCase()
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g')
    .replace(/ä/g, 'ae').replace(/ß/g, 'ss')
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim();
}

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  STADIUM VERIFICATION ${FIX ? '+ FIX' : '(REPORT)'}`);
  console.log(`${'='.repeat(60)}\n`);

  // Load all clubs from DB
  const { data: dbClubs } = await supabase
    .from('clubs')
    .select('id, name, slug, stadium, city, league')
    .order('league').order('name');

  const clubByNorm = new Map();
  for (const c of dbClubs ?? []) {
    clubByNorm.set(normalizeForMatch(c.name), c);
    clubByNorm.set(c.slug, c);
  }

  // Parse all TM files for stadium + club title
  const tmDir = '.firecrawl/transfermarkt';
  const files = readdirSync(tmDir).filter(f => f.endsWith('.md') && !f.includes('overview'));

  const tmStadiums = [];
  for (const file of files) {
    const content = readFileSync(`${tmDir}/${file}`, 'utf-8');
    const lines = content.split('\n');

    // Extract club name from # Title
    const titleMatch = content.match(/^# (.+)$/m);
    const clubName = titleMatch ? titleMatch[1].trim() : null;
    if (!clubName) continue;

    // Extract stadium: line after "- Stadium:"
    let stadium = null;
    let capacity = null;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Stadium:') && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        // Format: [Stadium Name](url "Club") 49.000 Seats
        const stadMatch = nextLine.match(/\[([^\]]+)\]/);
        const capMatch = nextLine.match(/([\d.]+)\s*Seats/);
        if (stadMatch) stadium = stadMatch[1];
        if (capMatch) capacity = parseInt(capMatch[1].replace(/\./g, ''));
        break;
      }
    }

    if (stadium) {
      tmStadiums.push({ clubName, stadium, capacity, file });
    }
  }

  console.log(`Found ${tmStadiums.length} stadiums from Transfermarkt\n`);

  let matched = 0;
  let correct = 0;
  let wrong = 0;
  let fixed = 0;
  let unmatched = 0;

  for (const tm of tmStadiums) {
    // Match to DB club
    let dbClub = clubByNorm.get(normalizeForMatch(tm.clubName));
    if (!dbClub) {
      // Try partial matching
      for (const [key, club] of clubByNorm) {
        const tmNorm = normalizeForMatch(tm.clubName);
        if (tmNorm.includes(key.slice(0, 8)) || key.includes(tmNorm.slice(0, 8))) {
          dbClub = club;
          break;
        }
      }
    }

    if (!dbClub) {
      unmatched++;
      continue;
    }

    matched++;
    const dbStadium = dbClub.stadium ?? '';

    if (normalizeForMatch(dbStadium) === normalizeForMatch(tm.stadium)) {
      correct++;
    } else {
      wrong++;
      console.log(`  ❌ ${dbClub.name.padEnd(30)} DB: "${dbStadium}" → TM: "${tm.stadium}"${tm.capacity ? ` (${tm.capacity.toLocaleString()} Seats)` : ''}`);

      if (FIX) {
        const { error } = await supabase.from('clubs').update({ stadium: tm.stadium }).eq('id', dbClub.id);
        if (!error) {
          fixed++;
          console.log(`     ✅ FIXED`);
        }
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Matched: ${matched} | Correct: ${correct} | Wrong: ${wrong} | Fixed: ${fixed} | Unmatched: ${unmatched}`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
