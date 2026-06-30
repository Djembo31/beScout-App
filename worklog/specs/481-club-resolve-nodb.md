# Slice 481 — D-26c Teil 1: players.club Render-SSOT (no-DB-Surfaces)

**Slice-Type:** Service · **Größe:** S · **Welle:** Mock→Pro Konsistenz-Batch (D-26c Teil 1) · **Scope:** CTO autonom (kein Money)

## 1. Problem-Statement
`players.club` ist stale Freitext (live 6,57% = 294/4472 divergent vom FK `club_id`, D-26). 477 heilte `dbToPlayer`, 478 die 2 Mapper mit `club_id` in der Row. **D-26c-Rest** = Surfaces, die `dbToPlayer` NICHT durchlaufen und Freitext rendern. Teil 1 = die 3 **no-DB**-Surfaces (direkte Selects / Component, kein RPC-Change):
- `offers.ts:43` (`enrichOffers` → `OffersTab.tsx:83` Portfolio „Gebote") — `player?.club ?? ''`.
- `lineups.queries.ts:161` (Lineup-Slot-Spieler) — `p?.club ?? ''`.
- `compare/page.tsx:56/175/219` (Spieler-Vergleich) — `p.club` in Search-Filter + 2 `PlayerIdentity`-Displays.

Evidence: disease-register D-26c; live 294 divergente Spieler (z.B. Adli Freitext „Bournemouth" vs FK „Bayer Leverkusen").

## 2. Lösungs-Design
Kanonisches 477/478-Muster: `club: getClub(club_id)?.name ?? club` (`@/lib/clubs`-Cache-Lookup, Freitext-Fallback wenn Cache nicht ready = S286/D-26-AC-3-konform, KEIN Backfill).
- offers/lineups: `club_id` zum `players`-Select (+ Pick-Type bei lineups) ergänzen, dann am Mapper resolven.
- compare: `DbPlayer` trägt `club_id` schon (useRawPlayers) → inline-Resolve an den 3 Stellen (1 lokaler Helper).

## 3. Betroffene Files
- `src/lib/services/offers.ts` (Select + Mapper)
- `src/features/fantasy/services/lineups.queries.ts` (Select + Pick-Type + Mapper)
- `src/app/(app)/compare/page.tsx` (Search-Filter + 2 Displays)
- Tests: `offers.test.ts`, `lineups.test.ts` (getClub-Mock, AC-Test wie search.test 478)

## 4. Code-Reading-Liste (erledigt)
1. `src/lib/services/search.ts:98` — kanonisches Muster `getClub(p.club_id)?.name ?? p.club` (478). ✓
2. `src/lib/services/players.ts` dbToPlayer (477) — FK-Resolve + Freitext-Fallback bei null/cache-not-ready. ✓
3. `offers.ts:12-51` enrichOffers — direkter `players`-Select (id, first_name, last_name, position, club), `player_club` rendered in OffersTab.tsx:83. ✓
4. `lineups.queries.ts:136-163` — `players`-Select + `SlotPlayerData`-Pick + Slot-Mapper. ✓
5. `compare/page.tsx:13/23/51-56/175/219` — useRawPlayers (raw DbPlayer mit club_id), `p.club` in Filter + Display. ✓
6. `src/types/index.ts:220` — `DbPlayer.club_id: string | null`. ✓
7. `search.test.ts:11-12` (478) — getClub-Mock-Pattern für AC-Test. ✓

## 5. Pattern-References
- errors-frontend „Display-Anker aus Source-of-Truth, nicht aus vergifteter denormalisierter Spalte" (S368b) + Multi-League-Props (J3+J4).
- §0 SSOT: getClub = EINE Club-Namen-Resolution (kein neuer Weg).
- D-26/477 + D-26b/478 (gleiche Heilung, andere Surfaces).

## 6. Acceptance Criteria
- AC1: `enrichOffers` mit Spieler `{club:'Bournemouth', club_id:'X'}` + `getClub('X')={name:'Bayer Leverkusen'}` ⇒ `player_club='Bayer Leverkusen'`. VERIFY: vitest offers.
- AC2: `enrichOffers` mit `getClub`→null (Cache nicht ready) ⇒ Fallback `player_club=player.club` (Freitext). VERIFY: vitest offers.
- AC3: lineups Slot-Spieler analog: getClub-Resolve + Freitext-Fallback. VERIFY: vitest lineups.
- AC4: compare Search-Filter + Display nutzen getClub-resolved Namen (Code-Read; Component, kein Unit). VERIFY: grep + tsc.
- AC5: tsc 0 · `vitest run offers lineups` grün · keine neuen `?? ''`-Freitext-only-Pfade.
- AC6: grep — `player.club`/`p.club` ohne getClub in den 3 Files = 0 (außer bewusster Fallback `?? player.club`).

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| club_id null | `getClub(null)?.name` → undefined → `?? club` Freitext-Fallback |
| Cache nicht ready (Cold/SSR) | getClub null → Freitext (kein Crash, S286-konform) |
| player nicht gefunden (offers Map miss) | `player ? ... : ''` → '' wie bisher |
| getClub name leer | `?? club` greift (?. + ??) |

## 8. Self-Verification
- `npx tsc --noEmit`
- `npx vitest run src/lib/services/__tests__/offers.test.ts src/features/fantasy/services/__tests__/lineups.test.ts`
- `grep -n "club_id\|getClub" src/lib/services/offers.ts src/features/fantasy/services/lineups.queries.ts src/app/\(app\)/compare/page.tsx`

## 9. Open-Questions
- Keine. RPC-Surfaces (watchlist/trading-movers) = Teil 2/Slice 482 (DB-isoliert). Cache-Race = geparkt.

## 10. Proof-Plan
`worklog/proofs/481-club-resolve-nodb.txt`: tsc + vitest (offers+lineups) + grep der 3 Files + DB-Divergenz-Beleg (294 stale).

## 11. Scope-Out
- KEINE RPC-Migration (Teil 2). KEIN Backfill von players.club (S303-verboten). `useRawPlayers` NICHT global geändert (nur compare-Use-Sites). Cache-Race S286/D-03 geparkt.

## 12. Stage-Chain
SPEC → IMPACT (skipped: keine Schema-/Contract-Änderung, additive Select-Spalte + Display-Resolve) → BUILD → REVIEW (reviewer) → PROVE → LOG.

## 13. Pre-Mortem (kurz)
1. getClub server-side null (enrichOffers via API?) → Freitext-Fallback, kein Regress (Status quo). enrichOffers ist client-gerufen (offer-Queries).
2. Select-Spalte club_id vergessen im Pick-Type (lineups) → tsc fängt's.
3. compare useMemo-deps: Filter nutzt getClub (Modul-Cache, nicht reaktiv) — wie Status quo (search.ts), Cold-Load-Fallback Freitext.
