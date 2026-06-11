# Slice 282 — Cold-Start Phase 3: Home von /api/players entkoppeln (−4,2 MB)

**Größe:** M
**Slice-Type:** Service + UI (Hook-Layer + Query-Layer + page.tsx-Anpassung)
**Datum:** 2026-06-11
**CEO-Scope:** Nein (Performance-Refactor; IPO-Spotlight-Reaktivierung ist D63-Design-Intent, kein neuer Scope)

## 1. Problem-Statement

**Evidence (worklog/audits/2026-06-11/lighthouse-baseline.md):**
- `GET /api/players` = **4,2 MB JSON, 5,5s unthrottled, ~21s auf Mobile-Profil** — geladen auf Home via `useHomeData → usePlayers()`.
- Anil-Komplaint D70 (2026-05-06): „ich bin weiterhin mit dem laden der App total unzufrieden!"
- Home braucht davon real: 5-Trending-Join + 1 `some()`-Check. Die dritte Ableitung `activeIPOs` ist **dead code** — `dbToPlayer` setzt `ipo.status` immer `'none'` (`src/lib/services/players.ts:185`), der Filter matched nie, IPO-Spotlight (Slot 3 der D63-Cascade) + Sidebar-IPO-Sektion (page.tsx:352) haben nie gerendert.
- Slice-109-Lehre beachtet: Das ist KEINE Query-Konsolidierung (parallel = kein Win), sondern **Payload-Elimination** — 4,2 MB Netzwerk + 4-MB-JSON.parse auf 4×-throttled Main-Thread fallen weg.

## 2. Lösungs-Design

`usePlayers()` komplett aus `useHomeData` entfernen. Die 3 Ableitungen bekommen gezielte Mini-Quellen:

| Ableitung | Neu | Payload |
|---|---|---|
| `activeIPOs` | `useActiveIpos()` (existiert, Market+Manager nutzen es) + Mini-Player-Fetch `.in('id', ipoPlayerIds)` für Namen/Progress-Shape | wenige KB; **heilt zugleich das tote IPO-Feature** |
| `trendingWithPlayers` | neuer Service `getPlayersByIds(ids)` (PLAYER_SELECT_COLS, `.in('id', ids)`, ≤5 IDs) + Join gegen trending | <10 KB |
| `hasGlobalMovers` | Supabase Head-Count `players` `.neq('price_change_24h', 0).limit(1)` ODER `/api/players?movers=true&limit=1` (existiert, 5-min-cached) | <1 KB |
| `playersLoading` / `playersError` | ersetzt durch Loading/Error der neuen Mini-Queries (page.tsx-Konsumenten anpassen) | — |

`activeIPOs`-Shape: page.tsx + helpers.tsx:162 erwarten `{first, last, ipo:{progress}}`-artige Player — Mapping-Layer von `DbIpo` + Mini-Player-Rows auf die konsumierte Shape (exakte Konsumenten-Felder in BUILD per Read verifizieren, NICHT raten).

**Nicht angefasst:** Market (`useEnrichedPlayers`) behält `usePlayers()` — Marktplatz braucht die volle Liste legitim; Server-Pagination dort wäre L-Slice (Scope-Out).

## 3. Betroffene Files

| File | Änderung |
|------|----------|
| `src/app/(app)/hooks/useHomeData.ts` | usePlayers raus, 3 Mini-Quellen rein, Mapping |
| `src/lib/services/players.ts` | + `getPlayersByIds(ids)` |
| `src/lib/queries/players.ts` | + `usePlayersByIds(ids)` Hook (qk-Key + Konsument im selben Slice — kein Orphan-Key, Slice-267-Lehre) |
| `src/lib/queries/keys.ts` | + `qk.players.byIds(ids)` |
| `src/app/(app)/page.tsx` | playersLoading/playersError/players-Konsumenten anpassen |
| ggf. `src/components/home/helpers.tsx` | Shape-Anpassung getStoryMessage/IPO |

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Frage |
|------|-------|
| `src/app/(app)/page.tsx` (voll) | Welche Felder von `players`/`playersLoading`/`playersError`/`activeIPOs` werden konsumiert? Welche Sections gaten darauf? |
| `src/components/home/helpers.tsx` | Exakte Shape die `getStoryMessage` + IPO-Sektionen brauchen |
| `src/features/market/queries/ipos.ts` | useActiveIpos Return-Shape (DbIpo), staleTime, qk-Key |
| `src/lib/services/ipo.ts:44-54` | ✅ gelesen — getActiveIpos filtert open/early_access + ends_at |
| `src/lib/services/players.ts` PLAYER_SELECT_COLS + dbToPlayer | ✅ gelesen — ipo.status='none' Beweis; getPlayersByIds nutzt gleiche COLS |
| `src/lib/queries/keys.ts` players-Namespace | Key-Konvention für byIds |
| `src/components/home/HomeSpotlight.tsx` | Was konsumiert der ipo-Slot? (Slot reaktiviert sich durch Fix) |
| RLS `players` + `ipos` | Sind beide anon/authenticated-SELECT-readable via Client? (ipos: Market nutzt Client-Query → ja; verifizieren) |

## 5. Pattern-References

- errors-infra.md „Query-Konsolidierung ≠ LCP-Win wenn parallel (Slice 109)" — Begründung warum Payload-Cut statt RPC-Bündelung
- errors-frontend.md „qk-Key-Definition ohne Konsument (Slice 267)" — Key + Konsument im selben Slice
- errors-frontend.md „PLAYER_SELECT_COLS Sync (Slice 200)" — getPlayersByIds nutzt die Konstante
- common-errors.md §1 `.in()` Chunking — byIds max 5-10 IDs, kein Chunk nötig, aber error-check pflicht
- errors-frontend.md „Data-Format vs Component-Expectation Drift (Slice 102)" — IPO-Shape-Mapping im Service-Layer erzwingen
- D63 Spotlight-Cascade (Slot 3 = ipo) — Reaktivierung ist Design-Intent
- performance.md „Messen VOR Optimieren" — Baseline: worklog/audits/2026-06-11/lighthouse-baseline.md

## 6. Acceptance Criteria

- AC-01 [HAPPY]: Home lädt OHNE `GET /api/players`. VERIFY: Chrome-DevTools-MCP Network-Trace auf bescout.net `/` (eingeloggt) → kein Request auf `/api/players` (ohne `?movers`). FAIL-IF: Request vorhanden.
- AC-02 [HAPPY]: Trending-Section rendert identisch (5 Spieler mit Name/Club/Bild). VERIFY: Screenshot-Vergleich vorher/nachher. FAIL-IF: leere Trending-Liste bei vorhandenen Trending-Daten.
- AC-03 [HAPPY]: `hasGlobalMovers` liefert true wenn DB Movers hat. VERIFY: vitest + DB-Spotcheck `SELECT COUNT(*) FROM players WHERE price_change_24h <> 0`. FAIL-IF: immer false.
- AC-04 [BEHAVIOR-CHANGE]: Bei aktiven IPOs (DB `ipos` status open/early_access) erscheint IPO im Spotlight/Sidebar — erstmals echt. VERIFY: DB-Check ob aktive IPOs existieren; wenn ja Visual, wenn nein: Unit-Test des Mappings. FAIL-IF: activeIPOs leer trotz offener IPOs.
- AC-05 [GUARD]: Market unverändert (usePlayers bleibt dort). VERIFY: `grep -n "usePlayers" src/features/market/` unverändert + /market Smoke. 
- AC-06 [GUARD]: `npx tsc --noEmit` + `CI=true pnpm exec vitest run` (betroffene Suites) grün.
- AC-07 [PERF]: Home-Transfer-Size (eingeloggt, cold) sinkt um ≥ 4 MB. VERIFY: DevTools-MCP Network-Summary vorher/nachher in Proof. FAIL-IF: < 3 MB Reduktion.
- AC-08 [GUARD]: Kein neuer qk-Key ohne Konsument. VERIFY: Orphan-Key-Grep aus Slice 267.

## 7. Edge Cases

| # | Case | Handling |
|---|------|----------|
| 1 | trendingPlayers = [] | byIds-Query `enabled: ids.length > 0`, Section bleibt hidden |
| 2 | IPO-Player-Row fehlt (player gelöscht/club_id null) | Mapping filtert null-Joins, IPO ohne Player-Row wird nicht angezeigt |
| 3 | ipos-Tabelle leer | activeIPOs = [] — identisch zu heutigem (kaputtem) Verhalten |
| 4 | movers-Check Error | hasGlobalMovers defensiv false (kein Risk-Indikator-True bei unknown, Slice-265-Pattern) |
| 5 | Race: trending resolved vor byIds | Join in useMemo über beide data — partial = leere Liste bis beide da (wie heute mit players) |
| 6 | page.tsx nutzt players für mehr als die 3 Ableitungen | Code-Reading klärt VOR Build; falls ja → Spec-Update statt raten |
| 7 | RLS blockt ipos-SELECT für authenticated | Pre-BUILD-Verify via pg_policies; Market nutzt Client-Query bereits → erwartbar OK |
| 8 | storyMessage konsumiert activeIPOs-Shape | helpers.tsx:162 Signatur lesen, Mapping liefert exakt die Felder |
| 9 | byIds Reihenfolge ≠ ids-Reihenfolge | Join über Map, nicht Index |
| 10 | Doppel-Fetch wenn User Home→Market navigiert | Market lädt /api/players weiterhin lazy bei Mount — akzeptiert (war vorher auch so) |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
CI=true pnpm exec vitest run src/app src/lib/queries src/lib/services 2>&1 | tail -5
grep -rn "usePlayers()" src/app/\(app\)/hooks/useHomeData.ts   # erwartet: 0 Treffer
grep -rn "qk.players.byIds" src/ --include="*.ts*" | grep -v keys.ts | wc -l   # ≥ 1 Konsument
# DB-Verify:
#   SELECT status, COUNT(*) FROM ipos GROUP BY status;
#   SELECT COUNT(*) FROM players WHERE price_change_24h <> 0;
#   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'ipos';
# Network-Proof: chrome-devtools-MCP auf https://bescout.net/ → list_network_requests → kein /api/players
```

## 9. Open-Questions

- **Autonom-Zone:** hasGlobalMovers-Quelle (Supabase-Head-Query vs. ?movers-Endpoint), Hook-Naming, staleTimes, Shape-Mapping-Details.
- **Pflicht-Klärung:** keine — Track von Anil approved („go").
- **CEO-Zone:** keine. (IPO-Slot-Reaktivierung = D63-Intent; falls Anil IPO-Sektion auf Home NICHT will, ist das ein 1-Zeilen-Revert des Filters.)

## 10. Proof-Plan

`worklog/proofs/282-home-payload.md`: (1) Network-Trace vorher/nachher (Transfer-Size-Delta), (2) vitest-Output, (3) DB-Spotchecks, (4) Mobile-393px-Screenshot Home post-Deploy.

## 11. Scope-Out

- Market/Community-Entkopplung von /api/players (Server-Pagination) — L-Slice, später
- LHCI-Auth-Fix + GHA-Artifact-Fix (Validity-Befund) — **Slice 282b**
- /api/players CDN-Caching-Härtung — folgt ggf. mit Market-Slice
- IPO-Status-Merge in dbToPlayer global — nicht nötig, Home nutzt jetzt ipos-Quelle direkt

## 12. Stage-Chain (geplant)

SPEC → IMPACT (Pflicht — `src/lib/queries/` + `src/lib/services/` berührt; kompakt inline: Konsumenten-Grep useHomeData/page.tsx/keys) → BUILD → REVIEW (Cold-Context-Reviewer — M-Slice mit Behavior-Change AC-04) → PROVE → LOG

## 13. Pre-Mortem

1. page.tsx konsumiert `players` an übersehener Stelle → Code-Reading VOR Build, grep `players` in page.tsx.
2. IPO-Reaktivierung zeigt plötzlich IPO-Section mit kaputtem Layout (nie visuell getestet, da nie gerendert) → Visual-QA der Section pflicht; wenn DB keine aktiven IPOs hat: Test-IPO-Mapping per Unit-Test + Layout via Storybook-artigem Mock nicht möglich → Section-Render mit Mock-Daten lokal prüfen.
3. trendingWithPlayers-Shape driftet (Player-Type vs DbPlayer) → dbToPlayer auf byIds-Rows anwenden, gleiche Pipeline wie vorher.
4. hasGlobalMovers false-positive bei Query-Error → defensiv false + error-check (Slice-265 strict-equality-Lehre).
5. Vergessener page.tsx-Gate `!playersLoading && activeIPOs.length > 0` (Z.352) verhält sich neu anders → Loading-Semantik der Ersatz-Queries explizit mappen.
