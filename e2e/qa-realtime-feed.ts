import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import * as dotenv from 'dotenv';

// Load .env.local for service role key
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const screenshotDir = path.join(__dirname, 'screenshots', 'realtime-feed');
fs.mkdirSync(screenshotDir, { recursive: true });

const BASE = process.env.QA_BASE_URL ?? 'https://www.bescout.net';
const EMAIL = 'jarvis-qa@bescout.net';
const PASSWORD = 'JarvisQA2026!';

// emre_snipe — one of the users jarvis-qa follows (from `user_follows`)
const FAKE_ACTOR_ID = '212f1290-c69f-4041-ab31-dcdfda46bde4';
const FAKE_ACTOR_HANDLE = 'emre_snipe';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function login(page: any) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  try {
    const btn = page.getByRole('button', { name: 'Akzeptieren' });
    if (await btn.isVisible({ timeout: 3000 })) {
      await btn.click();
      await page.waitForTimeout(500);
    }
  } catch {}
  try {
    await page.getByPlaceholder('E-Mail Adresse').fill(EMAIL);
    const pw = page.getByPlaceholder('Passwort');
    await pw.click();
    await pw.fill(PASSWORD);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
  } catch {
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.waitForTimeout(500);
    await page.locator('button[type="submit"]').click();
  }
  await page.waitForURL('**/', { timeout: 15000 });
  console.log('[LOGIN] OK:', page.url());
}

async function insertFakeActivity(kind: string) {
  // Insert a synthetic activity_log row under a followed user so jarvis-qa's
  // realtime subscription picks it up via the cross-user RLS policy.
  const { data, error } = await admin
    .from('activity_log')
    .insert({
      user_id: FAKE_ACTOR_ID,
      action: 'post_create',
      category: 'content',
      metadata: { test: true, label: kind },
    })
    .select('id')
    .single();
  if (error) {
    console.error('[INSERT FAIL]', error);
    throw error;
  }
  console.log(`[INSERT] ${kind} → row ${data.id}`);
  return data.id as string;
}

async function cleanupFakeRows(ids: string[]) {
  if (ids.length === 0) return;
  const { error } = await admin.from('activity_log').delete().in('id', ids);
  if (error) console.error('[CLEANUP FAIL]', error);
  else console.log(`[CLEANUP] removed ${ids.length} fake rows`);
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 402, height: 874 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.on('console', (msg: any) => {
    const type = msg.type();
    if (type === 'error') console.log('[BROWSER ERROR]', msg.text());
  });

  const insertedIds: string[] = [];

  try {
    await login(page);

    // Open home and wait for the feed rail + realtime socket to be ready.
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);

    // Screenshot 01: baseline — feed present, no pill
    await page.screenshot({
      path: path.join(screenshotDir, '01-home-baseline.png'),
      fullPage: true,
    });
    console.log('[CAPTURE] 01-home-baseline');

    // ── Trigger 1 fake activity → expect pill with count 1 after ~2.5s ──
    insertedIds.push(await insertFakeActivity('single-event'));
    await page.waitForTimeout(3500);
    await page.screenshot({
      path: path.join(screenshotDir, '02-after-single-event.png'),
      fullPage: true,
    });
    console.log('[CAPTURE] 02-after-single-event (expect pill +1)');

    // ── Trigger 3 more events in a burst → expect pill to show 4 total ──
    insertedIds.push(await insertFakeActivity('burst-1'));
    insertedIds.push(await insertFakeActivity('burst-2'));
    insertedIds.push(await insertFakeActivity('burst-3'));
    await page.waitForTimeout(3500);
    await page.screenshot({
      path: path.join(screenshotDir, '03-after-burst.png'),
      fullPage: true,
    });
    console.log('[CAPTURE] 03-after-burst (expect pill +4 total)');

    // ── Click the pill → counter resets, feed refetches ──
    const pill = page.locator('button', { hasText: /neue Aktivit/i }).first();
    if (await pill.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pill.click();
      await page.waitForTimeout(2500);
      await page.screenshot({
        path: path.join(screenshotDir, '04-after-pill-click.png'),
        fullPage: true,
      });
      console.log('[CAPTURE] 04-after-pill-click (pill gone, feed updated)');
    } else {
      console.log('[PILL] NOT VISIBLE — capturing anyway for debugging');
      await page.screenshot({
        path: path.join(screenshotDir, '04-pill-missing.png'),
        fullPage: true,
      });
    }
  } catch (err) {
    console.error(err);
    await page.screenshot({
      path: path.join(screenshotDir, 'debug-error.png'),
      fullPage: true,
    });
  } finally {
    await cleanupFakeRows(insertedIds);
    await context.close();
    await browser.close();
  }
  console.log('[DONE] screenshots in', screenshotDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
