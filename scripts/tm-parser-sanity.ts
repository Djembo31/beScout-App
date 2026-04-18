/**
 * TM Parser Sanity Check — Phase 1 of Data-Gap Plan
 *
 * Opens 5 hardcoded TM pages (Stammspieler with MV=0 in DB),
 * runs our parseMarketValue + parseContractEnd against the real HTML,
 * and dumps the raw marketvalue-HTML-block for manual comparison.
 *
 * Purpose: determine whether MV=0 in DB is a parser bug or a real TM=0.
 *
 * Usage: npx tsx scripts/tm-parser-sanity.ts
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import {
  parseMarketValue,
  parseContractEnd,
} from '../src/lib/scrapers/transfermarkt-profile';

const SAMPLES = [
  { name: 'Morgan Rogers', club: 'Aston Villa', tm_id: '503743' },
  { name: 'Jean Butez', club: 'Como', tm_id: '290537' },
  { name: 'Ezri Konsa', club: 'Aston Villa', tm_id: '413403' },
  { name: 'Matty Cash', club: 'Aston Villa', tm_id: '425334' },
  { name: 'Ollie Watkins', club: 'Aston Villa', tm_id: '324358' },
];

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  const outDir = path.resolve(process.cwd(), 'tmp', 'tm-sanity');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({
    locale: 'de-DE',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  });
  const page = await ctx.newPage();

  console.log('\n=== TM Parser Sanity Check ===\n');
  console.log(`Output: ${outDir}`);
  console.log(
    `Sample:  ${SAMPLES.length} Stammspieler with MV=0 in DB\n`,
  );

  const results: Array<{
    name: string;
    club: string;
    tm_id: string;
    parser_mv: number | null;
    parser_contract: string | null;
    mv_block_found: boolean;
    mv_block_preview: string;
    contract_snippet: string;
  }> = [];

  for (const s of SAMPLES) {
    const url = `https://www.transfermarkt.de/spieler/profil/spieler/${s.tm_id}`;
    process.stdout.write(`[${s.name.padEnd(20)}] ${url} ... `);

    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (!resp || !resp.ok()) {
        console.log(`HTTP ${resp?.status() ?? '??'}`);
        continue;
      }
      const html = await page.content();

      const mv = parseMarketValue(html);
      const contract = parseContractEnd(html);

      const mvBlockMatch = html.match(
        /data-header__box--marketvalue[\s\S]{0,500}?<a[^>]*>([\s\S]{0,150}?)<\/a>/,
      );
      const mvBlockFound = Boolean(mvBlockMatch);
      const mvBlockPreview = mvBlockMatch?.[1]?.replace(/\s+/g, ' ').trim() ?? '(no match)';

      const contractMatch = html.match(/Vertrag bis[\s\S]{0,200}/);
      const contractSnippet = contractMatch?.[0]?.replace(/\s+/g, ' ').trim().slice(0, 150) ?? '(no match)';

      const outFile = path.join(outDir, `${s.tm_id}-${s.name.replace(/\s+/g, '_')}.html`);
      fs.writeFileSync(outFile, html);

      console.log(
        `parser_mv=${mv === null ? 'null' : '€' + mv.toLocaleString()}  contract=${contract ?? 'null'}  mv_block_found=${mvBlockFound}`,
      );

      results.push({
        name: s.name,
        club: s.club,
        tm_id: s.tm_id,
        parser_mv: mv,
        parser_contract: contract,
        mv_block_found: mvBlockFound,
        mv_block_preview: mvBlockPreview,
        contract_snippet: contractSnippet,
      });

      await sleep(2500);
    } catch (err) {
      console.log(`ERROR ${(err as Error).message}`);
    }
  }

  await browser.close();

  console.log('\n\n=== VERDICT TABLE ===\n');
  console.log(
    'NAME                 | parser_mv         | parser_contract | mv_block_found | mv_block_preview'
  );
  console.log('-'.repeat(140));
  for (const r of results) {
    console.log(
      [
        r.name.padEnd(20),
        (r.parser_mv === null ? 'null' : '€' + r.parser_mv.toLocaleString()).padEnd(17),
        (r.parser_contract ?? 'null').padEnd(15),
        String(r.mv_block_found).padEnd(14),
        r.mv_block_preview.slice(0, 60),
      ].join(' | '),
    );
  }

  console.log('\n=== CONTRACT SNIPPETS ===\n');
  for (const r of results) {
    console.log(`[${r.name}] ${r.contract_snippet}`);
  }

  const summaryFile = path.join(outDir, 'SUMMARY.json');
  fs.writeFileSync(summaryFile, JSON.stringify(results, null, 2));
  console.log(`\nFull HTMLs in: ${outDir}`);
  console.log(`Summary: ${summaryFile}\n`);
}

void main();
