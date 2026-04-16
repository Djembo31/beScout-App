#!/usr/bin/env node
/**
 * STADIUM IMAGE FETCHER
 *
 * Downloads stadium images from Wikipedia/Wikimedia Commons (CC-licensed).
 * For each club without a stadium image, searches Wikipedia for the stadium
 * article and downloads the main image.
 *
 * Usage:
 *   node scripts/fetch-stadium-images.mjs              # All missing
 *   node scripts/fetch-stadium-images.mjs --dry-run    # Preview only
 *   node scripts/fetch-stadium-images.mjs --force      # Overwrite existing
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { join } from 'path';

const envFile = readFileSync('.env.local', 'utf-8');
const env = {};
for (const line of envFile.split('\n')) {
  const clean = line.replace(/\r$/, '');
  const eqIdx = clean.indexOf('=');
  if (eqIdx < 1 || clean.startsWith('#')) continue;
  env[clean.slice(0, eqIdx).trim()] = clean.slice(eqIdx + 1).trim();
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const STADIUMS_DIR = 'public/stadiums';

// Ensure directory exists
if (!existsSync(STADIUMS_DIR)) mkdirSync(STADIUMS_DIR, { recursive: true });

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

// Rate limit: 200ms between requests (respectful to Wikipedia)
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Search Wikipedia for a stadium article and get its main image URL
 */
async function getStadiumImageUrl(stadiumName, clubName) {
  // Strategy 1: Direct page lookup by stadium name
  const searchTerms = [
    stadiumName,
    `${stadiumName} stadium`,
    `${stadiumName} (stadium)`,
    `${clubName} stadium`,
  ];

  for (const term of searchTerms) {
    try {
      // Search Wikipedia
      const searchUrl = `${WIKI_API}?action=query&list=search&srsearch=${encodeURIComponent(term)}&srnamespace=0&srlimit=3&format=json`;
      const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': 'BeScoutApp/1.0 (stadium-image-fetch)' } });
      const searchData = await searchRes.json();
      const results = searchData.query?.search ?? [];

      for (const result of results) {
        // Check if this is likely a stadium article
        const title = result.title;
        const snippet = result.snippet?.toLowerCase() ?? '';
        const isStadium = snippet.includes('stadium') || snippet.includes('arena') ||
          snippet.includes('ground') || snippet.includes('stadion') || snippet.includes('stadyum') ||
          snippet.includes('capacity') || snippet.includes('seat') ||
          title.toLowerCase().includes('arena') || title.toLowerCase().includes('stadium') ||
          title.toLowerCase().includes('park') || title.toLowerCase().includes('stadion');

        if (!isStadium && results.indexOf(result) > 0) continue;

        // Get page image
        const imgUrl = `${WIKI_API}?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&piprop=original|thumbnail&pithumbsize=1200&format=json`;
        const imgRes = await fetch(imgUrl, { headers: { 'User-Agent': 'BeScoutApp/1.0' } });
        const imgData = await imgRes.json();
        const pages = imgData.query?.pages ?? {};

        for (const pageId of Object.keys(pages)) {
          const page = pages[pageId];
          // Prefer original, fallback to thumbnail
          const imageUrl = page.original?.source ?? page.thumbnail?.source;
          if (imageUrl && !imageUrl.endsWith('.svg') && !imageUrl.includes('Flag_of')) {
            return { url: imageUrl, title, source: 'wikipedia' };
          }
        }

        await sleep(100);
      }
    } catch (err) {
      // Skip this search term on error
    }
    await sleep(150);
  }

  // Strategy 2: Search Wikimedia Commons directly
  try {
    const commonsUrl = `${COMMONS_API}?action=query&generator=search&gsrsearch=${encodeURIComponent(stadiumName)}&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1200&format=json`;
    const commonsRes = await fetch(commonsUrl, { headers: { 'User-Agent': 'BeScoutApp/1.0' } });
    const commonsData = await commonsRes.json();
    const pages = commonsData.query?.pages ?? {};

    for (const pageId of Object.keys(pages)) {
      const page = pages[pageId];
      const info = page.imageinfo?.[0];
      if (!info?.url) continue;
      // Skip SVGs, tiny images, flags
      if (info.url.endsWith('.svg') || info.url.includes('Flag_of') || info.url.includes('logo')) continue;
      const thumbUrl = info.thumburl ?? info.url;
      return { url: thumbUrl, title: page.title, source: 'commons' };
    }
  } catch (err) {
    // Commons search failed
  }

  return null;
}

/**
 * Download an image and save as JPG
 */
async function downloadImage(url, destPath) {
  const res = await fetch(url, { headers: { 'User-Agent': 'BeScoutApp/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(destPath, buffer);
  return buffer.length;
}

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  STADIUM IMAGE FETCHER ${DRY_RUN ? '(DRY RUN)' : ''}`);
  console.log(`${'='.repeat(60)}\n`);

  // Load all clubs from DB
  const { data: clubs } = await supabase
    .from('clubs')
    .select('id, slug, name, stadium, league')
    .order('league').order('name');

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  let alreadyExists = 0;

  for (const club of clubs ?? []) {
    const destPath = join(STADIUMS_DIR, `${club.slug}.jpg`);

    // Skip if image already exists (unless --force)
    if (existsSync(destPath) && !FORCE) {
      alreadyExists++;
      continue;
    }

    if (!club.stadium) {
      console.log(`  ⚠ ${club.name.padEnd(30)} — no stadium name in DB`);
      skipped++;
      continue;
    }

    // Search for stadium image
    const result = await getStadiumImageUrl(club.stadium, club.name);

    if (!result) {
      console.log(`  ❌ ${club.name.padEnd(30)} — "${club.stadium}" not found on Wikipedia`);
      failed++;
      await sleep(200);
      continue;
    }

    if (DRY_RUN) {
      console.log(`  🔍 ${club.name.padEnd(30)} — ${result.title} (${result.source})`);
      downloaded++;
      continue;
    }

    try {
      const size = await downloadImage(result.url, destPath);
      const sizeKB = Math.round(size / 1024);
      console.log(`  ✅ ${club.name.padEnd(30)} — ${sizeKB}KB (${result.title})`);
      downloaded++;
    } catch (err) {
      console.log(`  ❌ ${club.name.padEnd(30)} — download failed: ${err.message}`);
      failed++;
    }

    await sleep(1500); // Respectful rate limiting for Wikipedia
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Downloaded: ${downloaded} | Already had: ${alreadyExists} | Failed: ${failed} | Skipped: ${skipped}`);
  console.log(`${'='.repeat(60)}\n`);

  // Update CREDITS.md
  if (downloaded > 0 && !DRY_RUN) {
    const creditsPath = join(STADIUMS_DIR, 'CREDITS.md');
    const existing = existsSync(creditsPath) ? readFileSync(creditsPath, 'utf-8') : '';
    if (!existing.includes('Wikipedia/Wikimedia Commons')) {
      const credit = `\n## Stadium Images (${new Date().toISOString().slice(0, 10)})\n\nStadium photographs sourced from Wikipedia and Wikimedia Commons.\nLicensed under Creative Commons Attribution-ShareAlike (CC BY-SA).\nSee individual image pages for specific attribution.\n`;
      writeFileSync(creditsPath, existing + credit);
    }
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
