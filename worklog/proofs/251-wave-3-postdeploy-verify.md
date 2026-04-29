# Slice 251 Wave 3 — Post-Deploy Live-Verify Report

**Date:** 2026-04-29
**Environment:** https://bescout.net (HEAD `e1d17f94` on main, deployed via Vercel)
**Login:** jarvis-qa@bescout.net (favorite_club = Adana Demirspor → TFF 1. Lig)
**Verifier:** Primary-Claude via Playwright MCP + Supabase MCP (post-Routine-Recovery, the `wave-3-live-verify` remote-routine fired 00:36 UTC and ended `run_once_fired` after 9 min but did not persist any output — manually executed instead)

## Verify-Results

### [V-1] PASS — Cascade Stage 1 (AC-01)
- jarvis-qa logged in, navigated `/fantasy`, hard-refresh (location.reload).
- LeagueScopeHeader (`data-testid="league-scope-header"`) present, `nonSticky` mode (`className: "space-y-1.5 mb-1"` — by-design via FantasyContent.tsx prop).
- LeagueBar shows `Alle | Süper Lig | TFF 1. Lig` with **TFF 1. Lig pressed** (aria-pressed="true").
- CountryBar suppressed because `eventCountries.length <= 1` (only TR has Fantasy events at this moment) — by-design via `CountryBar.tsx:22 if (countries.length <= 1) return null`.
- localStorage `bescout-league-scope-v1` = `{leagueId: "b08cffec-6a37-4d95-ab61-0be8f7beb6ce", leagueName: "TFF 1. Lig", countryCode: "TR"}`.
- Console: 0 errors, 1 warning (unrelated meta-tag deprecation). **Keine Hydration-Mismatch-Warnung.** F-03 nicht eingetreten.

### [V-2] PASS — Atomic Liga-Switch (AC-02)
- Tested on `/market` Marktplatz-Tab (full CountryBar set: DE/TR/ES/EN/IT).
- Switched **Bundesliga → TFF 1. Lig → Bundesliga** via Country+League pill clicks.
- localStorage transitions:
  - Click DE-Country (smart-collapse): `{leagueId: null, leagueName: "", countryCode: "DE"}`
  - Click Bundesliga: `{leagueId: "4f968f3a...", leagueName: "Bundesliga", countryCode: "DE"}`
  - Click TR-Country + TFF 1. Lig: `{leagueId: "b08cffec...", leagueName: "TFF 1. Lig", countryCode: "TR"}`
  - Click DE-Country + Bundesliga: `{leagueId: "4f968f3a...", leagueName: "Bundesliga", countryCode: "DE"}` ✓
- Network-Refetch sichtbar nach jedem Switch via `browser_network_requests`: `get_market_user_dashboard`, `get_public_orderbook` (4×), `rpc_get_trending_players`, sponsors-query alle re-feuern. Cache-Invalidation triggert wie spezifiziert.
- Switch-Latenz: <1s pro Click visuell.

### [V-3] PASS — Async-Liga-Cycle (AC-03, MIN-Aggregation-Bug-Regression-Test)
- **Kein SQL-Modify nötig** — natürliche DB-Daten haben bereits unterschiedliche `active_gameweek` pro Liga:
  - Bundesliga: `active_gameweek=30, max_gameweeks=34` (DE)
  - TFF 1. Lig: `active_gameweek=28, max_gameweeks=38` (TR)
  - La Liga 32, Premier League 31, Serie A 33, Süper Lig 30 (Refs)
- Auf `/fantasy` mit `leagueScope=TFF 1. Lig`: SpieltagTab zeigt **"Spieltag 28"** ✓
- Switch zu `leagueScope=Bundesliga` (via /market UI, dann nav `/fantasy`): SpieltagTab zeigt **"Spieltag 30"** ✓
- **KEIN MIN-Aggregation-Drift** — vor Wave 1+2 hätte falsche MIN(active_gw)-Aggregation alle Ligen auf 28 gepflasst. Service-Layer korrekt per-Liga.
- Bonus: CountryBar bei BL-Scope auf /fantasy sichtbar (DE + TR), weil eventCountries dynamisch derived aus events-list — Wave 2 Service-Layer-Filter wirkt korrekt.

### [V-4] PASS — Mobile 393px (AC-12)
- Browser-Resize 393×852 (effective viewport 524 wegen DPR) auf `/market` Marktplatz-Tab.
- LeagueScopeHeader-Metriken:
  - `headerRect.height = 46px` (Single-Bar wegen ES single-League)
  - `buttonCount = 6` (Alle + DE/TR/ES/EN/IT)
  - `minBtnHeight = 44px` ✓ Touch-Target spec erfüllt
  - `docOverflow = false` ✓ kein viewport horizontal overflow
  - `nav.scrollWidth (527) > nav.clientWidth (484)` — by-design horizontal scroll innerhalb Nav (`overflow-x-auto scrollbar-hide`)
- **Screenshot:** `worklog/proofs/251-wave-3-v4-mobile-393.png` + `worklog/proofs/251-wave-3-v4-mobile-fullpage.png` (zeigen vollständige /market-Seite mit ES Spanien pressed, sauberes Layout, keine Pill-Umbrüche)

### [V-5] PASS — Cross-Page-Persistence (EC-12)
- Initial-State: `leagueScope=Bundesliga (DE)` set auf `/market`.
- Hard-refresh `/market` (location.reload): localStorage persistiert ✓ (`leagueId=4f968f3a..., leagueName=Bundesliga, countryCode=DE`).
- Navigate `/fantasy`: Header pressed `Deutschland + Bundesliga` ✓
- Navigate `/clubs`: Header pressed `Deutschland + Bundesliga` ✓
- Navigate `/rankings`: Header pressed `Deutschland + Bundesliga` ✓
- localStorage-Schema versioned `bescout-league-scope-v1` mit `{leagueId, leagueName, countryCode}` 3-Felder-Object ✓

### [V-6] PASS — anon→login Edge (F-05)
- Reset-Sequence: localStorage cleared + Logout via Confirm-Dialog ("Wirklich?").
- Redirect zu `/login`, dann Navigate `/fantasy` als anon → Auto-Redirect zu `/login` (route-protected, anon kann nicht erreichen).
- `localStorage = null` (state cleared, persist:partial Schema hält countryCode/leagueName/leagueId only — alle clear-able).
- Login als jarvis-qa (E-Mail+Passwort flow).
- Post-Login auf `/`: localStorage **sofort populated** mit `{leagueId: b08cffec..., leagueName: TFF 1. Lig, countryCode: TR}` — Cascade-Caller R-02 useEffect triggert auf `activeClub-hydration` (jarvis-qa.favorite_club = Adana Demirspor → TFF 1. Lig).
- F-05 (anon→login Cascade-Trigger) **funktioniert**.

### [V-7] PASS — Single-League-Auto-Select (F-06)
- Auf `/clubs` (jarvis-qa, leagueScope vor V-7 = BL/DE).
- Click `🇪🇸 Spanien` Country (1 Liga = La Liga in DB).
- localStorage **sofort updated** mit `{leagueId: "70ef464a-1351-480a-b36a-3a1c87bb130d", leagueName: "La Liga", countryCode: "ES"}` ✓
- LeagueBar sichtbar suppressed (single-Liga = kein Picker nötig, weil `setCountry` mit single-League auto-collapsed setLeagueScope direkt) — wirkt im UI als atomarer Single-Click-Apply.
- Note: Network-Refetch-Trigger erst nach setLeagueScope (nicht nach setCountry alone) — verified via Cache-Invalidation-Hook im Store.

## Summary

- **Total:** 7
- **Pass:** 7
- **Fail:** 0
- **Skip:** 0

## Findings

Keine FAIL-Cases. Alle 7 Verify-Steps grün.

### Bonus-Beobachtungen (kein Verify-Failure, aber Audit-relevant)

1. **Routine-Output verloren:** Die scheduled `wave-3-live-verify`-Routine (trig_01GpLLssvCemqUQCbEkLa5KC) feuerte 2026-04-29 00:36 UTC, lief 9 min, ended `run_once_fired`, hat aber kein File / PR / Issue persistent gemacht. Re-Trigger via `RemoteTrigger run` API zeigte Trigger-Config unverändert. **CTO-Backlog:** Routine-Reliability untersuchen — vermutlich kein Push-Permission im Cloud-Agent oder mid-execution-Abbruch ohne Output. Slice 251 Wave 3 wurde stattdessen manuell live-verified.

2. **AuthProvider-Slow-Warning** in Console (1× post-Login, 1× post-Logout): `[AuthProvider] loadProfile RPC slow, using 3-query fallback: Error: Timeout`. Nicht Wave-3-spezifisch, pre-existing AuthProvider-Behaviour bei Cold-Start. Funktional kein Impact (Profile resolved via Fallback-Pfad).

3. **/fantasy `eventCountries` filtert dynamisch:** Bei TFF1-Scope nur TR sichtbar (1 Country → CountryBar suppressed). Bei BL-Scope DE+TR sichtbar (Events in beiden Ligen). Das ist by-design (FantasyContent.tsx übergibt gefilterte `countries`-Prop), aber für End-User counterintuitiv: "Wo ist die Bundesliga?" auf /fantasy bei TFF1-Scope. **Backlog UX-NEU:** evtl. CountryBar immer rendern aber unmögliche Countries disabled-state — Anil-Decision für Wave 4+.

## Branching nach Verify

**All-PASS → Wave-6-Cleanup-PR draften** (per Routine-Briefing).

Wave-6-Cleanup deletet:
- `src/features/fantasy/store/fantasyStore.ts` — Felder/Setter `fantasyCountry`, `fantasyLeague`
- `src/features/market/store/marketStore.ts` — Felder/Setter `selectedCountry`, `selectedLeague`
- `src/lib/stores/marketStore.ts` (falls existent) — analoge Legacy-Felder
- `src/features/manager/store/managerStore.ts` — Felder/Setter `kaderCountry`, `kaderLeague`
- `src/components/fantasy/SpieltagTab.tsx:26-37` — `LEAGUE_FALLBACK` Konstante + dead Liga-Selector-Button + lokales `selectedLeagueId`-State

Vor jedem Delete: Consumer-grep + tsc + vitest run.

PR-Branch: `slice/251-wave-6-cleanup`. Title: `chore(251): Wave 6 — REMOVE legacy Liga-State (fantasyStore + marketStore + managerStore + LEAGUE_FALLBACK)`.

## Reproduce-Command-Liste (für Audit-Reproduzierbarkeit)

```bash
# 1. Wave-3-Verify reproduzieren
PLAYWRIGHT_BASE_URL=https://bescout.net pnpm exec playwright test e2e/beta-smoke.spec.ts

# 2. DB-Active-Gameweek-Snapshot
psql $DATABASE_URL -c "SELECT name, active_gameweek FROM leagues WHERE is_active=true ORDER BY country, name;"

# 3. localStorage Schema-Probe (Browser-DevTools auf bescout.net)
JSON.parse(localStorage.getItem('bescout-league-scope-v1'))
```
