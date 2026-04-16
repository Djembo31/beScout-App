#!/usr/bin/env node
/**
 * DIRECT STADIUM IMAGE FETCHER
 *
 * Uses a manual Wikipedia article mapping to fetch stadium images
 * with exactly 1 API call per stadium (no search = no rate limit issues).
 *
 * Usage: node scripts/fetch-stadium-direct.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const wikiMap = JSON.parse(readFileSync('scripts/stadium-wiki-map.json', 'utf-8'));
const STADIUMS_DIR = 'public/stadiums';
const WIKI_API = 'https://en.wikipedia.org/w/api.php';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('  DIRECT STADIUM IMAGE FETCH (Wiki article mapping)');
  console.log(`${'='.repeat(60)}\n`);

  let downloaded = 0, skipped = 0, failed = 0;

  const slugs = Object.keys(wikiMap);
  console.log(`${slugs.length} stadiums mapped\n`);

  for (const slug of slugs) {
    const dest = join(STADIUMS_DIR, `${slug}.jpg`);
    if (existsSync(dest)) { skipped++; continue; }

    const article = wikiMap[slug];
    try {
      // Single API call: get page image by article title
      const url = `${WIKI_API}?action=query&titles=${encodeURIComponent(article)}&prop=pageimages&piprop=original|thumbnail&pithumbsize=1200&format=json`;
      const res = await fetch(url, { headers: { 'User-Agent': 'BeScoutApp/1.0 (stadium-images; k_demirtas@hotmail.de)' } });

      if (!res.ok) {
        console.log(`  ❌ ${slug.padEnd(32)} — HTTP ${res.status}`);
        failed++;
        await sleep(5000); // Wait longer on rate limit
        continue;
      }

      const data = await res.json();
      const pages = data.query?.pages ?? {};
      let imageUrl = null;

      for (const pageId of Object.keys(pages)) {
        const page = pages[pageId];
        imageUrl = page.original?.source ?? page.thumbnail?.source;
      }

      if (!imageUrl || imageUrl.endsWith('.svg')) {
        console.log(`  ❌ ${slug.padEnd(32)} — no image for "${article}"`);
        failed++;
        await sleep(2000);
        continue;
      }

      // Download image
      await sleep(1000);
      const imgRes = await fetch(imageUrl, { headers: { 'User-Agent': 'BeScoutApp/1.0' } });
      if (!imgRes.ok) {
        console.log(`  ❌ ${slug.padEnd(32)} — image download HTTP ${imgRes.status}`);
        failed++;
        await sleep(3000);
        continue;
      }

      const buffer = Buffer.from(await imgRes.arrayBuffer());
      writeFileSync(dest, buffer);
      const sizeKB = Math.round(buffer.length / 1024);
      console.log(`  ✅ ${slug.padEnd(32)} — ${sizeKB}KB (${article})`);
      downloaded++;

    } catch (err) {
      console.log(`  ❌ ${slug.padEnd(32)} — ${err.message}`);
      failed++;
    }

    await sleep(2000); // 2s between clubs — very respectful
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Downloaded: ${downloaded} | Skipped: ${skipped} | Failed: ${failed}`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
