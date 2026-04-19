# Next-Session Briefing (2026-04-21 Morning)

> Erstellt 2026-04-20 nach Session-Ende Vormittag.
> **Heute: 4 Commits, 2 Slices (079c + 080-R1) komplett, Home+Market Polish Phase 1 verified live.**

---

## TL;DR

**Phase 1 Core-Trading-Polish läuft planmäßig:** Home ✅, Market R1 ✅. Nächste: Round 2 (Filter-Refactor) oder Page 3 (Player Detail).

**Kein P0 offen.** `test12` Holdings-Bug (P0 `/api/players` Pagination) ist verified. Balance-Drift zwischen TopBar und Header ist gefixt. Tab-A11y + P&L-Compliance sind live.

**1 CI-Blocker:** `useMarketData.test.ts:283` — CEO-Money-Decision für computePlayerFloor referencePrice-Fallback nötig. Blockt jeden Commit im CI.

**Erste Action morgen:** `/ship status` lesen → dann je nach Anil-Entscheidung einen der 4 Kandidaten starten (siehe unten).

---

## Was heute passiert ist (chronologisch)

### Session-Start
- Vercel MCP + Notion MCP OAuth durchgezogen (beide Tools callable)
- test12 P0-Fix visuell verifiziert (16 Holdings inkl. 7× Sarıcalı sichtbar)

### CTO-Reviewer Slice 079 → PASS
- 1 NIT: common-errors.md Pattern-Header "Slice 080" → "Slice 079b-emergency" (fixed)
- 3 Follow-ups als Queue-Items (F0, F1, F2, F3)
- 2 money-adjacent Findings → sofort als Slice 079c angegangen

### Slice 079c — Audit-Fix 1000-row-cap (Commit `b87f8f5d`)
- `footballData.ts` getMappingStatus: `.limit(1000)` → `count:'exact', head:true` → Admin-Dashboard zeigt echte 4556 statt 1000
- `sync-contracts/route.ts`: `loadAllPlayers()` while-loop → täglicher Cron aktualisiert alle 4556 Players (nicht nur alpha-first 1000 bis "Crociata"). **TFF-1-Lig Spieler mit Ş/Ç/Ö Nachnamen hatten stale contract_end → Market-Value-Kalkulation war konservativ verzerrt.**
- Proof: tsc + 7/7 targeted + 986/986 full-suite

### Home Click-Throughs Finalisiert
- 22 Links statisch verifiziert (alle hrefs korrekt)
- 3 dynamic Buttons getestet (Search-Dialog, Mystery-Modal mit Drop-Rates + Compliance, Profile-Chip)
- Router-Spot-Check /rankings (clean render)
- Proof: `worklog/proofs/079-click-throughs.txt`

### Slice 080 Round 1 — Market Polish (Commit `2ab40fb2` + `6b0fffa4` hotfix)
Market-Rundgang identifizierte 9 Findings. Top-3 P1 gefixt:

- **F1 Balance-Format-Konsistenz** (Money-adjacent, Reviewer-Follow-up)
  - TopBar zeigte `7.221` (gerundet via `formatScout`), MarketHeader zeigte `7.226,77 CR` (voll via `fmtScout(centsToBsd(x))`)
  - Fix: TopBar auf `fmtScout(centsToBsd(balanceCents))` vereinheitlicht
  - Live verified: TopBar "7.220,77" === Header "7.220,77 CR" ✓

- **F3 Sort-Label "P&L" → "+/−"** (AR-17 Compliance)
  - "P&L" (Profit and Loss) = SPK/MASAK Securities-Terminologie
  - Existing `bestandSortPnlDesc/Asc` nutzten bereits "+/−" — jetzt konsistent in der kurzen Tab-Form
  - DE+TR i18n keys `bestandSortPnl="+/−"` hinzugefügt

- **F4 Market-Tabs A11y** (Screen-Reader + Keyboard)
  - Inline-Buttons hatten kein `role`, kein `aria-selected`, kein `aria-controls`, kein focus-ring
  - Fix: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `tabIndex`, `focus-visible` ring
  - IDs matchen existing TabPanel component (`tab-${id}` + `tabpanel-${id}`)
  - Live verified: `aria-selected="true"`, `aria-controls="tabpanel-portfolio"` ✓

### Hotfix (Commit `6b0fffa4`)
- `tabsAriaLabel` defaultMessage allein reicht bei next-intl nicht — MISSING_MESSAGE console-error
- DE "Market-Bereiche" + TR "Pazar Alanları" keys nachgelegt

### F2 Club-Namen-Typos (wontfix, OCR-Fehler)
- Mein Screenshot-Lesen war falsch. DB-Verify via Supabase MCP zeigte korrekte Namen: Hatayspor, Fatih Karagümrük, Bandırmaspor, Sakaryaspor, Adana Demirspor
- **Lesson:** Vor DB-Migration immer erst Query, nicht auf Screenshot-Text vertrauen

---

## Jetzt offen (priorisiert)

### 🟠 P1 — Nächste Session angehen

**1. F0 1000-row-cap Audit restliche cron-routes**
- ~15 weitere `.from('players')` Stellen in `src/app/api/cron/*` + `src/app/api/admin/*`
- Einige haben `.eq()`/`.in()` Filter (legitim unter 1000), andere nicht
- Betroffene Routes (verdächtig): `sync-players-daily:237,270`, `sync-injuries:112,166,210,236`, `sync-transfers:144,205`, `gameweek-sync:606,1245,1553,1566`, `sync-transfermarkt-batch:139`, `transfermarkt-search-batch:71`, `backfill-ratings:57`, `players-csv/export:57`, `players-csv/import:110,137`
- Audit-Command: `grep -rn "\.from('players')" src/app/api/ | grep -v "\.range\|\.limit(\|\.eq\|\.single\|\.maybeSingle\|test\|insert\|update"`
- Schätzung: 30-45 min Audit + ggf. 2-3 Fix-Slices
- **Empfohlen als Slice 080c** (nach Round 2 oder parallel)

**2. F4 AuthProvider + Wallet RPC-Timeouts (seit 2026-04-19 offen)**
- Login dauert 10-15s, Console: `loadProfile RPC slow, using 3-query fallback`, `[Wallet] Balance fetch failed (attempt 3/3)`
- Betrifft alle Pages (AuthProvider im Layout). User-Experience belastend.
- Backend-Perf-Slice: EXPLAIN ANALYZE auf `load_profile` + `get_wallet_balance` RPCs
- Empfohlen als **Slice 081** (vor Player-Detail, weil Login-UX schwerer wiegt als noch eine Polish-Page)

**3. Phase-1-Pages weiter polieren**
- `081 Player Detail /player/[id]` — nächster Page-Polish im Sweep (wenn F4 Login-Perf nicht priorisiert)
- `082 Portfolio /inventory` · `083 Transactions /transactions` · `084 Profile /profile`

### 🟡 P2 — Queue

**4. useMarketData.test.ts:283 CEO-Money-Decision (CI-Blocker)**
- Test erwartet `floorMap.get('p1') === 0`, Code returnt `800` (via `player.prices.referencePrice ?? 0` Fallback)
- Entweder (a) `referencePrice` aus `computePlayerFloor`-Fallback entfernen (Money-Logik-Change) ODER (b) Test-Expected auf `800` updaten (Intent-Change)
- **Blockt CI bei jedem Commit** — muss vor nächstem `git commit` geklärt werden ODER `vitest run` manuell wegklicken
- 5 min Decision, 10 min Code/Test-Fix

**5. Slice 080 Round 2 — Market Filter/UX-Bundle**
- F5 Filter-Chaos Mobile (4 Zeilen Filter → Drawer-Refactor)
- F6 Mission-Banner-Position (Bestand-Tab → Marktplatz-Tab move)
- F7 "22 SC vs 12 Spieler" Label-Klarheit
- F8 Grid-vs-List inkonsistent zwischen Tabs
- F9 Compliance-Disclaimer Sticky-Position
- Schätzung: 2-3h Design + Code

**6. Playwright direct-dep in package.json**
- Scripts `tm-*.ts` importieren `playwright` via transitive resolution. Würde auf neuer Maschine/CI brechen.
- Quick fix (5 min): `pnpm install -D playwright`

**7. Multi-Account-Gate als Hook**
- `feedback_polish_multi_account.md` dokumentiert, kein Hook enforced
- Pre-commit-Hook nötig der 2+ Test-Accounts manuell durchgeklickt verlangt

### 🟢 P3 — Post-Beta / Low-Prio

- F3 fanRankStammgast Graceful Fallback (nur wenn neue Tiers in DB)
- F9 Home Quick-Actions Label 10px (echter Device-Test)
- F10 Home Divider-Gradient Abstand (visual polish)
- F13 Welcome Bonus Modal + OnboardingChecklist (New-User-Account nötig)
- Activity-Feed Dedup (Phase 3 Social)

---

## 4 Slice-Kandidaten für nächste Session

**A) Slice 080c — F0 Audit restliche 1000-row-caps**
- Aufwand: 45-60 min (Audit + gezielte Fixes, Pattern bekannt aus 079c)
- Impact: Money-adjacent data-integrity (stale cron updates)
- Risiko: niedrig (Pattern etabliert)

**B) Slice 081 — AuthProvider/Wallet Perf-Slice (F4)**
- Aufwand: 1-2h (EXPLAIN ANALYZE + Query-Optimierung + Test)
- Impact: globale Login-UX verbessert (10-15s → <3s)
- Risiko: mittel (RPC-Queries sind intricate, braucht Messung VOR Optimierung)

**C) Slice 081-alt — Player Detail Polish**
- Aufwand: 2h (Rundgang + Top-3-Fixes wie Slice 080)
- Impact: Phase-1-Fortschritt (Page 3/6)
- Risiko: niedrig

**D) CEO-useMarketData Decision + CI-Unblock**
- Aufwand: 15 min (Decision + 1-Zeilen-Fix)
- Impact: CI grün → cleaner commit-flow
- Risiko: niedrig bis er Money-Decision trifft

**Empfehlung:** D (CI unblocken, 15 min) → B (AuthProvider, weil schwerste User-Pain-Point) → A (Audit, 45 min) → C (falls Zeit)

---

## Tech-Debt

1. **useMarketData referencePrice-Fallback** (CEO-Decision pending, CI-blockierend)
2. **playwright direct-dep fehlt** (transitive-resolution-Gefahr)
3. **Multi-Account-Gate kein Hook** (nur Text-Regel, nicht enforced)
4. **15 weitere 1000-row-cap Routes** (F0 Audit)

---

## Session-Metrics 2026-04-20 Vormittag

- **Commits:** 4 (b87f8f5d, 2ab40fb2, 6b0fffa4, d0733757)
- **Deploys:** 2 successful (READY), 0 failed
- **Slices:** 2 komplett (079c, 080 R1)
- **Tasks:** 7 (alle completed)
- **Test-Status:** 1098/1099 passing (1 pre-existing bekannt)
- **Live-Verify:** bescout.net Mobile 393px — TopBar + Tabs + P&L-Label ✓
- **Queue Movement:** 2 P-Items fixed, 1 closed (wontfix), 3 new P-Items added (F0/F1/F2/F3 aus Reviewer)

---

## Kontextuell wichtig

- **Anil hat CTO-Autonomie delegiert** ("mach es perfekt für bescout") — bei Border-Cases 2-3 Optionen + Empfehlung geben
- **CEO-Scope:** useMarketData Money-Decision, Multi-Account-Gate-Policy, F5 Filter-UX-Design
- **Phase 1 Progress:** 2/6 Pages komplett (Home + Market R1), 4/6 pending (Market R2 oder Player-Detail als nächstes)
- **MCPs jetzt live:** Vercel, Notion, Chrome DevTools, Supabase, Playwright, Sentry, Context7 — Session-Start braucht nicht mehr neu auth-en

**Gute Nacht. Bis morgen.**
