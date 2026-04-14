---
name: Operation Beta Ready
description: SSOT — End-to-End Quality Sweep für 50-Mann Beta-Launch. 5 Phasen, 12 User Journeys, Beta-Gate-Checklist. Status-Tracker für CTO-Orchestrator-Mode.
type: project
status: phase-1-ready-to-start
created: 2026-04-14
owner: CTO (Claude) + CEO (Anil)
---

# Operation Beta Ready

**Mission:** BeScout production-ready für 50 Mann Beta. End-to-End jede User-Journey, jede Function, jeder Service verifiziert. Kohaerent, integrated, zero-Kruemel.

**Vision (Imperium):** Globaler Marktplatz mit Events, Gamification, Rewards. Win-Win-Win (User-Verein-Platform).

**Owner:** CTO (Claude Opus 4.6) + CEO (Anil). Agents = Team.

---

## Approval-Triggers (CTO arbeitet AUTONOM ausser hier)

CEO wird NUR bei diesen 4 Triggern eingebunden, sonst silent execution mit Status-Report am Session-Ende:

1. **Geld-relevante DB-Migrations** — Backup + Approval vor `apply_migration`
2. **User-Facing Compliance-Wording** — Aenderungen die Disclaimers, Token-Bezeichnungen, oder regulierte Terms beruehren
3. **Architektur-Lock-Ins** — Entscheidungen die spaeter teuer rueckgaengig sind
4. **Externe System-Touchpoints** — Vercel-Settings, Supabase-Config, Cron-Setups, Permissions

Alle anderen Bug-Fixes, Code-Aenderungen, Tests, i18n, Polish → autonom.

---

## 5-Phasen-Methodologie

### Phase 0 — Inventory (PENDING — naechste Session start hier)
**Ziel:** Master-Dokument mit Feature Map + User Journey Map. Ohne dieses Inventory ist jeder Fix Cherry-Picking.

**Tasks:**
- [ ] Feature Map: alle 60+ Features kategorisiert (Trading, Fantasy, Social, Profile, Equipment, Liga, Admin, ...)
- [ ] User Journey Map: 12 critical paths (siehe Phase 2)
- [ ] Service-Map: alle src/lib/services/* Funktionen mit Konsumenten-Liste
- [ ] RPC-Map: alle public Postgres-Funktionen mit Service-Konsumenten

**Output:** `memory/feature-map.md` + `memory/user-journeys.md`

**Agents:** 2 Explore Agents parallel (Frontend-Inventory + Backend-Inventory)

**Aufwand:** 60-90 Min

---

### Phase 1 — Pre-Launch Cleanup (READY TO START — alle Fakten live verifiziert 2026-04-14)

**Ziel:** Datenbank ist clean fuer Pilot-Start. Phantom-SCs entfernt, Test-Inflation weg, RPC-Wording compliant.

#### Item 1.1: Fan-Seed Phantom SCs loeschen 🔴

**Live-DB Beweis (2026-04-14):**
```
Mendy Mamadou:  held=24, purchased=15  → +9 phantom (casual06 haelt 9)
Doğukan Tuzcu:  held= 4, purchased= 2  → +2 phantom (casual01 haelt 3 SCs total in 2 players)
TOTAL PHANTOM: 11 SCs
```

**Affected Accounts** (10 casual01-10, alle created 2026-02-15 20:37:40):
| Handle | UUID |
|--------|------|
| casual01 | 671269ed-199a-5e73-9959-e30e54f05f03 |
| casual02 | 91b6bc18-c20d-599f-9424-50944d4be6d6 |
| casual03 | 8eeb6119-c0bd-5358-b7bb-fdb0fe73489c |
| casual04 | a85617b2-1681-5040-a346-b4085c32e175 |
| casual05 | bad3f94b-ec26-56ac-a976-f92d0481b78e |
| casual06 | 92f2893b-c57b-5f59-92d9-4ce482c2e5bb |
| casual07 | da13204e-b332-57c7-9384-8c27fa739ccf |
| casual08 | b989efa4-e604-58eb-afa3-bd8e3bcd00ca |
| casual09 | 589fb318-40ef-5455-a2bc-790afcf8e3b9 |
| casual10 | 3f3b6221-089c-57c3-b9a8-5308c455778f |

**Trade-Aktivitaet (LIVE BESTAETIGT — Cascade braucht Care):**
- casual01: 2 trades als buyer
- casual06: 1 trade als buyer
- alle anderen: 0 trades

**Cascade-Tabellen** (in Loesch-Reihenfolge, Trades-CARE):
1. **trades** — UPDATE seller_id=NULL (zero-sum break sonst Supply-Invariant) ODER Reassign
2. holdings, wallets, user_stats
3. offers (sender + receiver)
4. ipo_purchases
5. activity_log
6. user_tickets, user_equipment, user_cosmetics
7. notifications
8. watchlist
9. post_votes, post_comments
10. profiles (last)

**Pre-Delete Audit:** Re-run `sum(holdings) vs sum(ipo_purchases) per player` — confirmieren dass NUR diese 10 Accounts unbacked SCs halten.

**Verify danach:** Supply-Invariant-Test grün, kein Player mit `held > purchased`.

#### Item 1.2: Test-Account SC Cleanup 🔴

**Live-DB Beweis (2026-04-14):**
| Handle | UUID | SCs | Players |
|--------|------|-----|---------|
| test12 | 46535ade-4db2-4866-8dfa-b8a8bcdbd933 | 30 | 16 |
| jarvisqa | 535bbcaf-f33c-4c66-8861-b15cbff2e136 | 18 | 9 |
| test1 | ca37ebe6-2ce7-4d1e-b296-ec9f291c4ae7 | 17 | 14 |
| test2 | 01c36853-ad96-453a-bab7-3cec3c6832be | 11 | 11 |
| test | cc8e9304-91ae-4a14-bc2c-0751aff9a7fa | 10 | 9 |
| test444 | 782777a7-9e4a-4e5f-9681-0db78db66648 | 4 | 3 |

**Total: 90 SCs** in 6 QA-Accounts.

**Wichtig:** Diese SCs sind NICHT phantom (durch echte Trades), aber pollutet Marktdaten. Decision: loeschen ODER nur SCs nullen ODER beibehalten als "QA Demo Accounts"?

**Empfehlung:** test444 + jarvisqa BEHALTEN (fuer ongoing QA), aber SC-Holdings nullen + neu seeden mit kleinen Zahlen. test/test1/test2/test12 komplett loeschen (Cascade wie Item 1.1).

**WAITING ON CEO:** Welche Accounts sollen bleiben fuer post-launch QA?

#### Item 1.3: 14 RPCs DPC-String Sanitize 🔴

**Live-DB Beweis (2026-04-14):** 16 RPCs enthalten "DPC" string:

**14 RPCs mit DPC im Body** (description-strings, comments):
1. accept_offer
2. award_mastery_xp
3. buy_from_ipo
4. buy_from_market
5. buy_from_order
6. calculate_fan_rank
7. create_ipo
8. create_offer
9. fn_mastery_on_trade
10. increment_mastery_hold_days
11. liquidate_player
12. place_buy_order
13. place_sell_order
14. refresh_airdrop_score

**2 RPCs mit DPC im Function-Name** (Decision needed):
- `buy_player_dpc` — Legacy-Alias? Renamed to `buy_player_sc`?
- `calculate_dpc_of_week` — Renamed to `calculate_sc_of_week`?

**Approach:** Pro RPC einzeln:
1. `pg_get_functiondef()` lesen
2. Code-grep wo RPC aufgerufen wird
3. String-replace "DPC" → "SC" in Function-Body (description text only, NICHT in column-names oder business-logic)
4. Migration mit `mcp__supabase__apply_migration`
5. Supply-Invariant + Geld-Tests gruen
6. Reviewer Agent (Opus) prueft Geld-Invarianten

**WICHTIG:** Code-intern bleibt "dpc" in Variable/Column-Names (siehe business.md). Nur USER-FACING strings in Descriptions werden umbenannt.

**Aufwand:** ~3 Min pro RPC × 14 = 45 Min + Reviewer 30 Min = 75 Min total.

#### Item 1.4: Migration-Drift dokumentieren 🟡

**Live Beweis (2026-04-14):** Local 61 migrations, Remote 44 migrations. Naming-Drift bei mehreren (z.B. `20260410150000_liga_seasons` lokal vs `20260410130137_liga_seasons_and_monthly_winners` remote).

**Decision:** Permanent-ignore-Pattern, weil Cleanup zu riskant.
- Add to `.claude/rules/database.md`: "NIE `supabase db push` — nur `mcp__supabase__apply_migration`"
- Existing rule already there in `reference_migration_workflow.md`

**Action:** Bestaetigen dass Rule prominent in CLAUDE.md verlinkt ist.

#### Item 1.5: Live-DB Integration Tests Status ✅ (DOC ONLY)

**Live-Code Verify (2026-04-14):** `vitest.config.ts` excludet 11 globs wenn `process.env.CI`:
- `src/lib/__tests__/auth/rls-checks.test.ts`
- `src/lib/__tests__/boundaries/**`
- `src/lib/__tests__/bug-regression.test.ts`
- `src/lib/__tests__/concurrency/**`
- `src/lib/__tests__/contracts/**`
- `src/lib/__tests__/db-invariants.test.ts`
- `src/lib/__tests__/flows/**`
- `src/lib/__tests__/money/**`
- `src/lib/__tests__/state-machines/**`
- `src/lib/__tests__/unicode/**`

Status: **Intentional design.** Lokal laufen lassen vor Pilot-Start, in CI permanent skip (zu volatile).

**Action:** Kein Code-Change. Documentation in `pre-launch-checklist.md` clarifyen.

---

### Phase 2 — 12 User Journey E2E Audits (PENDING)

Jede Journey wird systematisch durchgegangen:
1. **Frontend Agent** klickt durch (Playwright auf bescout.net)
2. **Backend Agent** verfolgt Service-Calls (Sentry-Logs + Supabase-Queries)
3. **Business Agent** prueft Wording + Compliance jeder Page
4. **Reviewer Agent** prueft Trio
5. Findings → `memory/bug-tracker.md`
6. **Healer Agent** fixt nach Priority

**Die 12 Journeys** (Reihenfolge nach Beta-User-Impact):

| # | Journey | Pages | Critical-für-Beta? |
|---|---------|-------|---------------------|
| 1 | Onboarding | /welcome → /onboarding → /home | 🔴 Critical |
| 2 | Erster IPO-Kauf | /market → IPO-Card → BuyConfirm → /market Bestand | 🔴 Critical |
| 3 | Erster Sekundär-Trade | /market → Player → BuyOrder/Buy → Holding-Update | 🔴 Critical |
| 4 | Fantasy-Event-Teilnahme | /fantasy → Event → Lineup → Result → Reward-Claim | 🔴 Critical |
| 5 | Mystery Box täglich | /home → MysteryBoxModal → Open → Reward → Daily-Cap | 🟡 High |
| 6 | Profile + Public + Following | /profile → /profile/[handle] → Follow → Timeline | 🟡 High |
| 7 | Mission/Streak | /missions → Mission → Progress → Complete → Claim | 🟡 High |
| 8 | Verkaufen + Order-Buch | /market → Player → SellModal → Match → History | 🔴 Critical |
| 9 | Liga-Rang | /home Widget → /profile Rang → Tier-Update | 🟢 Medium |
| 10 | Watchlist + Notifications | Watchlist-Add → Price-Alert → Notify → Click | 🟢 Medium |
| 11 | Equipment + Inventar | MysteryBox → Equip auf Player → Lineup-Effekt | 🟡 High |
| 12 | Multi-League Discovery | /market Liga-Filter → Cross-League Compare | 🟢 Medium |

**Output pro Journey:** 
- Playwright-Recording (success + fail paths)
- Bug-Liste mit Severity (CRITICAL/HIGH/MEDIUM/LOW)
- Wording-Compliance Check
- Performance-Metriken (LCP, RPC-P95)

**Aufwand:** ~30 Min pro Journey × 12 = 6 Stunden total. Verteilbar auf 3-4 Sessions.

---

### Phase 3 — Cross-Cutting Audits (parallel zu Phase 2)

**3.1 DB Audit**
- Jede RPC einmal angefasst (Money-Invariant Check)
- Jede CHECK constraint dokumentiert
- Jede RLS-Policy verifiziert (own + public Pattern)
- Output: `memory/db-audit.md`

**3.2 i18n Audit**
- DE + TR komplett, jeder Hardcoded-String entfernt
- Coverage-Test (jede Page, jede Modal, jeder Toast)
- Output: `memory/i18n-coverage.md`

**3.3 Performance Audit**
- `next build` Bundle-Size Analyse
- Mobile-Page-Load (4G simulation)
- Slow-RPC Identifizierung (>200ms)
- Output: `memory/perf-baseline.md`

**3.4 Compliance Audit**
- Wording-Sweep gegen `business.md` forbidden words
- Disclaimers auf jeder $SCOUT-Page
- Geofencing-Logic verifiziert
- Output: `memory/compliance-audit.md`

---

### Phase 4 — Beta Launch Gate (Definition)

EXPLIZITE Checklist. Was hier nicht ✅ ist, blockt Beta-Launch.

- [ ] Alle 12 User Journeys laufen ohne CRITICAL/HIGH-Bug durch (Playwright-Beweis)
- [ ] Onboarding < 60 Sekunden (Welcome bis erste Action)
- [ ] RPC-P95 < 200ms für: buy_from_market, buy_from_order, place_sell_order, accept_offer, score_event
- [ ] Mobile 390px clean auf jeder Page (Screenshot-Beweis)
- [ ] DE + TR coverage 100% für user-facing strings
- [ ] Compliance-Sweep clean (0 forbidden words live)
- [ ] Sentry hooked up + DSN live + Source-Maps uploaded
- [ ] PostHog hooked up (optional, falls vorhanden)
- [ ] Beta-Onboarding Email/SMS-Flow ready
- [ ] Pre-Launch Cleanup done (Phase 1 alle 5 Items ✅)
- [ ] Supply-Invariant + NULL-Money-Bug Tests gruen in CI
- [ ] Roll-back Plan + Hotfix-Workflow dokumentiert
- [ ] CEO Beta-User-Liste finalisiert (50 Mann)

---

### Phase 5 — Beta Launch + Iteration

**Plan:** 50 Mann in Wellen 10 → 20 → 50 mit je 48h Beobachtung.

**Per Welle:**
- Sentry/Vercel Live-Monitoring
- PostHog User-Behavior (falls hooked)
- Bugs hot-fixen (Healer Agent)
- Retro nach jeder Welle
- Adjust nach Feedback

---

## Imperium-Roadmap (langfristig, post-Beta)

Skizze fuer spaetere Sessions:

| Track | Scope | Aufwand |
|-------|-------|---------|
| Multi-League v2 | Cross-League Suche, Compare, Rankings | M |
| BeScout Liga | Wave 0-5 (siehe `project_bescout_liga.md`) | L |
| Globale Expansion | EN/ES/FR/IT, Multi-Currency | XL |
| B2B Sales Onboarding | Tool fuer neue Clubs (post-Sakaryaspor) | L |
| Token-Phase 3+ | Nach CASP/MGA: Cash-Out, Exchange, Paid Fantasy | XL |
| Creator Economy | Research-Posts, Polls, Bounties weiter | M |

**Aktuell DEFERRED bis Beta-Launch durch.**

---

## Status-Tracker (live updaten)

| Phase | Status | Owner | Last-Update |
|-------|--------|-------|-------------|
| 0 — Inventory | ⏳ pending | CTO + 2 Explore Agents | — |
| 1.1 Fan-Seed Cleanup | 🔴 ready | Backend Agent | Live-Beweis 2026-04-14 |
| 1.2 Test-Account Cleanup | ⏳ waiting CEO decision | Backend Agent | 2026-04-14 |
| 1.3 14 RPCs DPC-Sanitize | 🔴 ready | Backend Agent + Reviewer | Live-Beweis 2026-04-14 |
| 1.4 Migration-Drift Doku | 🟡 quick-doc | CTO | 2026-04-14 |
| 1.5 Live-DB Tests | ✅ verified intentional | — | 2026-04-14 |
| 2 — Journey Audits (12) | ⏳ pending | Frontend+Backend+Business+Reviewer | — |
| 3 — Cross-Cutting (4) | ⏳ pending | parallel zu Phase 2 | — |
| 4 — Beta Gate | ⏳ definition pending | CEO + CTO | — |
| 5 — Launch | ⏳ blocked by 4 | — | — |

---

## Bug-Tracker (wird in Phase 2 gefuellt)

```
[Severity] [Journey] [Title] [Owner] [Status]
```

(empty — noch keine Journey-Audits gelaufen)

---

## Open Questions for CEO (sammeln, nicht jedes Mal fragen)

- [ ] Beta-User Profile: Hardcore-Fans? Casuals? Mix? (Phase 4 Gate)
- [ ] Failure-Tolerance: Was darf NIE kaputt gehen? (Geld-Layer? Lineup? Onboarding?)
- [ ] Performance-Erwartung: Mobile auf 4G Tuerkei? Desktop only?
- [ ] Welche Test-Accounts behalten fuer post-launch QA? (Item 1.2)
- [ ] Function-Names `buy_player_dpc` + `calculate_dpc_of_week` rename ODER legacy lassen? (Item 1.3)
- [ ] PostHog hooked? (Phase 4 Gate Item 8)

Sammeln und in einer 15-Min Spec-Session abarbeiten, nicht einzeln.

---

## Session-Log

- **2026-04-14** — Operation Beta Ready definiert. Live-DB Pre-Launch Scan durchgefuehrt — alle Items 1.1-1.5 mit echten Daten verifiziert. Tool-Setup: Sentry MCP scoped + GitHub gh + Vercel CLI alle live (siehe `cto-tools-setup.md`). Naechste Session: Phase 0 Inventory + Phase 1 Cleanup parallel starten.
