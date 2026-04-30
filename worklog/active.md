# Active Slice

```
status: active
slice: 267
stage: emergency
spec: emergency-fix (Beta-Day-3 Anil-Live-Report Map-Persist-Crash)
impact: skipped (2 Files, defensive Pattern)
proof: emergency (tsc clean + 50/50 vitest grün — Console-Error-Match in Commit)
review: self-review (Slice-261-Bug-Klasse, defensive Pattern, kein Money-Path)
```

## Slice 267 EMERGENCY — Map-Persist-Korruption Heal

Spieltag + Manager broken durch Map-typed query-data via Persist-Cache zu `{}` korrumpiert. 4-Layer-Fix: Layer-4-Filter in Persist + Defensive Reconstruction in useFixtureDeadlines + Buster-Bump v1→v2-slice267 (verwirft existierende korrupte Caches automatisch).
