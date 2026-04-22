# Slice 152 Money-Path Smoke-Test

**Datum:** 2026-04-22T21:30:57.967Z
**Target:** https://www.bescout.net
**User:** jarvis-qa@bescout.net

## Balance-Konsistenz quer durch Pages

| Page | TopBar Balance | Timestamp |
|------|----------------|-----------|
| /home | (not found) | 21:30:40 |
| /market | 7.220,77 | 21:30:43 |
| /profile | 7.220,77 | 21:30:45 |
| /player/2f3442ea-a9f3-4cf3-aa90-267b78e326ca | 7.220,77 | 21:30:51 |
| /home (return) | (not found) | 21:30:57 |

**Unique Balance-Werte:** 1 (7.220,77)
**Konsistent:** ✅ JA

## Console-Errors

**Count:** 9

```
Failed to fetch RSC payload for https://www.bescout.net/rankings. Falling back to browser navigation. TypeError: Failed to fetch (www.bescout.net)
    at https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:6:36703
    at f (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:46646)
    at https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:60198
    at Object.i [as task] (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:32994)
    at l.c (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:33699)
    at l.enqueue (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:33124)
    at c (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:60161)
    at u (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:59701)
    at s (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:66525)
    at f (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:76442)
    at Object.action (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:2:10483)
    at l (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:2:9611)
    at u (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:2:9295)
    at l (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:2:9710)
Failed to fetch RSC payload for https://www.bescout.net/missions. Falling back to browser navigation. TypeError: Failed to fetch (www.bescout.net)
    at https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:6:36703
    at f (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:46646)
    at https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:60198
    at Object.i [as task] (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:32994)
    at l.c (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:33699)
    at l.enqueue (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:33124)
    at c (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:60161)
    at u (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:59701)
    at s (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:66525)
    at f (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:76442)
    at Object.action (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:2:10483)
    at l (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:2:9611)
    at u (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:2:9295)
    at l (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:2:9710)
Failed to fetch RSC payload for https://www.bescout.net/market. Falling back to browser navigation. TypeError: Failed to fetch (www.bescout.net)
    at https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:6:36703
    at f (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:46646)
    at https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:60198
    at Object.i [as task] (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:32994)
    at l.c (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:33699)
    at l.enqueue (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:33124)
    at c (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:60161)
    at u (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:59701)
    at s (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:66525)
    at f (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:76442)
    at Object.action (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:2:10483)
    at l (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:2:9611)
    at u (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:2:9295)
    at l (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:2:9710)
Failed to fetch RSC payload for https://www.bescout.net/manager. Falling back to browser navigation. TypeError: Failed to fetch (www.bescout.net)
    at https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:6:36703
    at f (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:46646)
    at https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:60198
    at Object.i [as task] (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:32994)
    at l.c (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:33699)
    at l.enqueue (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:33124)
    at c (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:60161)
    at u (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:59701)
    at s (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:66525)
    at f (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:76442)
    at Object.action (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:2:10483)
    at l (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:2:9611)
    at u (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:2:9295)
    at l (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:2:9710)
Failed to fetch RSC payload for https://www.bescout.net/fantasy. Falling back to browser navigation. TypeError: Failed to fetch (www.bescout.net)
    at https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:6:36703
    at f (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:46646)
    at https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:60198
    at Object.i [as task] (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:32994)
    at l.c (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:33699)
    at l.enqueue (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:33124)
    at c (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:60161)
    at u (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:59701)
    at s (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:66525)
    at f (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:1:76442)
    at Object.action (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:2:10483)
    at l (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:2:9611)
    at u (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:2:9295)
    at l (https://www.bescout.net/_next/static/chunks/2646-296b34e218ed4281.js:2:9710)
[AppLayout] Welcome bonus claim failed: Error: TypeError: Failed to fetch (skzjfhvgccaeplydsunz.supabase.co)
    at tp (https://www.bescout.net/_next/static/chunks/app/(app)/layout-fd5e529b6ecd74f6.js:1:70417)
[useNotificationRealtime] fetch failed: Error: TypeError: Failed to fetch (skzjfhvgccaeplydsunz.supabase.co)
    at d (https://www.bescout.net/_next/static/chunks/app/(app)/layout-fd5e529b6ecd74f6.js:1:87927)
    at async Promise.all (index 1)
    at async https://www.bescout.net/_next/static/chunks/app/(app)/layout-fd5e529b6ecd74f6.js:1:46387
Failed to load resource: the server responded with a status of 404 ()
Failed to load resource: the server responded with a status of 404 ()
```

## Screenshots

- /home: `152-home-balance.png`
- /market: `152-market-balance.png`
- /profile: `152-profile-balance.png`
- /player/[id]: `152-player-balance.png`
- BuyModal: `152-buymodal-fresh.png`

## Verdict

- Balance-Konsistenz: PASS
- Console-Errors: 9 errors (siehe oben)
- Overall: ⚠ REVIEW
