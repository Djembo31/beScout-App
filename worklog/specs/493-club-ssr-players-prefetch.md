# Slice 493 — W6/D-03: /club Hero ins SSR-HTML (players-Prefetch)

**Slice-Type:** Service + SSR (page.tsx) · **Größe:** M · **Welle:** Mock→Pro W6 / D-03 SSR-Architektur

## 1. Problem-Statement (live gemessen + code-verifiziert)
`/club/[slug]` LCP = **2226 ms** (chrome-devtools post-487, Desktop). Post-487-Trace: das Stadion-Hero-Bild ist @740ms fertig geladen, **paintet aber erst @2226ms** → render-delay **1486ms (67%)**. Ursache exakt lokalisiert:
- `ClubContent.tsx:178`: `if (authLoading || loading) return <ClubSkeleton />;`
- `useClubData.ts:166`: `const loading = !!(clubLoading || (clubId && playersLoading));` → Gate hängt **nur an `club` + `players`** (Sekundär-Queries haben safe Defaults, blocken nicht).
- `page.tsx` (471) prefetcht **nur** die Club-Query (`qk.clubs.bySlug`), **nicht** `players` → im SSR ist `playersLoading` true → `loading` true → `ClubContent` rendert server-seitig **ClubSkeleton** (nicht den Hero) → Stadion-`<Image>` **nicht im SSR-HTML** → paint erst nach Client-Hydration+players-Fetch.

**Anils Wahl = Option 1 „Hero vom loading-Gate entkoppeln".** Recon zeigt: das **Gate füttern** (players mitprefetchen) realisiert dasselbe Ziel (Hero im SSR-HTML) **ohne** Gate-/Null-Safety-Refactor → strikt einfacher + robuster (§1 „den einfacheren Weg").

## 2. Lösungs-Design
`page.tsx`: nach dem Club-Prefetch, wenn `club?.id` da, **`players` mitprefetchen** unter dem exakten Client-Key `qk.players.byClub(club.id, true)` via `getPlayersByClubId(club.id, {activeOnly:true}, supabaseAdmin)`. → SSR `loading` false → bestehendes Gate (Z.178) passt → `ClubHero`/`PublicClubView` rendert ins SSR-HTML mit vollständigen club+players-Props → Stadion-Bild im SSR-HTML → paintet sofort (via 487 preloaded). Sekundär-Props (followerCount/ipos/form/prestige) bleiben safe-default (count-ups von 0, conditional). Path-agnostisch (ausgeloggt+eingeloggt, gleiches Gate).

**SSOT (§0):** `getPlayersByClubId` bekommt einen optionalen `client`-Param (Default Browser-`supabase`) → EINE Query-Definition, server-seitig mit injiziertem `supabaseAdmin` wiederverwendet. Kein zweiter Query-Weg.

## 3. Betroffene Files
- `src/lib/services/players.ts` — `getPlayersByClubId` + optionaler `client`-Param (DI), `SupabaseClient`-Type-Import.
- `src/app/(app)/club/[slug]/page.tsx` — players-Prefetch nach club-Prefetch (error-safe via prefetchQuery).

## 4. Code-Reading-Liste (erledigt)
1. `ClubContent.tsx:178` Gate + `useClubData.ts:166` loading-Def → **Root-Cause = players nicht geprefetcht** ✓
2. `page.tsx` (Live) → prefetcht nur club (Z.65-75), players fehlt ✓
3. `players.ts:43` `usePlayersByClub(clubId,true)` → Key `qk.players.byClub(cid,true)`, queryFn `getPlayersByClubId(cid,{activeOnly:true})` → `DbPlayer[]` ✓
4. `services/players.ts:144` `getPlayersByClubId` = `.select(PLAYER_SELECT_COLS).eq('club_id').order('last_name')` +activeOnly `.neq('mv_source','transfermarkt_stale')` ✓
5. `ClubHero.tsx` — Sekundär-Props safe (count-ups von 0, `buyablePlayers>0 &&`, `formResults.length>0 &&`, `prestigeTier &&`, `clubPrestige?.tier`) ✓
6. Live-RLS `players_select` = `{public}`/`qual=true` → admin==anon Row-Parität ✓
7. `supabaseAdmin` = `SupabaseClient` (proxy, server-safe, schon in page.tsx genutzt) ✓

## 5. Pattern-References
- errors-frontend **S474** (SSR authed surface = Blast-Radius, nur Live-Walk clearbar; localStorage-placeholderData-Mismatch — hier N/A, kein wallet/tickets im /club-Pfad).
- errors-frontend **S476** (HydrationBoundary dual-build → ClubHydration-Wrapper; SSR-Slices JEDEN Page-Typ walken).
- errors-db **S461/S354** (Prefetch-Shape muss Client-queryFn exakt matchen → DI derselben Service-Fn = Parität).
- d03-ssr-ist-analyse.md (Baseline/Trace-Historie).

## 6. Acceptance Criteria (executable)
- **AC1** tsc `--noEmit` grün.
- **AC2** `getPlayersByClubId` 3-arg, Default-Client = Browser `supabase` (bestehender Caller `usePlayersByClub` unverändert).
- **AC3** page.tsx prefetcht `qk.players.byClub(club.id, true)` NUR wenn `club?.id`; prefetchQuery error-safe (kein throw).
- **AC4 (Live, post-Deploy):** `/club/galatasaray` (ausgeloggt) chrome-devtools LCP **deutlich < 2226ms** (Ziel < ~1200ms; render-delay kollabiert, Bild im SSR-HTML). Trace-Vergleich.
- **AC5 (Live):** Console auf `/club` (aus- UND eingeloggt) **frei von React #418/#422/#423/#425 + MISSING_MESSAGE** (kein Hydration-Regress, S474/S476).
- **AC6 (Live):** /club rendert visuell vollständig (Hero + Sektionen), Spielerliste korrekt (players im SSR).

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| Club nicht gefunden (Cache-Miss) | `club?.id` falsy → kein players-Prefetch, kein Break (notFound-Pfad unverändert) |
| players-Prefetch-Query-Fehler | prefetchQuery swallowt → Client-Fetch-Fallback (wie 471 club) |
| Eingeloggt (RLS) | players public (`qual=true`) → admin==authed rows → Parität |
| activeOnly-Filter | `.neq('mv_source','transfermarkt_stale')` gespiegelt via DI (identische Fn) |
| 0 aktive players | leeres Array geprefetcht, Hero rendert (playerCount 0), kein Crash |
| Hydration | server rendert Hero mit prefetch-Daten == client (kein localStorage im /club-anon-Pfad) → kein #418 |

## 8. Self-Verification
- `npx tsc --noEmit`
- `grep -n "getPlayersByClubId" src/lib/queries/players.ts src/app/(app)/club/[slug]/page.tsx` (Caller unverändert + neuer Server-Call)
- Post-Deploy: `chrome-devtools performance_start_trace` gegen `https://www.bescout.net/club/galatasaray` (LCP-Breakdown) + Console-Scan aus/eingeloggt.

## 9. Open-Questions
- Keine Pflicht-Klärung. Autonom-Zone: DI-Param-Signatur, Prefetch-Platzierung. (Anil-Mandat „autonom übernehmen".)

## 10. Proof-Plan
- tsc-Output (`.txt`) + post-Deploy chrome-devtools LCP-Trace-Vergleich (2226ms → ?) + Console-Screenshot/Log aus+eingeloggt → `worklog/proofs/493-*`.

## 11. Scope-Out
- KEIN Gate-Refactor (Z.178 unverändert), KEIN Null-Safety-Umbau, KEIN ClubHero/PublicClubView-Touch.
- Option 2 (Stadion-Backdrop server-rendern) = separater Slice, NUR falls AC4 zeigt dass der Hero-SSR nicht reicht (evidenzbasiert nach Messung).
- TTFB-Optimierung (472 getServerUser) + Player-Detail-Payload = eigene W6-Items.

## 12. Stage-Chain (geplant)
SPEC ✓ → IMPACT (inline: 2 Files, 1 Consumer unverändert, kein DB/RLS-Change) → BUILD → REVIEW (cold-context, SSR/Hydration-Fokus — S474/476-Pflicht) → PROVE (tsc + Live-LCP+Console) → LOG.

## 13. Pre-Mortem
1. **players-Prefetch-Shape ≠ Client** → Hydration-Mismatch/Refetch. → DI derselben `getPlayersByClubId` = exakte Parität (kein Replika-Drift). Public-RLS → admin==anon rows.
2. **Browser-`supabase` vs `supabaseAdmin` Typ-Konflikt** → tsc. → beide `SupabaseClient`, `client: SupabaseClient = supabase`.
3. **SSR rendert jetzt Below-Hero-Sektionen mit leeren Sekundär-Daten** → latenter Null-Crash. → dieselben Sektionen rendern HEUTE schon post-loading mit unresolveten Sekundär-Queries (nicht im Gate) → tolerieren es bereits, kein NEUES Surface.
4. **Größere SSR-HTML-Payload (players im dehydrate)** → TTFB↑. → Daten die der Client eh fetcht; Netto-Win (kein Client-Waterfall); players ~400-700 rows indiziert.
5. **HydrationBoundary-Regress (#422/476) durch größeren dehydrate-State** → Page-Crash. → ClubHydration-Wrapper (476) build-agnostisch; Live-Walk /club Pflicht (AC5).
6. **Eingeloggter Pfad anders** → nur ausgeloggt gemessen. → beide walken (AC5/AC6); Gate identisch für beide.
