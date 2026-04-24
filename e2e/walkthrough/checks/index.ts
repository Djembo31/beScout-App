import type { Page } from '@playwright/test';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Severity = 'P0' | 'P1' | 'P2' | 'P3';

export type Finding = {
  check: string;
  severity: Severity;
  page: string;
  selector?: string;
  evidence: string;
  reproSteps: string[];
  timestamp: string;
};

export type CheckResult = {
  checkName: string;
  findings: Finding[];
};

export type CheckFn = (page: Page, pageUrl: string) => Promise<CheckResult>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function finding(
  check: string,
  severity: Severity,
  pageUrl: string,
  evidence: string,
  reproSteps: string[],
  selector?: string,
): Finding {
  return {
    check,
    severity,
    page: pageUrl,
    selector,
    evidence,
    reproSteps,
    timestamp: new Date().toISOString(),
  };
}

// ── Check B1: GhostRowCheck ───────────────────────────────────────────────────
//
// Detects "zombie" player rows caused by null-player joins in holdings queries.
// Pattern (Slice 192 reference): a holding row where the player is null resolves
// to ID "#0", empty display name, and falls back to default position "MID".
//
// DOM indicators (any 2 of 3 = Ghost):
//   1. Text "#0" visible inside a holdings list item
//   2. Empty player-name element (non-zero element, zero text length)
//   3. Position badge shows "MID" while neighboring players have varied positions
//
// Severity P0: directly shows corrupted data to users.

export const GhostRowCheck: CheckFn = async (page, pageUrl) => {
  const findings: Finding[] = [];

  try {
    // 1. Look for "#0" pattern in player-ID display
    const zeroIdEls = await page.$$eval(
      // Holdings rows typically render inside a[href*="/player/"] or data-holding containers
      'a[href*="/player/"], [data-holding-id], [data-player-id]',
      (els) =>
        els
          .map((el) => ({
            text: (el as HTMLElement).innerText?.trim() ?? '',
            href: (el as HTMLAnchorElement).href ?? '',
          }))
          .filter((e) => e.text.includes('#0') || e.href.endsWith('/player/0') || e.href.endsWith('/player/null')),
    ).catch(() => [] as { text: string; href: string }[]);

    if (zeroIdEls.length > 0) {
      findings.push(
        finding(
          'GhostRowCheck',
          'P0',
          pageUrl,
          `Found ${zeroIdEls.length} row(s) with ghost player-ID (#0 or /player/null). Evidence: ${JSON.stringify(zeroIdEls[0])}`,
          [
            `1. Navigate to ${pageUrl}`,
            `2. Look for player rows with "#0" text or href ending in /player/0`,
            `3. These are zombie holdings from null-player join in the DB query`,
            `4. Fix: add .not.is('player_id', null) guard in the holdings query`,
          ],
          'a[href*="/player/"]',
        ),
      );
    }

    // 2. Look for empty player names in known holding-list structures
    const emptyNames = await page.$$eval(
      // Player name is typically in a <span> or <p> that is a sibling of position badge
      '[class*="player-name"], [data-player-name], [class*="playerName"]',
      (els) =>
        els.filter((el) => {
          const text = (el as HTMLElement).innerText?.trim() ?? '';
          return text.length === 0;
        }).length,
    ).catch(() => 0);

    if (emptyNames > 0) {
      findings.push(
        finding(
          'GhostRowCheck',
          'P0',
          pageUrl,
          `Found ${emptyNames} player-name element(s) with empty text — likely ghost row from null player join`,
          [
            `1. Navigate to ${pageUrl}`,
            `2. Inspect DOM: find [class*="player-name"] with empty innerText`,
            `3. Check holdings query for missing NULL-guard on players join`,
          ],
          '[class*="player-name"]',
        ),
      );
    }
  } catch {
    // DOM inspection failed — not a crawl-blocking error
  }

  return { checkName: 'GhostRowCheck', findings };
};

// ── Check C1: I18nLeakCheck ───────────────────────────────────────────────────
//
// Detects un-translated i18n keys rendered directly in the DOM.
// next-intl keys use dotted camelCase notation: e.g. "market.title", "manager.tabs.kader"
//
// Regex: /^[a-z][a-zA-Z0-9]+\.[a-z][a-zA-Z0-9.]+$/
// This matches: "market.title", "player.positions.MID" but NOT "www.bescout.net"
// or "5.5%" or "1.000.000" (excludes numeric-heavy strings).
//
// Strategy: scan all visible text nodes from key DOM elements, filter against regex.
// Known false-positives: version strings, URLs. These are excluded by the filter.
//
// Severity P1: i18n keys visible to users are a UX defect, not blocking but confusing.

const I18N_KEY_REGEX = /^[a-z][a-zA-Z0-9]{1,30}\.[a-z][a-zA-Z0-9.]{1,60}$/;

// Strings that look like i18n keys but are benign (URLs, versions, etc.)
const I18N_FALSE_POSITIVE_PATTERNS = [
  /^\d/,             // starts with digit
  /www\./,           // URL
  /\.(com|net|de|io|co)$/, // TLD
  /\.(png|jpg|svg|webp)$/, // Image
  /https?:/,         // Full URL
];

export const I18nLeakCheck: CheckFn = async (page, pageUrl) => {
  const findings: Finding[] = [];

  try {
    const leakedKeys = await page.$$eval(
      'h1, h2, h3, h4, h5, h6, p, button, a, li, span, label, td, th, [data-testid]',
      (els, { regex, fpPatterns }) => {
        const r = new RegExp(regex);
        const fps = fpPatterns.map((p: string) => new RegExp(p));

        return els
          .map((el) => (el as HTMLElement).innerText?.trim() ?? '')
          .filter((text) => {
            if (!text || text.length < 4 || text.length > 80) return false;
            if (!r.test(text)) return false;
            // Exclude false positives
            for (const fp of fps) {
              if (fp.test(text)) return false;
            }
            return true;
          })
          .slice(0, 10); // cap at 10 to avoid huge findings
      },
      {
        regex: I18N_KEY_REGEX.source,
        fpPatterns: I18N_FALSE_POSITIVE_PATTERNS.map((r) => r.source),
      },
    ).catch(() => [] as string[]);

    if (leakedKeys.length > 0) {
      const unique = Array.from(new Set(leakedKeys));
      findings.push(
        finding(
          'I18nLeakCheck',
          'P1',
          pageUrl,
          `Found ${unique.length} visible i18n key(s) — translation missing or t() call failed. Keys: ${unique.join(', ')}`,
          [
            `1. Navigate to ${pageUrl}`,
            `2. Observe visible text matching pattern "namespace.key" (camelCase dot-notation)`,
            `3. Check messages/de.json for missing key OR check if t() is called with correct namespace`,
            `4. Common cause: new i18n key added to component but not to messages/de.json + messages/tr.json`,
          ],
        ),
      );
    }
  } catch {
    // DOM scan failed — not blocking
  }

  return { checkName: 'I18nLeakCheck', findings };
};

// ── Check B2: BrokenImageCheck ────────────────────────────────────────────────
//
// Detects images that failed to load (404, CORS, CSP block).
//
// Browser signals:
//   - img.complete === true  (browser attempted load)
//   - img.naturalWidth === 0 (but decoded = 0 = load failed OR img is 0x0 placeholder)
//
// False-positive filter:
//   - Exclude 1x1 tracking pixels (alt="" + width<=1)
//   - Exclude SVG data-uri (src starts with "data:image/svg")
//   - Exclude lazy-load placeholders (data-src present = not yet loaded)
//   - Only flag img with width > 10 || height > 10 (visible images)
//
// Severity P1: broken player photos, club logos, flag icons degrade UX significantly.

export const BrokenImageCheck: CheckFn = async (page, pageUrl) => {
  const findings: Finding[] = [];

  try {
    // Wait briefly for lazy images to settle
    await page.waitForTimeout(500).catch(() => {});

    const brokenImages = await page.$$eval(
      'img',
      (imgs) =>
        imgs
          .filter((img) => {
            const el = img as HTMLImageElement;
            // Must be "attempted and failed": complete=true, naturalWidth=0
            if (!el.complete) return false;
            if (el.naturalWidth !== 0) return false;

            const src = el.src ?? el.getAttribute('src') ?? '';

            // Exclude SVG data-uri (always naturalWidth=0 in some browsers)
            if (src.startsWith('data:image/svg')) return false;

            // Exclude lazy-load placeholders (not yet attempted)
            if (el.hasAttribute('data-src') || el.hasAttribute('data-lazy-src')) return false;

            // Exclude 1x1 tracking pixels
            const w = el.naturalWidth || el.width || parseInt(el.getAttribute('width') ?? '99');
            const h = el.naturalHeight || el.height || parseInt(el.getAttribute('height') ?? '99');
            if (w <= 1 && h <= 1) return false;

            // Exclude empty-src placeholder (no src at all = intentional)
            if (!src || src === window.location.href) return false;

            return true;
          })
          .map((img) => ({
            src: (img as HTMLImageElement).src ?? img.getAttribute('src') ?? '',
            alt: img.getAttribute('alt') ?? '',
            className: img.className ?? '',
          }))
          .slice(0, 20),
    ).catch(() => [] as { src: string; alt: string; className: string }[]);

    if (brokenImages.length > 0) {
      const severity: Severity = brokenImages.length >= 5 ? 'P1' : 'P2';
      findings.push(
        finding(
          'BrokenImageCheck',
          severity,
          pageUrl,
          `Found ${brokenImages.length} broken image(s). First: src="${brokenImages[0].src}", alt="${brokenImages[0].alt}"`,
          [
            `1. Navigate to ${pageUrl}`,
            `2. Open DevTools → Network → filter by "Img" → look for 404/CORS errors`,
            `3. Check if image domain is in vercel.json img-src CSP + next.config.mjs remotePatterns`,
            `4. Common causes: player photo URL changed in DB, CSP missing domain, Transfermarkt URL rotated`,
          ],
          'img',
        ),
      );
    }
  } catch {
    // Image scan failed — not blocking
  }

  return { checkName: 'BrokenImageCheck', findings };
};

// ── STUBBED Checks (Phase 2) ──────────────────────────────────────────────────
// These stubs define the interface. Implementation follows in Phase 2.
// Each stub documents: what it checks, why, what evidence it produces.

// TODO(Phase 2) B3: ConsoleErrorCheck
// Captures page.on('console') type=error events. Filters known false-positives:
// - React DevTools messages
// - ResizeObserver loop limit exceeded (benign)
// - Supabase realtime reconnect warnings
// Evidence: { type, text, url } array from page console capture.
// Severity: P1 for JS errors, P2 for warnings.
export const ConsoleErrorCheck: CheckFn = async (_page, _pageUrl) => {
  // STUB: Implement in Phase 2
  // Requires console capture setup BEFORE page.goto() — attach listener in Crawler Engine
  return { checkName: 'ConsoleErrorCheck', findings: [] };
};

// TODO(Phase 2) B4: PageErrorCheck
// Captures page.on('pageerror') = unhandled JS exceptions.
// Severity: P0 (crash) always. Evidence: error.message + error.stack.
// Implementation note: listener must be attached BEFORE navigation.
export const PageErrorCheck: CheckFn = async (_page, _pageUrl) => {
  // STUB: Implement in Phase 2
  return { checkName: 'PageErrorCheck', findings: [] };
};

// TODO(Phase 2) B5: FailedRequestCheck
// Captures page.on('requestfailed') — network-level failures (not 4xx/5xx).
// Relevant: Supabase edge function timeouts, CSP-blocked requests.
// False-positive filter: ignore OPTIONS preflight failures.
// Severity: P1 for Supabase/API endpoints, P2 for analytics endpoints.
export const FailedRequestCheck: CheckFn = async (_page, _pageUrl) => {
  // STUB: Implement in Phase 2
  return { checkName: 'FailedRequestCheck', findings: [] };
};

// TODO(Phase 2) U1: MissingEmptyStateCheck
// Detects list containers with 0 children but no empty-state element.
// Anti-pattern: empty list that shows nothing = silent fail for users.
// Selector strategy: [class*="List"] or [class*="Grid"] containers + count children.
// Known empty states: text matching /Noch keine|Keine.*vorhanden|Leer/i.
// Severity: P2.
export const MissingEmptyStateCheck: CheckFn = async (_page, _pageUrl) => {
  // STUB: Implement in Phase 2
  return { checkName: 'MissingEmptyStateCheck', findings: [] };
};

// TODO(Phase 2) U2: ModalNoCloseCheck
// Opens a modal (if triggerable via click), then presses ESC.
// If modal stays open AND no preventClose prop: FAIL.
// Caveat: only test modals that are safe to open in read-only mode.
// Evidence: [role="dialog"] visible after ESC + {component, trigger selector}.
// Severity: P1.
export const ModalNoCloseCheck: CheckFn = async (_page, _pageUrl) => {
  // STUB: Implement in Phase 2
  return { checkName: 'ModalNoCloseCheck', findings: [] };
};

// TODO(Phase 2) U3: MobileOverflowCheck
// Sets viewport to 393px (iPhone 16) and checks document.body.scrollWidth > window.innerWidth.
// Implementation: page.setViewportSize({ width: 393, height: 852 }) → evaluate overflow.
// Known false-positives: horizontal scroll in code blocks, tables (filter by specific selectors).
// Severity: P2.
export const MobileOverflowCheck: CheckFn = async (_page, _pageUrl) => {
  // STUB: Implement in Phase 2
  return { checkName: 'MobileOverflowCheck', findings: [] };
};

// TODO(Phase 2) C2: ForbiddenWordCheck
// Scans visible text for securities/gambling terminology per business.md.
// Forbidden (user-facing): Investment, ROI, Profit, Rendite, Dividende, Ownership,
//   "guaranteed returns", "to the moon", HODL, diamond hands, Prämie, Preisgeld,
//   gewinnen (Verb in button/CTA context), kazan* (TR).
// False-positive exclusion: Admin-only context, code comments.
// Severity: P0 for financial instrument terminology, P1 for gambling vocabulary.
export const ForbiddenWordCheck: CheckFn = async (_page, _pageUrl) => {
  // STUB: Implement in Phase 2
  // Pattern from business.md — see Kapitalmarkt-Glossar + Gluecksspiel-Vokabel tables
  return { checkName: 'ForbiddenWordCheck', findings: [] };
};

// TODO(Phase 2) C3: IPOUserFacingCheck
// Detects "IPO" string in user-facing text (not admin pages).
// Rule from business.md AR-7: user-facing = "Erstverkauf" (DE) / "Kulüp Satışı" (TR).
// Skip: /bescout-admin, /club/[slug]/admin pages (admin-facing = "IPO" OK).
// Evidence: element text + page URL.
// Severity: P1.
export const IPOUserFacingCheck: CheckFn = async (_page, _pageUrl) => {
  // STUB: Implement in Phase 2
  return { checkName: 'IPOUserFacingCheck', findings: [] };
};

// TODO(Phase 3) P1: LCPCheck
// Measures Largest Contentful Paint via Performance Observer API.
// Threshold: > 3000ms = P2, > 5000ms = P1.
// Implementation: page.evaluate() with PerformanceObserver('largest-contentful-paint').
// Note: LCP is not available in all Playwright contexts — test browser support first.
// Evidence: { lcp_ms, element, url } per page.
export const LCPCheck: CheckFn = async (_page, _pageUrl) => {
  // STUB: Implement in Phase 3
  return { checkName: 'LCPCheck', findings: [] };
};

// TODO(Phase 3) P2: ScrollCheck
// Detects extremely long pages without virtualization.
// Threshold: document.body.scrollHeight > window.innerHeight * 10 = P2.
// Relevant pages: /market (holdings list), /transactions (history), /rankings.
// Evidence: { scrollHeight, viewportHeight, ratio } per page.
// Severity: P2 (UX degradation, potential performance hit on mobile).
export const ScrollCheck: CheckFn = async (_page, _pageUrl) => {
  // STUB: Implement in Phase 3
  return { checkName: 'ScrollCheck', findings: [] };
};

// ── Check Registry ────────────────────────────────────────────────────────────

export const PHASE_1_CHECKS: CheckFn[] = [
  GhostRowCheck,
  I18nLeakCheck,
  BrokenImageCheck,
];

export const ALL_CHECKS: CheckFn[] = [
  GhostRowCheck,
  I18nLeakCheck,
  BrokenImageCheck,
  ConsoleErrorCheck,
  PageErrorCheck,
  FailedRequestCheck,
  MissingEmptyStateCheck,
  ModalNoCloseCheck,
  MobileOverflowCheck,
  ForbiddenWordCheck,
  IPOUserFacingCheck,
  LCPCheck,
  ScrollCheck,
];

export async function runChecks(
  page: Page,
  pageUrl: string,
  checks: CheckFn[] = PHASE_1_CHECKS,
): Promise<Finding[]> {
  const allFindings: Finding[] = [];

  for (const check of checks) {
    try {
      const result = await check(page, pageUrl);
      allFindings.push(...result.findings);
    } catch {
      // Individual check failure does not abort the crawl
    }
  }

  return allFindings;
}
