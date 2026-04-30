# Active Slice

```
status: active
slice: 261
stage: REVIEW PASS — ready for Commit+Push (P2-1 inline-gefixt, tsc clean re-verified)
spec: worklog/specs/261-gameweek-status-bar.md (v2.1)
impact: skipped (1 neue Component, 3 edits, 2 i18n, kein Service-Layer, kein Schema, kein Money-Path)
proof: worklog/proofs/261-self-verification.txt
review: Pre-Review-1st REWORK → v2 → Pre-Review-2nd CONCERNS → v2.1 → Code-Review POST-BUILD PASS (worklog/reviews/261-code-review.md, P2-1 fixed inline)
anil-decisions: A=b (2d 4h beide Locales), B=b (Bar ersetzt Spotlight-Event, Sidebar bleibt), C=ja (TR Hafta 28)
```

## Slice 261 — Home Layer 0: Gameweek-Status-Bar

**Phase 1 Identity-Foundation** des Home-Ultimate-Redesign-Plans (Anil-approved 2026-04-30, kontextueller Hero). Erste sichtbare Foundation: persistente GW-Awareness + Liga-Kontext + Deadline-Countdown above-the-fold. Größter Single-Win für FM-Power-User, 0 Compliance-Risk.

**Größe:** S (S-Voll-Pflicht 13 Sektionen Spec) · **Slice-Type:** UI

**Stage-Chain (geplant):**
- SPEC ✓ (jetzt geschrieben, Anil-Approval pending)
- Spec-Reviewer-VOR-BUILD (D62 Pattern aus Slice 268) — Cold-Context-Audit der Spec auf Anti-Patterns + Edge-Case-Completeness
- IMPACT skipped (Begründung in Spec Sektion 12)
- BUILD solo (kein parallel-dispatch nötig bei S-Size)
- REVIEW Code-Reviewer-Agent (D13, post-BUILD)
- PROVE Mobile-Screenshot bescout.net + AC-09 Liga-Switch-Demo + DE+TR-Verify
- LOG

**Open-Questions die Anil VOR BUILD klären sollte:**
1. Liga-Klick → `/fantasy` oder `/fantasy/spieltag` (Code-Reading klärt)
2. DE-Wording: „Spieltag 28" vs „GW28" (Default: „Spieltag 28")
3. **TR-Wording: „Hafta 28" vs alternative** (Anil-Pflicht, business.md-konform)

**Scope-Out (Phase 2-5 Slices):**
- Liga-Rang-Pill → Slice 263
- Stadium-Photo-BG → Slice 270 Phase 5
- Captain-Action-Required → Slice 264 Phase 2
- Realtime-Status-Channel → Phase 3

## Beta-Day-3 Status

Slice 268 (Cold-Start Cache-Mirror Wallet+Tickets) live + 5-Step-Verify durch Anil bestanden 2026-05-01. Beta-Day-3 ready für 3rd Tester. Slice 261 ist Beta-Day-3+ Polish.
