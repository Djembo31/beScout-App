# Slice 421 — Welle 2.4: Per-Liga GW-Max in SpieltagSelector durchrouten + toten GameweekSelector löschen

**Status:** SPEC · **Größe:** S · **Slice-Type:** UI · **Scope:** CTO · **Datum:** 2026-06-27

> Mock→Pro Welle 2 (Spieltag/Scoring), Teilstück 2.4. Korrektheits-Fix (User-facing) + Dead-Code-Cleanup. Kein Money, keine Compliance, keine i18n-Strings.

---

## 1. Problem Statement

**Bug (User-facing Korrektheit):** Der „Nächster Spieltag"-Button im Fantasy-Bereich cappt für **jede** Liga bei Spieltag 38. Faktenkette (grep-verifiziert 2026-06-27):
- `SpieltagSelector.tsx:20` hat `maxGameweek = 38` als **Default**-Prop.
- `FantasyNav.tsx:48` (einziger Produktions-Consumer von `SpieltagSelector`) reicht `maxGameweek` **nicht** durch → Default 38 greift immer.
- `useGameweek` (der GW-State-Hook) liefert `maxGameweeks` nicht.
- Folge: Für Ligen mit Saisonende < 38 (TFF 1. Lig = 34, weitere via `leagues.max_gameweeks`) sind bis zu 4 klickbare **Geister-Spieltage** ohne Fixtures erreichbar. `activeGameweek`-Cron respektiert Per-Liga-Max bereits korrekt (`route.ts:256`, `advance-helpers.ts`) — nur die UI-Navigation driftet.

**Wer/wie oft:** Jeder Fantasy-Nutzer einer Nicht-38-Liga, bei jeder GW-Navigation. Konkret die gesamte TR-Prio-Schiene (TFF 1. Lig).

**Dead-Code (Cleanup, Welle-2.4-Recon bestätigt):** `GameweekSelector.tsx` ist ein Orphan — 0 Produktions-Consumer (grep `GameweekSelector` über `src/**/*.{ts,tsx}` = nur Component selbst + Barrel-Export `index.ts:5` + eigener Test). Lebender Selector = `SpieltagSelector`. Toter Code driftet (Wartungslast, Verwechslungsgefahr) → Mock→Pro „eine Quelle".

## 2. Lösungs-Design

**Fix A (GW-Max-Routing):** Kanonische Quelle existiert bereits: `useLeagueMaxGameweeks(leagueId)` (`events.ts:78`) → `getLeagueMaxGameweeks` (`club.ts:604`, liest `leagues.max_gameweeks`, Fallback 38). `FantasyContent` hat `leagueScopeId` bereits in Scope (Z.89). Datenfluss:

```
FantasyContent: const { data: maxGameweek } = useLeagueMaxGameweeks(leagueScopeId)
   → <FantasyNav maxGameweek={maxGameweek ?? 38} ... />
       → <SpieltagSelector maxGameweek={maxGameweek} ... />   (Prop existiert schon)
```

`FantasyNav`-Interface bekommt `maxGameweek: number` (required, Caller liefert `?? 38`). `SpieltagSelector` bleibt **unverändert** (akzeptiert die Prop bereits, Default 38 bleibt als Safety für Tests/sonstige Aufrufer).

**Fix B (Orphan-Delete):** `GameweekSelector.tsx` löschen + Barrel-Zeile `index.ts:5` entfernen + `__tests__/GameweekSelector.test.tsx` löschen (S375: Symbol-grep MUSS `__tests__` einschließen — hier explizit getan).

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/app/(app)/fantasy/FantasyContent.tsx` | EDIT | `useLeagueMaxGameweeks(leagueScopeId)` mounten + Prop durchreichen |
| `src/features/fantasy/components/FantasyNav.tsx` | EDIT | `maxGameweek`-Prop in Interface + an SpieltagSelector |
| `src/components/fantasy/GameweekSelector.tsx` | DELETE | Orphan, 0 Prod-Consumer |
| `src/components/fantasy/index.ts` | EDIT | Barrel-Export-Zeile `GameweekSelector` raus |
| `src/components/fantasy/__tests__/GameweekSelector.test.tsx` | DELETE | Test des gelöschten Orphans |

**Greps (alle gelaufen):**
- `grep -rn "GameweekSelector" src/**/*.{ts,tsx}` → 3 Treffer (Component, Barrel, Test) — **0 Prod-Consumer bestätigt.**
- `grep -rn "<SpieltagSelector" src/` → 1 Prod-Consumer (`FantasyNav.tsx:48`) + 1 Test-Mock (`FantasyContent.test.tsx:372`).
- `grep -rn "<FantasyNav" src/` → 1 Consumer (`FantasyContent.tsx:225`).

## 4. Code-Reading-Liste (Pflicht VOR Implementation) — alle gelesen

| File | Zweck | Geprüft |
|------|-------|---------|
| `src/components/fantasy/SpieltagSelector.tsx` | Ziel-Prop | `maxGameweek?: number = 38`, genutzt Z.91/92 für Next-Button-Cap. Kein Change nötig. ✅ |
| `src/features/fantasy/components/FantasyNav.tsx` | Threading-Stelle | Interface Z.9-18, SpieltagSelector-Call Z.48-55 ohne maxGameweek. ✅ |
| `src/app/(app)/fantasy/FantasyContent.tsx` | Daten-Quelle | `leagueScopeId` (Z.89) + `gw=useGameweek(...)` (Z.91) vorhanden; FantasyNav-Call Z.225. ✅ |
| `src/features/fantasy/queries/events.ts` | Hook-Signatur | `useLeagueMaxGameweeks(leagueId)` Z.78: `enabled:!!leagueId`, staleTime 5min; data `undefined` bei null/loading. ✅ |
| `src/lib/services/club.ts` | Service-Fallback | `getLeagueMaxGameweeks(null)=38`, sonst `leagues.max_gameweeks ?? 38`. ✅ |
| `src/features/fantasy/hooks/useGameweek.ts` | Warum kein bestehender Pfad | Returnt currentGw/activeGw/gwStatus/fixtureCount — **kein maxGameweeks**. ✅ |
| `.claude/rules/errors-frontend.md` "Dead-Wrapper-File" (S280/S375) | Removal-Falle | Symbol-grep MUSS `__tests__` einschließen; Barrel-Zeile mit löschen. ✅ |

## 5. Pattern-References

- `errors-frontend.md` "Dead-Wrapper-File mit transitive Lib-Lock-In" (S280, Erw. S375) — Orphan-Removal deckt Code + Barrel + ungetypte Test-Fixtures; Symbol-grep inkl. `__tests__`.
- `errors-frontend.md` "Component-Prop Silent-Fallback" (S149b/D17) — Prop **required** machen + Caller `?? 38` explizit, statt optional-Prop die Call-Sites still weglassen lässt.
- `fantasy.md` "API-Football Integration" — TFF 1. Lig (max 34) ist der konkrete Bug-Trigger; Per-Liga-Max ist seit Slice 251 Wave 1 (`getLeagueMaxGameweeks`) etabliert.

## 6. Acceptance Criteria

```
AC-01: [HAPPY] TFF-1-Liga-Nutzer kann nicht über GW34 hinaus klicken
  VERIFY: bescout.net /fantasy mit Liga-Scope TFF 1. Lig, GW34 wählen, "Nächster" prüfen
  EXPECTED: "Nächster"-Button disabled bei GW34; kein GW35-38 erreichbar
  FAIL IF: Button klickbar auf GW35+ (Geister-Spieltag)

AC-02: [HAPPY] 38-Liga unverändert (Premier League o.ä.)
  VERIFY: Liga-Scope mit max_gameweeks=38, bis GW38 klicken
  EXPECTED: Navigation bis GW38 möglich, dort disabled
  FAIL IF: vor GW38 disabled (Regression)

AC-03: [NULL] Kein Liga-Scope gewählt → Fallback 38, kein Crash
  VERIFY: leagueScopeId=null → useLeagueMaxGameweeks disabled → data undefined
  EXPECTED: maxGameweek = 38 (?? Fallback), SpieltagSelector rendert normal
  FAIL IF: undefined an SpieltagSelector → NaN-Vergleich / Crash

AC-04: [REGRESSION] GameweekSelector-Delete bricht nichts
  VERIFY: npx tsc --noEmit && CI=true npx vitest run
  EXPECTED: tsc 0 Errors, alle Tests grün (GameweekSelector.test.tsx ist mitgelöscht)
  FAIL IF: dangling import / Barrel-Export-Fehler / Test referenziert gelöschte Datei

AC-05: [MOBILE] SpieltagSelector 393px unverändert
  VERIFY: bescout.net /fantasy iPhone-16-Viewport
  EXPECTED: Selector-Layout identisch zu vorher (nur Cap-Wert geändert)
  FAIL IF: Layout-Shift / Overflow

AC-06: [I18N] Keine neuen Strings — DE+TR unberührt
  VERIFY: git diff messages/ → leer
  EXPECTED: 0 i18n-Änderungen (reines Prop-Routing + Delete)
  FAIL IF: neuer Key ohne TR
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | GW-Max | leagueScopeId null | kein Scope | maxGameweek=38 (Fallback) | `?? 38` im Caller + Hook disabled |
| 2 | GW-Max | Query loading | data undefined initial | 38 während Load, dann echter Max | `?? 38`; staleTime 5min cached danach |
| 3 | GW-Max | leagues.max_gameweeks NULL in DB | unbekannte Liga | 38 | `getLeagueMaxGameweeks` Service-Fallback Z.612 |
| 4 | GW-Max | RLS/Query-Error | Service wirft | React Query error → kein data → 38 Fallback | `?? 38` fail-safe (kein Crash, konservativ = mehr GWs sichtbar, kein Datenleck) |
| 5 | Delete | dangling Barrel-Import | externer Consumer | tsc fängt es | grep bestätigt 0 Prod-Consumer; tsc-Gate |
| 6 | Delete | Test referenziert gelöschte Datei | GameweekSelector.test.tsx | mitgelöscht | Test-File im Delete-Set |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
CI=true npx vitest run src/app/\(app\)/fantasy/__tests__/FantasyContent.test.tsx
CI=true npx vitest run src/lib/services/__tests__/club.test.ts   # getLeagueMaxGameweeks unverändert grün
grep -rn "GameweekSelector" src/                                  # erwartet: 0 nach Delete
grep -n "maxGameweek" src/features/fantasy/components/FantasyNav.tsx  # neue Prop sichtbar
```

## 9. Open-Questions

**Pflicht-Klärung:** keine — CTO-Scope, kanonische Quelle + Fallback existieren, kein Money/Compliance.

**Autonom-Zone:** Prop-Naming (`maxGameweek` analog SpieltagSelector), required vs optional im FantasyNav-Interface (Entscheid: **required**, Caller `?? 38`).

**Nicht-Autonom:** keine.

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| UI-Bug-Fix | Playwright/Live gegen bescout.net: TFF-1-Liga GW34 → Next disabled (AC-01) + 38-Liga unverändert (AC-02), Screenshot/Log nach `worklog/proofs/421-gw-max.txt` |
| Delete + Regression | `npx tsc --noEmit` + `vitest run` Output (FantasyContent + club) + `grep GameweekSelector src/`=0 nach `worklog/proofs/421-gw-max.txt` |

## 11. Scope-Out

- **`getFullGameweekStatus` (`scoring.queries.ts:415`, Loop `1..38` global über ALLE Ligen)** → eigener Admin-Slice. Begründung: andere Change-Form (cross-league Aggregation → braucht `leagueId`-Param + Consumer-Threading in Admin-SpieltagTab). Mit dem UI-Prop-Fix bündeln würde zwei Change-Shapes vermischen (Surgical-Changes §1.3). **Als Design-Smell gemeldet.**
- **`useClubEventsData.ts:48,90` (`getGameweekStatuses(1, 38)`, Admin)** → selber Folge-Slice wie oben (Admin-seitige 38-Hardcodes).
- **`FantasyPlayerRow:72` Gegner-Logo via `opponentShort`** (Reviewer-F2 aus Slice 420, S276-Display-Variante, BAY-Kollision → falsches Logo) → eigener Slice, `opponentClubId` liegt seit 420 bereit.
- Ranking-Konsolidierung `scout_scores`↔`user_stats` → Welle-2-Carry-over.

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (skipped: kein DB/RPC/Service-Change, reines UI-Prop-Routing + Dead-Code-Delete; Consumer-Greps in §3) → BUILD → REVIEW (reviewer-Agent — UI-Korrektheit + Removal-Vollständigkeit) → PROVE (Live bescout.net + tsc/vitest) → LOG
```

## 13. Pre-Mortem (optional bei S — kurz)

| # | Failure | Prob | Impact | Mitigation | Detection |
|---|---------|------|--------|------------|-----------|
| 1 | `maxGameweek` undefined an SpieltagSelector → `gw >= undefined`=false → nie disabled | MED | mittel | Caller `?? 38`, Prop required | AC-03 + tsc |
| 2 | Liga-Switch: alter Max bleibt gecacht | LOW | niedrig | Query leagueId-keyed (`qk.events.leagueMaxGw`), invalidiert bei Switch (S254) | AC-01 nach Switch |
| 3 | Delete bricht Barrel für unentdeckten Consumer | LOW | hoch | grep inkl. `__tests__` (S375), tsc-Gate | AC-04 |
| 4 | Loading-Fenster zeigt kurz GW>34 klickbar | LOW | niedrig | bewusst akzeptiert (== heutiges Verhalten, kein Regress); cached nach 1. Load | Edge #2 dokumentiert |

## Open Risiko

Minimal: reines Prop-Threading entlang existierender Daten-Quelle + Delete eines bewiesenen Orphans. Einziges Restrisiko = Loading-Fenster-Flicker (Edge #2, akzeptiert, kein Regress). Fallback `?? 38` ist fail-safe.
