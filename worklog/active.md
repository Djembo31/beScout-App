# Active Slice

```
status: active
slice: 079
stage: BUILD (Pass 1 committed, Verify pending)
spec: worklog/specs/079-home-polish.md
impact: skipped (UI-Polish + 1 Seed-Migration)
proof: worklog/proofs/079-baseline/* + 079-home-findings.md
started: 2026-04-19 late
```

## Slice 079 Pass 1 — DONE (Commit 907a417f)
- F1 Hero-Label-Klarheit + Balance-Pill ✅
- F2 Mission-Titles disambiguiert (daily vs weekly) ✅
- F5 LastGameweekWidget Empty-Slots Polish ✅

## Pending Pass 2 (nach Deploy-Verify)
- F7 Meistbeobachtet min-3 Empty-State
- F8 Meine Vereine Hierarchy
- F12 Event-Banner Rewards-Pool=0 Empty-State

## Deferred
- F3 Activity-Feed Dedup → Phase 3 (Social)
- F4 RPC Timeouts → separater Backend-Slice
- F6 Screenshot-Artefakt → verify-only
- F9/F10/F11/F13 → case-by-case

## Slice 079 — Home `/` Polish Pass (Phase 1 Start)

Systematisches Durchgehen des Polish-Rubrics (States, Mobile 393px, A11y, Opacity, i18n, Perf, Flow, Anti-Slop, Compliance) für die Home-Page. 1. Page von 30 (Phase 1 = 6 Core-Pages).

**CTO-Autonomie:** Anil hat UX-Entscheidungen delegiert — "mach es perfekt für bescout".

**Workflow:** Playwright MCP gegen bescout.net → Findings → Fix → Deploy-Verify.

## Phase 1 — Core Trading (6 Pages)
- 079 Home `/` — IN PROGRESS
- 080 Market `/market` — pending
- 081 Player Detail `/player/[id]` — pending
- 082 Portfolio `/inventory` — pending
- 083 Transactions `/transactions` — pending
- 084 Profile `/profile` — pending

## Feedback-Kanal
- Anil meldet Fehler direkt → `memory/user-feedback-queue.md`
- Ende Phase 1: In-App-Feedback-Button (Slice ~085) vor User-Test-Start

## Session 2026-04-19 Spät — Slice 078 DONE
- TM Parser Fix (Markup-Change 2026-04) + Loader Pagination-Fix
- 267 MV-Updates, STAMM+ROTATION Lücken -46%
