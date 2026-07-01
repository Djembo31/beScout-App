# Active Slice

```
status: in-progress
slice: 501
title: W4-Rest User-Follow auf React Query (kanonische useToggleFollowUser für 2 Surfaces)
size: M
type: Service/Hook (+ 2 UI-Consumer)
welle: Mock→Pro W4 Follow/Discovery (User-Follow-Rest, CEO Anil „zieh slice 501 durch")
spec: worklog/specs/501-user-follow-react-query.md
proof: worklog/proofs/501-user-follow-rq.txt
review: worklog/reviews/501-review.md (Cold-Context PASS, 2 Nitpicks gefixt)
stage: REVIEW-PASS + PROVE (tsc 0, 196 Tests) → Commit → Deploy → Live-Walk Gesamtflow → LOG. W4 dann EHRLICH komplett.
```

## Slice 501 — W4-Rest User-Follow React Query (in Arbeit)
User-Follow-Schuld in 2 Surfaces (useProfileData local useState + FollowListModal local Map, beide raw follow/unfollow ohne RQ-Invalidation → Cross-Surface-Staleness Profil-Follow ↛ Community-„Folge ich"). §0: EINE kanonische `useToggleFollowUser`-Mutation (Spiegel useToggleFollowClub) + `useIsFollowingUser`, beide Surfaces darauf. onSettled invalidiert `qk.social.stats(me)` → Community-Filter reconciled. Live-Walk Gesamtflow Pflicht.

## Slice 500 — W4 Discovery-Liste React Query (DONE)
Discovery-Liste (`/clubs`) von page-lokalem useState/useEffect → React Query (`useClubsWithStats` + reuse `useNextFixtures`): Cache + Server-Reconciliation der follower_count via `useToggleFollowClub.onSettled`. Item 2 (fanRanking-Freshness) verifiziert **bereits erledigt** (useFanRanking staleTime 30s, FIX-06). **→ W4 (Follow/Discovery) KOMPLETT** (Voting-Konsolidierung 499 + Discovery-RQ 500 + fanRanking-done). Live-Walk /clubs = post-Deploy.

## Slice 499 — W4 club_votes → community_polls (§0 Schnitt) — KOMPLETT
Wave 1 (Code, `4860e4ab`, Live-Walk PASS) + Wave 2 (DB DROP + refresh_user_stats-Swap, `c3badc52`, live). D-18 bleibt geparkt (passive P2).

## Slice 499 — W4 club_votes → community_polls (§0 Schnitt)
**Befund (live-verifiziert):** club_votes = altes Voting-System, von community_polls (Superset, D86/D92-Money-Maschine, live) voll abgelöst, nie entfernt. **club_votes 0 Rows**; `cast_vote` belastet Voter OHNE Treasury/Creator-Split (reiner Sink) = money-model-divergent + reachable (live „Neu Vote"-Button) → **P1-latent**. CreatePollButton (kanonisch) liegt bereits im selben AdminVotesTab → kein Feature-Verlust.
**Wave 1 (code-only, jetzt):** alle club_votes-Reader/Writer/Render + cast_vote-Service raus (14 Live-Files + 5 Tests). community_polls unberührt.
**Wave 2 (gated):** DROP cast_vote + club_votes + vote_entries — CEO-Check vor irreversiblem Schritt.
**D-18 bleibt geparkt** (verifiziert passive P2, 0/210 divergent).

## Slice 498 — D-18 Full Consolidation — GEPARKT (P2, CEO-Direktive 2026-07-01)
**Live-verifiziert passive P2-Redundanz:** entry_fee 0/210 divergent zu ticket_cost, prize_pool 0 auf allen 210 Events, 2 Test-Events. Kein aktiver Bug, keine aktive zweite Wahrheit. Große L-Money-Schema-Migration für reine Schema-Hygiene → unter neuer Direktive (nur P0/P1 bauen, klein/verifizierbar) **geparkt**, bleibt getrackt (disease-register D-18). Spec/Baseline bleiben committed für später.

## Slice 498 — D-18 Full Consolidation — DE-RISKED, Build pausiert (CEO „frisch")
**Fertig + committed (Wave 0):** Live-Verifikation (P2-Redundanz, kein aktiver Bug) · vollständige L-Spec (`worklog/specs/498-*`) · Money-RPC-Baseline `create_user_event` (`worklog/proofs/498-d18-drop.txt`).
**Nächste Aktion = Wave-1-BUILD** (frischer Kopf): Reader/Writer/SELECTs off `entry_fee`/`prize_pool` (~20 Files + ~10 Test-Files), Money-RPC-INSERT-Edit (S156 gg. Baseline im Proof), tsc-grün-Commit → Deploy → Live-Verify → **Wave-2 DROP-Migration** → Verify. STRIKT 2-phasig (NIE DROP vor Code-Deploy). Alles in Spec §12/§13.

## Slice 497 — D-08 getSystemStats „Scout Total" uncapped (§0-Subtraktion)
**Problem (Live-verifiziert):** `getSystemStats` (platformAdmin.ts:43) summiert `wallets.select('balance').limit(5000)` client-seitig → PostgREST cappt real bei **~1000** (common-errors „PostgREST-1000-cap MONEY-CRITICAL"; `.limit(5000)` ist KEIN Override). Feeds „Scout Total" im Platform-Admin (`BescoutAdminContent.tsx:63`). **Latent:** 128 Wallets heute → undercount=0; **falsch ab >1000 Wallets** (Launch-Wachstum). Kanonischer Zwilling `get_treasury_stats.total_circulating_cents` (SECDEF, admin-gated, server-SUM ohne Cap) existiert.
**Semantik-Parität (D87, live functiondef):** `total_circulating_cents = COALESCE(SUM(balance) FROM wallets, 0)` = EXAKT die alte `totalBsdCirculation`-Semantik (SUM balance), nur uncapped. Live true SUM = 850.935.524 cents.
**Fix (§0-Subtraktion):** in `getSystemStats` den gecappten wallets-Client-SUM durch `supabase.rpc('get_treasury_stats')` ersetzen, `totalBsdCirculation = Number(total_circulating_cents ?? 0)`. Caller = platform-admin-only (Middleware-gated) → RPC-Auth (platform_admins) authorisiert. SystemStats-Shape unverändert (1 Consumer, kein Impact).
**Scope-Out:** D-09 (getTreasuryStats-Fallback `.limit(5000)`) = nur RPC-Ausfall-Branch (doppelter Fehlerfall), gleiche Klasse, niedrigere Prio → im Register notiert, nicht mit-gefixt (kein Misch-Commit). volume24h `.limit(5000)` (24h-Trades) bleibt (< 1000 unkritisch).
**AC:** (1) getSystemStats sourced totalBsdCirculation aus get_treasury_stats (kein wallets-Cap-SUM mehr). (2) tsc 0 · platformAdmin-Tests grün. (3) Live: Admin „Scout Total" == Treasury-Tab „circulating" (beide 850.935.524-basiert, konsistent), kein Regress. → schließt D-08.

## Slice 496 — D-39 anon /club Read-Gates (GATE-für-anon, CEO Anil 2026-07-01)
**Problem:** ClubContent läuft für anon (ssrConfirmedAnon-Pfad, ClubContent.tsx:183 rendert durch; PublicClubView = späterer early-return :209) → alle Top-Level-Hooks feuern für anon. 3 davon rufen authed-only RPCs (`anon_exec=false` live-verifiziert) → 401-Kaskade in der öffentlichen Club-Console.
**Fix (GATE, verhaltens-erhaltend — anon sieht ohnehin nichts; spiegelt das Precedent `useClubStanding(user ? clubId : undefined)` ClubContent.tsx:143):**
1. `useClubData.ts:39` — `useClubRecentTrades(clubId,5)` → `useClubRecentTrades(userId ? clubId : undefined, 5)` (`enabled:!!clubId` → false für anon).
2. `useClubData.ts:54` — News-useEffect `if(!clubId)return` → `if(!clubId||!userId)return` + deps `[clubId,userId]`.
3. `ClubContent.tsx:162` — `useEventPlayerPickRates(currentEventId)` → `useEventPlayerPickRates(currentEventId, !!userId)` (Hook hat enabled-Param: `!!eventId && enabled`).
**AC:** (1) anon /club Console **0× 401** für news_teasers/recent_trades/pick_rates (live bescout.net). (2) authed /club: alle 3 feuern weiter (unverändert). (3) tsc 0 · useClubData.test + ClubContent.test grün. → schließt D-39 für /club.

## Slice 495 — anon /club resolveExpiredResearch-Gate

**Problem (Evidence: proof 493 Z.58 live-anon-Console + Live-DB):** `useClubData.ts:43-45` feuert `resolveExpiredResearch()` als fire-and-forget bei JEDEM `/club`-Mount, **ungated** — auch für anon. Live-DB verifiziert: `resolve_expired_research` hat `anon_exec=false` (REVOKE anon, korrekt) → anon-Call scheitert garantiert mit „permission denied for function resolve_expired_research" (401) in der Console der öffentlichen Club-Seite. Zusätzlich: **kein pg_cron** fährt die RPC → der Client-Trigger ist der EINZIGE Auflösungspfad (nicht entfernen).

**Lösung (chirurgisch, 1 Effect):** `if (!userId) return;` + deps `[userId]`. Authed triggert weiter (einziger Pfad bleibt intakt), anon feuert nie (kann's ohnehin nicht). Behavior für authed unverändert; anon-Console-Error weg.

**Scope-Out:** `get_club_news_teasers` (throwt ebenfalls anon permission-denied) = **CEO-Scope** (Produktfrage: soll anon Club-News SEHEN → grant anon, ODER nicht → gate). Separat, P2.

**Smell geparkt (P2):** `resolve_expired_research` als globale Maintenance-Mutation an `/club`-Mount gekoppelt + kein Cron = „lazy-cron"-Anti-Pattern (fragil: keine Auflösung ohne authed Club-Traffic). Proper Fix = pg_cron/Vercel-Cron + Client-Trigger entfernen → eigener Infra-Slice.

**AC:** (1) anon `/club` Console 0× „permission denied … resolve_expired_research" (live bescout.net post-Deploy). (2) authed `/club` triggert `resolve_expired_research` weiter (unverändert). (3) tsc 0 · useClubData.test grün.

## Slice 494 — REVERTED (Live-Walk fing Regress)

**Versuch:** authed /club Hero ins SSR-HTML via user-scoped Club-Prefetch (`ssrUserId`).
**Live-Walk (authed, bescout.net):** React **#425 (Text-Mismatch) + #422 (Hydration-Error)** → der volle authed ClubContent-Baum rendert server-seitig mit leeren Sekundär-Daten (Standings/Events/Trades nicht geprefetcht) → Mismatch. Die anon reduzierte PublicClubView (493) war safe; die authed volle nicht (S472/476-Blast-Radius, live materialisiert).
**Revert:** page.tsx auf 493-Stand. Gründe: echter Hydration-Regress · LCP-Nutzen marginal (authed LCP-Element = below-hero, render-delay 914ms) · /club authed non-core · Fix (alle Sektionen SSR-safe / below-hero-Streaming) = großer Scope, unverhältnismäßig (§1 caution). **anon 493-Win (−43%) bleibt erhalten.**
**Lehre → errors-frontend S494:** reduced-view-SSR ≠ full-view-SSR; großer client-Baum erstmals server-rendern braucht alle Sektionen SSR-safe ODER below-hero-Streaming; Live-Walk beider Auth-Zustände Pflicht.

## Slice 494 — REVERTED (Live-Walk fing Regress)

**Versuch:** authed /club Hero ins SSR-HTML via user-scoped Club-Prefetch (`ssrUserId`).
**Live-Walk (authed, bescout.net):** React **#425 (Text-Mismatch) + #422 (Hydration-Error)** → der volle authed ClubContent-Baum rendert server-seitig mit leeren Sekundär-Daten (Standings/Events/Trades nicht geprefetcht) → Mismatch. Die anon reduzierte PublicClubView (493) war safe; die authed volle nicht (S472/476-Blast-Radius, live materialisiert).
**Revert:** page.tsx auf 493-Stand. Gründe: echter Hydration-Regress · LCP-Nutzen marginal (authed LCP-Element = below-hero, render-delay 914ms) · /club authed non-core · Fix (alle Sektionen SSR-safe / below-hero-Streaming) = großer Scope, unverhältnismäßig (§1 caution). **anon 493-Win (−43%) bleibt erhalten.**
**Lehre → errors-frontend S494:** reduced-view-SSR ≠ full-view-SSR; großer client-Baum erstmals server-rendern braucht alle Sektionen SSR-safe ODER below-hero-Streaming; Live-Walk beider Auth-Zustände Pflicht.

## Offene W6/D-03-Hebel (für CEO/nächste Session)
- **authed /club-SSR bleibt offen** (494 reverted): bräuchte below-hero-Streaming-Refactor (Hero aus SSR, Sektionen client-gated) — größerer Slice, non-core, niedrige Prio.
- Residual anon render-delay 545ms (LCP-Element teil-animation-gebunden).
- P2 pre-existing: anon /club Console-Permission-Errors (`resolve_expired_research`/`get_club_news_teasers`).
- ⏳ CLS-Feld-Check (490/491/492) ~24h (2026-07-02).
