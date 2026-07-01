# Active Slice

```
status: in-progress
slice: 494
title: W6/D-03 Teil 2 — authed /club Hero ins SSR-HTML (user-scoped Club-Prefetch, Finding #3)
size: S
type: SSR (page.tsx)
welle: Mock→Pro W6 / D-03 SSR-Architektur
proof: worklog/proofs/494-club-ssr-authed.txt
review: self-review (minimal user-scoped-Key-Change; Parität DB-verifiziert p_user_id; anon byte-identisch zu 493; 493-R2 hat den authed-Pfad bereits logisch abgedeckt) — Live-Walk = decisive Gate (S472/476 Hydration nur live clearbar)
stage: PROVE (deployed-pending)
```

## Slice 494 — Kurz

**Root-Cause (493-Finding #3, pre-existing 471/472):** eingeloggter /club-SSR bleibt Skeleton — der Club-Prefetch (page.tsx) nutzt **anon-Key** `qk.clubs.bySlug(slug, undefined)` + `p_user_id: null`; der authed Client nutzt `bySlug(slug, userId)` → NICHT hydratet → `clubLoading=true` → `loading=true` → Gate blockt (obwohl authLoading via 472-Seed schon false). → 493-Win nur für Ausgeloggte.

**Fix (minimal):** Club-Prefetch **user-gescopt** — `getServerAuthState` zuerst → `ssrUserId = serverUser?.id ?? null` → Prefetch-Key `bySlug(slug, ssrUserId ?? undefined)` + RPC `p_user_id: ssrUserId`. Für authed matcht der Prefetch jetzt den Client-Key → `loading` false → authed ClubHero (+Stadion-`<Image>`) im SSR-HTML.

**Parität verifiziert:**
- `get_club_by_slug(p_slug, p_user_id)` nutzt `p_user_id`-Param (nicht `auth.uid()`), SECDEF → `supabaseAdmin` + userId == authed-Client. ✓
- `useCachedPlaceholder` (S474-localStorage-#418-Falle) NUR in useWallet/useUserTickets (SSR-gehärtet seit 474), NICHT useClubData. ✓
- players-Prefetch unverändert (public, gleicher Key für alle User).

**Risiko:** erster SSR des VOLLEN authed ClubContent-Baums (S472/476-Blast-Radius) → Live-Walk eingeloggt (Console #418/#422/#425) = decisive proof.

**Anon-Pfad (493) unberührt:** ssrUserId=null → `bySlug(slug, undefined)` + `p_user_id: null` = identisch. ssrConfirmedAnon-Logik unverändert.

## AC
- AC1 tsc 0.
- AC2 anon /club unverändert (LCP + Render, kein Regress vs 493).
- AC3 (Live, authed) /club SSR-HTML enthält Stadion-`<img>` (nicht Skeleton) → LCP < authed-Baseline; Console eingeloggt kein #418/#422/#425.
- AC4 (Live) authed /club voll korrekt (Follow-Button, Sektionen), kein Cross-User-Leak (2-Account).

## Stage-Chain: SPEC(inline) → BUILD → REVIEW(cold-context authed-SSR) → PROVE(tsc+Live-Walk aus+eingeloggt) → LOG
