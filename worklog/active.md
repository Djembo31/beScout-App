# Active Slice

```
status: active
slice: 264
stage: PROVE
spec: inline (Slice 263 follow-up — Smoking-Gun #3)
impact: skipped (1 File AuthGuard.tsx — Block-Removal, Components bereits null-safe)
proof: worklog/proofs/264-ac-audit.txt
review: self-review D35 (XS architectural-soft-fix)
```

## Slice 264 P0 (Beta-Day-2 final-fix): AuthGuard Architektur-Refactor — Smoking-Gun #3 endlich. AuthGuard blockierte children mit ContentSkeleton während `profileLoading=true` — User sieht 5-13s Wasserfall. Components nutzen profile bereits null-safe (audit: `profile?.favorite_club_id ?? null` etc.) → AuthGuard kann children rendern sobald `user` cached ist, profileLoading muss kein Block mehr sein. Slice 263's Timeout-Bump heilt Sentry-Cascade, Slice 264 heilt das User-Wahrnehmungs-Problem.
