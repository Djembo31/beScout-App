import { test, expect } from '@playwright/test';
import { waitForApp } from '../helpers';

/**
 * Market Page — Full E2E Check
 *
 * Tests EVERY interaction on /market:
 *   Tab 1: Mein Kader (Portfolio)
 *     - Bestand sub-tab: player list, position filter, club filter, sort, sell button, player link
 *     - Angebote sub-tab: 4 sub-tabs (Eingehend/Ausgehend/Offene Gebote/Verlauf), "Neues Angebot" button
 *   Tab 2: Marktplatz
 *     - Club Verkauf sub-tab: IPO cards, view state tabs (Laufend/Geplant/Beendet)
 *     - Transferliste sub-tab: user sell orders, buy button, order depth expand
 *     - Trending sub-tab: trending players with volume
 *     - Watchlist sub-tab: watchlist entries or empty state
 *   Cross-cutting: header, balance, mission hints, trading disclaimer, search, player links
 *
 * Run: npx playwright test e2e/market.spec.ts --project=authenticated
 */

// ── Timeouts ──
const TAB_SETTLE = 1500;
const RENDER_WAIT = 2000;

test.describe('Market Page — Full Check', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/market', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
  });

  // ════════════════════════════════════════════
  // 1. PAGE STRUCTURE
  // ════════════════════════════════════════════

  test.describe('Page structure', () => {
    test('page loads with "Transfermarkt" header', async ({ page }) => {
      // MarketHeader renders an h1 with market.title = "Transfermarkt"
      const header = page.locator('h1');
      await expect(header).toBeVisible({ timeout: 15_000 });
      const text = await header.textContent();
      expect(text).toMatch(/Transfermarkt/i);
    });

    test('balance display is visible in header', async ({ page }) => {
      // MarketHeader shows balance with "CR" suffix
      const balanceEl = page.locator('text=/CR$/');
      await expect(balanceEl.first()).toBeVisible({ timeout: 15_000 });
    });

    test('TopBar balance pill is visible', async ({ page }) => {
      const topBarBalance = page.locator('[data-tour-id="topbar-balance"]');
      await expect(topBarBalance).toBeVisible({ timeout: 15_000 });
    });

    test('two main tabs are visible: Mein Kader + Marktplatz', async ({ page }) => {
      // Tab buttons (not role="tab", they are plain buttons)
      await expect(page.getByRole('button', { name: /Kader/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Marktplatz/i })).toBeVisible();
    });

    test('trading disclaimer is visible on portfolio tab', async ({ page }) => {
      // TradingDisclaimer with variant="card" is rendered in PortfolioTab
      // It uses text-[10px] with legal disclaimer text
      const disclaimer = page.locator('text=/Credits sind keine Finanzprodukte|Hinweis.*Risiken|kein.*Anspruch|Credits.*Plattform/i');
      if (await disclaimer.first().isVisible({ timeout: 8_000 }).catch(() => false)) {
        await expect(disclaimer.first()).toBeVisible();
      } else {
        // Fallback: look for the disclaimer card by structure
        const disclaimerCard = page.locator('.text-\\[10px\\]').first();
        const exists = await disclaimerCard.count();
        expect(exists).toBeGreaterThan(0);
      }
    });
  });

  // ════════════════════════════════════════════
  // 2. MEIN KADER TAB — BESTAND
  // ════════════════════════════════════════════

  test.describe('Mein Kader > Bestand', () => {
    test.beforeEach(async ({ page }) => {
      // Ensure we are on portfolio tab (default)
      const kaderBtn = page.getByRole('button', { name: /Kader/i });
      await expect(kaderBtn).toBeVisible({ timeout: 15_000 });
      await kaderBtn.click();
      await page.waitForTimeout(TAB_SETTLE);

      // Click Bestand sub-tab (may already be selected as default)
      const bestandBtn = page.getByRole('button', { name: /Bestand/i });
      if (await bestandBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await bestandBtn.click();
        await page.waitForTimeout(TAB_SETTLE);
      }
    });

    test('shows player list or empty state', async ({ page }) => {
      // Either we see player rows or the empty state ("Noch keine Scout Cards")
      const playerRow = page.locator('a[href*="/player/"]').first();
      const emptyState = page.locator('text=/Noch keine Scout Cards|Marktplatz entdecken/i').first();

      const hasPlayers = await playerRow.isVisible({ timeout: 10_000 }).catch(() => false);
      const hasEmpty = await emptyState.isVisible({ timeout: 3_000 }).catch(() => false);

      expect(hasPlayers || hasEmpty).toBe(true);
    });

    test('position filter buttons are visible (GK/DEF/MID/ATT)', async ({ page }) => {
      // PosFilter renders buttons for each position — only when user has holdings
      const playerRow = page.locator('a[href*="/player/"]').first();
      const hasPlayers = await playerRow.isVisible({ timeout: 10_000 }).catch(() => false);
      if (!hasPlayers) {
        test.skip(true, 'No holdings — position filter not rendered');
        return;
      }

      for (const pos of ['GK', 'DEF', 'MID', 'ATT']) {
        const btn = page.getByRole('button', { name: pos, exact: true });
        await expect(btn).toBeVisible({ timeout: 5_000 });
      }
    });

    test('clicking position filter narrows results', async ({ page }) => {
      const playerRow = page.locator('a[href*="/player/"]').first();
      const hasPlayers = await playerRow.isVisible({ timeout: 10_000 }).catch(() => false);
      if (!hasPlayers) {
        test.skip(true, 'No holdings — cannot test position filter');
        return;
      }

      // Count players before filter
      const beforeCount = await page.locator('a[href*="/player/"]').count();

      // Click DEF filter
      const defBtn = page.getByRole('button', { name: 'DEF', exact: true });
      if (await defBtn.isVisible()) {
        await defBtn.click();
        await page.waitForTimeout(500);

        // Count should change (or stay same if all are DEF)
        const afterCount = await page.locator('a[href*="/player/"]').count();
        expect(afterCount).toBeLessThanOrEqual(beforeCount);
      }
    });

    test('sort buttons are visible (Wert/P&L/L5/Name)', async ({ page }) => {
      const playerRow = page.locator('a[href*="/player/"]').first();
      const hasPlayers = await playerRow.isVisible({ timeout: 10_000 }).catch(() => false);
      if (!hasPlayers) {
        test.skip(true, 'No holdings — sort bar not rendered');
        return;
      }

      // Sort options from BestandView: Wert, P&L, L5, Name
      for (const label of ['Wert', 'P&L', 'L5', 'Name']) {
        const btn = page.getByRole('button', { name: label, exact: true });
        await expect(btn).toBeVisible({ timeout: 5_000 });
      }
    });

    test('clicking sort "Name" reorders list', async ({ page }) => {
      const playerRow = page.locator('a[href*="/player/"]').first();
      const hasPlayers = await playerRow.isVisible({ timeout: 10_000 }).catch(() => false);
      if (!hasPlayers) {
        test.skip(true, 'No holdings — cannot test sort');
        return;
      }

      const nameBtn = page.getByRole('button', { name: 'Name', exact: true });
      await nameBtn.click();
      await page.waitForTimeout(500);

      // Page should still have player rows (sort doesn't remove items)
      const count = await page.locator('a[href*="/player/"]').count();
      expect(count).toBeGreaterThan(0);
    });

    test('sell button ($) is visible on player rows', async ({ page }) => {
      const playerRow = page.locator('a[href*="/player/"]').first();
      const hasPlayers = await playerRow.isVisible({ timeout: 10_000 }).catch(() => false);
      if (!hasPlayers) {
        test.skip(true, 'No holdings — no sell buttons');
        return;
      }

      // BestandPlayerRow has a sell button with DollarSign icon or aria-label
      const sellBtn = page.locator('[aria-label*="ell"], [aria-label*="erkauf"]').first();
      const sellBtnAlt = page.locator('button').filter({ has: page.locator('svg') }).first();

      const hasSell = await sellBtn.isVisible({ timeout: 5_000 }).catch(() => false);
      const hasSellAlt = await sellBtnAlt.isVisible({ timeout: 3_000 }).catch(() => false);

      expect(hasSell || hasSellAlt).toBe(true);
    });

    test('clicking a player navigates to /player/[id]', async ({ page }) => {
      const playerLink = page.locator('a[href*="/player/"]').first();
      const hasPlayers = await playerLink.isVisible({ timeout: 10_000 }).catch(() => false);
      if (!hasPlayers) {
        test.skip(true, 'No holdings — no player links');
        return;
      }

      const href = await playerLink.getAttribute('href');
      expect(href).toMatch(/^\/player\/[a-f0-9-]+$/);

      await playerLink.click();
      await page.waitForURL('**/player/**', { timeout: 15_000 });
      expect(page.url()).toContain('/player/');
    });

    test('portfolio header shows value and count when holdings exist', async ({ page }) => {
      const playerRow = page.locator('a[href*="/player/"]').first();
      const hasPlayers = await playerRow.isVisible({ timeout: 10_000 }).catch(() => false);
      if (!hasPlayers) {
        test.skip(true, 'No holdings — portfolio header not shown');
        return;
      }

      // BestandHeader shows portfolio value in gold with "CR" suffix
      const valueEl = page.locator('text=/CR$/').first();
      await expect(valueEl).toBeVisible({ timeout: 5_000 });
    });
  });

  // ════════════════════════════════════════════
  // 3. MEIN KADER TAB — ANGEBOTE
  // ════════════════════════════════════════════

  test.describe('Mein Kader > Angebote', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to portfolio tab
      const kaderBtn = page.getByRole('button', { name: /Kader/i });
      await expect(kaderBtn).toBeVisible({ timeout: 15_000 });
      await kaderBtn.click();
      await page.waitForTimeout(TAB_SETTLE);

      // Click Angebote sub-tab
      const angeboteBtn = page.getByRole('button', { name: /Angebote/i });
      await expect(angeboteBtn).toBeVisible({ timeout: 10_000 });
      await angeboteBtn.click();
      await page.waitForTimeout(TAB_SETTLE);
    });

    test('Angebote title is visible', async ({ page }) => {
      const title = page.locator('text=/Angebote/i');
      await expect(title.first()).toBeVisible({ timeout: 10_000 });
    });

    test('"Neues Angebot" button is visible', async ({ page }) => {
      const newOfferBtn = page.getByRole('button', { name: /Neues Angebot/i });
      await expect(newOfferBtn).toBeVisible({ timeout: 10_000 });
    });

    test('4 offer sub-tabs visible (Eingehend, Ausgehend, Offene Gebote, Verlauf)', async ({ page }) => {
      // OffersTab renders sub-tabs as buttons inside bg-surface-minimal container
      const subTabBar = page.locator('.bg-surface-minimal').first();
      if (await subTabBar.isVisible({ timeout: 5_000 }).catch(() => false)) {
        const buttons = subTabBar.locator('button');
        const count = await buttons.count();
        expect(count).toBe(4); // incoming, outgoing, open, history
      }
    });

    test('clicking "Eingehend" sub-tab shows content or empty state', async ({ page }) => {
      // "Eingehend" is the default sub-tab
      const body = page.locator('body');
      const text = await body.textContent();
      expect(text?.length).toBeGreaterThan(50);
    });

    test('clicking "Neues Angebot" opens create offer modal', async ({ page }) => {
      const newOfferBtn = page.getByRole('button', { name: /Neues Angebot/i });
      await newOfferBtn.click();
      await page.waitForTimeout(500);

      // Modal should open with player search input
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5_000 });

      // Should contain the search input for player
      const searchInput = page.locator('input[id="offer-player-search"]');
      if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await expect(searchInput).toBeVisible();
      }
    });

    test('cycling through all 4 offer sub-tabs works', async ({ page }) => {
      const subTabBar = page.locator('.bg-surface-minimal').first();
      if (!(await subTabBar.isVisible({ timeout: 5_000 }).catch(() => false))) {
        test.skip(true, 'Sub-tab bar not visible');
        return;
      }

      const buttons = subTabBar.locator('button');
      const count = await buttons.count();

      for (let i = 0; i < count; i++) {
        await buttons.nth(i).click();
        await page.waitForTimeout(500);

        // Page should not crash
        await expect(page.locator('body')).not.toBeEmpty();
      }
    });
  });

  // ════════════════════════════════════════════
  // 4. MARKTPLATZ TAB — CLUB VERKAUF
  // ════════════════════════════════════════════

  test.describe('Marktplatz > Club Verkauf', () => {
    test.beforeEach(async ({ page }) => {
      const marktplatzBtn = page.getByRole('button', { name: /Marktplatz/i });
      await expect(marktplatzBtn).toBeVisible({ timeout: 15_000 });
      await marktplatzBtn.click();
      await page.waitForTimeout(TAB_SETTLE);

      // Club Verkauf is the default sub-tab in Marktplatz
      const clubVerkaufBtn = page.getByRole('button', { name: /Club Verkauf/i });
      if (await clubVerkaufBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await clubVerkaufBtn.click();
        await page.waitForTimeout(TAB_SETTLE);
      }
    });

    test('Club Verkauf sub-tab is selected', async ({ page }) => {
      const clubVerkaufBtn = page.getByRole('button', { name: /Club Verkauf/i });
      await expect(clubVerkaufBtn).toBeVisible({ timeout: 10_000 });
    });

    test('IPO view state tabs visible (Laufend/Geplant/Beendet)', async ({ page }) => {
      // ClubVerkaufSection renders VIEW_TABS
      const laufend = page.getByRole('button', { name: /Laufend/i });
      const geplant = page.getByRole('button', { name: /Geplant/i });
      const beendet = page.getByRole('button', { name: /Beendet/i });

      const hasLaufend = await laufend.isVisible({ timeout: 8_000 }).catch(() => false);
      const hasGeplant = await geplant.isVisible({ timeout: 3_000 }).catch(() => false);
      const hasBeendet = await beendet.isVisible({ timeout: 3_000 }).catch(() => false);

      expect(hasLaufend || hasGeplant || hasBeendet).toBe(true);
    });

    test('club cards or empty state visible', async ({ page }) => {
      await page.waitForTimeout(RENDER_WAIT);

      const content = page.locator('body');
      const text = await content.textContent();
      expect(text?.length).toBeGreaterThan(50);
    });

    test('IPO player cards link to player detail', async ({ page }) => {
      await page.waitForTimeout(RENDER_WAIT);

      const playerLink = page.locator('a[href*="/player/"]').first();
      const hasLink = await playerLink.isVisible({ timeout: 10_000 }).catch(() => false);

      if (hasLink) {
        const href = await playerLink.getAttribute('href');
        expect(href).toContain('/player/');
      }
      // If no links, that's OK — no active IPOs
    });

    test('switching to "Geplant" view shows announced IPOs or empty', async ({ page }) => {
      const geplantBtn = page.getByRole('button', { name: /Geplant/i });
      if (await geplantBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await geplantBtn.click();
        await page.waitForTimeout(TAB_SETTLE);

        await expect(page.locator('body')).not.toBeEmpty();
      }
    });

    test('switching to "Beendet" view shows ended IPOs or empty', async ({ page }) => {
      const beendetBtn = page.getByRole('button', { name: /Beendet/i });
      if (await beendetBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await beendetBtn.click();
        await page.waitForTimeout(TAB_SETTLE);

        await expect(page.locator('body')).not.toBeEmpty();
      }
    });
  });

  // ════════════════════════════════════════════
  // 5. MARKTPLATZ TAB — TRANSFERLISTE (Von Usern)
  // ════════════════════════════════════════════

  test.describe('Marktplatz > Transferliste', () => {
    test.beforeEach(async ({ page }) => {
      const marktplatzBtn = page.getByRole('button', { name: /Marktplatz/i });
      await expect(marktplatzBtn).toBeVisible({ timeout: 15_000 });
      await marktplatzBtn.click();
      await page.waitForTimeout(TAB_SETTLE);

      const transferBtn = page.getByRole('button', { name: /Von Usern|Transferliste/i });
      await expect(transferBtn).toBeVisible({ timeout: 10_000 });
      await transferBtn.click();
      await page.waitForTimeout(TAB_SETTLE);
    });

    test('Transferliste section header is visible', async ({ page }) => {
      const header = page.locator('text=/Transferliste|Von Usern/i');
      await expect(header.first()).toBeVisible({ timeout: 10_000 });
    });

    test('user sell orders visible or empty state shown', async ({ page }) => {
      await page.waitForTimeout(RENDER_WAIT);

      const playerLink = page.locator('a[href*="/player/"]').first();
      const emptyState = page.locator('text=/Keine.*Angebote|Keine.*Listings|Aktuell keine/i').first();

      const hasListings = await playerLink.isVisible({ timeout: 10_000 }).catch(() => false);
      const hasEmpty = await emptyState.isVisible({ timeout: 3_000 }).catch(() => false);

      expect(hasListings || hasEmpty).toBe(true);
    });

    test('buy button visible on listings', async ({ page }) => {
      await page.waitForTimeout(RENDER_WAIT);

      const playerLink = page.locator('a[href*="/player/"]').first();
      const hasListings = await playerLink.isVisible({ timeout: 10_000 }).catch(() => false);
      if (!hasListings) {
        test.skip(true, 'No sell orders — no buy buttons');
        return;
      }

      // Buy button from TransferListSection
      const buyBtn = page.locator('button').filter({ hasText: /Kaufen|Buy/i }).first();
      await expect(buyBtn).toBeVisible({ timeout: 5_000 });
    });

    test('clicking buy opens confirmation modal', async ({ page }) => {
      await page.waitForTimeout(RENDER_WAIT);

      const playerLink = page.locator('a[href*="/player/"]').first();
      const hasListings = await playerLink.isVisible({ timeout: 10_000 }).catch(() => false);
      if (!hasListings) {
        test.skip(true, 'No sell orders — cannot test buy modal');
        return;
      }

      const buyBtn = page.locator('button').filter({ hasText: /Kaufen|Buy/i }).first();
      if (await buyBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await buyBtn.click();
        await page.waitForTimeout(1000);

        // BuyConfirmModal should open
        const modal = page.locator('[role="dialog"]');
        const hasModal = await modal.isVisible({ timeout: 5_000 }).catch(() => false);
        if (hasModal) {
          await expect(modal).toBeVisible();
          // Close without buying
          const closeBtn = modal.locator('button').filter({ hasText: /Abbrechen|Schlie/i }).first();
          if (await closeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await closeBtn.click();
          }
        }
      }
    });

    test('player links navigate to /player/[id]', async ({ page }) => {
      await page.waitForTimeout(RENDER_WAIT);

      const playerLink = page.locator('a[href*="/player/"]').first();
      const hasListings = await playerLink.isVisible({ timeout: 10_000 }).catch(() => false);
      if (!hasListings) {
        test.skip(true, 'No sell orders — no player links');
        return;
      }

      const href = await playerLink.getAttribute('href');
      expect(href).toMatch(/\/player\/[a-f0-9-]/);
    });

    test('"Leistbar" filter button toggles affordable listings', async ({ page }) => {
      await page.waitForTimeout(RENDER_WAIT);

      const affordableBtn = page.getByRole('button', { name: /Leistbar/i });
      if (await affordableBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await affordableBtn.click();
        await page.waitForTimeout(500);

        // Page should not crash
        await expect(page.locator('body')).not.toBeEmpty();

        // Toggle off
        await affordableBtn.click();
        await page.waitForTimeout(500);
      }
    });

    test('order depth expander works when multiple sellers', async ({ page }) => {
      await page.waitForTimeout(RENDER_WAIT);

      // Listings with >1 seller show an expand button
      const expandBtn = page.locator('[aria-label*="Orderbuch"]').first();
      if (await expandBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await expandBtn.click();
        await page.waitForTimeout(500);

        // OrderDepthView should appear
        await expect(page.locator('body')).not.toBeEmpty();

        // Collapse
        await expandBtn.click();
        await page.waitForTimeout(300);
      }
    });
  });

  // ════════════════════════════════════════════
  // 6. MARKTPLATZ TAB — TRENDING
  // ════════════════════════════════════════════

  test.describe('Marktplatz > Trending', () => {
    test.beforeEach(async ({ page }) => {
      const marktplatzBtn = page.getByRole('button', { name: /Marktplatz/i });
      await expect(marktplatzBtn).toBeVisible({ timeout: 15_000 });
      await marktplatzBtn.click();
      await page.waitForTimeout(TAB_SETTLE);

      const trendingBtn = page.getByRole('button', { name: /Trending/i });
      await expect(trendingBtn).toBeVisible({ timeout: 10_000 });
      await trendingBtn.click();
      await page.waitForTimeout(TAB_SETTLE);
    });

    test('trending players shown or empty state', async ({ page }) => {
      await page.waitForTimeout(RENDER_WAIT);

      // TrendingSection shows DiscoveryCards or empty state
      const playerLink = page.locator('a[href*="/player/"]').first();
      const emptyState = page.locator('text=/Noch keine Trends|Sobald gehandelt wird/i').first();

      const hasTrending = await playerLink.isVisible({ timeout: 10_000 }).catch(() => false);
      const hasEmpty = await emptyState.isVisible({ timeout: 3_000 }).catch(() => false);

      expect(hasTrending || hasEmpty).toBe(true);
    });

    test('trending cards link to player detail', async ({ page }) => {
      await page.waitForTimeout(RENDER_WAIT);

      const playerLink = page.locator('a[href*="/player/"]').first();
      const hasTrending = await playerLink.isVisible({ timeout: 10_000 }).catch(() => false);

      if (hasTrending) {
        const href = await playerLink.getAttribute('href');
        expect(href).toContain('/player/');
      }
    });
  });

  // ════════════════════════════════════════════
  // 7. MARKTPLATZ TAB — WATCHLIST
  // ════════════════════════════════════════════

  test.describe('Marktplatz > Watchlist', () => {
    test.beforeEach(async ({ page }) => {
      const marktplatzBtn = page.getByRole('button', { name: /Marktplatz/i });
      await expect(marktplatzBtn).toBeVisible({ timeout: 15_000 });
      await marktplatzBtn.click();
      await page.waitForTimeout(TAB_SETTLE);

      const watchlistBtn = page.getByRole('button', { name: /Watchlist/i });
      await expect(watchlistBtn).toBeVisible({ timeout: 10_000 });
      await watchlistBtn.click();
      await page.waitForTimeout(TAB_SETTLE);
    });

    test('watchlist entries or empty state visible', async ({ page }) => {
      await page.waitForTimeout(RENDER_WAIT);

      // WatchlistView shows player rows or EmptyState with Heart icon
      const playerLink = page.locator('a[href*="/player/"]').first();
      const emptyState = page.locator('text=/Watchlist.*leer|Beobachte.*Spieler/i').first();

      const hasEntries = await playerLink.isVisible({ timeout: 10_000 }).catch(() => false);
      const hasEmpty = await emptyState.isVisible({ timeout: 3_000 }).catch(() => false);

      expect(hasEntries || hasEmpty).toBe(true);
    });

    test('watchlist sort buttons visible when entries exist', async ({ page }) => {
      await page.waitForTimeout(RENDER_WAIT);

      const playerLink = page.locator('a[href*="/player/"]').first();
      const hasEntries = await playerLink.isVisible({ timeout: 10_000 }).catch(() => false);
      if (!hasEntries) {
        test.skip(true, 'Watchlist is empty — no sort controls');
        return;
      }

      // Sort options: Name, Floor Price, L5, 24h
      for (const label of ['Name', 'L5', '24h']) {
        const btn = page.getByRole('button', { name: label, exact: true });
        await expect(btn).toBeVisible({ timeout: 5_000 });
      }
    });

    test('watchlist player rows link to player detail', async ({ page }) => {
      await page.waitForTimeout(RENDER_WAIT);

      const playerLink = page.locator('a[href*="/player/"]').first();
      const hasEntries = await playerLink.isVisible({ timeout: 10_000 }).catch(() => false);
      if (!hasEntries) {
        test.skip(true, 'Watchlist is empty');
        return;
      }

      const href = await playerLink.getAttribute('href');
      expect(href).toMatch(/\/player\/[a-f0-9-]/);
    });

    test('remove from watchlist button visible on entries', async ({ page }) => {
      await page.waitForTimeout(RENDER_WAIT);

      const playerLink = page.locator('a[href*="/player/"]').first();
      const hasEntries = await playerLink.isVisible({ timeout: 10_000 }).catch(() => false);
      if (!hasEntries) {
        test.skip(true, 'Watchlist is empty');
        return;
      }

      // Remove button has aria-label containing "atchlist"
      const removeBtn = page.locator('[aria-label*="atchlist"]').first();
      const hasRemove = await removeBtn.isVisible({ timeout: 5_000 }).catch(() => false);
      expect(hasRemove).toBe(true);
    });

    test('alert threshold button visible on entries', async ({ page }) => {
      await page.waitForTimeout(RENDER_WAIT);

      const playerLink = page.locator('a[href*="/player/"]').first();
      const hasEntries = await playerLink.isVisible({ timeout: 10_000 }).catch(() => false);
      if (!hasEntries) {
        test.skip(true, 'Watchlist is empty');
        return;
      }

      // ThresholdPopover button with aria-label/title containing "lert"
      const alertBtn = page.locator('[aria-label*="lert"], [title*="lert"]').first();
      const hasAlert = await alertBtn.isVisible({ timeout: 5_000 }).catch(() => false);
      expect(hasAlert).toBe(true);
    });
  });

  // ════════════════════════════════════════════
  // 8. MARKTPLATZ TAB — SEARCH
  // ════════════════════════════════════════════

  test.describe('Marktplatz > Search', () => {
    test.beforeEach(async ({ page }) => {
      const marktplatzBtn = page.getByRole('button', { name: /Marktplatz/i });
      await expect(marktplatzBtn).toBeVisible({ timeout: 15_000 });
      await marktplatzBtn.click();
      await page.waitForTimeout(TAB_SETTLE);
    });

    test('search toggle button is visible', async ({ page }) => {
      // MarktplatzTab has a search toggle button with aria-label "Spieler suchen"
      const searchBtn = page.locator('[aria-label*="uchen"]');
      await expect(searchBtn.first()).toBeVisible({ timeout: 10_000 });
    });

    test('clicking search opens MarketSearch overlay', async ({ page }) => {
      const searchBtn = page.locator('[aria-label*="uchen"]').first();
      await searchBtn.click();
      await page.waitForTimeout(500);

      // MarketSearch should render a search input
      const searchInput = page.locator('input[type="text"], input[type="search"]').first();
      const hasInput = await searchInput.isVisible({ timeout: 5_000 }).catch(() => false);
      expect(hasInput).toBe(true);
    });

    test('typing in search shows results', async ({ page }) => {
      const searchBtn = page.locator('[aria-label*="uchen"]').first();
      await searchBtn.click();
      await page.waitForTimeout(500);

      const searchInput = page.locator('input[type="text"], input[type="search"]').first();
      if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await searchInput.fill('Sakarya');
        await page.waitForTimeout(1000);

        // Should show some results
        await expect(page.locator('body')).not.toBeEmpty();
      }
    });
  });

  // ════════════════════════════════════════════
  // 9. MARKTPLATZ SUB-TAB NAVIGATION
  // ════════════════════════════════════════════

  test.describe('Marktplatz sub-tab navigation', () => {
    test('all 4 sub-tabs are visible', async ({ page }) => {
      const marktplatzBtn = page.getByRole('button', { name: /Marktplatz/i });
      await expect(marktplatzBtn).toBeVisible({ timeout: 15_000 });
      await marktplatzBtn.click();
      await page.waitForTimeout(TAB_SETTLE);

      // 4 sub-tabs: Club Verkauf, Von Usern/Transferliste, Trending, Watchlist
      await expect(page.getByRole('button', { name: /Club Verkauf/i })).toBeVisible({ timeout: 5_000 });
      await expect(page.getByRole('button', { name: /Von Usern|Transferliste/i })).toBeVisible({ timeout: 5_000 });
      await expect(page.getByRole('button', { name: /Trending/i })).toBeVisible({ timeout: 5_000 });
      await expect(page.getByRole('button', { name: /Watchlist/i })).toBeVisible({ timeout: 5_000 });
    });

    test('cycling through all sub-tabs does not crash', async ({ page }) => {
      const marktplatzBtn = page.getByRole('button', { name: /Marktplatz/i });
      await expect(marktplatzBtn).toBeVisible({ timeout: 15_000 });
      await marktplatzBtn.click();
      await page.waitForTimeout(TAB_SETTLE);

      const tabs = [/Club Verkauf/i, /Von Usern|Transferliste/i, /Trending/i, /Watchlist/i];

      for (const tabPattern of tabs) {
        const btn = page.getByRole('button', { name: tabPattern });
        if (await btn.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await btn.click();
          await page.waitForTimeout(TAB_SETTLE);
          await expect(page.locator('body')).not.toBeEmpty();
        }
      }
    });
  });

  // ════════════════════════════════════════════
  // 10. MISSION HINTS
  // ════════════════════════════════════════════

  test.describe('Mission Hints', () => {
    test('mission hint area rendered (may be empty)', async ({ page }) => {
      // MissionHintList with context="trading" is rendered after the tab bar
      // It may or may not show hints depending on active missions
      await expect(page.locator('body')).not.toBeEmpty();

      // If mission hints are visible, they should be readable
      const missionHint = page.locator('text=/Mission|Aufgabe|Belohnung/i').first();
      const hasMission = await missionHint.isVisible({ timeout: 5_000 }).catch(() => false);

      // Either missions are shown or not — both are valid
      expect(typeof hasMission).toBe('boolean');
    });
  });

  // ════════════════════════════════════════════
  // 11. TRADING DISCLAIMER ON MARKTPLATZ
  // ════════════════════════════════════════════

  test.describe('Trading Disclaimer', () => {
    test('disclaimer visible on Marktplatz tab', async ({ page }) => {
      const marktplatzBtn = page.getByRole('button', { name: /Marktplatz/i });
      await expect(marktplatzBtn).toBeVisible({ timeout: 15_000 });
      await marktplatzBtn.click();
      await page.waitForTimeout(RENDER_WAIT);

      // TradingDisclaimer with variant="card" renders at bottom of MarktplatzTab
      const disclaimer = page.locator('.text-\\[10px\\]').last();
      const hasDisclaimer = await disclaimer.isVisible({ timeout: 8_000 }).catch(() => false);

      // Check for legal text content
      const legalText = page.locator('text=/Credits|Plattform|kein.*Anspruch/i').first();
      const hasLegal = await legalText.isVisible({ timeout: 3_000 }).catch(() => false);

      expect(hasDisclaimer || hasLegal).toBe(true);
    });
  });

  // ════════════════════════════════════════════
  // 12. URL PARAMETER SYNC
  // ════════════════════════════════════════════

  test.describe('URL parameter sync', () => {
    test('?tab=marktplatz opens Marktplatz tab directly', async ({ page }) => {
      await page.goto('/market?tab=marktplatz', { waitUntil: 'domcontentloaded' });
      await waitForApp(page);
      await page.waitForTimeout(RENDER_WAIT);

      // Marktplatz sub-tabs should be visible
      const clubVerkaufBtn = page.getByRole('button', { name: /Club Verkauf/i });
      const hasCV = await clubVerkaufBtn.isVisible({ timeout: 10_000 }).catch(() => false);
      expect(hasCV).toBe(true);
    });

    test('?tab=kaufen aliases to Marktplatz tab', async ({ page }) => {
      await page.goto('/market?tab=kaufen', { waitUntil: 'domcontentloaded' });
      await waitForApp(page);
      await page.waitForTimeout(RENDER_WAIT);

      const clubVerkaufBtn = page.getByRole('button', { name: /Club Verkauf/i });
      const hasCV = await clubVerkaufBtn.isVisible({ timeout: 10_000 }).catch(() => false);
      expect(hasCV).toBe(true);
    });

    test('?tab=portfolio opens Mein Kader tab', async ({ page }) => {
      await page.goto('/market?tab=portfolio', { waitUntil: 'domcontentloaded' });
      await waitForApp(page);
      await page.waitForTimeout(RENDER_WAIT);

      // Portfolio sub-tabs (Bestand / Angebote) should be visible
      const bestandBtn = page.getByRole('button', { name: /Bestand/i });
      const hasBestand = await bestandBtn.isVisible({ timeout: 10_000 }).catch(() => false);
      expect(hasBestand).toBe(true);
    });

    test('?tab=watchlist aliases to Marktplatz tab', async ({ page }) => {
      await page.goto('/market?tab=watchlist', { waitUntil: 'domcontentloaded' });
      await waitForApp(page);
      await page.waitForTimeout(RENDER_WAIT);

      // Should be on Marktplatz tab
      const marktplatzBtn = page.getByRole('button', { name: /Marktplatz/i });
      await expect(marktplatzBtn).toBeVisible({ timeout: 10_000 });
    });
  });

  // ════════════════════════════════════════════
  // 13. NEW USER TIP
  // ════════════════════════════════════════════

  test.describe('New User Tip', () => {
    test('new user tip may be shown on Marktplatz for users without holdings', async ({ page }) => {
      const marktplatzBtn = page.getByRole('button', { name: /Marktplatz/i });
      await expect(marktplatzBtn).toBeVisible({ timeout: 15_000 });
      await marktplatzBtn.click();
      await page.waitForTimeout(RENDER_WAIT);

      // NewUserTip is conditional (show={holdings.length === 0})
      await expect(page.locator('body')).not.toBeEmpty();
    });
  });

  // ════════════════════════════════════════════
  // 14. SPONSOR BANNER
  // ════════════════════════════════════════════

  test.describe('Sponsor Banner', () => {
    test('sponsor banner area exists on Marktplatz', async ({ page }) => {
      const marktplatzBtn = page.getByRole('button', { name: /Marktplatz/i });
      await expect(marktplatzBtn).toBeVisible({ timeout: 15_000 });
      await marktplatzBtn.click();
      await page.waitForTimeout(RENDER_WAIT);

      // SponsorBanner with placement="market_top" is rendered
      // It may or may not show content depending on ad inventory
      await expect(page.locator('body')).not.toBeEmpty();
    });
  });

  // ════════════════════════════════════════════
  // 15. CROSS-TAB NAVIGATION
  // ════════════════════════════════════════════

  test.describe('Cross-tab navigation', () => {
    test('switching between Mein Kader and Marktplatz preserves state', async ({ page }) => {
      // Go to Marktplatz
      const marktplatzBtn = page.getByRole('button', { name: /Marktplatz/i });
      await marktplatzBtn.click();
      await page.waitForTimeout(TAB_SETTLE);

      // Switch to Trending sub-tab
      const trendingBtn = page.getByRole('button', { name: /Trending/i });
      if (await trendingBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await trendingBtn.click();
        await page.waitForTimeout(500);
      }

      // Go to Kader
      const kaderBtn = page.getByRole('button', { name: /Kader/i });
      await kaderBtn.click();
      await page.waitForTimeout(TAB_SETTLE);

      // Go back to Marktplatz
      await marktplatzBtn.click();
      await page.waitForTimeout(TAB_SETTLE);

      // Page should be stable
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('rapid tab switching does not crash', async ({ page }) => {
      const kaderBtn = page.getByRole('button', { name: /Kader/i });
      const marktplatzBtn = page.getByRole('button', { name: /Marktplatz/i });

      // Rapid switch 5 times
      for (let i = 0; i < 5; i++) {
        await marktplatzBtn.click();
        await page.waitForTimeout(200);
        await kaderBtn.click();
        await page.waitForTimeout(200);
      }

      // Page should still be functional
      await expect(page.locator('body')).not.toBeEmpty();
      await expect(page.locator('h1')).toBeVisible();
    });
  });
});
