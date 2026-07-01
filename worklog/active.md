# Active Slice

```
status: idle
slice: 494
title: W6/D-03 Teil 2 — authed /club SSR (VERSUCHT → REVERTED: #425/#422 Hydration-Regress)
size: S
type: SSR (page.tsx)
welle: Mock→Pro W6 / D-03 SSR-Architektur
proof: worklog/proofs/494-club-ssr-authed.txt
review: self-review + Live-Walk (der den Regress fing)
stage: REVERTED (Live-Walk fing #425/#422 auf authed → zurückgerollt; anon 493-Win erhalten)
```

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
