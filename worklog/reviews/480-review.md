# Slice 480 Review — D-27 Gameweek-Season-Guard SSOT

**2 Runden** (Cold-Context-Reviewer-Agent). Money-adjacent (Event-Eintrittsgebühren) → Pflicht.

## Round 1 — verdict: CONCERNS
Fix-Stand: Guard nach Template-Fetch, Anker `templates[0].league_id`.

| # | Sev | Issue | Resolution |
|---|-----|-------|-----------|
| 1 | MED | `resolvedLeagueId = templates[0].league_id` nicht-deterministisch (kein ORDER BY); `events.league_id` ist vom Club entkoppelt (Default NULL) → bei NULL-Default-Batches kann der Phantom-Pfad überleben ODER offene Events fälschlich blocken. | **Behoben + weiter gegangen:** Live-DB zeigte 207/208 Events = `league_id=NULL` → templates[0] UND die per-Clone-Empfehlung wären auf 38-Fallback gefallen (Bug NICHT gefixt). Anker → **clubs.league_id** (Club-Liga, deterministisch, 0 Clubs ohne Liga). |
| 2 | LOW | Reorder (Guard hinter idempotency/templates) → Edge-Delta bei No-Templates+season-end. | **Behoben:** Guard zurück an Funktions-Top (braucht jetzt nur clubId). |
| 3 | LOW | Test-Lücken: Boundary `nextGw==maxGw` liga-scoped + liga-scoped Fixtures-Call. | **Teil-behoben:** Boundary-Test (GW33→34 max34 → created:1) ergänzt. Fixtures-Call-Assertion = Bridge-Mock-Limit (s. Round 2 NIT #2). |
| 4 | LOW | disease-register D-27 noch offen. | **Behoben:** im selben Slice auf geheilt geflippt. |

## Round 2 (neuer Club-Liga-Anker) — verdict: PASS
> „Würde ein Senior mergen — ja: korrekter Anker (Club-Liga statt templates[0]/event.league_id), Guard-at-Top safe, drei Schlüsselpfade getestet, Money-/i18n-sauber."

Bestätigt: (1) clubs.league_id ist der korrekte Anker — konsistent mit bestehendem `getActiveGameweek` (club.ts:585, gleiche Quelle), kein liga-übergreifendes Event im club-scoped Klon-Pfad, kein Regressionsrisiko (PL=38 unverändert, BL/2.BL=34 korrekt gestoppt). (2) Guard-at-Top safe (Per-Table-FIFO-Mock → unmockte clubs={data:null} → 38-Fallback = altes Verhalten). (3) §0 erfüllt (ein resolvedLeagueId-Begriff für Guard+Fixtures, Hardcode restlos weg). (4) Money/Compliance: Guard short-circuited vor jedem insert → keine Phantom-Geld-Events; error-String intern (skipped:true → Caller swallowt) → kein i18n-Leak.

| # | Sev | Issue | Resolution |
|---|-----|-------|-----------|
| 1 | LOW | clubs-Query swallowt Error → transienter Fehler → still 38-Fallback (Phantoms zurück). | **Umgesetzt:** `error`-Destructuring + `console.warn` vor 38-Fallback (Silent-Fail sichtbar, common-errors.md). Degradiert weiter safe. |
| 2 | NIT | Boundary-Test asserted Fixtures-Call nicht. | **Bewusst belassen:** `@/lib/services/fixtures` ist Re-Export-Bridge, der Test-Mock greift den `./fixtures`-Call von events.mutations nicht ab (0 calls). Fixture-Scoping per Code-Read verifiziert (resolvedLeagueId reused). |

## Verdikt: PASS (Round 2), alle Findings adressiert.
