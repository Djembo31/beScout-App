# Active Slice

```
status: active
slice: 261
stage: PROVE
spec: worklog/specs/261-tanstack-persist-cache.md
impact: skipped (3 Files, kein src/lib/services, kein RPC, kein Schema)
proof: worklog/proofs/261-ac-audit.txt
review: worklog/reviews/261-review.md (CONCERNS-mergeable → PASS post P1+P3 inline-Heal)
```

## Slice 261 P2 (Beta-Day-2 Final): TanStack Query Persist-Cache. Anil-Direktive autonom + "Kapitel zuhaben". Smoking-Gun #6 vom Slice 259/260 Deep-Dive. persistQueryClient + createSyncStoragePersister mit localStorage Key `BESCOUT_QUERY_CACHE_v1`. Defensive 3-Layer Allowlist: USER_SCOPED-domain-deny + UUID-regex-deny + status-success-only. Cascading via Slice 260 queryClient.clear() bei User-Switch. Anil PARALLEL an Home → KEIN Touch an `src/app/layout.tsx` / `page.tsx` / `(app)/layout.tsx`. Slice 262 (Middleware Public-Route-Bail-Out) folgt nahtlos.

## Zuletzt

- **Slice 260** (2026-04-30) — Auth-Hydrate Hardening (sessionStorage→localStorage + idle-callback)
- **Slice 259** (2026-04-30) — EMERGENCY P0 SW Cache-Pollution Heal
- **Slice 258** (2026-04-29) — EMERGENCY P0 Signup-Trigger-Bug 13-Tage-latent gefixt
