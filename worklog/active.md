# Active Slice

```
status: idle
slice: 497
title: D-08 — getSystemStats „Scout Total" aus kanonischer Treasury-RPC (gecappten Client-SUM killen)
size: S
type: Service
welle: Mock→Pro Money-Konsolidierung (D-08, §0-Subtraktion, CEO Anil endorsed)
proof: worklog/proofs/497-d08-scout-total-uncapped.txt
review: self-review (§3 Money, aber display-only/read; Semantik-Parität DB-bewiesen, keine Mutation)
stage: LOG (DONE — live: Admin „Scout Total" 8.509.355,24 aus get_treasury_stats, Console clean, D-08 zu)
```

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
