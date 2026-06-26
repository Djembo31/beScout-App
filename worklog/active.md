# Active Slice

```
status: in-progress
slice: 394
title: AuthProvider Profile-Load-Failure observability — Sentry-Capture statt console-only
size: XS
stage: BUILD
spec: worklog/specs/394-authprovider-observability.md
impact: inline (additive — 1 captureMessage am finalen Failure-Pfad; KEINE Auth/RLS-Logik-Änderung)
proof: worklog/proofs/394-observability.txt
review: worklog/reviews/394-review.md
prev: 393 DONE. Fund 2 aus E-3-Bündel-Playwright: 7× "[AuthProvider] Profile load failed after retry" — console-only, Sentry blind.
diagnose: get_auth_state(ali)=62ms gesund, ali-Profil valide → bekannte JWT-Hydration-Race (Cookie-Resume, Code-dokumentiert), graceful Fallback via LS-Cache. KEIN Daten-Defekt, NICHT ali-spezifisch. Auth-Logik bewusst NICHT angefasst (money-nah, caution over speed) — erst messbar machen.
ac: tsc clean + captureMessage am Failure-Pfad + Reviewer
```

## Zuletzt

- **Slice 394** (2026-06-26) — AuthProvider Failure-Pfad nach Sentry instrumentiert (war console-only → Observability-Lücke). Fund 2 aus E-3-Bündel. IN ARBEIT.
- **Slice 393** (2026-06-26) — E-3 Regel-Rejects regel-spezifisch (9 Codes DE/TR). DONE (`2fbc4ab6`), Reviewer PASS.
- **Slice 392** (2026-06-26) — E-3 nation_in + max_per_nation. DONE. Gebündelter Playwright erledigt.

Nächstes: Session-Close (beide Funde erledigt).
```
