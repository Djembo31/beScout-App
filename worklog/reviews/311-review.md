# CTO Review — Slice 311: GW-Status Single-Source computeGwStatus (Fantasy-#5)

**Verdict: PASS** · time-spent 14 min · Cold-Context Reviewer-Agent (a2d9020adf488a09b)

## Spec-Coverage (AC-1…AC-6 alle ✅)
- AC-1 computeGwStatus pure, Kanon-Logik (gwStatus.ts) — 9 Tests grün
- AC-2 Divergenz-Fälle a/b/c/d gepinnt (gwStatus.test.ts)
- AC-3 useGameweek nutzt Helper, kein inline-Ternary
- AC-4 SpieltagTab nutzt Helper; finishedCount/allEnded/allFixturesFinished unverändert
- AC-5 getGameweekStatuses isFixtureDone, is_complete bit-identisch
- AC-6 tsc clean + 71+9 Tests grün

## Findings: KEINE (keine Änderung nötig)

## Detail (6 Fragen)
1. **Helper:** Branch-Reihenfolge korrekt; struktureller Input-Typ sauber (FantasyEvent⊆ zuweisbar, ReadonlyArray); isFixtureDone bit-identisch (cancelled-als-done erhalten).
2. **Reconciliation-Sanity:** Beide Änderungen Verbesserungen, kein Fall schlechter. (a) offene Fixtures → 'open' statt 'empty' (Pulse grün „Live" statt grau). (b) betrifft NUR SpieltagTab (useGameweek hatte simulatedCount-Guard nie) → events-all-ended → 'simulated' (gold „Done") korrekt.
3. **SpieltagTab:** simulatedCount via isFixtureDone semantisch identisch; fixturesComplete repliziert alten allSimulated-Guard exakt; keine versehentlich entfernte Var.
4. **useGameweek:** gwFixtureInfo.count jetzt als fixtureCount durchgereicht (count-Achse vorher fehlend); deps vollständig.
5. **getGameweekStatuses:** is_complete bit-identisch; KEIN Circular-Import (gwStatus.ts = pure Leaf-Modul, 0 Imports).
6. **Blindspots:** keine 4. Berechnung; AdminEventsTab/AdminGameweeksTab nutzen nur #1-Primitive bzw. separaten FullGameweekStatus-Shape (out-of-scope korrekt); Tests decken Divergenz-Fälle ab.

## Positive
- Pure-Helper + strukturell entkoppelter Input-Typ (Slice-309-Vorgehen).
- DRY der „done"-Definition über alle 3 Stellen.
- Reconciliation mit Kommentar-Audit-Trail + AC-Pinning statt stillem Drift.

## Observation (kein Handlungsbedarf)
- SpieltagPulse 'empty'-Branch jetzt de-facto tot (`total===0 → return null` schluckt den einzigen empty-Fall). Optionaler Future-UI-Cleanup.
