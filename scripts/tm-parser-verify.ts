/**
 * TM Parser Verify — runs the (newly fixed) parser against the 5 HTMLs
 * saved by tm-parser-sanity.ts. Offline test, no network.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  parseMarketValue,
  parseContractEnd,
} from '../src/lib/scrapers/transfermarkt-profile';

const EXPECTED: Record<string, { name: string; mv: number; contract: string }> = {
  '503743': { name: 'Morgan Rogers', mv: 80_000_000, contract: '2031-06-30' },
  '290537': { name: 'Jean Butez', mv: 8_000_000, contract: '2028-06-30' },
  '413403': { name: 'Ezri Konsa', mv: 40_000_000, contract: '2028-06-30' },
  '425334': { name: 'Matty Cash', mv: 22_000_000, contract: '2029-06-30' },
  '324358': { name: 'Ollie Watkins', mv: 30_000_000, contract: '2028-06-30' },
};

const dir = path.resolve('tmp/tm-sanity');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.html'));

console.log('\n=== TM Parser Verify (offline against saved HTMLs) ===\n');
console.log(
  'TM-ID    | Name               | expected MV   | parser MV       | ok? | contract  ',
);
console.log('-'.repeat(100));

let pass = 0;
let fail = 0;

for (const f of files) {
  const tmId = f.split('-')[0];
  const expected = EXPECTED[tmId];
  if (!expected) continue;

  const html = fs.readFileSync(path.join(dir, f), 'utf-8');
  const mv = parseMarketValue(html);
  const contract = parseContractEnd(html);

  const mvOk = mv === expected.mv;
  const contractOk = contract === expected.contract;
  const ok = mvOk && contractOk;

  console.log(
    [
      tmId.padEnd(8),
      expected.name.padEnd(18),
      ('€ ' + (expected.mv / 1_000_000).toFixed(2) + ' Mio').padEnd(13),
      (mv === null ? 'null' : '€ ' + mv.toLocaleString()).padEnd(15),
      (ok ? 'OK ' : 'FAIL').padEnd(3),
      (contract ?? 'null').padEnd(10),
    ].join(' | '),
  );

  if (ok) pass++;
  else fail++;
}

console.log('-'.repeat(100));
console.log(`\nRESULT: ${pass}/${pass + fail} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
