# Active Slice

```
status: in-progress
slice: 393
title: E-3 Regel-Rejects regel-spezifisch (9 Validator-Codes → eigene DE/TR-Toast-Meldung)
size: S
stage: BUILD
spec: worklog/specs/393-lineup-rule-reject-messages.md
impact: inline (additive — 9 Codes in KNOWN_KEYS-Allowlist + 9 DE/TR Strings im errors-Namespace; kein Money, kein RPC-Change)
proof: worklog/proofs/393-reject-messages.txt
review: worklog/reviews/393-review.md
prev: 392 DONE (E-3-Regelsatz komplett). Fund aus gebündeltem Playwright: Reject-Toasts fielen auf 'generic'.
ac-ui: statischer Node-Check (9 Codes resolven DE+TR, nicht mehr generic) + tsc + errorMessages-Test
```

## Zuletzt

- **Slice 393** (2026-06-26) — Reject-Hinweise der 5 E-3-Regeln regel-spezifisch (vorher generic). Fund aus E-3-Bündel-Playwright. IN ARBEIT.
- **Slice 392** (2026-06-26) — E-3 nation_in + max_per_nation. DONE. **Gebündelter Playwright erledigt** (`worklog/proofs/e3-bundle-playwright-verify.md`): Builder beide PASS Mobile 393px; 2 Funde → 393 (Reject-Texte) + AuthProvider-Check offen.
- **Slice 391** (2026-06-26) — nationality_iso generierte Spalte. DONE.

Nächstes: Fund 2 (AuthProvider Profile-Load untersuchen), dann Session-Close.
```
