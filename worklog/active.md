# Active Slice

```
status: idle
slice: 493
title: W6/D-03 — /club Hero ins SSR-HTML (authLoading-Decouple + players-Prefetch)
size: M
type: Service + SSR
welle: Mock→Pro W6 / D-03 SSR-Architektur
proof: worklog/proofs/493-club-ssr-players-prefetch.txt
review: worklog/reviews/493-review.md (R1 REWORK → R2 PASS)
stage: DONE — anon /club LCP 2226→1269ms (−43%), Hydration sauber, authed 0 Regress
```

## Slice 493 — DONE (SUCCESS)

**Ergebnis (Live bescout.net, ausgeloggt sauber):** LCP **2226 → 1269 ms (−43%)** · render-delay 1486→545ms · CLS 0,04 · Hydration sauber (kein #418/#422/#425/MISSING_MESSAGE) · authed /club voll korrekt (kein PublicClubView-Leak). Proof `493-...txt`, Review `493-review.md`.

**Fix:** `authLoading`-Gate-Term für server-bestätigt-anon (`getServerAuthState`→`{user,resolved}`→`ssrConfirmedAnon`) entkoppelt + `players`-Prefetch (DI) → PublicClubView+ClubHero+Stadion-`<Image>` im SSR-HTML statt Skeleton.

## Nächste Hebel (offen, NICHT 493 — für CEO/nächste Session)
- **Option 2 (Backdrop server-rendern) = REDUNDANT** — Option 1 hat das Bild ins SSR gebracht.
- **Eingeloggter /club-SSR bleibt Skeleton** (Finding #3, pre-existing 471/472): Club-Prefetch nutzt anon-Key `bySlug(slug,undefined)`, authed Client `bySlug(slug,userId)` → clubLoading true → Skeleton. Fix = user-gescopter Club-Prefetch (page.tsx kennt user via getServerAuthState). Separater W6-Slice.
- **Residual render-delay 545ms** (anon): LCP-Element noch teil-hydration/animation-gebunden.
- **P2 pre-existing:** anon /club Console-Errors (`resolve_expired_research`/`get_club_news_teasers` permission denied + 401) — anon triggert auth-gated useClubData-Queries ohne anon-Grant/`enabled:!!user`.
- **⏳ CLS-Feld-Check (490/491/492) ~24h** (2026-07-02): Sentry p75 CLS re-queryn.
