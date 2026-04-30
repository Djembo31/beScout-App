# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
review: —
```

## Slice 264 KOMPLETT (P0): AuthGuard Architektur-Refactor — Smoking-Gun #3 fix. Pre-264 hard-block `if (loading || profileLoading)` aufgesplittet in 3 separate guards. profileLoading falls through → children rendern instant wenn user da ist (Components null-safe). Provider-Tests 25/25, Test 'shows skeleton while profileLoading' invertiert zu 'renders children'. Commit `9c972862`.

## Beta-Day-2 Auth/Cache-Initialisierungs-Story FERTIG

Alle 7 Smoking-Guns aus Deep-Dive adressiert:
- **#1** SW Cache-Pollution (Slice 259 P0)
- **#2** Auth-Hydration-Race (Slice 260 P1)
- **#3** Sequential Loading-Cascade (Slice 264 P0)
- **#4** Middleware getUser auf jedem Request (Slice 262 P3)
- **#5** sessionStorage statt localStorage (Slice 260 P1)
- **#6** TanStack Query ohne Persist (Slice 261 P2)
- **#7** Welcome-Bonus + ActivityLog auf Mount (Slice 260 P1)

Plus **Slice 263** Mobile-Safari Timeout-Bump (3rd Tester iPhone iOS 18.7 Live-User-Bug).
