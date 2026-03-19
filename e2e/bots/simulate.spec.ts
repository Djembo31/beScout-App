import { test, expect, type Page } from '@playwright/test';
import { BOTS, BOT_PASSWORD, type BotConfig } from './bot-config';
import { BotJournal, saveReports, type BotReport } from './bot-journal';

/**
 * BeScout Bot Simulation
 *
 * 5 Bot-User mit verschiedenen Persoenlichkeiten durchlaufen die Plattform.
 * Jeder Bot fuehrt ein Journal mit Erlebnissen, Bugs und Wuenschen.
 * Am Ende wird ein aggregierter Report generiert.
 *
 * Run: npx playwright test e2e/bots/simulate.spec.ts --workers=1
 */

const BASE_URL = 'http://localhost:3000';
const allReports: BotReport[] = [];

// ── Helpers ──

async function waitForApp(page: Page) {
  await page.waitForLoadState('domcontentloaded', { timeout: 15_000 });
  // Wait for actual React content — nav links, main content, or form elements
  await Promise.race([
    page.locator('nav, [role="navigation"], main, form, [id="main-content"]').first().waitFor({ state: 'visible', timeout: 15_000 }),
    page.locator('a[href="/market"], a[href="/fantasy"], button[type="submit"]').first().waitFor({ state: 'visible', timeout: 15_000 }),
  ]).catch(() => {});
  await page.waitForTimeout(300);

  const dismissBtn = page.getByText(/Spaeter|Later|Verstanden/i);
  if (await dismissBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await dismissBtn.click();
    await page.waitForTimeout(300);
  }
}

async function timedNavigation(page: Page, url: string, journal: BotJournal, pageName: string): Promise<number> {
  const start = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  const elapsed = Date.now() - start;
  journal.timing(pageName, `Navigation ${pageName}`, elapsed);
  return elapsed;
}

async function loginBot(page: Page, bot: BotConfig, journal: BotJournal): Promise<boolean> {
  journal.action('login', 'Navigiere zur Login-Seite');
  const elapsed = await timedNavigation(page, `${BASE_URL}/login`, journal, 'login');

  const emailInput = page.getByLabel(/E-Mail|Email/i);
  const visible = await emailInput.isVisible({ timeout: 30_000 }).catch(() => false);
  if (!visible) {
    journal.bug('login', 'Email-Feld nicht sichtbar nach 30s', 'high');
    return false;
  }

  // Wait for React hydration
  await page.waitForFunction(() => {
    const form = document.querySelector('form');
    if (!form) return false;
    const el = form.querySelector('input');
    return el && Object.keys(el).some(k => k.startsWith('__react'));
  }, { timeout: 30_000 }).catch(() => {
    journal.uxIssue('login', 'React Hydration dauert sehr lange', 'medium');
  });

  journal.action('login', `Login als ${bot.email}`);
  await emailInput.fill(bot.email);
  await page.getByPlaceholder(/Passwort|Password/i).fill(BOT_PASSWORD);
  await page.locator('button[type="submit"]').click();

  try {
    // Wait for redirect — could go to /, /market, /home, or stay on /login with success
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 30_000 });
  } catch {
    // Check if we're still on login but actually logged in (session exists)
    const isStillLogin = page.url().includes('/login');
    if (isStillLogin) {
      // Try navigating manually — login may have succeeded without redirect
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
      await waitForApp(page);
      if (page.url().includes('/login')) {
        journal.bug('login', 'Login fehlgeschlagen — zurueck auf Login-Seite', 'critical');
        return false;
      }
      journal.uxIssue('login', 'Login-Redirect hat nicht funktioniert, musste manuell navigieren', 'medium');
    }
  }

  await waitForApp(page);
  await page.evaluate(() => localStorage.setItem('bescout-welcome-shown', '1'));
  journal.success('login', `Login erfolgreich (${(elapsed / 1000).toFixed(1)}s)`);
  return true;
}

async function getBalance(page: Page, journal: BotJournal, pageName: string): Promise<string> {
  // Look for balance display in various formats
  const selectors = [
    page.locator('text=/\\d[\\d.,]*\\s*CR/').first(),
    page.locator('[class*="font-mono"]').filter({ hasText: /\d/ }).first(),
  ];

  for (const sel of selectors) {
    if (await sel.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const text = await sel.textContent();
      if (text && /\d/.test(text)) return text.trim();
    }
  }
  journal.observe(pageName, 'Konnte Balance nicht ablesen');
  return '?';
}

// ── Bot Actions ──

async function browseMarket(page: Page, bot: BotConfig, journal: BotJournal): Promise<string[]> {
  journal.action('market', 'Oeffne Marktplatz');
  await timedNavigation(page, `${BASE_URL}/market?tab=marktplatz`, journal, 'market');

  // Wait for market tab content to fully hydrate (auth-gated, React Query data)
  // Look for tab bar which confirms the page has rendered
  const tabBar = page.getByRole('tablist');
  await tabBar.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

  // Check if page loaded or shows error
  const errorState = page.getByText(/Daten konnten nicht geladen|Error|Fehler/i);
  if (await errorState.isVisible({ timeout: 2_000 }).catch(() => false)) {
    journal.bug('market', 'Marktplatz zeigt Fehlermeldung beim Laden', 'critical');
    return [];
  }

  // Click Marktplatz tab if not already active
  const marktplatzTab = page.getByRole('tab', { name: /Marktplatz/i });
  if (await marktplatzTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await marktplatzTab.click();
    await page.waitForTimeout(1000);
  }

  // Switch to Transferliste sub-tab where player links exist
  const transferBtn = page.locator('button').filter({ hasText: /Transferliste|Transfer/i }).first();
  if (await transferBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await transferBtn.click();
    await page.waitForTimeout(2000);
    journal.action('market', 'Transferliste Sub-Tab geklickt');
  } else {
    journal.observe('market', 'Transferliste-Button noch nicht sichtbar');
  }

  // Collect player links
  const links = page.locator('a[href*="/player/"]');
  const count = await links.count();
  const playerIds: string[] = [];
  const maxPicks = Math.min(count, bot.targetCount);

  if (count === 0) {
    journal.observe('market', 'Keine Spieler auf dem Marktplatz sichtbar');
    journal.wish('market', 'Als neuer User sehe ich keine kaufbaren Spieler. Ein Hinweis oder Tutorial waere hilfreich.');
  } else {
    journal.observe('market', `${count} Spieler auf dem Marktplatz gefunden`);
  }

  for (let i = 0; i < maxPicks; i++) {
    const href = await links.nth(i).getAttribute('href');
    if (href) {
      const match = href.match(/\/player\/([a-f0-9-]+)/);
      if (match) playerIds.push(match[1]);
    }
  }

  return playerIds;
}

async function viewAndBuyPlayer(page: Page, bot: BotConfig, journal: BotJournal, playerId: string): Promise<boolean> {
  journal.action('player-detail', `Oeffne Spieler ${playerId.slice(0, 8)}`);
  const elapsed = await timedNavigation(page, `${BASE_URL}/player/${playerId}`, journal, 'player-detail');

  // Read player name
  const nameEl = page.locator('h1, h2').first();
  const playerName = (await nameEl.textContent().catch(() => '')) ?? 'Unbekannt';
  journal.observe('player-detail', `Spieler: ${playerName.trim()}`);

  // Check price
  const priceEls = page.locator('.text-gold, .gold-glow');
  let foundPrice = false;
  for (let i = 0; i < await priceEls.count(); i++) {
    const t = await priceEls.nth(i).textContent();
    if (t && /\d/.test(t)) {
      journal.observe('player-detail', `Preis angezeigt: ${t.trim()}`);
      foundPrice = true;
      break;
    }
  }
  if (!foundPrice) {
    journal.bug('player-detail', 'Kein Preis sichtbar fuer diesen Spieler', 'medium');
  }

  // Check for badges
  const badges = page.locator('[class*="rounded-full"], [class*="rounded"]').filter({ hasText: /Angebot|gelistet|Teklif/i });
  if (await badges.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
    const badgeText = await badges.first().textContent();
    journal.observe('player-detail', `Badge: ${badgeText?.trim()}`);
  }

  // Check for Wertentwicklung
  const wert = page.getByText(/Markteintritt|Wertentwicklung/i);
  if (await wert.isVisible({ timeout: 2_000 }).catch(() => false)) {
    journal.observe('player-detail', 'Wertentwicklung wird angezeigt');
  }

  // Try to buy
  const buyBtn = page.getByRole('button', { name: /Kaufen|Verpflichten|Buy/i }).first();
  if (!(await buyBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
    journal.observe('player-detail', 'Kein Kaufen-Button sichtbar');
    if (bot.personality === 'collector') {
      journal.wish('player-detail', 'Ich moechte diesen Spieler kaufen aber es gibt keinen Weg dazu');
    }
    return false;
  }
  if (!(await buyBtn.isEnabled())) {
    journal.observe('player-detail', 'Kaufen-Button deaktiviert');
    return false;
  }

  journal.action('player-detail', `Klicke Kaufen fuer ${playerName.trim()}`);
  await buyBtn.click();
  await page.waitForTimeout(800);

  // Check modal
  const modal = page.locator('[role="dialog"]');
  if (!(await modal.isVisible({ timeout: 5_000 }).catch(() => false))) {
    journal.bug('player-detail', 'Kauf-Modal oeffnet sich nicht nach Klick auf Kaufen', 'high');
    return false;
  }

  journal.observe('buy-modal', 'Kauf-Modal geoeffnet');

  // Check for individual order listings (new feature)
  const orderRows = modal.locator('button').filter({ hasText: /@/ });
  const orderCount = await orderRows.count();
  if (orderCount > 0) {
    journal.observe('buy-modal', `${orderCount} individuelle Verkaufsangebote sichtbar — User kann waehlen`);
    journal.success('buy-modal', 'Orderbook funktioniert: Einzelne Angebote werden angezeigt');
  } else {
    journal.observe('buy-modal', 'Keine individuellen Sell Orders sichtbar');
  }

  // Check for Club Verkauf section
  const clubSale = modal.getByText(/Club.*Verkauf|Clubverkauf|Kulüp/i);
  if (await clubSale.isVisible({ timeout: 2_000 }).catch(() => false)) {
    journal.observe('buy-modal', 'Clubverkauf (IPO) Sektion vorhanden');
  }

  // Try to buy
  const confirmBtn = modal.locator('button').filter({ hasText: /Kaufen|Commit|Verpflichten|Buy/i }).first();
  if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false) && await confirmBtn.isEnabled()) {
    await confirmBtn.click();

    // Buy success: modal may close, or success text appears on page
    const successText = page.getByText(/gekauft|Success|Erfolg/i);
    try {
      await Promise.race([
        modal.waitFor({ state: 'hidden', timeout: 8_000 }),
        successText.waitFor({ state: 'visible', timeout: 8_000 }),
      ]);
      journal.success('buy-modal', `${playerName.trim()} gekauft!`);
      await page.waitForTimeout(500);
      return true;
    } catch {
      // Neither modal closed nor success appeared
      const errorMsg = page.getByText(/Fehler|Error|nicht genug|insufficient/i);
      if (await errorMsg.isVisible({ timeout: 1_000 }).catch(() => false)) {
        const errText = await errorMsg.textContent();
        journal.error('buy-modal', `Kauf fehlgeschlagen: ${errText?.trim()}`);
      } else {
        journal.observe('buy-modal', 'Kein Feedback nach Kauf-Klick');
      }
    }
  } else {
    journal.observe('buy-modal', 'Kaufen-Button im Modal nicht klickbar oder nicht sichtbar');
    const notAfford = modal.getByText(/nicht genug|Guthaben/i);
    if (await notAfford.isVisible({ timeout: 1_000 }).catch(() => false)) {
      journal.observe('buy-modal', 'Nicht genug Guthaben fuer Kauf');
    }
  }

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  return false;
}

async function placeSellOrder(page: Page, bot: BotConfig, journal: BotJournal, playerId: string): Promise<boolean> {
  if (Math.random() > bot.sellProbability) return false;

  journal.action('sell', `Erstelle Verkaufsorder fuer ${playerId.slice(0, 8)}`);
  await timedNavigation(page, `${BASE_URL}/player/${playerId}`, journal, 'player-detail');

  const sellBtn = page.getByRole('button', { name: /Verkaufen|Sell|Sat/i }).first();
  if (!(await sellBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
    journal.observe('sell', 'Kein Verkaufen-Button — halte ich wohl nicht');
    return false;
  }

  await sellBtn.click();
  await page.waitForTimeout(800);

  const modal = page.locator('[role="dialog"]');
  if (!(await modal.isVisible({ timeout: 5_000 }).catch(() => false))) {
    journal.bug('sell', 'Sell-Modal oeffnet sich nicht', 'high');
    return false;
  }

  journal.observe('sell-modal', 'Verkaufs-Modal geoeffnet');

  // Check orientation info (Referenzwert + Gesuch)
  const refWert = modal.getByText(/Referenzwert|Referans/i);
  if (await refWert.isVisible({ timeout: 2_000 }).catch(() => false)) {
    journal.success('sell-modal', 'Referenzwert wird als Orientierung angezeigt');
  } else {
    journal.observe('sell-modal', 'Referenzwert nicht sichtbar');
  }

  const gesuch = modal.getByText(/Gesuch|Hoechstes|talep/i);
  if (await gesuch.isVisible({ timeout: 2_000 }).catch(() => false)) {
    journal.success('sell-modal', 'Hoechstes Kaufgesuch wird angezeigt');
  }

  // Check "Sofort verkaufen" section
  const sofort = modal.getByText(/Sofort verkaufen|Hemen sat/i);
  if (await sofort.isVisible({ timeout: 2_000 }).catch(() => false)) {
    journal.success('sell-modal', 'Sofort-Verkaufen Option vorhanden');
  }

  // Try to set price and list
  const priceInputs = modal.locator('input[type="number"]');
  const priceInputCount = await priceInputs.count();
  if (priceInputCount >= 2) {
    // Use floor button if available
    const floorBtn = modal.getByRole('button', { name: /Floor/i }).first();
    if (await floorBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await floorBtn.click();
      journal.action('sell-modal', 'Floor-Preis gesetzt');
    } else {
      await priceInputs.nth(1).fill('15');
      journal.action('sell-modal', 'Preis manuell auf 15 gesetzt');
    }

    // The footer button uses t('listForPrice') pattern
    const listBtn = modal.locator('button').filter({ hasText: /Listen|Erstellen|Sell|Verkauf|zum Preis/i }).last();
    if (await listBtn.isVisible({ timeout: 2_000 }).catch(() => false) && await listBtn.isEnabled()) {
      await listBtn.click();

      // Modal closes on success (setSellModalOpen(false) in usePlayerTrading)
      // So detect: modal gone = success, error text in modal = failure
      try {
        await modal.waitFor({ state: 'hidden', timeout: 8_000 });
        // Modal closed = sell succeeded
        journal.success('sell-modal', 'Sell Order erfolgreich erstellt!');
        await page.waitForTimeout(500);
        return true;
      } catch {
        // Modal still open — check for error
        const errorMsg = modal.getByText(/Fehler|Error|nicht genug|insufficient|Mindestpreis/i);
        if (await errorMsg.isVisible({ timeout: 1_000 }).catch(() => false)) {
          const errText = await errorMsg.textContent();
          journal.error('sell-modal', `Sell fehlgeschlagen: ${errText?.trim()}`);
        } else {
          journal.observe('sell-modal', 'Modal noch offen aber kein Fehler sichtbar');
        }
      }
    }
  } else if (priceInputCount === 1) {
    // Only qty input visible — might be a different sell modal variant
    journal.observe('sell-modal', 'Nur 1 Input-Feld im Modal (nur Menge, kein Preis?)');
  } else {
    journal.uxIssue('sell-modal', 'Kein Input-Feld im Sell-Modal gefunden', 'medium');
  }

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  return false;
}

async function browseClubPage(page: Page, bot: BotConfig, journal: BotJournal) {
  journal.action('club', 'Besuche Sakaryaspor Vereinsseite');
  await timedNavigation(page, `${BASE_URL}/club/sakaryaspor`, journal, 'club');

  // Wait for player list to load (async data)
  const playerLinks = page.locator('a[href*="/player/"]');
  await playerLinks.first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  const count = await playerLinks.count();
  journal.observe('club', `${count} Spieler-Links auf der Vereinsseite`);

  if (count === 0) {
    journal.bug('club', 'Keine Spieler auf der Vereinsseite sichtbar', 'medium');
  }
}

async function visitCommunity(page: Page, bot: BotConfig, journal: BotJournal) {
  journal.action('community', 'Besuche Community');
  await timedNavigation(page, `${BASE_URL}/community`, journal, 'community');

  const posts = page.locator('[class*="card"], article, [class*="Card"]');
  const postCount = await posts.count();
  journal.observe('community', `${postCount} Posts/Cards in der Community sichtbar`);

  if (postCount === 0) {
    journal.observe('community', 'Community ist leer — keine Posts');
    if (bot.personality === 'analyst') {
      journal.wish('community', 'Als Analyst moechte ich hier Spieler-Analysen teilen, aber die Community wirkt verlassen');
    }
  }
}

async function visitFantasy(page: Page, bot: BotConfig, journal: BotJournal) {
  journal.action('fantasy', 'Besuche Fantasy/Spieltag');
  await timedNavigation(page, `${BASE_URL}/fantasy`, journal, 'fantasy');

  const events = page.locator('[class*="card"], [class*="Card"]').filter({ hasText: /Event|Spieltag|Gameweek/i });
  const eventCount = await events.count();
  journal.observe('fantasy', `${eventCount} Events/Spieltage sichtbar`);

  if (eventCount === 0) {
    journal.observe('fantasy', 'Keine aktiven Events');
    journal.wish('fantasy', 'Ohne aktive Events kann ich als Manager nichts tun. Automatische Events waeren gut.');
  }
}

async function visitPortfolio(page: Page, bot: BotConfig, journal: BotJournal) {
  journal.action('portfolio', 'Besuche Mein Kader');
  await timedNavigation(page, `${BASE_URL}/market?tab=portfolio`, journal, 'portfolio');

  const kaderBtn = page.getByRole('button', { name: /Kader/i });
  if (await kaderBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await kaderBtn.click();
    await page.waitForTimeout(1000);
  }

  // Check for Wertentwicklung badge
  const wertBadge = page.getByText(/Wertentwicklung/i);
  if (await wertBadge.isVisible({ timeout: 3_000 }).catch(() => false)) {
    journal.success('portfolio', 'Wertentwicklung Badge sichtbar im Portfolio');
  }

  // Check for holdings
  const holdings = page.locator('a[href*="/player/"]');
  const holdingCount = await holdings.count();
  journal.observe('portfolio', `${holdingCount} Spieler im Portfolio`);
}

// ── Main Simulation ──

test.describe('Bot Simulation', () => {
  test.setTimeout(1800_000); // 30 min total

  for (const bot of BOTS) {
    test(`${bot.name} (${bot.personality})`, async ({ browser }) => {
      test.setTimeout(300_000); // 5 min per bot

      const journal = new BotJournal(bot);
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        // 1. LOGIN
        const loggedIn = await loginBot(page, bot, journal);
        if (!loggedIn) {
          journal.generateWishes();
          allReports.push(journal.getReport());
          test.skip();
          await context.close();
          return;
        }

        journal.balanceBefore = await getBalance(page, journal, 'home');

        // 2. BROWSE CLUB
        await browseClubPage(page, bot, journal);

        // 3. BROWSE MARKET
        const targets = await browseMarket(page, bot, journal);

        // 4. VIEW & BUY PLAYERS
        const bought: string[] = [];
        for (const pid of targets) {
          const success = await viewAndBuyPlayer(page, bot, journal, pid);
          if (success) bought.push(pid);
          await page.waitForTimeout(800);
        }

        // 5. SELL ORDERS
        for (const pid of bought) {
          await placeSellOrder(page, bot, journal, pid);
          await page.waitForTimeout(500);
        }

        // 6. COMMUNITY
        await visitCommunity(page, bot, journal);

        // 7. FANTASY (manager personality)
        if (bot.personality === 'manager' || bot.personality === 'analyst') {
          await visitFantasy(page, bot, journal);
        }

        // 8. PORTFOLIO CHECK
        await visitPortfolio(page, bot, journal);

        // 9. FINAL BALANCE
        journal.balanceAfter = await getBalance(page, journal, 'portfolio');

      } finally {
        journal.generateWishes(); // ensure wishes even on early exit
        const report = journal.getReport();
        allReports.push(report);
        await context.close();

        // Save per-bot report IMMEDIATELY (don't rely on afterAll)
        saveReports(allReports);

        // Log summary
        console.log(`\n${'='.repeat(50)}`);
        console.log(`${bot.name} (${bot.personality}) — Session Report`);
        console.log(`${'='.repeat(50)}`);
        console.log(`Duration: ${report.durationMs ? (report.durationMs / 1000).toFixed(0) + 's' : '?'}`);
        console.log(`Balance: ${report.balanceBefore ?? '?'} → ${report.balanceAfter ?? '?'}`);
        console.log(`Bought: ${report.summary.playersBought} | Sold: ${report.summary.sellOrdersPlaced}`);
        console.log(`Bugs: ${report.summary.bugs} | UX Issues: ${report.summary.uxIssues} | Wishes: ${report.summary.wishes}`);
        console.log(`Pages: ${report.summary.pagesVisited.join(', ')}`);
      }
    });
  }

  // After all bots, save combined report
  test.afterAll(() => {
    if (allReports.length > 0) {
      saveReports(allReports);
    }
  });
});
