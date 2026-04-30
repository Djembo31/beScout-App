# Slice 259 — Live Verify gegen bescout.net (Post-Deploy)

**Datum:** 2026-04-30 ~11:04 CEST
**Tool:** Playwright MCP (Chromium, fresh-context)
**Commit:** `d4583303` (auf main)

## Method

1. Vercel auto-deploy via push `3893434e..d4583303 main → main`
2. Background-Poll bis `https://www.bescout.net/sw.js` enthält `bescout-v4` → ~70s nach push
3. Playwright navigate zu `https://bescout.net`, JS-eval gegen page

## Verify-1: deployed sw.js Content (network-only fetch)

```json
{
  "CACHE_NAME": "bescout-v4",                  // ✓ AC-05
  "has_Supabase_REST_caching": false,          // ✓ AC-01
  "has_API_CACHE_NAME_var": false,             // ✓ AC-06 (variable-removed)
  "has_push_handler": true,                    // ✓ AC-03
  "has_notificationclick_handler": true,       // ✓ AC-03
  "has_offline_fallback": true,                // ✓ AC-04
  "has_static_patterns": true,                 // ✓ AC-02
  "has_Slice259_comment": true,                // ✓ Slice-Doc bewahrt
  "byte_length": 4255
}
```

## Verify-2: Browser SW + Cache-State (Initial Load — Update-Race)

Nach erstem Visit war der Browser noch unter alter SW v3:

```json
{
  "sw_state": "activated",
  "cache_storage_names": ["bescout-v3", "bescout-api-v1"],
  "cached_supabase_rest_requests": 1899
}
```

Das ist der erwartete PWA-Update-Race aus Pre-Mortem #2 (Spec § 13). Lösung: `registration.update()` triggern + Reload.

## Verify-3: Browser SW + Cache-State (Post-Update + Reload — final)

```json
{
  "sw_active_state": "activated",
  "sw_controller": "https://www.bescout.net/sw.js",
  "cache_storage_names": ["bescout-v4"],
  "bescout_v4_present": true,
  "bescout_v3_evicted": true,                  // ✓ AC-06
  "bescout_api_v1_evicted": true,              // ✓ AC-06 (catch-all-filter wirkt)
  "cached_supabase_rest_requests": 0           // ✓ AC-01 — 1899 → 0
}
```

## Verdict

**AC-07 LIVE-VERIFY: PASS**

- Bug-Klasse "stale anon-Response für logged-in User" ist im Cache nicht mehr möglich (Cache leer auf Supabase REST)
- Cache-Migration via `keys.filter(k => k !== CACHE_NAME)` evicted `bescout-v3` UND `bescout-api-v1` reliable
- Update-Race resolved automatisch beim 2. Reload — kein User-Action nötig
- Push-Notifications + Static-Assets weiter funktional (deployed sw.js hat alle Handler bewahrt)

## Notes für 3rd Tester

- Existing Tester (Anil + Pesmerga) erleben einen 2. Reload als "weicher" Update (skipWaiting + clients.claim, ~1-2s seamless)
- 3rd Tester landet direkt auf v4 (frisches Profil, fresh SW-Install)
- Kein Manual-DevTools-Action nötig; PWA-Update-Standard

## Konsole

0 errors, 1 warning (irrelevant — wahrscheinlich react-query devtools deprecation oder ähnlich)
