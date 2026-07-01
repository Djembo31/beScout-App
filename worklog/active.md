# Active Slice

```
status: in-progress
slice: 493
title: W6/D-03 — /club Hero ins SSR-HTML (authLoading-Decouple für bestätigt-anon + players-Prefetch)
size: M
type: Service + SSR
welle: Mock→Pro W6 / D-03 SSR-Architektur
proof: worklog/proofs/493-club-ssr-players-prefetch.txt
review: worklog/reviews/493-review.md (R1 REWORK → korrigiert → R2 PASS, bedingt: Live-Walk = echter Done-Gate)
stage: PROVE (deployed-pending: Live-Walk aus+eingeloggt)
```

## Slice 493 — Kurz

Spec: `worklog/specs/493-club-ssr-players-prefetch.md`.

**Root-Cause (gemessen + R1-korrigiert):** `/club` LCP 2226ms, render-delay 1486ms (67%). SSR-Gate `ClubContent:178` = `if (authLoading || loading)`. **BEIDE Terme gaten:** `loading` (club+players — page.tsx 471 prefetcht nur club) UND `authLoading` (= `AuthProvider:172 initialUser==null`, für Ausgeloggte im SSR **true**, 472-Design). curl aktuelle prod (ausgeloggt): Skeleton, kein `<img stadium>` im SSR-HTML.

**Fix (Anils Option 1 literal — 2 Teile, beide nötig):**
1. `players` mitprefetchen (page.tsx, `getPlayersByClubId(...,supabaseAdmin)` DI/SSOT) → `loading`-Term false.
2. `getServerAuthState` (neu, `cache()`-dedupt mit layout, `{user,resolved}`) → `ssrConfirmedAnon = resolved && user===null` → ClubContent-Gate `(authLoading && !ssrConfirmedAnon) || loading` → authLoading-Term für server-bestätigt-anon bypassed → PublicClubView (+ClubHero+Stadion-`<Image>`) im SSR-HTML. `resolved` schützt vor Fehl-anon bei getUser-Fehler (kein #418-Swap).

**Geparkt (R-Finding #3, pre-existing 471/472):** eingeloggter /club-SSR bleibt Skeleton (Club-Prefetch anon-Key `undefined` ≠ authed `userId`) → separater Slice. Ziel-Pfad = ausgeloggt.

**PROVE:** tsc 0 ✓ · R2 PASS ✓ · **PENDING Live-Walk (bescout.net post-Deploy):** curl SSR-HTML enthält `<img stadium>` + chrome-devtools LCP (2226→?) + Console aus+eingeloggt (#418/#422/#425/MISSING_MESSAGE) + authed = kein PublicClubView-Leak + Row-Parität Player-Count.

## Stage-Chain: SPEC → IMPACT(inline) → BUILD → REVIEW(R1 REWORK→R2 PASS) → PROVE(tsc+Live-Walk) → LOG
