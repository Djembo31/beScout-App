import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('tmp/tm-sanity');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.html'));

for (const f of files) {
  const html = fs.readFileSync(path.join(dir, f), 'utf-8');
  console.log(`\n====== ${f} (${html.length} bytes) ======`);

  // 1. thread_title pattern with Mio.
  const threadMatch = html.match(/thread_title[^"]*"[^"]*\((\d[\d.,]*) Mio\. \\u20ac/);
  console.log(`thread_title Mio. match: ${threadMatch?.[1] ?? 'NO MATCH'}`);

  // 2. Look for current-value or data-value attrs
  const dataValue = html.match(/current-value\s*=\s*"([^"]+)"/);
  console.log(`current-value attr: ${dataValue?.[1] ?? 'none'}`);

  // 3. ALL contexts of "market-value-wrapper"
  let idx = 0;
  let hit = 0;
  while ((idx = html.indexOf('market-value-wrapper', idx + 1)) !== -1 && hit < 3) {
    const snippet = html.slice(Math.max(0, idx - 50), Math.min(html.length, idx + 600));
    console.log(`\n--- market-value-wrapper hit @${idx} ---`);
    console.log(snippet.replace(/\s+/g, ' ').slice(0, 700));
    hit++;
  }

  // 4. Search for "€ X Mio." or "€ X Tsd." near top of body
  const allMoney = [...html.matchAll(/€\s*([\d.,]+)\s*(Mio|Tsd)/g)].slice(0, 5);
  console.log(`\n€ XX Mio/Tsd. matches (first 5): ${allMoney.map((m) => m[0]).join(' | ')}`);

  // 5. New selector candidates: data-header__box-content, data-header__market-value
  const candidates = [
    'data-header__market-value',
    'data-header__box-content',
    'tm-player-market-value-development',
    'detail-currentvalue',
  ];
  for (const c of candidates) {
    const i = html.indexOf(c);
    if (i !== -1) {
      const snip = html.slice(i, i + 400).replace(/\s+/g, ' ');
      console.log(`\n*** FOUND: "${c}" @${i} ***\n${snip.slice(0, 400)}`);
    }
  }
}
