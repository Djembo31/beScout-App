# Slice 425 Review — Welle-2 Display-Truth Cleanup (A/B/C)

**Reviewer:** Cold-Context-Agent (read-only) · **time-spent:** 14 min
**Verdict: PASS**

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | `LineupPanel.tsx:781` | Scored-Synergie-Detail-Zeile rendert `${d.source} (${d.bonus_pct}%)`. Settled-Quelle = Club-Name (DB-verifiziert OK); Legacy-Fallback nutzt synergyPreview.details (flat 5). Zwei Quellen, ein Renderpfad — visuell konsistent, kein Bug. | akzeptabel |
| 2 | NIT | `KaderTab.tsx:124,323` | `clubFilter`-State wird bei Country/League-Switch nicht zurückgesetzt → alter clubId nach Liga-Wechsel = 0 Treffer. **Pre-existing** (alte String-Variante hatte denselben Smell, im Spec als Edge dokumentiert), durch 425 nicht verschlechtert. | Optional: `setClubFilter('')` im Country/League-Change-Handler (eigener Slice) |

## Spec-Coverage
AC1-AC8 alle ✓ (Coercion `Math.round(Number("10.00"))`=10 im Hook; Banner-Guard pct>0; Surge ungecappt; Bau-Banner + SynergyPreview.tsx unverändert; getClub-aufgelöster Club-Name; clubId-Filter konsistent; tsc 0 + 323 Tests grün).

## Fokus-Fragen
1. **Weitere live Surfaces?** Nein — LineupPanel ist die einzige live scored-Synergie/player.club-Stelle. ScoreBreakdown/LineupBuilder/SynergyPreview = bestätigter Orphan-Cluster. Korrekte S424-Umlenkung, kein „von-allem-N"-Rest.
2. **NUMERIC-Coercion?** Korrekt + an einer Stelle (Hook-Load), null-safe (`?? 0`/`?? []`), Reset in else+catch.
3. **(C) Key-Konsistenz?** `clubId ?? club` durchgängig über availableClubs/filter/clubGroups — keine S423-„Chip filtert leer"-Falle.
4. **Required-Prop durch beide Caller?** Ja, EventDetailModal:334 + AufstellenTab:325 je `?? null` (S149b).
5. **Surge ungecappt?** Ja — settled.pct roh, Cap 15 nur im Client-Fallback.

## Journal-Review
Mid-BUILD-Scope-Korrektur (ScoreBreakdown=toter Code → Umlenkung LineupPanel) = korrekte Anwendung der eigenen S424-Lehre. Tote Edits revertiert statt mitgeschleppt. Orphan-Cluster als separater S280-Slice gemeldet statt opportunistisch gelöscht = saubere Scope-Disziplin (§3 Surgical).

## Positive
- Coercion an einer Stelle (robust gegen künftige Surfaces).
- Required-Prop + `?? null` beide Caller = S149b.
- Einheitlicher clubId-Key verhindert S423-Klasse.
- Money-neutral wasserdicht (score_event/Migration unberührt).
- Wording-compliant (synergyBonus reused DE+TR, kein neuer Securities/Gambling-String).

## Knowledge-Kopplung (D88)
Kein neuer errors-Pattern — saubere Folge-Heilung der S424-Klasse. Beim LOG `fantasy.md`-Scoring-Sektion (a)/(b)/(c) auf „Slice 425 DONE" aktualisieren, inkl. Hinweis Live-Surface = **LineupPanel** (nicht ScoreBreakdown) + Orphan-Cluster S280 offen.

## Summary
Sauberer, eng begrenzter Display-Truth-Cleanup; alle 3 Sub-Fixes an kanonische Quelle gebunden, required-Prop diszipliniert, NUMERIC-Coercion korrekt. 2 NITs pre-existing/akzeptabel. **PASS — mergebar.**
