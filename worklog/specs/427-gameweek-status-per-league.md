# Slice 427 — Gameweek-Status per-Liga (getFullGameweekStatus + useClubEventsData)

**Status:** SPEC · **Größe:** M · **Slice-Type:** Service · **Scope:** CTO · **Datum:** 2026-06-27

> Teil 1/3 des GW-Lifecycle-Per-Liga-Forks (CEO-Entscheid Anil 2026-06-27, Recon `worklog/notes/gameweek-engine-recon.md`). Riss 3 (Status-View global 1..38). Slice C. Folge: 428 (A Spalten), 429 (B finalize).

---

## 1. Problem Statement

`getFullGameweekStatus()` (Plattform-Admin `AdminGameweeksTab`) und `getGameweekStatuses(1,38)` (Club-Admin `useClubEventsData`) sind **global, ohne Liga-Filter**:
- **Phantom-Spieltage:** Loop hart `1..38` zeigt GW 35–38 als leere Karten für die 34-Wochen-Ligen (Bundesliga, 2. Bundesliga, Süper Lig — Live-DB `leagues.max_gameweeks=34`, seit Slice 421 bekannt).
- **Liga-Vermischung:** ohne `league_id`-Filter mischt die GW-Grid alle 7 Ligen in geteilte Eimer (GW20 = BL-GW20 + PL-GW20 + … als ein Eintrag).
- **Latenter 1000-Cap (Live-belegt):** `getFullGameweekStatus` macht `from('fixtures').select(...)` ohne `.range()`. **2438 Fixtures live** → PostgREST cappt still bei 1000 → die globalen Fixture-Counts sind seit jeher falsch (common-errors „PostgREST 1000-row cap"). Per-Liga-Max = **380 Fixtures** → liga-gefiltert sicher unter 1000.

**Betroffen:** jeder Plattform-Admin (GW-Engine-Tab) + jeder Club-Admin (Events-Tab). Display-only, **kein Money-Bug** (score_event ist liga-korrekt, Recon verifiziert).

## 2. Lösungs-Design (Architektur)

Beide Status-Quellen werden liga-scoped. `events.league_id` ist **209/210 NULL** (Live) → Events-Liga-Filter via Club-Join (separate Query → `.in('club_id', leagueClubIds)`, database.md „nested unzuverlässig").

**Vorher → Nachher:**
- `getFullGameweekStatus()` → `getFullGameweekStatus(leagueId: string | null = null)`. `leagueId` gesetzt: Fixtures `.eq('league_id', leagueId)`, Events `.in('club_id', <clubs der Liga>)`, Loop `1..getLeagueMaxGameweeks(leagueId)`. `null` = Legacy global 1..38 (Backward-Compat, kein Consumer mehr aktiv).
- `useClubEventsData(clubId)` → `useClubEventsData(clubId, leagueId?: string | null)`; ruft `getGameweekStatuses(1, 38, leagueId)`. **Faktum:** `getGameweekStatuses(leagueId)` baut die GW-Map nur aus real existierenden Liga-Fixtures → Phantom-GW lösen sich automatisch, der `38`-Oberbound ist harmlos (keine Fixtures jenseits max).
- Consumer reichen `league_id` durch: `AdminGameweeksTab` aus `activeClub.league_id`; `AdminEventsTab` aus `club.league_id` (beide `DbClub`/`ClubWithAdmin` → Feld vorhanden, verifiziert).

Keine Type-Shape-Änderung an `FullGameweekStatus`/`GameweekStatus`. Kein Money, kein Migration, kein i18n.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/features/fantasy/services/scoring.queries.ts` | EDIT | `getFullGameweekStatus(leagueId)` — Liga-Filter + 1..max + Cap-Fix |
| `src/components/admin/hooks/useClubEventsData.ts` | EDIT | `leagueId`-Param → `getGameweekStatuses(1,38,leagueId)` (2 Call-Sites) |
| `src/app/(app)/bescout-admin/AdminGameweeksTab.tsx` | EDIT | `getFullGameweekStatus(activeClub.league_id)` (2 Call-Sites: load + post-sim) |
| `src/components/admin/AdminEventsTab.tsx` | EDIT | `useClubEventsData(club.id, club.league_id)` |
| `src/features/fantasy/services/__tests__/fixtures.test.ts` | EDIT | getFullGameweekStatus neue Signatur/Behavior (falls Coverage existiert) |
| `src/components/admin/__tests__/AdminEventsTab.test.tsx` | EDIT | Mock-Signatur getGameweekStatuses ggf. leagueId-arg |

**Grep:** `grep -rn "getFullGameweekStatus\|getGameweekStatuses\|useClubEventsData" src/` — Consumer (oben) identifiziert: AdminGameweeksTab (1×), useClubEventsData (1×, 2 Calls), AdminEventsTab (1×), useGameweek (schon leagueId-aware, unberührt).

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `src/features/fantasy/services/scoring.queries.ts:392-432` | Ist-Stand getFullGameweekStatus | Loop-Bound, Promise.allSettled-Shape, logSilentRejects |
| `src/features/fantasy/services/fixtures.ts:185-222` | getGameweekStatuses leagueId-Support | leagueId schon optional → nur durchreichen, kein Service-Change |
| `src/lib/services/club.ts:602-613` | getLeagueMaxGameweeks | Signatur `(leagueId\|null)→number`, null→38 |
| `src/app/(app)/bescout-admin/AdminGameweeksTab.tsx` | Consumer-Threading | activeClub.league_id verfügbar? 2 Call-Sites? |
| `src/components/admin/AdminEventsTab.tsx:24-30` | Consumer-Threading | club.league_id (ClubWithAdmin) |
| `.claude/rules/errors-db.md` „PostgREST 1000-row cap" | Cap-Bug | warum Liga-Filter ihn schließt |
| `.claude/rules/database.md` „PostgREST nested unzuverlässig" | Events-Liga-Filter | separate clubIds-Query statt nested embed |

## 5. Pattern-References

- `errors-db.md` „PostgREST 1000-row cap — MONEY-CRITICAL" — getFullGameweekStatus `.select()` ohne range; Liga-Filter (380<1000) schließt es.
- `errors-frontend.md` S276 / S270 — „gleiche GW-Nummer = rein"-Liga-Vermischung; exakt diese Klasse (getGameweekTopScorers-Kommentar Z.227 bestätigt Präzedenz).
- `database.md` „PostgREST nested.field unzuverlässig → separate Query + .in()" — Events-Liga-Filter via clubIds.
- Slice 421 / 251 — `getLeagueMaxGameweeks` ist kanonische Per-Liga-Max-Quelle.
- `errors-frontend.md` S149b „Component-Prop Silent-Fallback" — neue optional `leagueId`-Props: Caller explizit setzen, sonst stiller global-Fallback.

## 6. Acceptance Criteria

```
AC-01: [HAPPY] getFullGameweekStatus(BL-leagueId) liefert nur GW 1..34
  VERIFY: Unit-Test mit gemockten Fixtures GW1..34 (BL) + leagueId → result.length === 34
  EXPECTED: kein GW 35-38 im Array
  FAIL IF: result enthält gameweek 35,36,37,38

AC-02: [HAPPY] getFullGameweekStatus(null) bleibt Legacy 1..38
  VERIFY: Unit-Test ohne leagueId → result.length === 38
  EXPECTED: Backward-Compat unverändert
  FAIL IF: Signatur-Change bricht no-arg-Call

AC-03: [I18N/REGRESSION] FullGameweekStatus-Shape unverändert
  VERIFY: npx tsc --noEmit
  EXPECTED: 0 Errors, kein Consumer bricht
  FAIL IF: tsc-Error in AdminGameweeksTab/AdminEventsTab

AC-04: [EMPTY] Liga ohne Fixtures
  VERIFY: getFullGameweekStatus(leagueId) wo 0 Fixtures → loop 1..max, alle totalFixtures=0
  EXPECTED: max leere Karten (kein Crash)
  FAIL IF: throw / undefined

AC-05: [HAPPY] useClubEventsData reicht leagueId an getGameweekStatuses
  VERIFY: Unit/Mock prüft getGameweekStatuses Call-Args === (1, 38, leagueId)
  EXPECTED: 3. Arg = club.league_id
  FAIL IF: Call ohne leagueId (global)

AC-06: [LIVE/VISUAL] AdminGameweeksTab BL zeigt nur 1..34
  VERIFY: bescout.net Plattform-Admin GW-Tab, BL-Club selektiert (post-Deploy)
  EXPECTED: Grid endet bei GW34, keine 35-38-Karten, Counts liga-rein
  FAIL IF: GW35-38 sichtbar ODER Fixture-Count > Liga-Realität (Vermischung)
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | getFullGameweekStatus | leagueId null | Legacy-Aufruf | global 1..38 wie bisher | Default-Param `= null` |
| 2 | getFullGameweekStatus | Liga 0 Clubs | leagueClubIds=[] | events-Query `.in('club_id', [])` → 0 events, kein Crash | `.in()` mit leerem Array = leeres Set (kein Fehler) |
| 3 | getFullGameweekStatus | Liga 0 Fixtures | totalFixtures=0 | loop 1..max, alle 0 | bestehende `length>0`-Guards in isSimulated |
| 4 | useClubEventsData | leagueId undefined (alt-Caller) | nicht durchgereicht | global (Backward-Compat) | optional Param |
| 5 | getFullGameweekStatus | getLeagueMaxGameweeks wirft | DB-Fehler | propagiert (Promise.allSettled fängt fixtures/events separat) | max-Fetch vor allSettled → try/throw sichtbar |
| 6 | events.in club_id | >100 clubIds | max 20 Clubs/Liga | unter 100-Chunk-Limit | Liga hat ≤20 Clubs (Live) |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
CI=true npx vitest run src/features/fantasy/services/__tests__/fixtures.test.ts
CI=true npx vitest run src/components/admin/__tests__/AdminEventsTab.test.tsx
grep -rn "getFullGameweekStatus\|useClubEventsData(" src/  # alle Caller threaden leagueId
# Live-Smoke (read-only):
# SELECT league_id, COUNT(*) FROM fixtures GROUP BY league_id  → max 380 < 1000
```

## 9. Open-Questions

**Pflicht-Klärung:** keine — CEO-Fork bereits entschieden (Per-Liga). Display-only, kein Money.

**Autonom-Zone:** Events-Liga-Filter-Implementierung (clubIds-Query inline vs Helper), Test-Granularität, ob max-Fetch in Service oder Consumer (→ Service, hält Consumer dumm).

**Nicht-Autonom:** keine (kein Money/RLS/Wording).

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| Service (read-only) | `vitest run` Output `worklog/proofs/427-vitest.txt` (AC-01/02/04/05) + `tsc` clean |
| UI-Visual | Playwright/Screenshot bescout.net Plattform-Admin GW-Tab BL → `worklog/proofs/427-bl-gw34.png` (AC-06, post-Deploy) |

## 11. Scope-Out

- `clubs.active_gameweek` vs `leagues.active_gameweek` Konsolidierung → **Slice 428 (A)**.
- `finalizeGameweek` Liga-Scope + `set_active_gameweek`-Guard `>38`→`>max` → **Slice 429 (B)** bzw. 428 (Guard, da RPC dort ohnehin angefasst).
- `events.league_id`-Backfill (D113-Denorm ungenutzt) → eigener Entscheid, nicht GW-Fork.
- `getFullGameweekStatus` null/global-Pfad behält den 1000-Cap (Legacy, kein aktiver Consumer) — bewusst nicht gefixt (kein Konsument).

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (skipped: read-only Queries, kein Schema/Service-Contract-Change, nur Param-Add) → BUILD → REVIEW (reviewer-Agent: M-Slice) → PROVE (vitest + Live-Screenshot) → LOG
```

## 13. Pre-Mortem

| # | Failure | Prob | Impact | Mitigation | Detection |
|---|---------|------|--------|------------|-----------|
| 1 | Events-Liga-Filter via clubIds vergisst Events deren Club die Liga gewechselt hat | LOW | niedrig | events sind club-scoped, club_id stabil | Live-Count BL events vs grid |
| 2 | `getLeagueMaxGameweeks` null-return → loop 1..38 trotz leagueId | LOW | niedrig (Phantom zurück) | Fallback 38 nur bei leagueId null; bei gesetzt liefert DB max | AC-01 |
| 3 | useClubEventsData simGw-Auto-Select bricht bei leerer Liga | LOW | niedrig | `find(!is_complete)` → undefined → setSimGw nicht aufgerufen (bestehend) | AC-04 |
| 4 | AdminEventsTab `club.league_id` undefined | LOW | niedrig (global-Fallback) | ClubWithAdmin extends DbClub, league_id NOT NULL in DB | tsc + AC-05 |
| 5 | tsc grün aber Consumer vergisst 2. Call-Site (post-sim refresh) | MED | mittel (Grid bleibt global nach Sim) | beide Call-Sites in AdminGameweeksTab explizit (Z.28+53) | AC-06 Live nach Sim |

## Compliance-Check
Kein Money-Path, kein user-facing $SCOUT/IPO/Reward-Wording (Admin-interne GW-Grid). i18n unverändert. → n/a.

## Open Risiko
Gering. Reine Read-Query-Erweiterung mit Default-Param (Backward-Compat). Einziges echtes Risiko: eine vergessene Call-Site lässt eine Surface global — durch explizite 2-Call-Site-Liste + Live-Verify (AC-06) abgedeckt.
