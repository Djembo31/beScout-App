# Slice 251 — Reviewer Index

Slice 251 läuft in mehreren Waves. Wave-spezifische Review-Dateien:

| Wave | Track | Reviewer-File | Verdict |
|------|-------|---------------|---------|
| 1 | A (Migration + Cron Dual-Write + Service-Rewrite + Bridge) | [251-wave-1-review.md](./251-wave-1-review.md) | PASS with CONCERNS (Bridge ✓ gefixt, Pattern ✓ promoted) |
| 1 | A (Pre-Review-Memo) | [251-wave-1-pre-review.md](./251-wave-1-pre-review.md) | self-audit by backend-agent |
| 2 | B (Service Layer) ‖ F (Wildcards Composite-PK) | TBD | TBD |
| 2.5 | Pre-Wave-3-Probe | TBD | TBD |
| 3 | C (Store-Consumers useLeagueScope) | TBD | TBD |
| 4 | D (Topspiel) ‖ E (Lineup-Eligibility) | TBD | TBD |
| 5 | G (PlayerPicker-Filter) | TBD | TBD |

**Wave 1 Self-Review-Note (Recovery, 2026-04-28):**

Recovery in dieser Session — Original-Wave-1 BUILD ging in Session-Transition verloren (uncommitted, git-checkout-Side-Effect). Re-Implementation aus `251-wave-1-pre-review.md` + `251-wave-1-review.md` + Read-Tool-Cache. DB-Migration war bereits applied (irreversibel) → Code matcht den DB-Stand.

Zusatz-Verdict für Recovery:
- Pattern-Promotion 4-Layer in `common-errors.md` §0 ✅
- 92/92 Tests grün, tsc clean ✅
- Bridge in FantasyContent.tsx:85 ✅ (Reviewer F-1)
- Hardcode `<= 38` an 2 Stellen ersetzt ✅ (AC-30 grep clean)
- Dual-Write in advance_gameweek atomar im selben runStep ✅ (Reviewer F-4 P3 deferred)

Recovery-Pattern selbst codifiziert als Layer 4 (Self-Recovery via patch-extract + checkout + apply).
