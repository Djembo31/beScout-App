# Slice 339 — Cold-Context-Review

**Verdict: PASS** (2 NITPICK, beide Scope-Out — kein Inline-Fix).

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | `communityPolls.ts` Notify-IIFE (`Promise.all` über followerIds) | Cap-Fix macht die Follower-Liste jetzt *wirklich* unbegrenzt — `Promise.all` feuert alle `createNotification`-Calls gleichzeitig. Mega-Club (35 Mio) → Concurrency-Storm. Vorher implizit auf 1000 gedeckelt. | **Backlog** (nicht hier): Notify in Chunks (z.B. 500er, sequenziell) oder serverseitige Fan-out-RPC. Scope-Out korrekt. |
| 2 | NIT | `getCommunityPolls` `.in('id', …)` | Durch `.limit(50)` auf ≤50 IDs gedeckelt → kein Chunk/Cap-Risiko. | Keine Aktion (Beleg: kein übersehener unbounded select in den Files). |

## One-Line
Ja — Senior merged das: lehrbuchgetreue Anwendung des `club.ts`-Range-Loop-Patterns, best-effort-Semantik nachweislich erhalten, Tests treffen die Sticky-Mock-Falle korrekt (echtes Grün).

## Verifizierte Prüfpunkte
- **Range-Loop:** Termination `page.length < PAGE` (bricht auch bei exakt-1000), `.order()` vor `.range()` bei getPlayerNames, `range(offset, offset+PAGE-1)` off-by-one-frei (= club.ts:393).
- **Best-effort erhalten (money-nah):** throw aus `fetchAllFollowerIds` landet im bestehenden try/catch der Notify-IIFE → `result.poll_id` (RPC bereits abgeschlossen) wird trotzdem returned. AC-05 verifiziert.
- **Sticky-Mock:** 2-Eintrag-Tests = echte FIFO-Pagination + `toHaveBeenCalledTimes(2)`; 1-Eintrag-Tests = sticky + Count-1-Assert schließt false-green aus.
- **Keine übersehenen unbounded selects** in beiden Files (by-PK/`.eq`/`.in`≤50/`.limit` alle ok).
- **Helper-Signatur** clubId/userId `string|null` nullable, Branch-Guards fail-safe → `[]`.

## time-spent
~9 min. Reviewer-Agent-ID: a0a50067ed52382a3.
