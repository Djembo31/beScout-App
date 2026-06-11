/**
 * Slice 279 (2026-05-06) — D70 Cold-Start-Track Foundation, Phase 1 WARN-only.
 * Slice 282b (2026-06-12) — Authenticated Collection: alle 3 URLs sind auth-gated;
 * die JSON-Variante hat 5 Wochen lang die /login-Redirect-Page gemessen
 * (Validity-Befund worklog/audits/2026-06-11/lighthouse-baseline.md).
 *
 * Format-Wechsel json → cjs weil executablePath/env in statischem JSON nicht
 * ausdrückbar sind. Inhalte (Throttling, screenEmulation, Assertions) 1:1
 * aus lighthouserc.json portiert.
 *
 * URLs: 3 Top-FLJS-Pages, jetzt direkt www (Root 307-redirected auf www —
 * der Hop würde Metriken verfälschen + Cookie-Domain ist www).
 * 3 runs per URL median minimiert Mess-Rauschen aus Vercel-Cold-Lambda-Boot.
 * Phase-3-Schwellen erst nach 3-5 AUTHED Runs ableiten (alte /login-Baseline
 * ist für App-Pages unbrauchbar).
 */
const { existsSync } = require('fs');

function resolveChromePath() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const candidates = [
    '/usr/bin/google-chrome', // GHA ubuntu-latest
    '/usr/bin/google-chrome-stable',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    `${process.env.LOCALAPPDATA || ''}/Google/Chrome/Application/chrome.exe`,
  ];
  const found = candidates.find((p) => p && existsSync(p));
  if (!found) {
    throw new Error(
      '[lighthouserc] Kein Chrome gefunden — CHROME_PATH env setzen. ' +
        'puppeteer lädt bewusst keinen eigenen Chrome (.puppeteerrc.cjs skipDownload).',
    );
  }
  return found;
}

module.exports = {
  ci: {
    collect: {
      url: [
        'https://www.bescout.net/',
        'https://www.bescout.net/market',
        'https://www.bescout.net/community',
      ],
      numberOfRuns: 3,
      // Slice 282b: Login vor Collection — Browser persistiert über alle URLs.
      puppeteerScript: './e2e/lhci-login.cjs',
      // WICHTIG: chromePath auf COLLECT-Ebene — LHCI überschreibt
      // puppeteerLaunchOptions.executablePath intern mit options.chromePath
      // (puppeteer-manager.js: `executablePath: this._options.chromePath`).
      chromePath: resolveChromePath(),
      puppeteerLaunchOptions: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
      settings: {
        preset: 'perf',
        formFactor: 'mobile',
        throttlingMethod: 'simulate',
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
        },
        screenEmulation: {
          mobile: true,
          width: 393,
          height: 852,
          deviceScaleFactor: 2,
          disabled: false,
        },
        // Slice 282b: Pflicht für authed Collection — Lighthouse würde sonst
        // Origin-Storage (inkl. Session) pro Run resetten → zurück auf /login.
        // Trade-off: warm cache zwischen den 3 Runs pro URL → Median leicht
        // optimistisch, aber über Zeit konsistent vergleichbar.
        disableStorageReset: true,
      },
    },
    assert: {
      assertions: {
        // Phase 1 (Slice 279): ALLE assertions auf 'warn' — Baseline-Sammlung.
        // Phase 3 schaltet auf 'error' mit Schwellen aus der AUTHED Baseline
        // (worklog/audits/2026-06-12/lighthouse-baseline-authed.md, 3-5 Runs).
        'categories:performance': ['warn', { minScore: 0.5 }],
        'categories:accessibility': ['warn', { minScore: 0.8 }],
        'categories:best-practices': ['warn', { minScore: 0.85 }],
        'categories:seo': ['warn', { minScore: 0.85 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './.lighthouseci',
    },
  },
};
