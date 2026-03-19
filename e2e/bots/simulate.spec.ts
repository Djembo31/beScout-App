import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { BOTS, BOT_PASSWORD, type BotConfig } from './bot-config';

/**
 * BeScout Bot Simulation
 *
 * Simuliert 5 echte User die gleichzeitig auf der Plattform aktiv sind:
 * - Einloggen
 * - Market durchstoebern
 * - Spieler bewerten und kaufen (IPO oder Marktplatz)
 * - Sell Orders erstellen
 * - Community interagieren
 * - Fantasy Aufstellungen bauen
 *
 * Laueft sequentiell: Jeder Bot macht seine Runde, dann der naechste.
 * So entstehen echte Orderbuch-Interaktionen (Bot B kauft Bot A's Listing).
 */

const BASE_URL = 'http://localhost:3000';

// ── Helpers ──

async function waitForApp(page: Page) {
  await page.waitForLoadState('domcontentloaded', { timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForFunction(() => {
    const root = document.getElementById('__next');
    return root && root.innerHTML.length > 100;
  }, { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Dismiss welcome modal
  const dismissBtn = page.getByText(/Spaeter|Later|Verstanden/i);
  if (await dismissBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dismissBtn.click();
    await page.waitForTimeout(300);
  }
}

async function loginBot(page: Page, bot: BotConfig): Promise<boolean> {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await waitForApp(page);

  // Wait for form to be interactive
  const emailInput = page.getByLabel(/E-Mail|Email/i);
  await expect(emailInput).toBeVisible({ timeout: 30_000 });

  // Wait for React hydration
  await page.waitForFunction(() => {
    const form = document.querySelector('form');
    if (!form) return false;
    const el = form.querySelector('input');
    return el && (
      (el as unknown as Record<string, unknown>).__reactFiber$ !== undefined ||
      Object.keys(el).some(k => k.startsWith('__react'))
    );
  }, { timeout: 30_000 }).catch(() => {});

  await emailInput.fill(bot.email);
  await page.getByLabel(/Passwort|Password/i).fill(BOT_PASSWORD);
  await page.getByRole('button', { name: /Anmelden|Login|Sign/i }).click();

  try {
    await page.waitForURL(/^\/$|\/market|\/home/, { timeout: 30_000 });
  } catch {
    return false;
  }
  await waitForApp(page);

  // Set welcome shown
  await page.evaluate(() => localStorage.setItem('bescout-welcome-shown', '1'));
  return true;
}

async function getBalance(page: Page): Promise<string> {
  const balanceEl = page.locator('[data-tour-id="balance"], :text-matches("\\\\d+.*CR")').first();
  if (await balanceEl.isVisible({ timeout: 3_000 }).catch(() => false)) {
    return (await balanceEl.textContent()) ?? '?';
  }
  return '?';
}

function log(bot: BotConfig, msg: string) {
  const icon = { trader: '💹', manager: '⚽', analyst: '🔍', collector: '🎯', sniper: '🎪' };
  console.log(`${icon[bot.personality]} [${bot.name}] ${msg}`);
}

// ── Bot Actions ──

async function browseMarket(page: Page, bot: BotConfig): Promise<string[]> {
  log(bot, 'Browsing market...');
  await page.goto(`${BASE_URL}/market?tab=marktplatz`, { waitUntil: 'domcontentloaded' });
  await waitForApp(page);

  // Click Marktplatz/Kaufen tab
  const tab = page.getByRole('button', { name: /Marktplatz|Kaufen|Pazar/i });
  if (await tab.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await tab.click();
    await page.waitForTimeout(2000);
  }

  // Collect player links
  const links = page.locator('a[href*="/player/"]');
  const count = await links.count();
  const playerIds: string[] = [];
  const maxPicks = Math.min(count, bot.targetCount);

  for (let i = 0; i < maxPicks; i++) {
    const href = await links.nth(i).getAttribute('href');
    if (href) {
      const match = href.match(/\/player\/([a-f0-9-]+)/);
      if (match) playerIds.push(match[1]);
    }
  }

  log(bot, `Found ${count} players, targeting ${playerIds.length}`);
  return playerIds;
}

async function viewAndBuyPlayer(page: Page, bot: BotConfig, playerId: string): Promise<boolean> {
  log(bot, `Viewing player ${playerId.slice(0, 8)}...`);
  await page.goto(`${BASE_URL}/player/${playerId}`, { waitUntil: 'domcontentloaded' });
  await waitForApp(page);

  // Read player name
  const nameEl = page.locator('h1, h2').first();
  const playerName = await nameEl.textContent().catch(() => 'Unknown');
  log(bot, `Player: ${playerName?.trim()}`);

  // Check price
  const priceEls = page.locator('.text-gold, .gold-glow');
  let priceText = '';
  for (let i = 0; i < await priceEls.count(); i++) {
    const t = await priceEls.nth(i).textContent();
    if (t && /\d/.test(t)) { priceText = t.trim(); break; }
  }
  log(bot, `Price: ${priceText || 'N/A'}`);

  // Try to buy
  const buyBtn = page.getByRole('button', { name: /Kaufen|Verpflichten|Buy/i }).first();
  if (!(await buyBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
    log(bot, 'No buy button visible, skipping');
    return false;
  }
  if (!(await buyBtn.isEnabled())) {
    log(bot, 'Buy button disabled, skipping');
    return false;
  }

  await buyBtn.click();
  await page.waitForTimeout(1500);

  // Check if modal opened
  const modal = page.locator('[role="dialog"]');
  if (!(await modal.isVisible({ timeout: 5_000 }).catch(() => false))) {
    log(bot, 'Modal did not open, skipping');
    return false;
  }

  // Look for a buy/commit button in the modal
  const confirmBtn = page.locator('[role="dialog"] button').filter({ hasText: /Kaufen|Commit|Verpflichten|Buy/i }).first();
  if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    if (await confirmBtn.isEnabled()) {
      await confirmBtn.click();
      await page.waitForTimeout(3000);

      // Check for success toast or message
      const success = page.getByText(/gekauft|Success|Erfolg/i);
      if (await success.isVisible({ timeout: 5_000 }).catch(() => false)) {
        log(bot, `Bought ${playerName?.trim()}!`);
        return true;
      }

      // Check for error
      const error = page.getByText(/Fehler|Error|nicht genug/i);
      if (await error.isVisible({ timeout: 2_000 }).catch(() => false)) {
        const errText = await error.textContent();
        log(bot, `Buy failed: ${errText?.trim()}`);
      }
    }
  }

  // Close modal
  const closeBtn = page.locator('[role="dialog"] button[aria-label*="close"], [role="dialog"] button[aria-label*="Schliessen"]').first();
  if (await closeBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await closeBtn.click();
  } else {
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(500);

  return false;
}

async function placeSellOrder(page: Page, bot: BotConfig, playerId: string): Promise<boolean> {
  if (Math.random() > bot.sellProbability) {
    log(bot, 'Decided not to sell (probability)');
    return false;
  }

  log(bot, `Placing sell order for ${playerId.slice(0, 8)}...`);
  await page.goto(`${BASE_URL}/player/${playerId}`, { waitUntil: 'domcontentloaded' });
  await waitForApp(page);

  // Find sell button
  const sellBtn = page.getByRole('button', { name: /Verkaufen|Sell|Sat/i }).first();
  if (!(await sellBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
    log(bot, 'No sell button');
    return false;
  }

  await sellBtn.click();
  await page.waitForTimeout(1500);

  const modal = page.locator('[role="dialog"]');
  if (!(await modal.isVisible({ timeout: 3_000 }).catch(() => false))) {
    log(bot, 'Sell modal did not open');
    return false;
  }

  // Find price input and set price with markup
  const priceInput = modal.locator('input[type="number"]').nth(1); // Second input (first is qty)
  if (await priceInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    // Use a quick-price button if available (Floor, +5%, etc.)
    const floorBtn = modal.getByRole('button', { name: /Floor|floor/i }).first();
    if (await floorBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await floorBtn.click();
      await page.waitForTimeout(500);
      log(bot, 'Set price to floor');
    } else {
      // Set a manual price
      await priceInput.fill('15');
      log(bot, 'Set price to 15 $SCOUT');
    }

    // Click list/sell button
    const listBtn = modal.getByRole('button', { name: /Listen|Sell|Verkaufen|Erstellen/i }).first();
    if (await listBtn.isVisible({ timeout: 2_000 }).catch(() => false) && await listBtn.isEnabled()) {
      await listBtn.click();
      await page.waitForTimeout(2000);

      const success = page.getByText(/gelistet|Listed|Erfolg/i);
      if (await success.isVisible({ timeout: 3_000 }).catch(() => false)) {
        log(bot, 'Sell order placed!');
        return true;
      }
    }
  }

  await page.keyboard.press('Escape');
  return false;
}

async function browseClubPage(page: Page, bot: BotConfig) {
  log(bot, 'Visiting Sakaryaspor club page...');
  await page.goto(`${BASE_URL}/club/sakaryaspor`, { waitUntil: 'domcontentloaded' });
  await waitForApp(page);

  // Browse squad
  const spielerTab = page.getByRole('tab', { name: /Spieler|Kader|Squad/i });
  if (await spielerTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await spielerTab.click();
    await page.waitForTimeout(2000);
    log(bot, 'Browsed squad roster');
  }
}

async function visitCommunity(page: Page, bot: BotConfig) {
  log(bot, 'Visiting community...');
  await page.goto(`${BASE_URL}/community`, { waitUntil: 'domcontentloaded' });
  await waitForApp(page);

  // Scroll through posts
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(1000);
  log(bot, 'Browsed community feed');
}

async function visitFantasy(page: Page, bot: BotConfig) {
  log(bot, 'Checking fantasy events...');
  await page.goto(`${BASE_URL}/fantasy`, { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await page.waitForTimeout(2000);
  log(bot, 'Checked fantasy page');
}

// ── Main Simulation ──

test.describe('Bot Simulation', () => {
  test.setTimeout(600_000); // 10 min total

  for (const bot of BOTS) {
    test(`${bot.name} (${bot.personality}) — full session`, async ({ browser }) => {
      test.setTimeout(180_000); // 3 min per bot

      // Create fresh context (isolated cookies/storage)
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        // 1. LOGIN
        log(bot, '=== Starting session ===');
        const loggedIn = await loginBot(page, bot);
        if (!loggedIn) {
          log(bot, 'Login failed, skipping');
          test.skip();
          await context.close();
          return;
        }
        const balance = await getBalance(page);
        log(bot, `Logged in. Balance: ${balance}`);

        // 2. BROWSE CLUB
        await browseClubPage(page, bot);

        // 3. BROWSE MARKET & IDENTIFY TARGETS
        const targets = await browseMarket(page, bot);
        log(bot, `Targets: ${targets.length} players`);

        // 4. VIEW & BUY PLAYERS
        const bought: string[] = [];
        for (const pid of targets) {
          const success = await viewAndBuyPlayer(page, bot, pid);
          if (success) bought.push(pid);
          await page.waitForTimeout(1000); // Pacing
        }
        log(bot, `Bought ${bought.length}/${targets.length} players`);

        // 5. SELL ORDERS (if personality trades)
        if (bought.length > 0 && bot.sellProbability > 0) {
          for (const pid of bought) {
            await placeSellOrder(page, bot, pid);
            await page.waitForTimeout(500);
          }
        }

        // 6. COMMUNITY
        await visitCommunity(page, bot);

        // 7. FANTASY
        if (bot.personality === 'manager') {
          await visitFantasy(page, bot);
        }

        // 8. FINAL BALANCE
        await page.goto(`${BASE_URL}/market`, { waitUntil: 'domcontentloaded' });
        await waitForApp(page);
        const finalBalance = await getBalance(page);
        log(bot, `Session complete. Final balance: ${finalBalance}`);
        log(bot, '=== Session ended ===\n');

      } finally {
        await context.close();
      }
    });
  }
});
