#!/usr/bin/env node
/**
 * STADIUM IMAGE COMPRESSOR (Slice 106)
 *
 * Compresses large stadium JPGs via sharp: resize to max 2400px width,
 * quality 85. Targets files > MAX_SIZE_MB, leaves smaller ones alone.
 *
 * Usage:
 *   node scripts/compress-stadium-images.mjs              # All > 2MB
 *   node scripts/compress-stadium-images.mjs --threshold=5 # Only > 5MB
 *   node scripts/compress-stadium-images.mjs --dry-run     # Preview only
 */

import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

const STADIUMS_DIR = 'public/stadiums';
const MAX_WIDTH = 2400;
const QUALITY = 85;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const threshold = parseFloat(args.find((a) => a.startsWith('--threshold='))?.split('=')[1] ?? '2');
const MAX_SIZE_BYTES = threshold * 1024 * 1024;

function fmtMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + 'MB';
}

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  STADIUM IMAGE COMPRESSOR ${DRY_RUN ? '(DRY RUN)' : ''}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`  Target: ≤ ${MAX_WIDTH}px width, JPG quality ${QUALITY}`);
  console.log(`  Threshold: compress files > ${threshold}MB\n`);

  const files = readdirSync(STADIUMS_DIR)
    .filter((f) => f.endsWith('.jpg'))
    .map((f) => ({ name: f, path: join(STADIUMS_DIR, f), size: statSync(join(STADIUMS_DIR, f)).size }))
    .filter((f) => f.size > MAX_SIZE_BYTES)
    .sort((a, b) => b.size - a.size);

  if (files.length === 0) {
    console.log(`  No files > ${threshold}MB. Nothing to do.`);
    return;
  }

  let totalBefore = 0;
  let totalAfter = 0;

  for (const f of files) {
    totalBefore += f.size;
    const input = readFileSync(f.path);
    const metadata = await sharp(input).metadata();
    const needsResize = (metadata.width ?? 0) > MAX_WIDTH;

    let output;
    if (needsResize) {
      output = await sharp(input).resize({ width: MAX_WIDTH, withoutEnlargement: true }).jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
    } else {
      output = await sharp(input).jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
    }

    const delta = output.length;
    const savedPct = ((1 - delta / f.size) * 100).toFixed(1);
    totalAfter += delta;

    const action = DRY_RUN ? '(preview)' : '(wrote)';
    console.log(
      `  ${f.name.padEnd(30)} ${fmtMB(f.size).padStart(10)} → ${fmtMB(delta).padStart(9)} (-${savedPct}%, ${metadata.width}×${metadata.height}px → ${needsResize ? MAX_WIDTH + 'px wide' : 'unchanged dims'}) ${action}`,
    );

    if (!DRY_RUN) {
      writeFileSync(f.path, output);
    }
  }

  const totalSavedPct = ((1 - totalAfter / totalBefore) * 100).toFixed(1);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${files.length} files ${DRY_RUN ? 'would be ' : ''}compressed`);
  console.log(`  Total: ${fmtMB(totalBefore)} → ${fmtMB(totalAfter)} (saved ${totalSavedPct}%, ${fmtMB(totalBefore - totalAfter)})`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
