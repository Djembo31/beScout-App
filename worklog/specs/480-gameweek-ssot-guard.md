# Slice 480 — D-27: Gameweek-Season-Guard aus SSOT `leagues.max_gameweeks`

**Slice-Type:** Service
**Größe:** S
**Welle:** Mock→Pro Konsistenz-Batch (disease-register D-27)
**Scope:** CTO autonom (money-adjacent → Reviewer Pflicht)

> **POST-REVIEW ANKER-KORREKTUR (R1 CONCERNS):** Die unten skizzierte Auflösung `templates[0].league_id` war falsch — `events.league_id` ist vom Club entkoppelt (Default NULL, live 207/208 Events = NULL) → wäre auf 38-Fallback gefallen, Bug ungelöst. **Final-Anker = `clubs.league_id` (Club-Liga, Guard-at-Top)**, konsistent mit `getActiveGameweek`. Siehe `worklog/reviews/480-review.md` + `worklog/proofs/480-gameweek-ssot-guard.txt`.

## 1. Problem-Statement (Evidence)
`createNextGameweekEvents` (`src/features/fantasy/services/events.mutations.ts:234`) hartcodiert den Saison-Ende-Guard:
```ts
if (nextGw > 38) return { created: 0, skipped: true, error: 'Max GW 38 reached' };
```
Die kanonische SSOT für die Saisonlänge ist `leagues.max_gameweeks` (per-Liga). Der Rest der Codebase liest sie korrekt: cron `advance-helpers.ts:50` (`nextGw > maxGameweeks`), `getLeagueMaxGameweeks` (`club.ts:613`), `SpieltagSelector`, `cronHealth`. Diese Funktion ist die einzige verbliebene zweite Wahrheit — Drift aus dem GW-Per-Liga-Fork (Slices 427-429).

**Live-Beweis (DB `skzjfhvgccaeplydsunz`, 2026-06-30):** Bundesliga + 2. Bundesliga haben `max_gameweeks=34` UND stehen bei `active_gameweek=34` (Saison-Ende). Finalisiert ein BL-Club-Admin GW 34 (`finalizeGameweek` → `createNextGameweekEvents(clubId, 34)`, `nextGw=35`), ist `35 > 38` = false → die Funktion klont **Phantom-Events GW 35**: `getFixturesByGameweek(35,…)` = leer → Fallback-Timing `now+7d`, `status:'registering'`. Nutzer könnten mit echtem Eintritt (Credits/Tickets) beitreten; es gibt nie Fixtures → nie Scoring. Erreichbar in **2 von 7 Ligen** (nicht nur Off-Season-latent), money-adjacent.

## 2. Lösungs-Design
Den Hardcode durch die SSOT ersetzen, **ohne die Caller-Signatur zu ändern** (das 2-arg-Callsite `scoring.admin.ts:259` bleibt gültig):
- Guard vom Funktions-Top **hinter den Template-Fetch** verschieben (Templates tragen `league_id`).
- `resolvedLeagueId = leagueId ?? templates[0].league_id` (Param-Override behält Vorrang; null/offen ⇒ `getLeagueMaxGameweeks(null)=38` = alte Semantik, keine Regression für liga-lose Events).
- `maxGw = await getLeagueMaxGameweeks(resolvedLeagueId)` (reuse SSOT-Helper via dynamic import → kein Static-Cycle/Bundle-Pull von club.ts).
- `if (nextGw > maxGw) return { skipped, error: \`Max GW ${maxGw} reached\` }`.
- Dieselbe `resolvedLeagueId` an `getFixturesByGameweek` (statt `leagueId ?? null`) → heilt das latente Fixture-Timing-Scoping (Caller übergibt leagueId nie → heute werden alle Ligen gezogen, Timing aus fremder Liga abgeleitet) in EINER Resolution (kein zweiter Liga-Begriff in der Funktion).

## 3. Betroffene Files
- `src/features/fantasy/services/events.mutations.ts` — Guard-Logik (Kern).
- `src/lib/services/__tests__/events-v2.test.ts` — der `nextGw > 38`-Test asserted den Hardcode (`mockSupabase.from not called`) → auf SSOT-Verhalten umschreiben.

## 4. Code-Reading-Liste (vor Impl — erledigt)
1. `events.mutations.ts:228-318` `createNextGameweekEvents` — Kontrollfluss (Guard→idempotency→templates→fixtures→clone). ✓
2. `club.ts:611-622` `getLeagueMaxGameweeks` — Signatur `(leagueId: string|null) → Promise<number>`, 38-Fallback bei null/NULL-Spalte. ✓ SSOT-Helper.
3. `scoring.admin.ts:256-266` `finalizeGameweek` — Live-Caller, ruft 2-arg `createNextGameweekEvents(clubId, gameweek)`, kein leagueId. ✓
4. `advance-helpers.ts:39-52` — kanonischer cron-Guard `nextGw > maxGameweeks`, Referenz-Semantik. ✓
5. `events-v2.test.ts:200-263` — Mock-Pattern (`mockTable`, `mockGetFixtures`); club.test.ts:405-417 mockt `getLeagueMaxGameweeks` via `mockTable('leagues', {max_gameweeks})`. ✓

## 5. Pattern-References
- errors-db S454 (Werte-Skala/Reader-Audit), S453 (GW-Per-Liga-Fork-Writer-Enum, D113) — Klasse: GW-Fork-Drift.
- §0 Schnitt-Regel: alten Weg (Hardcode) schließen, kein zweiter Liga-Begriff. SSOT (§0/3 ein-Job-pro-Artefakt).
- `getLeagueMaxGameweeks` JSDoc: „replaces hardcoded `<= 38` in callers" — diese Funktion war übersehen.

## 6. Acceptance Criteria
- AC1: BL/2.BL-Pfad — `createNextGameweekEvents(club, 34)` mit Template-`league_id` + `leagues.max_gameweeks=34` ⇒ `{created:0, skipped:true, error:'Max GW 34 reached'}`, **keine Fixture-Query**. VERIFY: vitest.
- AC2: Liga-lose Events (`league_id=null`) ⇒ 38-Fallback unverändert (`createNextGameweekEvents(club,38)` ⇒ `'Max GW 38 reached'`). VERIFY: vitest.
- AC3: Normaler Klon (GW 10, in-Season) ⇒ unverändert `created:1` (Bestands-Test grün). VERIFY: vitest.
- AC4: Caller-Signatur unverändert — `scoring-v2.test.ts:448` (`toHaveBeenCalledWith(CLUB_ID, GW)`) bleibt grün. VERIFY: vitest.
- AC5: `grep "> 38"` in events.mutations.ts ⇒ 0. VERIFY: grep.
- AC6: tsc 0 · `vitest run events-v2 scoring-v2` grün.

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| `league_id=null` (offen) | `getLeagueMaxGameweeks(null)=38` ohne DB-Query → 38-Fallback (alte Semantik) |
| Template ohne league_id-Spalte | select enthält `league_id` (Z.251) → vorhanden |
| nextGw == maxGw (z.B. GW 33→34 in BL) | `34 > 34`=false → klont GW 34 korrekt (letzter echter GW) |
| nextGw == maxGw+1 (GW 34→35 BL) | `35 > 34`=true → skip (der Fix) |
| in-Season (GW 10, max 38) | `11 > 38`=false → normal |
| Süper Lig max=38 (Daten-Smell) | außerhalb Scope — Funktion respektiert den DB-Wert, was auch immer er ist |
| leagueId-Param explizit übergeben | Vorrang vor templates[0] (Backward-Compat) |

## 8. Self-Verification Commands
- `npx tsc --noEmit`
- `npx vitest run src/lib/services/__tests__/events-v2.test.ts src/lib/services/__tests__/scoring-v2.test.ts`
- `grep -n "> 38\|Max GW 38" src/features/fantasy/services/events.mutations.ts` (erwartet: nur via `${maxGw}`, kein Hardcode-38)

## 9. Open-Questions
- Keine Pflicht-Klärung. Süper-Lig-`max_gameweeks=38`-Diskrepanz = separater Daten-Slice (geparkt, NICHT hier).

## 10. Proof-Plan
`worklog/proofs/480-gameweek-ssot-guard.txt`: tsc-Output + vitest-Output (events-v2 + scoring-v2) + grep-0-Hardcode + DB-Snapshot der league max_gameweeks.

## 11. Scope-Out
- Kein Backfill bereits erzeugter Phantom-Events (DB-Check zeigt aktuell keine; falls vorhanden → separater Cleanup).
- Süper-Lig-`max_gameweeks`-Wert nicht angefasst.
- Caller-Signatur `finalizeGameweek`/`createNextGameweekEvents` unverändert.

## 12. Stage-Chain (geplant)
SPEC → IMPACT (skipped: kein Schema-/Consumer-Contract-Change, reine interne Guard-Logik) → BUILD → REVIEW (reviewer, money-adjacent) → PROVE (vitest+grep+DB) → LOG.

## 13. Pre-Mortem (S optional, kurz)
1. Circular import club.ts → events: vermieden via dynamic `import()` (club importiert nicht events). 
2. Reorder bricht Bestands-Test: nur der `> 38`-Test asserted Hardcode → umgeschrieben; übrige Tests haben league_id=null → 38-Fallback ohne leagues-Query → unverändert.
3. templates[0].league_id heterogen: club gehört zu einer Liga; templates[0] ist self-konsistent mit den geklonten Events.
