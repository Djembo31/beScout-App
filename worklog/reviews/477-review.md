# Review — Slice 477 (D-26 Player-Domain Club-Identität)

**Reviewer:** Cold-Context reviewer-Agent · 2026-06-30 · time-spent ~9 min
**Verdict: PASS** (würde ein Senior so mergen: Ja — chirurgischer 1-Zeilen-SSOT-Fix, round-trip-bewiesen, money/score-neutral, sauber getestet, Residual ehrlich geparkt.)

## Findings (alle NITPICK/INFO — kein Code-Defekt, nichts vor Merge zu fixen)

| # | Severity | Location | Issue | Entscheidung |
|---|----------|----------|-------|--------------|
| 1 | NITPICK | players.ts:211/214-218 | `getClub(db.club_id)` 5-6×/Spieler (club + league_id/league + leagueLookup). O(1) Map-Get, perf vernachlässigbar. | **Bewusst gelassen** — pre-existed für Liga (326-Muster), Hoist würde leagueLookup mitziehen = Nachbar-Refactor (§1 surgical). Kein Blocker. |
| 2 | INFO (Residual) | useLineupBuilder.ts:360 + Holdings-Mapper (trading.ts:410/holdingMapper.ts:41) | Fantasy Event-Requirement-Gate (`minClubPlayers`/`specificClub`) liest Holdings-`.club` (NICHT dbToPlayer) → divergenter Spieler matcht client-seitig falsch. Eligibility-affecting, nicht nur kosmetisch. Server `rpc_save_lineup` bleibt autoritativ (kein Money-Bug). | **D-26-Rest: Holdings-Mapper priorisieren.** 477 selbst korrekt unangetastet. |
| 3 | NITPICK (Spec) | Spec AC-3/4 | `usePlayerDetailData.test.ts` mockt `dbToPlayer` komplett → vom Fix entkoppelt (bleibt grün egal welcher Branch), nicht via Fallback-Pfad. | Nur Begründungs-Präzisierung, keine Code-Änderung. |
| 4 | NITPICK (LOG) | disease-register D-26 | Volle stale-Mapper-Liste nicht enumeriert: search.ts:96, trading.ts:410/holdingMapper.ts:41, lineups.queries.ts:161, offers.ts:43. | **Im Register D-26-Rest mit voller Liste + Holdings-Priorität anlegen.** |

## Kern-Fragen verifiziert
1. **Round-Trip-Sicherheit ✓** — `getClub` indiziert per UUID/slug/**name**/short (clubs.ts:78-80); FK-`getClub(club_id).name` ist selbst Cache-Key → `getClub(player.club)` downstream (PlayerHero:70, ClubVerkaufSection:100) resolved garantiert korrekt. Fallback `?? db.club` greift nur bei null/undefined.
2. **Blast-Radius ✓** — Such-Match (MarketSearch:62, usePlayerTrading:534/536) nutzt jetzt Kanon-Namen = Verbesserung; kein Konsument braucht exakten Freitext. compare/Home-Strips lesen Roh-Rows/eigene RPCs → vom Mapper nicht erreicht.
3. **SSOT ✓** — Mapper-Resolve = saubere Service-seitige SSOT-Variante, folgt 1:1 dem Liga-Resolve im selben Mapper (326). Komponenten-Resolves (422-425) operieren auf Holdings-Mapper = andere Quelle → kein neuer zweiter Weg.
4. **Money/Score-Safety ✓** — kein dbToPlayer-`club`-Konsument ist Geld-/Scoring-Input; Synergie/Event-Requirement nutzen `clubId ?? club` (UUID-first) bzw. server-`club_id`; String-`club` nur Fallback bei `clubId===null` — genau dort ändert der Fix NICHTS.
5. **Test-Korrektheit ✓** — vi.hoisted+mockReset → Default undefined → Nicht-D26-Tests sehen Freitext-Fallback (unverändert). players.ts importiert NUR getClub aus clubs → Partial-Mock vollständig. Liga-Assertions grün.
6. **Scope-Out ehrlich ✓** — Register D-26 = Player-Domäne (PlayerHero/index/ClubVerkaufSection) geheilt; breitere Surfaces als D-26-Rest geparkt, NICHT „komplett" behauptet.

## Knowledge-Capture (Verschärfung errors-frontend S368b)
Bei „Display-Anker aus Source-of-Truth"-Fixes an EINEM Mapper prüfen, ob parallele Mapper (Holdings, Search-Service, server-RPC-Strips) dieselbe denormalisierte Spalte unabhängig lesen — ein Mapper-Fix heilt nur seinen Pfad; nicht-Display-Konsumenten (Fantasy Event-Requirement-Gate via Holdings) können stale bleiben und sind eligibility-affecting, nicht nur kosmetisch. (Schwester zu S414-416 „von-allem-N" auf der Mapper-Achse.)
