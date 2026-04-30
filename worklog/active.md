# Active Slice

```
status: active
slice: 259
stage: PROVE
spec: worklog/specs/259-sw-cache-pollution-heal.md
impact: skipped (1 file public/, kein src/lib/services, kein RPC, kein Schema)
proof: worklog/proofs/259-ac-audit.txt
review: worklog/reviews/259-review.md (PASS, 2× P3 healed inline)
```

## Slice 259 EMERGENCY P0 (Beta-Day-2): Service Worker Cache-Pollution Heal. Anil-Direktive: "saubere 100%tige Leistung, keine Reste, autonom". Root-Cause-Deep-Dive identifizierte SW Supabase-REST-Caching ohne JWT-Awareness als Smoking-Gun #1 für "First-Load-broken, Refresh-fixt"-Symptom. Fix: SW REST-Cache komplett raus, `bescout-v3 → bescout-v4` cache-bump, activate-handler löscht alle alten Caches inkl. `bescout-api-v1`. Kein Touch an Push-Handler / Static-Asset-Cache / Offline-Fallback. P1 (AuthProvider) als Slice 260 nahtlos wenn 3rd Tester noch nicht da. P2 (TanStack persist + Server-Hydrate) post-Beta wegen RootLayout-Risk.

## Zuletzt

- **Slice 258** (2026-04-29) — EMERGENCY P0 Signup-Trigger-Bug 13-Tage-latent gefixt
- **Slice 257** (2026-04-29) — Hardening-Bundle (F-4 + F-8 + D60-Hook)
- **Slice 256** (2026-04-29) — StalePipelineBanner Cron-Health UI-Sentinel
