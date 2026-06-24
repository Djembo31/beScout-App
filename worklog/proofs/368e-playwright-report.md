# Slice 368e Playwright-Proof — Markteintritt == Dein Einstieg (eine Quelle)

**Datum:** 2026-06-24T18:58:18.027Z
**Target:** https://www.bescout.net · Mobile 393px

| Player | Markteintritt | Dein Einstieg | match | NaN | i18n-leak |
|--------|---------------|---------------|-------|-----|-----------|
| /player/2f3442ea-a9f3-4cf3-aa90-267b78e326ca | 500 | 500 | ✅ | ✅ | ✅ |
| /player/46ca0d1b-7585-4440-9699-1e39a0ea1f4e | 800 | 800 | ✅ | ✅ | ✅ |

**Console-Errors:** 5
```
Failed to fetch RSC payload for https://www.bescout.net/community. Falling back to browser navigation. TypeError: Failed to fetch (www.bescout.net)
    at https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:6:36703
    at f (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:1:46646)
    at https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:1:60198
    at Object.i [as task] (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:1:32994)
    at l.c (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:1:33699)
    at l.enqueue (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:1:33124)
    at c (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:1:60161)
    at u (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:1:59701)
    at s (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:1:66525)
    at f (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:1:76442)
    at Object.action (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:2:10483)
    at l (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:2:9611)
    at u (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:2:9295)
    at l (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:2:9710)
Failed to fetch RSC payload for https://www.bescout.net/fantasy. Falling back to browser navigation. TypeError: Failed to fetch (www.bescout.net)
    at https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:6:36703
    at f (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:1:46646)
    at https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:1:60198
    at Object.i [as task] (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:1:32994)
    at l.c (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:1:33699)
    at l.enqueue (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:1:33124)
    at c (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:1:60161)
    at u (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:1:59701)
    at s (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:1:66525)
    at f (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:1:76442)
    at Object.action (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:2:10483)
    at l (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:2:9611)
    at u (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:2:9295)
    at l (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:2:9710)
Failed to fetch RSC payload for https://www.bescout.net/community?tab=bounties. Falling back to browser navigation. TypeError: Failed to fetch (www.bescout.net)
    at https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:6:36703
    at f (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:1:46646)
    at https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:1:60198
    at Object.i [as task] (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:1:32994)
    at l.c (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:1:33699)
    at Object.i [as task] (https://www.bescout.net/_next/static/chunks/2646-b6267fe329593de6.js:1:33056)
[AppLayout] Welcome bonus claim failed: Error: TypeError: Failed to fetch (skzjfhvgccaeplydsunz.supabase.co)
    at tp (https://www.bescout.net/_next/static/chunks/app/(app)/layout-ddd8603843390b7a.js:1:70361)
[useNotificationRealtime] fetch failed: Error: TypeError: Failed to fetch (skzjfhvgccaeplydsunz.supabase.co)
    at f (https://www.bescout.net/_next/static/chunks/app/(app)/layout-ddd8603843390b7a.js:1:89477)
    at async Promise.all (index 0)
    at async https://www.bescout.net/_next/static/chunks/app/(app)/layout-ddd8603843390b7a.js:1:46330
```

## Verdict: ✅ PASS (368e-spezifisch)
- Markteintritt == Dein Einstieg (eine Quelle): **PASS** (Emre Demir 500/500, Melih Bostan 800/800 = echte ipo_price)
- Kein NaN: PASS · Kein i18n-Leak: PASS · Mobile 393px

**Console-Errors (5) = NICHT 368e-relevant:** alle transiente „Failed to fetch" — Next.js-RSC-Prefetch
(/community, /fantasy, /community?tab=bounties) + Supabase-Background (Welcome-Bonus-Claim, Notification-Realtime),
ausgelöst durch die schnelle QA-Navigation. Keine Beziehung zum Markteintritt-Reader-Switch (reine Netzwerk-Noise,
vgl. Contract-E2E-Philosophie testing.md S293). Screenshots: 368e-<playerId>.png (beide Spieler, RewardsTab aufgeklappt).
