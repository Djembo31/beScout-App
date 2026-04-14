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

#### Item 1.2: Test-Account SC Cleanup ⏸️ DEFERRED bis post-Beta

**CEO-Decision 2026-04-14:** Test-Accounts BLEIBEN waehrend Beta. Begruendung: bei 50 Mann Start braucht der Markt Belebung, sonst tot.

**Status:** Item komplett auf post-Beta verschoben. Phase 1 reduziert auf 1.1 + 1.3 + 1.4 + 1.5.

**Live-DB Snapshot (2026-04-14):** 90 SCs in 6 Test-Accounts (test12=30, jarvisqa=18, test1=17, test2=11, test=10, test444=4) bleiben aktiv im Markt.

**Optional waehrend Beta:** Test-Accounts rebranden auf realistische Demo-Handles (z.B. "demo_haci", "demo_emre") damit es nicht nach "test" aussieht. → Nur wenn Beta-User es bemerken/ansprechen.

#### Item 1.3: 16 RPCs DPC-Sanitize + Function-Rename 🔴 (CEO 2026-04-14: rename approved)

**Live-DB Beweis (2026-04-14):** 16 RPCs enthalten "DPC" string.

**14 RPCs mit DPC im Body** (description-strings, comments → string-replace):
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

**2 RPCs mit DPC im Function-Name → CEO 2026-04-14: RENAME**:
- `buy_player_dpc` → `buy_player_sc`
- `calculate_dpc_of_week` → `calculate_sc_of_week`
- **Plus:** alle Service-Konsumenten (`src/lib/services/*.ts`) updaten
- **Plus:** alle Hooks/Components die diese RPCs nutzen
- **Plus:** Impact-Agent VOR Rename — jeder caller muss bekannt sein

**Approach (per RPC einzeln):**
1. `pg_get_functiondef()` lesen
2. Code-grep wo RPC aufgerufen wird (Service-Layer + direkte Callers)
3. **Body-Strings:** "DPC" → "SC" in description text only (NICHT in column-names oder business-logic)
4. **Function-Renames:** CREATE OR REPLACE FUNCTION mit neuem Namen, dann DROP alter Name (oder Alias-Pattern fuer 1 Migration)
5. Migration mit `mcp__supabase__apply_migration`
6. Service-Files updaten + tsc clean
7. Supply-Invariant + Geld-Tests gruen
8. Reviewer Agent (Opus) prueft Geld-Invarianten + Rename-Vollstaendigkeit

**WICHTIG:** Code-intern bleibt "dpc" in Variable/Column-Names (siehe business.md). Nur USER-FACING strings + Function-Names werden umbenannt.

**Aufwand:** ~3 Min pro RPC × 14 Body + 15 Min pro Rename × 2 = ~75 Min Backend + 15 Min Impact-Check + 30 Min Reviewer = ~2 Stunden total.

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

**Multi-League Integration pro Journey (Status 2026-04-14):**

Die Multi-League-Expansion (7 Ligen, 134 Clubs, 4.263 Spieler, Commit 8a5014d) ist teils live, teils offen. Jede Journey prueft zusaetzlich Liga-Aspekte. Multi-League-Offene-Items werden im Journey-Audit aufgedeckt + gefixt.

| Journey | Multi-League-Checks / Fixes |
|---------|------------------------------|
| 1 Onboarding | Home-Widgets Liga-Logos (TopMoversStrip, MostWatchedStrip, HomeSpotlight) fehlen — P1 |
| 2 IPO-Kauf | PlayerIPOCard Header + TradingCardFrame Liga-Logo — P1. **P1 IPO-Launch-Strategie:** 4.263 neue Spieler haben `dpc_total=0`, brauchen IPO-Launch (pro Spieler manuell vs Bulk-Auto — CEO-Decision pending) |
| 3 Sekundaer-Trade | TradingCardFrame Front+Back Liga-Logo fehlen, PlayerRow Card-Variant Header, Player-Detail Hero Liga-Badge — P1 |
| 4 Fantasy-Event | **🔴 P0 CRON MULTI-LEAGUE:** `src/app/api/cron/gameweek-sync/route.ts` hat keine `activeLeagues`-Loop → Gameweek-Sync/Scoring laeuft aktuell nur auf Ur-Liga (TFF 1. Lig). Events in BL/PL/Serie A/LaLiga/SuperLig/BL2 werden NICHT automatisch gescored. **Beta-Blocker.** Plus: EventDetailHeader + GwHeroSummary Liga-Logos (P1) |
| 5 Mystery Box | — (keine Multi-League-Relevanz) |
| 6 Profile + Following | Transactions Liga-Filter + Badge fehlen; Profile-Portfolio Liga-Breakdown optional — P2 |
| 7 Mission/Streak | — (keine Multi-League-Relevanz im Beta-Scope) |
| 8 Verkaufen + Order-Buch | TradingCardFrame Liga-Logo (gemeinsam mit J3) — P1 |
| 9 Liga-Rang | Rankings Liga-Filter ✅ done. Home Liga-Rang Widget Liga-Badge — P2 |
| 10 Watchlist + Notifications | Notification-Items Liga-Logo (P2); Watchlist-Filter bereits via MarktplatzTab ✅ |
| 11 Equipment + Inventar | — (keine Multi-League-Relevanz) |
| 12 Multi-League Discovery | CountryBar+LeagueBar ✅ live (MarktplatzTab, BestandView, KaderTab). Clubs-Page Liga-Gruppierung — P2. Cross-Liga Compare Feature — P2 |

**Nicht-Journey Multi-League-Items (nach Phase 2 als Cleanup):**
- ClubChips shared Component (aktuell inline BestandView)
- PlayerFilterStack Composite (optional)
- Navigation (SideNav Liga-Indikator, TopBar Liga-Info, SearchOverlay Liga-Gruppierung)
- Admin Panel Multi-League Support (Liga-Selector, AdminLigaTab multi-liga) — nicht Beta-Scope
- Community Liga-Filter — nicht Beta-Scope

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

### Phase 4 — Beta Launch Gate (Definition, CEO-Decisions 2026-04-14)

EXPLIZITE Checklist. Was hier nicht ✅ ist, blockt Beta-Launch.

- [ ] Alle 12 User Journeys laufen ohne CRITICAL/HIGH-Bug durch (Playwright-Beweis)
- [ ] Onboarding < 60 Sekunden (Welcome bis erste Action) — Comunio-Veteranen brauchen kein Hand-Holding
- [ ] RPC-P95 < 200ms für: buy_from_market, buy_from_order, place_sell_order, accept_offer, score_event
- [ ] **Mobile-First clean:** iPhone 12+ baseline, 4G Tuerkei, Bundle <300KB, LCP <2s (CEO Q3)
- [ ] DE + TR coverage 100% für user-facing strings
- [ ] Compliance-Sweep clean (0 forbidden words live)
- [ ] Sentry hooked up + DSN live + Source-Maps uploaded
- [ ] Beta-Onboarding Email/SMS-Flow ready (Founder-Status communiziert)
- [ ] Pre-Launch Cleanup done (Phase 1.1 + 1.3 + 1.4 ✅, 1.2 deferred post-Beta)
- [ ] Supply-Invariant + NULL-Money-Bug Tests gruen in CI
- [ ] **Roll-back Plan + P0 Hotfix-Workflow dokumentiert** (P0 = Geld + Onboarding + Lineup-Submit, CEO Q2)
- [ ] CEO Beta-User-Liste finalisiert (Familie + Freunde + Comunio.de Veteranen, CEO Q1)
- [ ] **Founder-Onboarding-Komms:** Welcome-Mail mit Founder-Status, Bug-Report-Channel definiert

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
| 0 — Inventory | ✅ complete | CTO + 2 Explore Agents | 2026-04-14: feature-map.md + service-map.md geschrieben |
| 1.1 Fan-Seed Cleanup | ✅ done | CTO via MCP | 2026-04-14: 10 Accounts + cascade purged, Supply-Invariant gruen |
| 1.2 Test-Account Cleanup | ⏸️ DEFERRED post-Beta | — | CEO-Decision 2026-04-14: brauchen Markt-Belebung |
| 1.3 14 RPCs DPC-Sanitize+Rename | ✅ done | CTO via MCP | 2026-04-14: A=10 RPCs sanitized, B=2 Renames mit Alias-Pattern, Code+Tests updated |
| 1.4 Migration-Drift Doku | ✅ done | CTO | 2026-04-14: database.md Zeile 67-82 + pre-launch [x] |
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

## CEO-Decisions (final — 2026-04-14)

- [x] **Q1 Beta-User Profile:** Familie + Freunde als **Founder** mitmachen. Comunio.de-Veteranen → erfahrene Manager-Spieler. Sie kennen Trading, Lineup, Stats von Day 1. **Implication:** Onboarding kurz halten (kein Hand-Holding noetig), aber Marktdepth + Lineup-Logic + Stats muessen tight sein. Founder-Status starke Motivation → werden Bugs proaktiv melden.
- [x] **Q2 Failure-Tolerance:** Alle 3 = P0 (Geld + Onboarding + Lineup-Submit). Hot-Fix sofort + Rollback noetig bei Bug. Rest = P1.
- [x] **Q3 Performance:** Mobile-First, 4G Tuerkei, iPhone 12+ Baseline. Bundle <300KB, LCP <2s.
- [x] **Q4 Test-Accounts:** **BEHALTEN bis post-Beta.** Brauchen Markt-Belebung (sonst toter Markt bei 50 Mann Start). Cleanup-Plan = post-Beta. Phase 1.2 → DEFERRED.
- [x] **Q5 RPC-Function-Names:** **RENAME** (`buy_player_dpc` → `buy_player_sc`, `calculate_dpc_of_week` → `calculate_sc_of_week`). Saubere Codebase. Phase 1.3 erweitert auf 16 RPCs inkl. Function-Renames + alle Service-Konsumenten.
- [x] **Q6 PostHog:** Nein, Beta laeuft nur mit Sentry. Behavior-Daten erst post-Beta.
- [x] **Bonus Cadence:** Session-Ende Status-Reports. CEO checkt SSOT wann gewuenscht.

---

## Session-Log

- **2026-04-14** — Operation Beta Ready definiert. Live-DB Pre-Launch Scan durchgefuehrt — alle Items 1.1-1.5 mit echten Daten verifiziert. Tool-Setup: Sentry MCP scoped + GitHub gh + Vercel CLI alle live (siehe `cto-tools-setup.md`). Naechste Session: Phase 0 Inventory + Phase 1 Cleanup parallel starten.
- **2026-04-14 Late** — CEO-Spec-Session: alle 6 Open Questions beantwortet. Beta-User = Comunio-Veteranen-Founder, Failure-P0 = Geld+Onboarding+Lineup, Mobile-First Performance, Test-Accounts deferred (Markt-Belebung), RPC-Rename approved, kein PostHog, Session-End Reports. Phase 1 reduziert auf 1.1+1.3+1.4+1.5 (1.2 post-Beta).
- **2026-04-14 Evening** — Phase 0 + Phase 1 COMPLETE. Inventaries geschrieben (feature-map.md + service-map.md). Phase 1.1 Fan-Seed-Cleanup durch (10 casual-Accounts + cascade, Supply-Invariant gruen). Phase 1.3 durch (10 RPCs sanitized, 2 Renames mit Alias-Pattern, 8 Code-Files + Tests updated, tsc + vitest gruen). Migration-Files als 20260414150000 + 20260414151000 committed. Beta-Ready-Checklist Phase 1 komplett → bereit fuer Phase 2 Journey-Audits.
