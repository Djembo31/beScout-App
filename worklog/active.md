# Active Slice

```
status: in-progress
slice: 496
title: D-39 — anon /club: 3 authed-only Read-RPCs für Ausgeloggte gaten (GATE, CEO Anil gewählt)
size: XS
type: UI (Hook)
welle: Mock→Pro W6 / D-03 (D-39, direkte Fortsetzung 495)
proof: worklog/proofs/496-anon-club-read-gates.txt
review: self-review (XS, gleiches enabled:!!userId-Gate-Pattern wie 495 + Zeile-143-Precedent im selben File)
stage: BUILD
```

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
