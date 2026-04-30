# Active Slice

```
status: active
slice: 263
stage: PROVE
proof: worklog/proofs/263-ac-audit.txt
spec: inline (P0-Emergency, Beta-User-Live-Bug)
impact: skipped (1 File AuthProvider.tsx — value-tuning)
proof: pending
review: self-review D35 (XS Emergency timeout-tuning)
```

## Slice 263 EMERGENCY P0: Mobile-Safari iPhone loadProfile-Timeout. 3rd Tester (cloud/f3267e0d) auf iOS 18.7 sieht 13s+ Skeleton-Cascade weil getAuthState in Mobile Safari NICHT durchgeht (Sentry-Breadcrumbs zeigen den RPC-Request gar nicht — Promise hängt SDK-intern). Slice 193 hatte Timeout 10s→3s reduziert mit Begründung "RPC ~150ms server-time" — gilt nicht für Mobile-Safari-Initial-State (post-login SDK-warm-up + Cookie-Roundtrip). Fix: Timeouts moderate erhöhen + safety-timer großzügiger. AuthGuard-Architektur-Refactor (Smoking-Gun #3) als Slice 264 nahtlos.
