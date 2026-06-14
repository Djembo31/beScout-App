# Slice 311 — GW-Status Single-Source: computeGwStatus (Fantasy-#5)

**Slice-Type:** UI (Helper-Extraktion + Refactor) + Service (DRY)
**Größe:** S–M (eine Domäne, kein DB-Change)
**Datum:** 2026-06-14
**S7-Phase-2 Fantasy-#5** (Registry §2.2) · P1 (Live-Pfad dormant, API-Key)

## 1. Problem-Statement (Evidence)

„Ist dieser Gameweek offen / fertig / leer?" wird an **3 Stellen unabhängig** berechnet:
1. **#1 `getGameweekStatuses.is_complete`** (`fixtures.ts:218`) = `simulated === total`, wobei `simulated` = `status IN ('simulated','finished','cancelled')`. Das **Fixture-Completeness-Primitive** (1 Input).
2. **#2 `useGameweek.gwStatus`** (`useGameweek.ts:85-96`) = `'open'|'simulated'|'empty'` aus `gwFixtureInfo.complete` (= #1) + events.
3. **#3 `SpieltagTab.gwStatus`** (`SpieltagTab.tsx:137-141`) = gleiche 3 Werte, **divergente Logik**.

**Divergenz #2 vs #3 (echte Redundanz):**
- #2 → `'empty'` sobald `events.length === 0` — **ignoriert offene Fixtures** (GW mit offenen Spielen aber 0 Events zeigt fälschlich „leer").
- #3 → `'empty'` nur bei `events.length === 0 && fixtures.length === 0`.
- #3 Events-Branch hat Zusatz-Guard `allEnded && simulatedCount > 0`; #2 nicht (`allEnded` allein).

→ Zwei Komponenten zeigen für denselben GW-State potenziell unterschiedliche Labels (Pulse/Nav). #1 ist das geteilte Primitive (kein Redundanz-Problem), #2/#3 sind es.

## 2. Lösungs-Design

**Neuer Helper `src/features/fantasy/lib/gwStatus.ts`:**
```ts
export type GwStatus = 'open' | 'simulated' | 'empty';
export function isFixtureDone(status: string): boolean   // 'simulated'|'finished'|'cancelled'
export function computeGwStatus(input: {
  fixturesComplete: boolean;   // alle Fixtures done (und ≥1)
  fixtureCount: number;
  events: Pick<FantasyEvent,'status'|'scoredAt'>[];
}): GwStatus
```
**Kanon-Logik (reconciled — die informiertere Interpretation):**
1. `fixturesComplete` → `'simulated'` (autoritativ, unabhängig von events).
2. `events.length>0 && every(status==='ended' || scoredAt)` → `'simulated'` (Fantasy-Einheit fertig).
3. `fixtureCount===0 && events.length===0` → `'empty'` (gar nichts angesetzt).
4. sonst → `'open'`.

**Reconciliation-Entscheidungen (bewusst, Bug-Fixes der Divergenz, dormant-Pfad):**
- #2's „events=0 → empty trotz offener Fixtures" wird zu `'open'` (offene Spiele ≠ leer). **Korrekter.**
- #3's `simulatedCount>0`-Guard fällt weg: events alle ended = GW done, auch wenn Fixtures noch komisch offen. Matcht #2's Events-Branch.

**Wiring:**
- `useGameweek.ts` → `computeGwStatus({fixturesComplete: gwFixtureInfo.complete, fixtureCount: gwFixtureInfo.count, events: gwEvents})`.
- `SpieltagTab.tsx` → `simulatedCount` via `isFixtureDone`; gwStatus via `computeGwStatus`. `allSimulated`-Var entfällt; `finishedCount`/`allFixturesFinished`/`allEnded` bleiben (eigene UI-Logik Z.219/226/229).
- `getGameweekStatuses` (#1) → `isFixtureDone` statt inline-Set (DRY der „done"-Definition; gleiche Logik, single-source).

**Scope-Out (Registry-Folge-Ziel, separat):** SpieltagTab useState/useEffect → React-Query (großer Daten-Fetch-Refactor mit useLiveFixtures-Realtime; HIGH-Risk; eigener Slice). Dieser Slice = nur Status-Unifikation.

## 3. Betroffene Files

| File | Änderung |
|------|----------|
| `src/features/fantasy/lib/gwStatus.ts` | neu: computeGwStatus + isFixtureDone |
| `src/features/fantasy/lib/__tests__/gwStatus.test.ts` | neu: Tests (Divergenz-Fälle gepinnt) |
| `src/features/fantasy/hooks/useGameweek.ts` | gwStatus useMemo → computeGwStatus |
| `src/components/fantasy/SpieltagTab.tsx` | gwStatus + simulatedCount → Helper |
| `src/features/fantasy/services/fixtures.ts` | getGameweekStatuses → isFixtureDone (DRY) |

## 4. Code-Reading-Liste (erledigt)

| File | Befund |
|------|--------|
| `fixtures.ts:184-220` | #1 is_complete = simulated===total; done-set inline |
| `useGameweek.ts:73-96` | #2 gwStatus aus gwFixtureInfo + gwEvents; 'empty' bei events=0 |
| `SpieltagTab.tsx:126-141` | #3 lokale Logik; simulatedCount/allSimulated; finishedCount/allEnded separat genutzt |
| `SpieltagTab.tsx:219/226/229` | allEnded/finishedCount/allFixturesFinished = eigene UI-Branches (bleiben) |
| `types.ts:36,69` | FantasyEvent.status (EventStatus inkl. 'ended') + scoredAt?:string|null |
| gwStatus-Consumer | FantasyNav (status-Prop), SpieltagPulse (Label), FantasyContent passt durch |

## 5. Pattern-References

- **Slice 273** „Selected-Item-Snapshot vs Realtime-Drift" — gleiche Domäne, Daten-Frische.
- **Slice 309** Helper-Extraktion (deriveL5FromRecentScores) — pure-Helper + Tests, gleiche Vorgehensweise.
- **errors-frontend.md** „qk-Key/Logic ohne Single-Source" Familie.

## 6. Acceptance Criteria

1. **AC-1** `computeGwStatus` pure, gibt 'open'|'simulated'|'empty' nach Kanon-Logik. VERIFY: Unit-Tests.
2. **AC-2** Divergenz-Fälle gepinnt: (a) fixtures>0+events=0+nicht-complete → 'open' (nicht 'empty'); (b) events alle ended+0 complete fixtures → 'simulated'; (c) fixturesComplete → 'simulated'; (d) nichts → 'empty'. VERIFY: Tests.
3. **AC-3** `useGameweek.gwStatus` nutzt computeGwStatus, kein inline-Ternary mehr. VERIFY: grep.
4. **AC-4** `SpieltagTab.gwStatus` nutzt computeGwStatus; `finishedCount`/`allEnded`/`allFixturesFinished` unverändert funktional. VERIFY: grep + tsc.
5. **AC-5** `getGameweekStatuses` nutzt isFixtureDone; is_complete-Output identisch zu vorher. VERIFY: fixtures.test.ts grün.
6. **AC-6** tsc clean + fixtures-Tests + FantasyContent-Tests + neuer gwStatus-Test grün.

## 7. Edge Cases

| Case | computeGwStatus |
|------|-----------------|
| fixturesComplete=true, events=0 | 'simulated' |
| fixturesComplete=true, events offen | 'simulated' (Branch 1 autoritativ) |
| fixtures>0 nicht complete, events=0 | 'open' (war #2 'empty' — Fix) |
| fixtures=0, events alle ended | 'simulated' |
| fixtures>0 nicht complete, events alle ended | 'simulated' (war #3 evtl. 'open') |
| fixtures=0, events=0 | 'empty' |
| fixtures=0, events offen | 'open' |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
npx vitest run src/features/fantasy/lib/__tests__/gwStatus.test.ts
npx vitest run src/features/fantasy/services/__tests__/fixtures.test.ts
npx vitest run "src/app/(app)/fantasy/__tests__/FantasyContent.test.tsx"
grep -n "computeGwStatus\|gwStatus" src/features/fantasy/hooks/useGameweek.ts src/components/fantasy/SpieltagTab.tsx
```

## 10. Proof-Plan

- Unit-Tests gwStatus (alle Edge-Cases inkl. Divergenz-Fixes) grün.
- fixtures.test.ts grün (is_complete unverändert).
- tsc clean + FantasyContent grün.

## 11. Scope-Out

- SpieltagTab → React-Query (Daten-Fetch-Refactor, separater Slice).
- FDR client-side aus perf.l5+club-String (Registry §2.2, erbt 1.1-Drift, separat).
- Live/Realtime-Pfad (API-Key dormant).

## 12. Stage-Chain (geplant)

SPEC → IMPACT (skipped — gwStatus-Consumer enumeriert §4; reine Logik-Unifikation, kein Contract-Change am Output-Typ) → BUILD → REVIEW (Pflicht: shared-Logic-Refactor + behaviorale Reconciliation) → PROVE → LOG.
