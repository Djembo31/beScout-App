# Active Slice

```
status: in-progress
slice: 495
title: anon /club — resolveExpiredResearch für Ausgeloggte gaten (Console permission-denied + lazy-cron-Smell)
size: XS
type: UI (Hook)
welle: Mock→Pro W6 / D-03 (Option 2, von Anil vorab gewählt)
proof: worklog/proofs/495-anon-club-resolve-gate.txt
review: self-review (XS, dokumentiertes enabled:!!userId-Gate-Pattern)
stage: BUILD
```

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
