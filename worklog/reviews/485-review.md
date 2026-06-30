# Slice 485 Review — D-04 lineups DB-Integrität (Cold-Context-Reviewer)

**Verdikt: CONCERNS** — Migration (Code) korrekt, sicher, null-Regression; **Spec/Proof-Prämisse + getrackter Follow-up D-04b standen auf einer Fehllesung des RPC** → vor LOG korrigiert (reine Doku, kein Code-Touch).

## Findings + Resolution
| # | Sev | Issue | Resolution |
|---|-----|-------|-----------|
| 1 | HIGH | Prämisse falsch: Spec/Proof behaupteten „RPC prüft Distinctness nur über 12 Starter, Bench NICHT". **Live verifiziert (Reviewer + ich):** `rpc_save_lineup` validiert die Bench **voll graceful** — separate Schleife mit `bench_duplicate` (Bench-vs-Bench) + `bench_overlaps_starter` (Bench-vs-Starter), RETURN `{ok:false}` (mig `20260626160000:187-188`, S455-Header). `raise_count=0`. | **Behoben:** Spec-Prämisse (b) + Code-Reading #2 + §2 + Proof korrigiert — Trigger ist **reiner DB-Backstop** (Defense-in-Depth für Nicht-RPC-Writes), schließt den Register-Kern „Integrität lebt nur im RPC" auf DB-Ebene, NICHT eine RPC-Lücke. |
| 2 | HIGH | **Phantom-Debt:** D-04b trackte einen nicht-existenten RPC-Bench-Gap → §0-widrig + gefährlich (hätte eine Session unnötig in den 25k-Money-RPC geroutet, S156-Risiko). | **Behoben:** D-04b **gestrichen** (Register-Zeile + Spec §11 + Proof). Verifiziert: `bench_duplicate`/`bench_overlaps_starter` sind in `errorMessages.ts` KNOWN_KEYS + `useEventActions.ts` cases gemappt → graceful UI, kein realer Gap. |
| 3 | LOW | Code-Reading #2 sagte „RPC **RAISE** duplicate_player" — real ist `RETURN {ok:false}` (Z.142). | **Behoben:** Code-Reading #2 auf „RETURN {ok:false}" korrigiert. |
| 4 | LOW | Starter-vs-Starter-Dup auf aktivem Event nie direkt exerziert (Ended-Event-Guard blockte AC3/AC8); Beweis ruht auf 16-Slot-Uniformität (via Bench-Slots). | **Akzeptiert (kein Fix nötig):** Reviewer bestätigt das Uniformitäts-Argument trägt (unnest behandelt alle 16 Slots identisch, keine Slot-spezifische Logik). Als bewusste Beweis-Lücke vermerkt (Proof). |

## Code-Verdikt (Reviewer): PASS
- Distinctness-Logik korrekt (alle Dup-Klassen, NULLs ignoriert). Trigger-Pattern D39 korrekt (BEFORE INS/UPD, GUC-Escape, search_path-pinned, REVOKE). `authenticated`-Grant auf Trigger-Fn harmlos (Direktaufruf wirft `0A000`). Error-Mapping korrekt (`duplicate_player` → mapErrorToKey Regex → `duplicatePlayer`). FK-Wahl konsistent mit Starter-Slots. **No-Regression sogar STÄRKER als angenommen** (RPC erzwingt dieselbe Invariante bereits → Trigger feuert NIE für RPC-Writes).
- „Ein Senior merged die Migration; Doku/Tracking vor LOG fixen." → erledigt.

## Lehre (→ errors-db)
- Spec-Prämisse „RPC prüft X nicht" gegen den **GANZEN** Body verifizieren, nicht nur die erste Validierungs-Schleife — Bench-Validierung lebte in einer separaten Schleife. Phantom-Debt im Register ist ein Anti-§0-Outcome (gefährlicher als kein Eintrag).
