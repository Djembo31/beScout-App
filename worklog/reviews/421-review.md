# Slice 421 — Review (Cold-Context-Reviewer)

**Verdict: PASS** · Reviewer-Zeit ~9 Min · Datum 2026-06-27

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | `FantasyContent.test.tsx:92,109` | Beide events-Mocks geben `useLeagueMaxGameweeks → {data:38}` → der `?? 38`-Fallback-Pfad (data `undefined`) wird im Unit nie durchlaufen; AC-03 nur via tsc + Live abgedeckt. | Optional: `it`-Case mit `{data:undefined}` + Assert SpieltagSelector maxGameweek=38. **Kein Merge-Blocker — akzeptiert** (Fallback trivial, tsc-garantiert, Live deckt es). |
| 2 | INFO | Spec §11 Scope-Out | `getFullGameweekStatus` (Loop 1..38 global) + `useClubEventsData` (Admin 1,38) + `FantasyPlayerRow` opponentShort-Logo bleiben — bewusst als Design-Smell ausgelagert, sauber gemeldet. | Folge-Slices. |

## One-Line
Ja — ein Senior merged das: chirurgischer Prop-Thread entlang etablierter kanonischer Quelle + bewiesener Orphan-Delete, fail-safe Fallback, vollständige Removal-Verkabelung.

## Verifizierte Prüf-Punkte (Reviewer)
- **`?? 38` fail-safe an JEDER Stelle** — JA. 4 Datenquellen-Zustände (null-Scope/loading/DB-NULL/Error) decken alle auf 38 ab. `gw >= undefined`-NaN strukturell ausgeschlossen (required `number`-Prop + Caller-`?? 38`).
- **Required-Prop überall versorgt** — JA. Einziger FantasyNav-Call + einziger SpieltagSelector-Prod-Call versorgt; tsc-Gate. Beide events-Modul-Mocks ergänzt (S199-Doppel-Mock-Falle bedient).
- **Orphan-Removal vollständig (S280/S375)** — JA. `grep GameweekSelector src/` = 0 Code-Symbole (Rest nur docs/worklog/memory + 1 toter Script-Kommentar). Code+Barrel+Test weg.
- **Import-Pfad** — JA, Re-Export-Bridge `@/lib/queries/events` intakt.
- **Liga-keyed Cache (S254)** — JA, `qk.events.leagueMaxGw(leagueId)` parametrisiert, kein Pin über Switch.
- **38-Liga-Regression** — keine (Default 38 bleibt; `club.test.ts:407` BL=38 grün).
- **Weitere SpieltagSelector-Consumer** — keine.

## Positive
Spec-Edge-Tabelle deckt exakt die 4 Fallback-Pfade; Inline-Kommentar erklärt Rationale; S199-Doppel-Mock korrekt; Orphan-Delete diszipliniert (S375). IMPACT sauber als skipped begründet.
