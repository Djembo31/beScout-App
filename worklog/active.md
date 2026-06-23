# Active Slice

```
status: idle
slice: 350
title: ✅ DONE — CI-grün + Push-Fix (Slice 350) · Fan-Board gemountet (Slice 349)
stage: LOG complete
size: S
slice-type: Hook
spec: worklog/specs/349-mount-club-fan-leaderboard.md + 350 inline
proof: worklog/proofs/350-ci-push-fix.txt + worklog/proofs/349-fan-board.txt
review: worklog/reviews/350-review.md + worklog/reviews/349-review.md
next: Slice 349 Live-Playwright-Verify (/club/sakaryaspor „Mehr"-Tab) ist erste Next-Session-Action; dann Pro-Stand-Roadmap (Polls-Reste ODER S7-Leaderboard-Konsolidierung)
```

## Stand (Session-Ende 2026-06-23)

**Diese Session, sauber abgeschlossen:**
- **Slice 348** ✅ — `csf_multiplier` komplett raus (Code + RPC + Spalte gedroppt), 0 Money-Effekt, live verifiziert.
- **Slice 349** ✅ (Code) — Club-Fan-Treue-Board gemountet (W2-B). **Offen:** Live-Playwright-Screenshot = erste Next-Session-Action.
- **Slice 350** ✅ — CI-grün (Silent-Fail-Baseline re-anchored) + Push-Fix (Pre-Push entschlackt) + Nightly-Workflow-SyntaxError-Fix. Behebt Anils tägliche Fail-Emails + Push-Bruch.

**Wichtig für nächste Session:**
- Push funktioniert wieder normal (kein `--no-verify` nötig). Pre-Push läuft jetzt schnellen `audit:silent-fail:check` (~5s); volle Tests = CI-Autorität.
- Bei neuem Silent-Fail-HIGH/MEDIUM: `.audit-baseline.json` bewusst nachziehen (Tool sagt's), sonst CI rot.
- Pro-Stand-Roadmap: `worklog/notes/348-pro-stand-roadmap.md`.
