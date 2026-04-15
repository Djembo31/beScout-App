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
| 2 — Journey Audits (12) | 🟡 in-progress | Frontend+Backend+Business+Reviewer | J1 ✅. J2 ✅ 6 AR. J3 ✅ **15 AR**. J4 ✅ **16 AR**. J5 ✅ **9 AR**. J6+J7+J8 🟡 Round 1 done (2026-04-15): **5 AKUT-P0 LIVE-FIX** (Streak-Race-Exploit-Reversal + assign_user_missions Security + 7 Trade-RPCs REVOKE + expire_pending_orders BUY-branch + DROP buy_from_market) + **46 autonome Healer-Fixes** (J6+J7+J8 Wording+Streak+Error-Mapping) + **Rework-Round** (orderCannotBeCancelled i18n, Wording-Sweep Portfolio/Trader/Einzahlen, Streak-Source-of-Truth Migration, J6 4 RPCs REVOKE). Offen: restliche ~10 reguläre CEO-Items (Realtime-Publication, TR-Glossar-Approval, Rate-Limit-Tier, Fee-Transparenz, SellModal-Refactor post-Beta). J9+ pending. |
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
- **2026-04-14 Schnellbahn** — **Journey #2 CEO-Approvals COMPLETE (6 / 6).** Alle AR-Items autonom durchgezogen nach Anil "schnellbahn" = alle A-Empfehlungen approved. Commits: df94b70 AR-8 drift-backfill + AR-6 zero-price guards; 6937b01 AR-5 Multi-League Bulk-IPO-Launch (3596 neue IPOs live, 4166/4285 Spieler jetzt tradebar = 97%); d1f2170 AR-10 sync-trigger (players.ipo_price ↔ ipos.price); 3067405 AR-9 IPO Fee-Transparenz (10/5/85 Breakdown im BuyConfirmModal); 739a46b AR-7 IPO-Vokabel-Sweep + business.md Begriffsregel. Migrations-Status: 3 neue Migrations (160000 drift + 161000 guards + 162000 bulk + 163000 sync-trigger). Live-Verify: 4166 open IPOs, 0 Drift players↔ipos, Zero-Price-Guards active, Fee-Breakdown sichtbar.
- **2026-04-14 Late-Night** — **Phase 2 Journey #2 Erster IPO-Kauf Round 1 COMPLETE.** 3 parallel Agents (FE/BE/Business) → 49 Findings (8 CRITICAL + 13 HIGH + 17 MEDIUM + 11 LOW). 2 Healer-Agents (FE+BE parallel worktrees) → 15 autonome Fixes in 2 Commits (3c02ebd Frontend FIX-01..14, 6b3f46d Backend FIX-10/13/15). Reviewer-Pass VERDICT: **PASS** — Contract-Change-Propagation korrekt (playerId optional), i18n-Key-Leak via errorMessages.ts geschlossen, Multi-League Liga-Logos in IPO-Components. tsc clean, 111 Tests green + 975 Service-Tests green. 6 CEO-Approval-Items pending (`journey-2-ceo-approvals-needed.md`): AR-5 Multi-League IPO-Launch (Beta-Blocker), AR-6 Zero-Price Guards (Geld), AR-7 IPO-Vokabel business.md, AR-8 Migration-Drift Backfill, AR-9 Fee-Transparenz, AR-10 players.ipo_price Source-of-Truth. Journey #3 (Sekundaer-Trade) als naechstes.

- **2026-04-14 Night** — **J3+J4 Schnellbahn COMPLETE + J5 Audit COMPLETE.** 17 Commits in einer Session-Hälfte. J3-AR-11..25 (15 Items) durchgezogen: RPC-Migrations AR-12+28/18/19/21/29 applied + AR-27+40 Security (Live-Exploit-Fix earn_wildcards REVOKE+auth.uid Guard) + AR-26+34 Cron Multi-League (6 Ligen aktiviert) + AR-13 707 Phantom-SCs Backfill (177 IPOs reconstructed) + AR-14 transactions RLS Privacy-Lockdown + AR-20 trades ON DELETE SET NULL FK + AR-24+30 trades+lineups Column-Level Whitelist. J3+J4-Compliance-Wording (7 Items): AR-15 Investment-Signale + AR-16+39 "Spieler kaufen"/Manager-Rolle + AR-17 business.md Kapitalmarkt-Glossar + AR-32 Gluecksspiel-Vokabel-Sweep + AR-33 FantasyDisclaimer+7 Integrationen + AR-36 Post-Event CTA neutralisiert + AR-41 Fantasy-Services Architektur-Note. Plus Frontend Feature-Flags: AR-11+23 BuyOrder/LimitOrder aus Beta + AR-31+38 PAID_FANTASY_ENABLED Flag + Creator-Fee entfernt. J5 Mystery Box Audit: 35 Findings mit 2 LIVE-BROKEN CRITICAL (AR-42 Equipment-Drops 6d tot wegen Column-Mismatch + AR-46 Inventory-Crash Legacy 'uncommon' rarity). 8 CEO-Approvals (AR-42..49) pending. tsc clean durchgehend. 17 Commits pushed.

- **2026-04-14 Late-Evening** — **Phase 2 Journey #4 Fantasy-Event Round 1 COMPLETE.** 3 parallel Audits (FE/BE/Business) → 71 Findings (19 CRITICAL + 26 HIGH + 19 MEDIUM + 7 LOW). **🚨 AKUT: Backend-Audit hat `earn_wildcards` RPC LIVE exploited** (anon konnte 99.999 Wildcards minten, reverted) — SECURITY DEFINER ohne REVOKE+Guard. 2 Healer-Agents parallel → 6 autonome Fixes in 2 Commits (`3603c00` FIX-01..03 i18n-Leak+preventClose+alert-raus+neuer ConfirmDialog; `cae1f78` FIX-12..14 Multi-League FantasyEvent/Holding Types + LeagueBadge × 4 via client-side Cache-Lookup Zero-RPC-Change). Reviewer VERDICT **PASS**: 6 Fixes OK, Pattern-konsistent, Test-Coverage OK, ConfirmDialog gelobt als wiederverwendbar, 2 TODO-Kommentare exemplarisch dokumentiert. tsc clean, 310/310+244/244 Tests green (Fantasy + Wallet + UI). **16 CEO-Approval-Items pending** (`journey-4-ceo-approvals-needed.md`): AR-27 AKUT SECURITY `earn_wildcards`/spend/get_balance/refund REVOKE+auth.uid-Guards, AR-26 P0 Cron Multi-League 114 Clubs, AR-28 Migration-Drift 5 Fantasy-RPCs (4. Journey), AR-29 12 Events phantom pgs_count=0, AR-30 lineups RLS whitelist, AR-31 Paid-Fantasy Feature-Flag 6 UI-Touchpoints, AR-32 Gluecksspiel-Vokabel-Sweep (gewinnen+Preise+Prize+Prämie), AR-33 FantasyDisclaimer-Component-Text, AR-34 Multi-League Admin-Spieltag (in AR-26), AR-35 lock_event_entry Fee-NoOp, AR-36 Post-Event Reinvest-CTA, AR-37 Pari-mutuel Disclaimer, AR-38 Creator-Fee hardcoded, AR-39 "Manager:Gewinne"-Rolle, AR-40 admin_grant_wildcards trust-client, AR-41 Fantasy-Services Error-Swallowing Architektur dokumentieren. 2 neue common-errors.md Patterns: SECURITY DEFINER REVOKE+Guard PFLICHT, ConfirmDialog statt native alert/confirm. Journey #5 (Mystery Box) als naechstes — parallel mit CEO-Session noetig da J3+J4 zusammen 31 CEO-Approvals stapeln.

- **2026-04-14 Evening-2** — **Phase 2 Journey #3 Sekundaer-Trade Round 1 COMPLETE.** 3 parallel Audits (FE/BE/Business) → 62 Findings (11 CRITICAL + 21 HIGH + 21 MEDIUM + 9 LOW). 2 Healer-Agents parallel (Healer A = Money-Safety+i18n, Healer B = Multi-League Liga-Logos) → 12 autonome Fixes in 2 Commits (`22467fa` FIX-01..07+24, `10df6cf` FIX-08..12) + Merge `32f2643`. Reviewer-Pass VERDICT: **PASS** — i18n-Key-Leak auf handleSell/handleCancelOrder/placeBuyOrder geschlossen (J2 hat nur handleBuy gefixt), preventClose auf 3 Modals, BuyOrderModal Disclaimer+Fee-Breakdown, Multi-League LeagueBadge auf TradingCardFrame Front+Back/PlayerHero/TransferListSection mit Props-Propagation. tsc clean, 97/97 Tests green. **15 CEO-Approval-Items pending** (`journey-3-ceo-approvals-needed.md`): AR-11 BuyOrder-Matching-Engine (Beta-Blocker), AR-12 Migration-Full-Sweep 7 RPCs, AR-13 707 Phantom-SCs Backfill, AR-14 anon-RLS transactions P0, AR-15 Investment-Signale Rewards+Intro (SPK-Flag), AR-16 "Spieler kaufen" 5 Keys, AR-17 business.md Kapitalmarkt-Glossar, AR-18 Circular-Trade-Guard, AR-19 1-SC-Limit weg, AR-20 529 Orphan ipo_id, AR-21 get_price_cap Fallback, AR-22 RPC-Errors i18n, AR-23 LimitOrderModal aus Beta, AR-24 trades whitelist, AR-25 Notif-Dedup. 3 neue common-errors.md Patterns: i18n-Key-Leak Systematik-Erweiterung, Modal preventClose, Multi-League Props-Propagation. Journey #4 (Fantasy-Event-Teilnahme) als naechstes.
- **2026-04-14 Night** — **Phase 2 Journey #1 Onboarding COMPLETE.** 3 parallel Agents (Frontend/Backend/Business) → 23 Findings. 19 Fixes in 3 Commits (155a31c, b31fef1, 4418c45): Service-Error-Hardening (referral, missions, welcomeBonus, search, notifications), RESERVED_HANDLES Validierung, TradingDisclaimer auf 6 Entry-Pages (Welcome+Login+Onboarding+Home+FoundingPass+WelcomeBonusModal), OnboardingChecklist i18n-Fix TR, Wording-Compliance (Waehrung→Plattform-Guthaben). Reviewer-Pass uncovered 3 Contract-Change-Propagation-Issues — alle gefixt (onboarding partial-failure non-blocking, validateHandle UI, test update). tsc gruen, 147 Tests gruen. 4 Items brauchen CEO-Approval (`memory/journey-1-ceo-approvals-needed.md`): AR-1 RPC-Migration-Drift, AR-2 Wallet-Init-Trigger, AR-3 atomic bootstrap (deferred), AR-4 TR-Geofencing-Legal. 2 neue common-errors.md Patterns: Contract-Change-Propagation + i18n-Key-Leak. Journey #2 (IPO-Kauf) als naechstes.

- **2026-04-14 Post-Midnight** — **J5 Execution COMPLETE (AR-42 + AR-42b + AR-46 + 12 autonome FIX).** Nach Handoff "AKUT P0". Sequenz: (1) AR-42 Migration `20260414230000` — `open_mystery_box_v2` INSERT `user_equipment(rank)` statt `equipment_rank`. Equipment-Drop-Pfad live seit 2026-04-08 tot, jetzt verify `has_correct_column=true`. (2) AR-46 Frontend-Agent-Worktree: `MysteryBoxRarity` Union + `RARITY_CONFIG['uncommon']` (green-Theme) — Type-Extension statt DB-Backfill. (3) 3× parallele Frontend-Agents in Worktrees fuer FIX-03..14: Healer A (Modal+History 8 Fixes) + Healer B (queries staleTime:0 + mapErrorToKey fuer `daily_free_limit_reached`/`Not enough tickets`) + Healer C (/home Card a11y + bCredits→Credits sweep). Alle gemerged, 1 Konflikt in MysteryBoxModal.tsx (locale vs tErrors Hook-Block) trivial resolved. (4) **Reviewer-Pass fand KRITISCHEN 2. Bug:** RPC bcredits-Branch insertet `(type, amount_cents, description)` — Live-Schema hat `amount`+`balance_after` (NOT NULL). Live-Beweis: `SELECT DISTINCT type FROM transactions` hat 0 Rows mit `mystery_box_reward`. bCredits-Pfad war NIE funktional. (5) AR-42b Migration `20260414233000` — zweiter Fix im selben RPC, live verified `bcredits_fixed=true`. (6) common-errors.md Pattern ergaenzt: "RPC INSERT Column-Mismatch gegen Live-Schema" — CREATE OR REPLACE parst Body aber validiert KEINE Column-Existenz, Fehler erst beim CALL. Audit-Pattern dokumentiert. **Watchlist: 5 weitere RPCs** mit `amount_cents` im Body (`adjust_user_wallet`, `claim_welcome_bonus`, `get_club_balance`, `request_club_withdrawal`, `send_tip`) — Phase-3-Audit vor Beta pflicht. Commits: fafebc8 AR-42, dc0b322 AR-46 merge, e5143a5 J5 Healer-A, 636fe12 Healer-C merge, 2b0c00e Healer-B merge (mit Conflict-Resolution), 46a75fa AR-42b.

- **2026-04-15 CEO-Session (A-Schnellbahn)** — **J5 CEO-Approvals ALLE DURCH (6 Items AR-43/44/45/47/48/49).** Anil "A fuer alle". CTO Backend-Block (Commit `1255b79`): AR-43 Snapshot-Migration fuer `get_player_price_changes_7d` (Stubs mit "superseded" markiert), AR-44 REVOKE-Template-Pflicht + Audit-Script in `database.md`, AR-45 `DROP FUNCTION open_mystery_box(boolean)` v1 legacy, AR-48-BE neuer RPC `get_mystery_box_drop_rates()` (curated JSON) + `mystery_box_config` RLS-Lock (kein public SELECT, service_role bypass + SECURITY DEFINER via postgres-owner), AR-49-BE `current_setting('app.paid_mystery_box_enabled', true)::boolean` Guard im paid-Pfad. 1 Frontend-Agent-Sweep (Commits `4697d43` merge + `8921c73`): AR-47 MysteryBoxDisclaimer Component (legal/, analog Trading/Fantasy, 2 Integrationen), AR-48-FE `useMysteryBoxDropRates` Hook (staleTime 5min) + REWARD_PREVIEW dynamic mit DEFAULT_DROP_PERCENTS Fallback, AR-49-FE PAID_MYSTERY_BOX_ENABLED env-flag + Defense-in-Depth Guard (env+client+handler+RPC = 4 Layer). 4 Merge-Konflikte trivial resolved (Imports + handleOpen deps + Comment + Error-Map entries + messages DE/TR). 1 tsc-Fix: `DEFAULT_DROP_PERCENTS` um `uncommon: 0` erweitert fuer Type-Coverage nach AR-46. **Reviewer VERDICT PASS**: 9/9 J5 AR-Items, Freigabe fuer J6+. 2 Nitpicks non-blocking (REWARD_PREVIEW doppelte dropRate-Spalte post-Beta cleanup, Admin-Panel Drop-Rate-Editor deferred). Live-verified: RPC returnt `{common:45%, rare:30%, epic:17%, legendary:6%, mythic:2%, total_weight:100}`, `paid_mystery_box_enabled`-Guard aktiv, `mystery_box_config` 0 Policies. 3 TR-Reviews dokumentiert (`legal.mysteryBoxDisclaimer`, `...Short`, `errors.mysteryBoxPaidDisabled`). Admin-Panel AR-48-Step-3 post-Beta (kein existing AdminMysteryBoxTab).
