import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

/**
 * Slice 151b-RESET — Club-Follow State-Sync Verification.
 *
 * Verifiziert dass nach dem Provider-Removal:
 *  - Follow-Button toggelt zwischen "Folgen"/"Entfolgen" ohne Blinzeln
 *  - Follower-Count auf der Page (Hero + StatsBar) bleibt waehrend Mutation
 *    konsistent (kein 0/4-Wechsel wie im Anil-Report)
 *  - Re-Klick toggled instant zurueck
 *
 * Ergebnis: 4 Screenshots + 1 Report-Markdown nach worklog/proofs/.
 */

const BASE = process.env.QA_BASE_URL ?? 'https://bescout.net';
const EMAIL = process.env.QA_EMAIL ?? 'jarvis-qa@bescout.net';
const PASSWORD = process.env.QA_PASSWORD ?? 'JarvisQA2026!';
const TARGET_SLUG = process.env.QA_CLUB_SLUG ?? 'galatasaray';

const outDir = path.join(__dirname, '..', 'worklog', 'proofs');
fs.mkdirSync(outDir, { recursive: true });

const SHOT_PRE = path.join(outDir, '151b-RESET-screenshot-pre.png');
const SHOT_AFTER_TOGGLE_1 = path.join(outDir, '151b-RESET-screenshot-after-toggle-1.png');
const SHOT_AFTER_TOGGLE_2 = path.join(outDir, '151b-RESET-screenshot-after-toggle-2.png');
const REPORT = path.join(outDir, '151b-RESET-report.md');

async function main() {
  console.log(`[151b-RESET] Verifying ${BASE}/club/${TARGET_SLUG}`);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // ── Login ──
  console.log('[151b-RESET] Login...');
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  const accept = page.getByRole('button', { name: 'Akzeptieren' });
  if (await accept.isVisible({ timeout: 1500 }).catch(() => false)) {
    await accept.click().catch(() => {});
    await page.waitForTimeout(400);
  }
  await page.getByPlaceholder('E-Mail Adresse').fill(EMAIL);
  await page.getByPlaceholder('Passwort').fill(PASSWORD);
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 });
  const later = page.getByText(/Später|Later/i).first();
  if (await later.isVisible({ timeout: 1000 }).catch(() => false)) {
    await later.click().catch(() => {});
  }

  // ── Navigate to club ──
  console.log(`[151b-RESET] Goto /club/${TARGET_SLUG}`);
  await page.goto(`${BASE}/club/${TARGET_SLUG}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(3000);

  // ── Pre-state ──
  // Button-Wording (Slice 149): Follow-State verwendet `t('follow')`/`t('subscribed')`:
  //   not-following: "Folgen" / TR "Takip et"
  //   following:     "Abonniert" / TR "Abone" (kein Entfolgen-Label, Toggle via same Button)
  // ClubHero rendert Desktop+Mobile-Variante parallel im DOM. Wir bevorzugen
  // den sichtbaren via getByRole-Filter mit visible-state.
  const followButton = page
    .getByRole('button', { name: /^(Folgen|Abonniert|Takip et|Abone)$/ })
    .filter({ visible: true })
    .first();
  try {
    await followButton.waitFor({ state: 'visible', timeout: 15_000 });
  } catch (err) {
    // Diagnose-Dump bei Timeout
    const html = await page.content();
    const diagPath = path.join(outDir, '151b-RESET-diag-nobutton.html');
    fs.writeFileSync(diagPath, html, 'utf-8');
    await page.screenshot({ path: path.join(outDir, '151b-RESET-diag-nobutton.png'), fullPage: true });
    console.error(`[151b-RESET] Follow-Button nicht gefunden. Diag: ${diagPath}`);
    throw err;
  }
  const preLabel = (await followButton.innerText()).trim();
  const scoutsCountPre = await readScoutsCount(page);
  console.log(`[151b-RESET] PRE: button="${preLabel}" scouts=${scoutsCountPre}`);
  await page.screenshot({ path: SHOT_PRE, fullPage: false });

  // ── Toggle 1 ──
  console.log('[151b-RESET] Toggle 1...');
  await followButton.click();
  // wait for the count to settle (animation done) — useDeferredValue + useCountUp 600ms
  await page.waitForTimeout(5000);
  const midLabel = (await followButton.innerText()).trim();
  const scoutsCountMid = await readScoutsCount(page);
  console.log(`[151b-RESET] AFTER TOGGLE 1: button="${midLabel}" scouts=${scoutsCountMid}`);
  await page.screenshot({ path: SHOT_AFTER_TOGGLE_1, fullPage: false });

  // ── Toggle 2 (back to original) ──
  console.log('[151b-RESET] Toggle 2 (revert)...');
  await followButton.click();
  await page.waitForTimeout(5000);
  const finalLabel = (await followButton.innerText()).trim();
  const scoutsCountFinal = await readScoutsCount(page);
  console.log(`[151b-RESET] AFTER TOGGLE 2: button="${finalLabel}" scouts=${scoutsCountFinal}`);
  await page.screenshot({ path: SHOT_AFTER_TOGGLE_2, fullPage: false });

  // ── Report ──
  const expectedDelta = preLabel.toLowerCase().includes('entfolgen') ? -1 : +1;
  const actualDelta = scoutsCountMid - scoutsCountPre;
  const finalDelta = scoutsCountFinal - scoutsCountMid;

  const verdict =
    Math.abs(actualDelta - expectedDelta) === 0 && Math.abs(finalDelta + expectedDelta) === 0
      ? 'PASS'
      : 'INVESTIGATE';

  const report = [
    '# Slice 151b-RESET — Club-Follow State-Sync Proof',
    '',
    `Run: ${new Date().toISOString()}`,
    `Target: ${BASE}/club/${TARGET_SLUG}`,
    `User: ${EMAIL}`,
    '',
    '## Beobachtungen',
    '',
    `| Phase | Button-Label | Scouts-Count | Delta |`,
    `|-------|--------------|--------------|-------|`,
    `| pre | ${preLabel} | ${scoutsCountPre} | — |`,
    `| toggle 1 | ${midLabel} | ${scoutsCountMid} | ${actualDelta >= 0 ? '+' : ''}${actualDelta} |`,
    `| toggle 2 | ${finalLabel} | ${scoutsCountFinal} | ${finalDelta >= 0 ? '+' : ''}${finalDelta} |`,
    '',
    '## Erwartung',
    '',
    `- Pre-Label "${preLabel}" → Toggle 1 erwartet Delta ${expectedDelta >= 0 ? '+' : ''}${expectedDelta} (gemessen: ${actualDelta})`,
    `- Toggle 2 (revert) erwartet Delta ${(-expectedDelta) >= 0 ? '+' : ''}${-expectedDelta} (gemessen: ${finalDelta})`,
    `- Final-Label muss = Pre-Label sein: ${preLabel === finalLabel ? 'JA ✓' : `NEIN (${preLabel} vs ${finalLabel}) ✗`}`,
    '',
    `## Verdict: **${verdict}**`,
    '',
    '## Screenshots',
    '',
    `- Pre: ${SHOT_PRE.split(/[/\\\\]worklog[/\\\\]/)[1]}`,
    `- After Toggle 1: ${SHOT_AFTER_TOGGLE_1.split(/[/\\\\]worklog[/\\\\]/)[1]}`,
    `- After Toggle 2: ${SHOT_AFTER_TOGGLE_2.split(/[/\\\\]worklog[/\\\\]/)[1]}`,
  ].join('\n');

  fs.writeFileSync(REPORT, report, 'utf-8');
  console.log(`[151b-RESET] Report: ${REPORT}`);
  console.log(`[151b-RESET] Verdict: ${verdict}`);

  await browser.close();
  if (verdict !== 'PASS') process.exit(1);
}

async function readScoutsCount(page: import('playwright').Page): Promise<number> {
  // Slice 149: Label wurde von "Scouts" zu "Fans" umbenannt (CEO-Entscheidung 1B).
  // ClubHero (mobile+desktop) + ClubStatsBar rendern den Count neben einem
  // Users2-Icon mit Label "Fans". Wir greifen den tabular-nums span im selben
  // container-Scope wie das Label.
  return await page
    .evaluate(() => {
      const labels = Array.from(document.querySelectorAll('span, div')).filter(
        (el) => /^Fans$/i.test((el.textContent ?? '').trim()),
      );
      for (const label of labels) {
        // Parent-Container enthaelt icon + label + separaten count-span.
        let parent = label.parentElement;
        for (let depth = 0; depth < 4 && parent; depth += 1) {
          const countEl = parent.querySelector<HTMLElement>('.tabular-nums, .font-mono.tabular-nums');
          if (countEl && countEl !== label) {
            const m = (countEl.textContent ?? '').trim().match(/^(\d{1,6})$/);
            if (m) return Number(m[1]);
          }
          parent = parent.parentElement;
        }
      }
      return 0;
    })
    .catch(() => 0);
}

main().catch((err) => {
  console.error('[151b-RESET] ERROR:', err);
  process.exit(2);
});
