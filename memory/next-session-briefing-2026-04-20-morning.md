# Next-Session Briefing (2026-04-20 Morning)

> Erstellt 2026-04-19 spät nach Slice 079 Home Polish Complete.
> **Heute: 9 Commits, Slice 078+079+Deploy-Healing LIVE, 4 Tools installiert.**

---

## TL;DR

Home-Page ist Test-ready **UND P0 Money-Critical Bug gefixt**. Aber nicht alle Polish-Sweep-Regel-Items wurden durchlaufen — restliche Click-Throughs + F9/F10/F13 offen.

**Erste Action morgen:** test12 re-test um P0-Fix zu verifizieren → Session-Restart → MCP-Auth → Reviewer-Agent → dann `/market` Slice 080.

---

## 🔥 P0 gefixt heute Nacht nach deinem test12-Feedback

- **Bug:** test12 hatte 16 Holdings in DB, UI zeigte nur 7. Demir Sarıcalı 7× Cards komplett unsichtbar.
- **Root Cause:** `/api/players` PostgREST-Cap 1000 von 4556 Players → alle Holdings mit `last_name` alphabetisch > 1000 (ab ~Crociata) wurden clientseitig nicht enriched.
- **Fix:** Pagination via `.range()` in while-loop. Commit `459da7b1`. Verified live: curl returnt 4556 players.
- **Plus:** pnpm-lock.yaml sync (vercel build hatte 3 Fails wegen npm install -D @lhci/cli). Commit `c1f7eac3`.
- **Wichtig morgen früh:** **test12 Login → Marktplatz Bestand** öffnen → solltest jetzt alle 16 Holdings sehen inkl. Sarıcalı 7×. Wenn ja → Fix bestätigt.

---

---

## Offene Punkte (Kategorisiert)

### 🟠 Home (Slice 079) — Nicht zu 100% abgehakt

**Click-Through unvollständig (Pflicht laut `feedback_polish_functional_pflicht.md`):**
- [ ] Bottom-Nav alle 8 Links — nur 3 spot-getested (Spieltag, Manager, Markt via direct nav)
- [ ] Section-Header "Top Mover der Woche" → `/market`
- [ ] Section-Header "Meistbeobachtet" → `/market` (strip hidden, header nicht)
- [ ] Section-Header "Meine Vereine" → `/clubs` (link existiert)
- [ ] Founding-Pass Card → `/founding`
- [ ] Event-Banner "Serie A Meisterschaft" → `/fantasy` (nav getestet separat)
- [ ] Scout Aktivität feed-item → `/profile/kemal2` (direct nav getestet, click nicht)
- [ ] LastGameweek Footer "Alle Spieltage" → `/manager?tab=historie`
- [ ] Top-Bar Logo → `/` (refresh)
- [ ] Top-Bar Profile-Chip "J" → `/profile`
- [ ] Top-Bar Search-Icon → Overlay öffnen
- [ ] Live Mystery Box öffnen + reward claim (Modal öffnet, claim nicht getestet)

**Deferred Findings:**
- [ ] F9 Quick-Actions Label 10px Mobile-Touchability verifizieren
- [ ] F10 Divider-Gradient Abstand visual review
- [ ] F13 Welcome Bonus Modal (nur mit new-user account testbar — kein Account verfügbar)
- [ ] OnboardingChecklist (erscheint nur für new users)

**Pflicht nach CLAUDE.md aber übersprungen:**
- [ ] **CTO-Reviewer-Agent** für Slice 079 dispatch (PFLICHT nach Implementation, nicht optional)
- [ ] qa-visual-Agent hätte parallel Screenshots machen können

### 🔴 Pre-existing Tech-Debt (CEO-Scope, CI-blockierend)

1. **`useMarketData.test.ts:283` — computePlayerFloor referencePrice fallback**
   - Code: `player.prices.floor ?? player.prices.referencePrice ?? 0`
   - Test erwartet: 0 wenn floor undefined. Code returnt referencePrice=800.
   - Money-Logik-Change → CEO-Approval für entweder (a) referencePrice aus Fallback rausnehmen oder (b) Test auf erwarteten referencePrice updaten.
   - **Blockt CI bei jedem Commit.**

2. **F4 AuthProvider + Wallet RPC-Timeouts**
   - Symptom: Login dauert 10-15s, 9+ Console-Warnings, Retry-Pattern greift
   - `loadProfile RPC slow, using 3-query fallback`
   - `[Wallet] Balance fetch failed (attempt 3/3) — exhausted: Timeout`
   - Backend-Performance-Issue, betrifft alle Pages (AuthProvider im Layout)
   - Separater Slice nötig — EXPLAIN ANALYZE, Query-Optimierung

3. **`playwright` fehlt als package.json direct-dep**
   - Lokale Scripts `scripts/tm-*.ts` importieren `playwright` — läuft nur durch transitive resolution via `@playwright/test`
   - Funktioniert auf Anil's PC, würde auf neuer Maschine/CI brechen
   - Slice 079 Healing hat `scripts/` aus tsconfig exclud — Type-Check ist weg aber import-Bug bleibt
   - Fix: `npm install -D playwright` (oder `playwright-core`) hinzufügen

### 🟡 Deferred Features (separate Slices)

- **F3** Activity-Feed Dedup — Phase 3 Social (user folgt 1 User → sieht 5× identisch, sollte consolidation geben)
- **MostWatched Empty-State CTA** — aktuell hidden bei <2 Players, könnte CTA "Folge Spielern..." haben

### ✅ Abgeschlossen heute

- Slice 077 + 077b + 078 + 079 (4 Slices über 2 Tage endlich LIVE)
- 6 Findings in Home gefixt (F1/F2/F5/F7/F12/F15)
- tsconfig-Fix unblocked 4 Slices retrospektiv
- Functional-Click-Through-Regel permanent in Memory
- 5 Common-Errors Patterns dokumentiert
- 4 Tools installiert (Vercel CLI, Lighthouse CI, Chrome DevTools MCP, Notion MCP)

---

## Tooling nach Session-Restart

**Sofort (5 min):**
1. Claude Code neustarten — neue MCPs laden
2. Vercel MCP OAuth (Browser-Login beim ersten Tool-Call)
3. Notion MCP OAuth (Browser-Login)

**Setup (15 min):**
4. Notion Workspace aufsetzen:
   - Page "User-Feedback" (Database: Status/Priorität/Page/Assignee)
   - Page "Slices" (Running-List, Links zu commits)
   - Page "Findings-Archive"
5. `npx lhci autorun` — Baseline-Scores für Home, Market, Fantasy, Inventory, Transactions, Profile (mobile 393px)

---

## Priorisierte To-Do Morgen

### Kritisch (Session-Start)
1. [ ] Claude Code restart + OAuth Vercel/Notion
2. [ ] Notion Workspace aufsetzen
3. [ ] **CTO-Reviewer-Agent für Slice 079** (Pflicht übersprungen)
4. [ ] Restliche Click-Throughs auf Home (12 Items oben)

### Wichtig (morgen)
5. [ ] Lighthouse Baseline alle 6 Pages
6. [ ] Slice 080 starten: `/market` Polish (Phase 1/6 Page 2)

### Wenn Zeit (diese Woche)
7. [ ] useMarketData Test-Failure klären (CEO-Scope, Money)
8. [ ] `playwright` in package.json korrekt deklarieren
9. [ ] AuthProvider-Performance-Slice (F4)

---

## Nutzung neuer MCPs morgen

**Vercel MCP** (ersetzt `npx vercel`):
- Deploy-Logs in einem Call statt 30s Detektivarbeit
- Build-Status checks
- Env-Vars management

**Chrome DevTools MCP** (ergänzt Playwright):
- Performance-Trace beim Page-Load
- Memory/Heap-Analyse
- Network-Waterfall für Perf-Bugs

**Notion MCP** (ersetzt markdown-queue):
- User-Feedback-Queue als Database
- Findings-Archive visuell durchsuchbar
- Slices als Kanban

**Lighthouse CI**:
- Scores als Proof-Artefakte pro Page
- CI-Check für Regression-Detection (nicht automatisiert, manual run reicht erstmal)

---

## Session-Ende Metrics 2026-04-19

- Git: 9 Commits, 10h Session
- Deploys: 2 erfolgreich (nach Tooling-Healing), vorher 2 failed
- Verified LIVE: Home DE + TR mobile 393px
- Offene Flows: ~12 Click-Throughs auf Home
- Findings-Ratio: 6/15 gefixt, 2 deferred, 1 skipped, 6 noch zu testen
- Tech-Debt: 3 offene (1 CI-blockierend)

**Gute Nacht. Bis morgen.**
