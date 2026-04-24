# Autonomous Walkthrough Crawler — Design Doc

**Date:** 2026-04-25  
**Status:** Draft — Awaiting CEO Approval  
**Slice:** 194 (pending)  
**Author:** Remote Agent (Overnight)

---

## 1. Ziel + Scope

### Ziel

Ein täglich laufender autonomer End-to-End-Audit-Crawler, der sämtliche User-facing Pages von bescout.net besucht, eine Check-Library ausführt und strukturierte Findings produziert. Anil reviewt die Findings am Morgen und entscheidet Prioritäten. Kein Auto-Fix in Phase 1.

**In einem Satz:** Der Crawler ist der erste Benutzer, der jeden Morgen vor Anil aufwacht und prüft, ob das Produkt in Ordnung ist.

### Scope (In)

- Alle authentifizierten User-facing Routes unter `src/app/(app)/` (21 Seiten)
- Read-only Interaktionen: Navigation, Tab-Klick, Screenshot, DOM-Inspect
- Check-Library: Bug-Patterns, UX-Anomalien, Business-Compliance, Performance-Regressions
- Triage-Engine: P0/P1/P2/P3 Kategorisierung + Konsolen-Action-Plan
- Output: `qa-screenshots/walkthrough-YYYY-MM-DD/findings.json` + Screenshots

### Beachhead (Phase 1 MVP)

5 Kern-Seiten: Home, Manager, Marktplatz, Fantasy, Profile. Damit sind die 3 Haupt-User-Journeys (Fan-Manager, Scout, Händler) abgedeckt.

### Scope Out

- Admin-Seiten (`/bescout-admin`, `/club/[slug]/admin`) — separates Admin-Audit
- Schreibende Operationen (Buy/Sell/Offer/Subscribe) — STRIKT verboten
- Realtime/WebSocket-Testing — zu fragil für täglichen Cron
- Multi-User-Szenarien — folgt in Phase 3
- Auto-Fix/Auto-Issue-Create — Phase 2/3
- Sentry/PostHog/Notion API-Calls — skeleton-only, kein externes Reporting in Phase 1

---

## 2. Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                    WALKTHROUGH CRAWLER                       │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  LAYER 1: Crawler Engine (full-walkthrough.spec.ts) │    │
│  │                                                     │    │
│  │  ┌──────────────┐  ┌─────────────┐  ┌───────────┐  │    │
│  │  │  Sitemap     │  │  Auth       │  │  Page     │  │    │
│  │  │  Extractor   │→ │  Manager    │→ │  Loop     │  │    │
│  │  │  (fs.readdir)│  │  (cookie)   │  │  (5→21)   │  │    │
│  │  └──────────────┘  └─────────────┘  └─────┬─────┘  │    │
│  └────────────────────────────────────────────│────────┘    │
│                                               │              │
│  ┌────────────────────────────────────────────▼────────┐    │
│  │  LAYER 2: Check Library (e2e/walkthrough/checks/)   │    │
│  │                                                     │    │
│  │  Bug Checks    │ UX Checks     │ Business │ Perf    │    │
│  │  ─────────────  ─────────────  ──────── │ ────     │    │
│  │  GhostRowCheck │ MissingEmpty  │ ForbWord │ LCPCheck│    │
│  │  BrokenImage   │ ModalNoClose  │ I18nLeak │ ScrlChk │    │
│  │  ConsoleErrors │ MobileOverflw │ IPOWord  │ QueryChk│    │
│  └────────────────────────────────────────────────────┘    │
│                                               │              │
│  ┌────────────────────────────────────────────▼────────┐    │
│  │  LAYER 3: Triage Engine (e2e/walkthrough/triage.ts) │    │
│  │                                                     │    │
│  │  findings.json → Severity-Sort → P0/P1/P2/P3       │    │
│  │  → Action-Plan (Console Output) → findings-triage.md│    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Datenfluss

```
bescout.net
    │
    ▼ (Playwright Navigate)
Per-Page Loop
    │
    ├─ navigate(url)
    ├─ waitForApp()
    ├─ screenshot(fullPage)
    ├─ runChecks(page, url) → Finding[]
    │
    ▼
findings.json
    │
    ▼ (triage.ts)
triage-report.md  →  Console Output  →  (Phase 2: GitHub Issue)
```

---

## 3. Sitemap-Extractor

### Implementierungsansatz

Der Extractor liest `src/app/(app)/` via `fs.readdirSync()` (Node-synchron, kein Next.js Runtime-Import) und leitet Routes ab.

```typescript
// e2e/walkthrough/sitemap.ts
import fs from 'fs';
import path from 'path';

type RouteEntry = {
  url: string;
  slug: string;
  isDynamic: boolean;
  tabs?: TabParam[];
};

type TabParam = { param: string; value: string };

function extractRoutes(appDir: string): RouteEntry[] {
  const entries = fs.readdirSync(appDir, { withFileTypes: true });
  // Filter: nur directories mit page.tsx (Next.js Route-Konvention)
  // Dynamic segments [slug] → isDynamic=true, expandWithFixtures()
  // Skip: bescout-admin (admin-only), error.tsx, loading.tsx, layout.tsx
}
```

### Dynamic Segments — Fixture-Expansion

Dynamic routes (`/player/[id]`, `/club/[slug]`, `/profile/[handle]`) können nicht blind gecrawlt werden. Strategie:

| Route | Fixture-Quelle | Phase |
|-------|----------------|-------|
| `/player/[id]` | Erster Link auf `/market` Seite | Phase 1 |
| `/club/[slug]` | Erster Link auf `/clubs` Seite | Phase 2 |
| `/profile/[handle]` | `jarvis-qa` handle (bekannter QA-Account) | Phase 1 |

### Tab-Parameter-Mapping

Tab-Params werden **nicht geraten** sondern aus Component-Source gelesen (Rule aus `testing.md`: "Deep-Link Tab-Params NIE raten"):

| Route | Tab-Params (aus Component-Source verifiziert) |
|-------|----------------------------------------------|
| `/market` | `tab=marktplatz`, `tab=portfolio`, `tab=watchlist`, `tab=kaufen` |
| `/manager` | `tab=kader` |
| `/community` | Enum aus `CommunityPage` Component (Phase 2 verifizieren) |
| `/fantasy` | Enum aus `FantasyContent.tsx` (Phase 2 verifizieren) |

### Modal-States

Modals werden in Phase 1 **nicht** durch den Crawler geöffnet. Crawl ist surface-only (was beim Page-Load sichtbar ist). Modal-Internals kommen in Phase 2 Check-Library-Erweiterung.

---

## 4. Check-Library — Vollständiger Katalog

12 Checks katalogisiert (3 implementiert, 9 stubbed):

### Bug-Checks (Critical)

| # | Name | Severity | Trigger | Pattern | Phase |
|---|------|----------|---------|---------|-------|
| B1 | **GhostRowCheck** | P0 | Holding-Listen | DOM: `text(#0)` + leerer Name + `MID` als Position bei Holdings-Render | Phase 1 ✅ |
| B2 | **BrokenImageCheck** | P1 | Jede Seite | `img.naturalWidth === 0 && img.complete` nach Load | Phase 1 ✅ |
| B3 | **ConsoleErrorCheck** | P1 | Jede Seite | `page.on('console')` type=error, filtert bekannte False-Positives (Hot-Reload, ResizeObserver) | Phase 2 |
| B4 | **PageErrorCheck** | P0 | Jede Seite | `page.on('pageerror')` = JS-Runtime-Crash | Phase 2 |
| B5 | **FailedRequestCheck** | P1 | Jede Seite | `page.on('requestfailed')` — insb. Supabase-Endpoints | Phase 2 |

### UX-Checks

| # | Name | Severity | Trigger | Pattern | Phase |
|---|------|----------|---------|---------|-------|
| U1 | **MissingEmptyStateCheck** | P2 | Listen-Seiten | Container mit 0 children AND kein `empty-state`/`text=/Noch keine/i` DOM-Element | Phase 2 |
| U2 | **ModalNoCloseCheck** | P1 | Modals | `[role=dialog]` sichtbar nach ESC → preventClose fehlt | Phase 2 |
| U3 | **MobileOverflowCheck** | P2 | Alle Seiten | Viewport 393px: `document.body.scrollWidth > window.innerWidth` | Phase 2 |

### Business/Compliance-Checks

| # | Name | Severity | Trigger | Pattern | Phase |
|---|------|----------|---------|---------|-------|
| C1 | **I18nLeakCheck** | P1 | Alle Seiten | DOM-Text matched `/^[a-z][a-zA-Z]+\.[a-z][a-zA-Z]+$/` = camelCase.dotNotation | Phase 1 ✅ |
| C2 | **ForbiddenWordCheck** | P0 | Alle Seiten | DOM-Text matched `/\b(Investment|ROI|Profit|Rendite|Dividende|Ownership|guaranteed returns)\b/i` | Phase 2 |
| C3 | **IPOUserFacingCheck** | P1 | User-facing Seiten | DOM-Text enthält "IPO" (user-visible) aber NICHT auf Admin-Seiten | Phase 2 |

### Performance-Checks

| # | Name | Severity | Trigger | Pattern | Phase |
|---|------|----------|---------|---------|-------|
| P1 | **LCPCheck** | P2 | Alle Seiten | `performance.getEntriesByType('largest-contentful-paint')[0].startTime > 3000` | Phase 3 |
| P2 | **ScrollCheck** | P3 | Listen-Seiten | Seite hat Scrollhöhe > 10x Viewport ohne virtualization hint | Phase 3 |

---

## 5. Triage-Engine

### Severity-Mapping

| Level | Definition | Action |
|-------|-----------|--------|
| P0 | Produktionsblocker — Datenverlust, Sicherheit, Crash | Sofort: GitHub Issue (Phase 2) |
| P1 | Sichtbarer Bug — User merkt es, Conversion-Impact | Issue: Backlog-Top | 
| P2 | UX-Degradation — suboptimal aber funktional | Backlog-Normal |
| P3 | Nice-to-have / Metric-Regression | Doc: Trendbewachung |

### Triage-Algorithmus

```
findings.json laden
  │
  ├─ group by page-url
  ├─ group by check-name
  ├─ sort by severity (P0 > P1 > P2 > P3)
  │
  ├─ P0-count > 0 → EXIT_CODE=1 (CI fails)
  ├─ P1-count > 3 → EXIT_CODE=1
  │
  └─ console.log Action-Plan Markdown
       ├─ "🚨 P0 Findings (immediate action)"
       ├─ "⚠️  P1 Findings (this sprint)"
       ├─ "💛 P2 Findings (backlog)"
       └─ "📝 P3 Findings (metrics)"
```

### False-Positive-Mitigation

- Bekannte False-Positives in `e2e/walkthrough/known-issues.json` (Phase 2)
- Jede Finding enthält: `page`, `check`, `severity`, `selector`, `evidence`, `timestamp`
- Triage vergleicht gegen known-issues → filtert confirmed false-positives

---

## 6. Test-Accounts

### Primär: jarvis-qa@bescout.net

- **Holdings:** Unbekannt (QA-Account in Live-DB). GhostRowCheck testet GEGEN holdings-Render.
- **Zweck:** Standard Read-Only Crawl
- **Auth:** SMOKE_EMAIL / SMOKE_PASSWORD env-vars (NIEMALS in Code oder PR-Body)

### Phase 2: Erweiterung

| Account | Typ | Zweck |
|---------|-----|-------|
| jarvis-qa@bescout.net | Standard Fan | Haupt-Crawler |
| (Phase 2) jarvis-admin@bescout.net | Club Admin | Admin-Seiten Crawl |
| (Phase 2) TR-Account | TR-Locale | Compliance-Check TR-Wording |

### Auth-Mechanik

```typescript
// Pattern aus synthetic-users.spec.ts — exakt übernommen
async function loginJarvis(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30_000 });
  // dismiss cookie consent
  // fill email + password from env
  // click Anmelden
  // waitForURL away from /login
  // dismiss Später-Modal
}
```

Cookie-Domain: Leading dot `.bescout.net` — valid für hostname + alle subdomains (Pattern aus synthetic-users.spec.ts Line 229).

---

## 7. Cadence

### Täglicher Cron (Phase 1)

```json
{ "path": "/api/cron/walkthrough-audit", "schedule": "0 3 * * *" }
```

**Warum 03:00 UTC:**
- Nach gameweek-sync (06:00) und dedup-cleanup (03:15) — sauberer State
- Vor sync-standings (02:00 schon fertig) — aktuelle Daten
- Hobby-Tier: Alle Crons daily → kein Problem (vercel.json hat 11 Crons → impliziert Pro Plan)

### Playwright-Laufzeit-Budget

| Phase | Seiten | Budget |
|-------|--------|--------|
| Phase 1 MVP | 5 | 10-15 min |
| Phase 2 Full | 21 | 30-40 min |
| Phase 3 Tabs+Modals | 21 + Tabs | 60 min |

**Hinweis:** Vercel Function Timeout = 300s max. Playwright läuft als Cron-triggered API Route → Timeout-Problem in Phase 3. Lösung: GitHub Actions cron (kein Function-Timeout). Entscheidung in Phase 2 treffen.

---

## 8. CI-Integration

### Phase 1: Manual Run (kein CI-Gate)

```bash
PLAYWRIGHT_BASE_URL=https://bescout.net pnpm exec playwright test e2e/full-walkthrough.spec.ts --project=walkthrough --reporter=list
```

### Phase 2: GitHub Actions Nightly

```yaml
# .github/workflows/nightly-walkthrough.yml
on:
  schedule:
    - cron: '0 3 * * *'
  workflow_dispatch:

jobs:
  walkthrough:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install chromium
      - run: pnpm exec playwright test e2e/full-walkthrough.spec.ts
        env:
          PLAYWRIGHT_BASE_URL: https://bescout.net
          SMOKE_EMAIL: ${{ secrets.SMOKE_EMAIL }}
          SMOKE_PASSWORD: ${{ secrets.SMOKE_PASSWORD }}
      - name: Upload findings
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: walkthrough-findings-${{ github.run_id }}
          path: qa-screenshots/walkthrough-*/
```

### Phase 3: Vercel Deploy Hook

Nach Auto-Deploy → Vercel Webhook → GitHub Actions Dispatch → Walkthrough läuft gegen frischen Deploy.

```yaml
on:
  repository_dispatch:
    types: [vercel-deploy-complete]
```

**CEO-Entscheidung benötigt:** Vercel Pro Webhook → GitHub Dispatch-Token = Security-relevanter Setup.

---

## 9. Open Questions für Anil (CEO-Approval)

**Alle 5 Fragen blockieren Implementierung. Anil muss entscheiden.**

### Q1: Crawler-Account — welcher?

`jarvis-qa@bescout.net` hat unbekannte Holdings in der Live-DB. GhostRowCheck braucht einen Account MIT Holdings (um Ghost-Rows zu detektieren) oder läuft auch ohne (keine Ghost-Rows = kein Trigger). Soll ich einen separaten `crawler@bescout.net` Account mit definierten Test-Holdings anlegen? Oder reicht jarvis-qa?

### Q2: P0-Exit-Code — CI blockierend?

Soll der Crawler bei P0-Findings `exit 1` werfen und damit CI/Deployments blocken? Oder ist Phase 1 "observe only" (exit 0 immer)? Empfehlung: Phase 1 = observe-only, Phase 2 = P0 blockiert.

### Q3: GitHub Issue Auto-Create — Timing?

Phase 2 Roadmap beinhaltet Auto-Issue-Creation bei P0/P1. Dafür braucht der Crawler `GITHUB_TOKEN` mit `issues:write`. Ist das akzeptabel? Alternativer Ansatz: Crawler schreibt findings.json, ein separater Human-Review-Step entscheidet Issue-Create.

### Q4: Vercel Hobby vs. Pro Cron-Limit?

`vercel.json` hat aktuell 11 Crons. Hobby-Tier erlaubt nur 2. Wenn der Plan Hobby ist, würde ein 12. Cron (walkthrough-audit) sofort deployen-blockieren (siehe `errors-infra.md` D36-Protokoll). Ist BeScout gerade auf Pro-Plan? Der neue Cron darf erst in `vercel.json` wenn Antwort klar ist.

### Q5: Screenshot-Retention?

`qa-screenshots/walkthrough-YYYY-MM-DD/` wächst täglich. Bei 5 Seiten × 2 Screenshots (desktop + mobile) = ~10 PNGs/Tag → ~300/Monat. Soll das in `qa-screenshots/` committed werden oder gitignored bleiben (nur temporär lokal)?

---

## 10. Implementierungs-Phasen

### Phase 1: MVP (dieses Skeleton)

**Deliverables:**
- `e2e/full-walkthrough.spec.ts` — Crawler Engine (5 Seiten)
- `e2e/walkthrough/checks/index.ts` — 3 Checks implementiert, 9 stubbed
- `e2e/walkthrough/triage.ts` — Triage Engine (Console Output)
- `docs/plans/2026-04-25-autonomous-walkthrough-crawler.md` — dieses Dokument

**Acceptance:** `pnpm exec playwright test e2e/full-walkthrough.spec.ts --list` zeigt ≥1 Test. `pnpm tsc --noEmit` clean.

### Phase 2: Full Check-Library (nächster Sprint)

- Alle 12 Checks implementiert
- 21 Seiten gecrawlt (inkl. Dynamic Routes via Fixture-Expansion)
- Tab-Parameter durchlaufen (market tabs, manager tabs, etc.)
- GitHub Actions Nightly Workflow
- known-issues.json für False-Positive-Management
- `pnpm run test:walkthrough` npm-Script

**Warum separates Script:** Walkthrough läuft 15-40 min. Nicht im Standard-CI-Gate. Eigenes Script verhindert versehentliches Triggern in `pnpm test:e2e`.

### Phase 3: Auto-Fix + Intelligence (Q3 2026)

- GitHub Issue Auto-Create bei P0/P1
- Slack/Telegram Alert bei P0
- Historical Trend-Tracking (findings-delta)
- Multi-User Szenarien (TR-Account, Admin-Account)
- LCP + Performance-Checks
- Vercel Deploy Hook Integration

---

## 11. Risiken + Mitigations

| Risiko | Likelihood | Impact | Mitigation |
|--------|-----------|--------|------------|
| False-Positives überfluten Backlog | Hoch | Mittel | known-issues.json + P3-Threshold-Filter |
| Crawler-Flake durch Netz-Latenz | Mittel | Niedrig | retries: 1 (wie synthetic-users), 30s timeout |
| Test-Account-Credentials leaken | Niedrig | Kritisch | Nur via env-vars, niemals in Code/PR-Body |
| CI-Zeit zu lang (30-40 min) | Mittel | Mittel | Eigenes GitHub Actions Workflow, kein Standard-CI-Gate |
| Vercel-Function-Timeout bei Phase 3 | Hoch | Mittel | GitHub Actions statt Vercel Cron |
| Dynamic Routes raten statt lesen | Niedrig | Hoch | Fixture-Expansion-Pattern, kein Guessing |
| GhostRowCheck false-negative (jarvis hat keine Holdings) | Mittel | Mittel | Q1 (CEO): separater Test-Account mit Holdings |
| Meme-Coin / Compliance-Worte in Kommentaren | Niedrig | Niedrig | Check ignoriert `<!-- comments -->` |
| Screenshots zu groß für Git | Mittel | Niedrig | gitignore qa-screenshots/ (Q5 CEO) |
| CSP-Header blockiert Playwright-Inspector | Niedrig | Niedrig | `ignoreHTTPSErrors: true` + Chromium ohne CSP-Enforcement in Playwright |

---

## Referenzen

- `e2e/synthetic-users.spec.ts` — Auth-Pattern, Console-Capture
- `e2e/beta-smoke.spec.ts` — smokeNavigate, dismissModals
- `e2e/full-check/market.spec.ts` — Per-Page Check Pattern
- `.claude/rules/common-errors.md` Section 1 — Silent-Fail-Patterns
- `.claude/rules/business.md` — Forbidden Words für ForbiddenWordCheck
- `.claude/rules/errors-infra.md` — D36 Vercel Cron Limits
- `.claude/rules/testing.md` — "Deep-Link Tab-Params NIE raten"
- `worklog/findings/walkthrough-crawler-readlog.md` — Phase 0 Read-Log
