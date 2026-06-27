# Review — Slice 420 (Heim/Auswärts + FDR über Club-UUID)

**Reviewer:** Cold-Context reviewer-Agent · **Datum:** 2026-06-27 · **Time-spent:** 14 min

## Verdict: PASS

Korrekt, vollständig verkabelt, liefert genau die Spec-Korrektheit. Kein Money, kein Schema, kein RPC, kein Compliance-Berührungspunkt. Zwei nicht-blockierende Findings (F1 geheilt, F2 bewusst out-of-scope).

## Findings

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | LOW (CONCERNS) | `src/lib/services/__tests__/fixtures.test.ts` | Neues required-Field `opponentClubId` war test-ungesichert; Signaturwechsel `string→string` ist tsc-unsichtbar (S375/S102) → fehlendes Regression-Netz für die nicht-tsc-geschützte Achse (AC4). | **GEHEILT** — `expect(result.get('c1')?.opponentClubId).toBe('c2')` + Spiegel ergänzt (Z.296-299), Test 29/29 grün. |
| 2 | NIT (out-of-scope) | `src/components/fantasy/FantasyPlayerRow.tsx:72` | `getClub(nextFixture.opponentShort)` = Short-String-Lookup fürs Gegner-**Logo** — dieselbe S276-Kollisions-Klasse (BAY same-league). Pre-existing, bewusst Display-Label-Scope-Out. `NextFixtureInfo.opponentClubId` liegt jetzt als Disambiguator bereit. | **NOTIERT** als Folge-Smell (Handoff/active.md), nicht in 420. |

## Belege (Reviewer-Herleitung)
- **Korrektheit isHome:** `statMap` aus `statRows`, `fixtureIds = statMap.keys()`, Fixtures via `.in('id', fixtureIds)` → jede gerenderte Fixture hat garantiert eine Stat-Row, `stat` nie undefined in der Map-Schleife. `opponent`/`logo`/`matchScore` hängen an `isHome` → konsistent. SQL-Proof (Zdravko Minchev, 8 AMD-Heimspiele alt-falsch) belegt end-to-end.
- **Vollständigkeit:** eigener grep `getClubAvgL5` → Definition + 4 Call-Sites, alle `opponentClubId`; `effectiveClubId`/`clubVoteCount`/`maxVotes` 0 Treffer.
- **Re-Export-Bridge** `@/lib/services/fixtures` = reiner `export *` → kein Zweit-File-Drift.
- **Majority-Vote-Verlust:** 270c-Robustheit (gegen stale `players.club_id`) bleibt — Step 1/2 lesen weiter aus `fixture_player_stats`; `fps.club_id` ist die Per-Spiel-Wahrheit → strikt robuster, kein Funktionsverlust.

## Positive
- Pre-Mortem #2 antizipierte die tsc-unsichtbare Falle korrekt (grep statt tsc).
- Proof exemplarisch (echter Multi-Club-Spieler, alt-vs-neu-Tabelle, 8 Flips).
- Scope-Disziplin: Display-Labels unverändert, kein `players.club_id`-Backfill (S303/S368e vermieden).

## Knowledge
Kein neuer Fehler-Pattern — saubere Anwendung von **S276** + **S102/Multi-League-Props** (beide bereits kodifiziert). F2 belegt: S276 ist auch in Display-Pfaden (Logo) relevant → Notiz für 2.x-Folge.
