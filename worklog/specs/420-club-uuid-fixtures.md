# Slice 420 — Heim/Auswärts + FDR über Club-UUID statt Short-String/Majority-Vote

**Slice-Type:** Service (+ UI-Verkabelung)
**Größe:** M
**Money/Security:** Nein (reine Anzeige-/Daten-Korrektheit, kein Geld-Pfad, kein Schema-Change, kein RPC). CTO-Scope.

---

## 1. Problem-Statement (mit Evidence)

Zwei Anzeige-Werte der Scoring-Domäne werden über **nicht-eindeutige Club-Short-Strings bzw. eine fragile Heuristik** abgeleitet statt über die Club-**UUID**, die in beiden Fällen bereits vorliegt:

**A) `getPlayerMatchTimeline` Majority-Vote (`scoring.queries.ts:145-165`):**
Heim/Auswärts (`isHome`), Gegner und `matchScore` werden über einen „effective club"-Mehrheitsentscheid bestimmt (welcher Club in den meisten Fixtures des Spielers auftaucht). Das ist falsch für Spieler, die **mid-season den Verein gewechselt** haben: in den Fixtures des Minderheits-Clubs kippt `isHome`/`opponent`/`matchScore` (Heim wird als Auswärts gezeigt, Ergebnis invertiert). Zudem ist der Tie-Break (50/50-Split) **nicht-deterministisch** (Map-Iterations-Reihenfolge).
- *Evidence:* gemessen **117 Spieler** mit Stat-Rows aus >1 Club (`SELECT player_id FROM fixture_player_stats GROUP BY player_id HAVING COUNT(DISTINCT club_id)>1` → 117). Die exakte Per-Spiel-Wahrheit liegt in `fixture_player_stats.club_id` (**0/67.737 NULL**, gemessen) — wird aber nicht selektiert.

**B) FDR `getClubAvgL5(clubShort)` (`FDRBadge.tsx:36-40`):**
Filtert die Gegner-Spieler per `p.club === clubShort` (String). Bei Short-Kollision mischt die FDR-Schwierigkeit die L5-Werte **zweier verschiedener Clubs**.
- *Evidence:* gemessen **6 echte Short-Kollisionen**, davon **BAY = Bayer Leverkusen ↔ Bayern München in DERSELBEN Liga (Bundesliga)** — d.h. FDR gegen Bayern mischt heute Leverkusens + Bayerns L5 im Prio-Markt DE. Cross-league: ALA/BOL/GEN/KAR/WOL. Dies ist exakt die in `errors-frontend.md` **S276** kodifizierte Bug-Klasse („Lookup indexed by ambiguous Key").

---

## 2. Lösungs-Design

**Leitprinzip:** UUID ist der eindeutige Disambiguator (S276). In beiden Fällen liegt die UUID schon vor — wir hören auf, sie über einen Short-String/eine Heuristik zu rekonstruieren.

**A) Timeline → per-Fixture `stat.club_id`:**
1. `club_id` in die Stat-Row-Query aufnehmen (`scoring.queries.ts:117`).
2. Majority-Vote-Block (Step 3, Z.145-165) **ersatzlos entfernen** (`effectiveClubId`/`clubVoteCount`).
3. Pro Fixture: `isHome = statMap.get(fix.id).club_id === fix.home_club_id`. Per-Fixture-korrekt (Transfer-robust) + UUID-eindeutig. `opponent`/`opponentLogoUrl`/`matchScore` hängen wie bisher an `isHome`, sind dadurch automatisch korrekt.

**B) FDR → `opponentClubId`-UUID-Filter:**
1. `NextFixtureInfo` um `opponentClubId: string` erweitern (`fixtures.ts:484`).
2. Beide Producer befüllen es aus der Fixture-FK (`getNextFixturesByClub:528/539`, `getNextFixturesForClub:597`): `opponentClubId = isHome ? away_club_id : home_club_id`.
3. `getClubAvgL5`-Signatur `(clubShort)` → `(opponentClubId)`, Filter `p.clubId === opponentClubId` (`FDRBadge.tsx:36`).
4. 4 Consumer reichen `nextFix.opponentClubId` statt `.opponentShort` durch (Display-Short bleibt unverändert).

**Bewusst NICHT geändert:** Display-Labels (`@{opponentShort}`, Gegner-Name) bleiben Short/Name — das ist Anzeigetext, keine Korrektheits-Achse. Nur die *Berechnung* wird UUID-basiert.

---

## 3. Betroffene Files

| File | Änderung |
|------|----------|
| `src/features/fantasy/services/scoring.queries.ts` | A: `club_id`-Select + Majority-Vote raus + per-Fixture-`isHome` |
| `src/features/fantasy/services/fixtures.ts` | B: `NextFixtureInfo.opponentClubId` + 2 Producer befüllen |
| `src/components/fantasy/FDRBadge.tsx` | B: `getClubAvgL5(opponentClubId)` + `p.clubId`-Filter |
| `src/components/club/sections/ClubFixturesStrip.tsx` | B: `getClubAvgL5(fix.opponentClubId)` |
| `src/components/fantasy/event-tabs/useLineupPanelState.ts` | B: `nextFix.opponentClubId` |
| `src/features/fantasy/components/lineup/LineupBuilder.tsx` | B: `nextFix.opponentClubId` |
| `src/features/fantasy/components/lineup/PlayerPicker.tsx` | B: `nextFix.opponentClubId` |
| `src/features/fantasy/services/__tests__/fixtures.test.ts` *(falls vorhanden)* | B: `opponentClubId`-Assertion |

---

## 4. Code-Reading-Liste (VOR Implementation) — erledigt

1. ✅ `scoring.queries.ts:109-227` `getPlayerMatchTimeline` — Majority-Vote + statMap; `club_id` fehlt im Select (Z.117). **Frage geklärt:** stat-Row pro (fixture,player) → `statMap.get(fix.id).club_id` ist autoritativ.
2. ✅ `FDRBadge.tsx:36-40` `getClubAvgL5` — `p.club === clubShort`. **Frage:** hat `Player` ein `clubId`? → **ja, `Player.clubId?: string`** (`types/index.ts:49/133`).
3. ✅ `fixtures.ts:484-608` `NextFixtureInfo` + 2 Producer — beide haben `home_club_id`/`away_club_id` lokal → `opponentClubId` direkt befüllbar.
4. ✅ 4 FDR-Consumer (grep) — alle via `nextFix` (`NextFixtureInfo`): ClubFixturesStrip (`getNextFixturesForClub`), useLineupPanelState/LineupBuilder/PlayerPicker (`useNextFixtures`→`getNextFixturesByClub`).
5. ✅ `misc.ts:203` — einziger Timeline-Consumer (`usePlayerMatchTimeline`), Shape unverändert → kein Consumer-Bruch.
6. ✅ `errors-frontend.md` **S276** (ambiguous-Key) + `database.md` (Multi-League club*/league*-Spiegel).

## 5. Pattern-References

- **S276** (`errors-frontend.md`): Cache/Lookup nie nach Short indizieren ohne Disambiguator → UUID ist der Disambiguator. **Kern dieses Slices.**
- **S102 / Multi-League Props-Propagation** (`errors-frontend.md`): jedes `club*`-Field braucht `league*`/UUID-Spiegel; neues optionales Field → ALLE Call-Sites greppen (hier: `opponentClubId` an 4 Consumer, alle erfasst).
- **Slice 270c** (Timeline-Robustheit gegen stale `players.club_id`): Begründung, warum Timeline aus Stat-Rows liest — wir bleiben in dieser Quelle, nutzen nur zusätzlich deren `club_id`.

## 6. Acceptance Criteria (executable)

- **AC1 (A):** Timeline-Query selektiert `club_id`; `effectiveClubId`/`clubVoteCount` existieren nicht mehr. *VERIFY:* `grep -n "effectiveClubId\|clubVoteCount" scoring.queries.ts` → 0 Treffer.
- **AC2 (A):** `isHome` = `stat.club_id === fix.home_club_id` pro Fixture. *VERIFY:* Code-Review + SQL-Probe eines Multi-Club-Spielers (s. §8) zeigt für jede Fixture korrektes isHome.
- **AC3 (A):** Multi-Club-Spieler: in ALLEN seinen Fixtures stimmt `isHome`/`matchScore` mit der echten `fps.club_id`-vs-`fixtures.home_club_id`-Relation überein (kein Vote-Kippen). *VERIFY:* SQL §8.
- **AC4 (B):** `NextFixtureInfo.opponentClubId` von beiden Producern befüllt (nie leer bei vorhandener Fixture). *VERIFY:* `grep -n "opponentClubId" fixtures.ts` → Typ + 2 Zuweisungen.
- **AC5 (B):** `getClubAvgL5` filtert `p.clubId === opponentClubId`. *VERIFY:* grep + Unit/Code-Review.
- **AC6 (B):** alle 4 Consumer rufen `getClubAvgL5(nextFix.opponentClubId, …)`. *VERIFY:* `grep -rn "getClubAvgL5(" src/ | grep -v opponentClubId | grep -v "__tests__"` → 0 (außer Definition).
- **AC7:** `pnpm exec tsc --noEmit` grün. `CI=true pnpm exec vitest run` betroffene Tests grün.
- **AC8 (Live):** Player-Detail eines Multi-Club-Spielers auf bescout.net zeigt korrekte H/A + Ergebnisse; FDR-Strip eines Bundesliga-Clubs gegen Bayern zeigt plausiblen (nicht-gemischten) FDR. (Render-Proof.)

## 7. Edge Cases

| Fall | Verhalten |
|------|-----------|
| `stat.club_id` weder home noch away (Daten-Anomalie) | `isHome=false` → opponent=home. 0 NULL gemessen; identisch zum alten Vote-Risiko. Defensiv akzeptiert. |
| Spieler in genau 1 Fixture | per-Fixture trivially korrekt (kein Vote nötig). |
| Multi-Club-Spieler (117) | jede Fixture nach eigener `club_id` → korrekt. **Kern-Fix.** |
| Gegner-Spieler ohne `clubId` (1,8%) | fallen aus FDR-Avg → marginal, NIE Misch-Korruption. Besser als Status quo. |
| `opponentClubId` leer | strukturell unmöglich (FK non-null); Avg=0 (heutiges `?`-Verhalten). |
| Short-Kollision same-league (BAY) | UUID-Filter trennt Leverkusen/Bayern sauber. |
| Timeline-Consumer (misc.ts) | Return-Shape `MatchTimelineEntry` unverändert → kein Bruch. |
| `getClubAvgL5`-Altsignatur woanders genutzt | grep §6-AC6 stellt sicher: nur Definition + 4 Call-Sites. |

## 8. Self-Verification Commands

```bash
# A: kein Majority-Vote mehr
grep -n "effectiveClubId\|clubVoteCount\|maxVotes" src/features/fantasy/services/scoring.queries.ts   # erwartet 0

# B: alle getClubAvgL5-Call-Sites UUID-basiert
grep -rn "getClubAvgL5(" src/ | grep -v "__tests__"   # Definition + 4 × opponentClubId

# B: opponentClubId im Typ + 2 Producern
grep -n "opponentClubId" src/features/fantasy/services/fixtures.ts

# tsc + tests
pnpm exec tsc --noEmit
CI=true pnpm exec vitest run scoring fixtures
```

**SQL-Probe (Proof, Multi-Club-Spieler) — über Supabase MCP:**
```sql
-- Pick a player with multi-club stat rows, show per-fixture truth:
WITH mc AS (
  SELECT player_id FROM fixture_player_stats
  WHERE player_id IS NOT NULL AND club_id IS NOT NULL
  GROUP BY player_id HAVING COUNT(DISTINCT club_id)>1 LIMIT 1)
SELECT f.gameweek, fps.club_id = f.home_club_id AS is_home_truth,
       hc.short AS home, ac.short AS away, f.home_score, f.away_score
FROM fixture_player_stats fps
JOIN fixtures f ON f.id = fps.fixture_id
JOIN clubs hc ON hc.id = f.home_club_id
JOIN clubs ac ON ac.id = f.away_club_id
WHERE fps.player_id = (SELECT player_id FROM mc) AND f.home_score IS NOT NULL
ORDER BY f.gameweek DESC;
-- erwartet: is_home_truth korrekt pro Zeile (würde der alte Vote für die
-- Minderheits-Fixtures kippen).
```

## 9. Open-Questions

- **Keine Pflicht-Klärung (CTO-autonom):** kein Geld, kein Schema, kein Wording, kein CEO-Scope. Anzeige-Korrektheit + bekanntes S276-Pattern.
- **Autonom-Zone:** Signaturwechsel `getClubAvgL5`, Entfernung des Vote-Blocks, `opponentClubId`-Plumbing.

## 10. Proof-Plan

- `worklog/proofs/420-*.txt`: (1) Self-Verify-Greps-Output, (2) tsc+vitest-Output, (3) SQL-Probe Multi-Club-Spieler (alt-Vote-Kipp vs neu-korrekt).
- Live-Render (Player-Detail Multi-Club-Spieler + FDR-Strip Bundesliga) als `.png`/DOM-Evaluate nach Deploy (AC8).

## 11. Scope-Out

- Keine Änderung an Scores/Money/`score_event` (419 eingefroren).
- Keine `players.club_id`-Backfill (1,8% NULL bleiben; S303/S368e-Klasse vermeiden).
- Kein Schema-Change, kein neuer RPC.
- Display-Labels (Short/Name) bleiben; nur Berechnung UUID-basiert.
- 2.4 (GW-Max-Routing, `GameweekSelector`-Delete) = separater Slice.

## 12. Stage-Chain (geplant)

SPEC → IMPACT (in Spec, Consumer grep-verifiziert) → BUILD → REVIEW (reviewer-Agent, Pflicht) → PROVE (vitest + SQL-Probe + Live-Render) → LOG.

## 13. Pre-Mortem (optional bei M)

1. **`Player.clubId` schlechter befüllt als gedacht** → FDR global leer. *Mitigation:* gemessen 98,2% befüllt; Avg dropt nur fehlende, mischt nie. Falls Live-Render leere FDR zeigt → Daten-Check, nicht Code-Revert.
2. **`getClubAvgL5`-Call-Site übersehen** → tsc-Fehler (Signaturwechsel `string`→`string` ist tsc-unsichtbar!). *Mitigation:* **kritisch** — Signatur bleibt `(string, players)`, also kein tsc-Schutz. AC6-grep ist Pflicht (nicht tsc-verlassen). S102-Lehre.
3. **Stat-Row club_id ≠ home/away** (Daten-Anomalie) → falsches isHome. *Mitigation:* 0 NULL, FK-konsistent; defensiv akzeptiert wie alt.
4. **misc.ts-Consumer erwartet altes Feld** → kein neues Feld, Shape stabil → kein Risiko.
5. **Test-Fixtures mit altem `opponentShort`-only** → tsc-unsichtbar (S375). *Mitigation:* fixtures.test.ts mit-anfassen wenn `NextFixtureInfo`-Mock vorhanden.
