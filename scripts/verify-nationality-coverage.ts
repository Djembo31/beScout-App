/**
 * Slice 102/103 verification: checks how many DB nationality values map to valid ISO.
 * Uses the live src/lib/utils/countryNameToIso.ts mapper to avoid staleness.
 *
 * Usage: npx tsx scripts/verify-nationality-coverage.ts
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { mapNationalityToIso } from '../src/lib/utils/countryNameToIso';

const envFile = readFileSync('.env.local', 'utf-8');
const env: Record<string, string> = {};
for (const line of envFile.split('\n')) {
  const clean = line.replace(/\r$/, '');
  const eqIdx = clean.indexOf('=');
  if (eqIdx < 1 || clean.startsWith('#')) continue;
  env[clean.slice(0, eqIdx).trim()] = clean.slice(eqIdx + 1).trim();
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const PAGE = 1000;
  const data: Array<{ nationality: string | null }> = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data: batch, error } = await supabase
      .from('players')
      .select('nationality')
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!batch) break;
    data.push(...batch);
    if (batch.length < PAGE) break;
  }

  const counts: Record<string, number> = {};
  for (const row of data) {
    const n = row.nationality ?? '[NULL]';
    counts[n] = (counts[n] ?? 0) + 1;
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  let mapped = 0;
  let unmapped = 0;
  let empty = 0;
  const unmappedList: Array<[string, number]> = [];
  for (const [name, n] of entries) {
    if (name === '[NULL]' || name === '') {
      empty += n;
      continue;
    }
    const iso = mapNationalityToIso(name);
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
  console.log(`Mapped to ISO: ${mapped} (${((100 * mapped) / total).toFixed(1)}%)`);
  console.log(`Empty/NULL:    ${empty} (${((100 * empty) / total).toFixed(1)}%)`);
  console.log(`Unmapped:      ${unmapped} (${((100 * unmapped) / total).toFixed(1)}%)`);
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
    const iso = mapNationalityToIso(name);
    const status = iso ? `→ ${iso}` : '✗ UNMAPPED';
    console.log(`  ${name.padEnd(30)} ${n.toString().padStart(4)}  ${status}`);
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
