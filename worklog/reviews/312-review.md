# CTO Review — Slice 312: /compare perf_l5/l15 matches-Guard

**Verdict: PASS** · Cold-Context Reviewer-Agent (a2eb7c8958ebd774a)

Schließt das /compare-Display-Residuum des perf_l5=50-DB-Default-Bugs (Slice 271) korrekt — saubere Type-Safety + volle Edge-Case-Abdeckung.

## Geprüft (alle ✓)
1. fmtPerfL5(p.perf_l5, p.matches) im Dropdown korrekt (p.matches verfügbar, korrekter Typ).
2. statRows guardByMatches: cells=null bei guarded+matches=0; maxVal/minVal nur über present (non-null); best/worst via v!==null-Check; Anzeige "—" bei null — korrekt.
3. Edges: beide matches=0 (present leer → maxVal=minVal=0, kein Highlight) ✓; ein 0/anderer >0 (nur >0 bekommt Wert+Highlight) ✓.
4. Andere statRows (matches/goals/assists/clean_sheets/floor/age) unverändert (guardByMatches nur L5/L15) ✓.
5. cells-Typ (number|null)[] sauber; floor_price isBsd-Pfad unberührt von null-Logik.

## Findings
- 2 NITPICKs, beide pre-existing/out-of-scope, non-blocking.
- **Observation (out-of-scope):** Radar-Chart-Achse (`buildPlayerRadarAxes`) bleibt ungeguarded — bewusst Scope-Out (Radar normalisiert, visuell weniger irreführend als literale „50"). Future-Knowledge-Capture-Kandidat.

## Verdict: PASS
