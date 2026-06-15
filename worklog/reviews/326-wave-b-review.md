# Slice 326 Wave B — CTO Review (pre-DROP) — REWORK

**Reviewer:** reviewer-Agent (Cold-Context) · **Datum:** 2026-06-15 · **time-spent:** 28 min

## Verdict: REWORK → (nach Fix) PASS

Der irreversible DROP durfte initial NICHT appliziert werden: 5 übersehene `clubs.league`-Reader/Writer gefunden, 2 BLOCKER auf Live-Pfaden. Migration-Logik (RPC-Bodies, AR-44, Cache-Order, TX-Atomarität) korrekt — aber 4-Achsen-Grep war unvollständig.

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| F-1 | BLOCKER | `src/lib/services/platformAdmin.ts:244` | `getAllClubs()` SELECT liest `clubs.league` direkt → AdminClubsTab-Query wirft nach DROP (PostgREST 400) | SELECT auf `league_id` + getLeagueById-Ableitung |
| F-2 | BLOCKER | `src/app/(app)/club/[slug]/page.tsx:11` | `getClubMeta()` SSR-SELECT liest `clubs.league` (ungenutzt im Output) → jede /club/[slug]-Metadata bricht | `league` aus SELECT streichen |
| F-3 | MAJOR | `scripts/import-league.mjs:137` | INSERT schreibt `league: league.name` → Liga-Import bricht nach DROP | `league:`-Zeile entfernen (league_id reicht) |
| F-4 | MAJOR | `scripts/enrich-from-transfermarkt.mjs:289` | `.eq('league', leagueName)` Filter auf gedroppter Spalte | auf `league_id` umstellen |
| F-5 | MAJOR | `scripts/fetch-stadium-images.mjs:184`, `scripts/verify-stadiums.mjs:46` | `.select('…league…')` + `.order('league')` auf clubs | auf `league_id` umstellen |
| F-6 | NITPICK | Migration-Header | "0 Views/Trigger/Constraints" ist DB-only-Scope | Header präzisieren |

## PATCH-AUDIT (3 RPCs) → PASS
- create_club v3: alle Guards preserviert (admin/name/slug/short/fail-closed-Liga/slug-dup/fee_config), nur league-INSERT-Spalte raus. AR-44 ✅
- get_club_by_slug: voller Body, `league` via leagues-Lookup, `league_id` neu im Output (kein Cast-Bruch). AR-44 ✅
- get_player_data_completeness: STABLE erhalten, `league`-Key = l.name via JOIN, Output identisch. INNER JOIN safe (NOT NULL davor). AR-44 ✅

## Cache-Order + DROP-Atomarität → PASS
- initClubCache awaitet initLeagueCache zuerst (Slice 286) ✅
- 4 Schritte in einer TX, create_club v3 vor DROP ✅
- league_id NOT NULL safe (134/0 NULL)

## Sauber & abgedeckt (kein Eingriff)
clubs.ts, club.ts (withLeagueName ×5), search.ts (ClubLookup), leagueScopeStore, ClubContent/PublicClubView (RPC), ClubVerkaufSection/ClubCard (getClub), home page.tsx (getUserFollowedClubs), clubs/page.tsx (getClubsWithStats), db-invariants.test (RPC-Output league-Key), seed-demo.sql (berührt clubs.league NICHT).

## Learning
errors-frontend.md "Column-DROP zählt als Removal" (Slice 324) erweitern: Pre-DROP-Grep muss `src/lib/services/*.ts` (ALLE Services, nicht nur Domain-Service) + `src/app/**/page.tsx` (SSR generateMetadata via supabaseAdmin umgeht Client-Cache) abdecken. Audit: `grep -rn "from('clubs')" src/ | grep "<col>"` über ALLE Files.

## Fix-Status (post-Review)
F-1..F-5 gefixt + re-verifiziert vor DROP-Apply. Siehe 326b-wave-b-fixes.
