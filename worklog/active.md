# Active Slice

```
status: in-progress
slice: 195
stage: SPEC-DONE → BUILD-PENDING
spec: worklog/specs/195-fantasy-mechanics-overhaul.md
impact: pending (cross-cutting analysis)
proof: pending
review: pending
```

## Slice 195 — Fantasy-Mechanics Overhaul (Beta-Blocker)

**Trigger:** Phase A Audit fantasy-scoring-expert (2026-04-25) — 6 P0 Findings.

**CEO-Approval:** Anil 2026-04-25 — alle 8 Mechanik-Decisions confirmed (siehe Spec).

**Build-Order:**
- 195a (30 Min) Captain-Multiplier 1.5x → 1.1x
- 195b (4 Std)  Boost-Chip Rename + Multiplier 3.0x → 1.25x + Captain-only
- 195c (3 Std)  Event max_per_club Parameter (Schema + RPC + Admin-UI)
- 195d (2 Tage) Bench + Auto-Sub
- 195e (4 Std)  Differentials-RPC + Player-Card-Badge

**Estimate:** 3-4 Werktage. Tester-Launch realistic ~03./04. Mai 2026.

## Parallel-Tracks (Session 2026-04-25)

- **Track B:** Hot-Fix de.json `Sieger/Siege` → `Erfolge/Top-Platzierung` (selbst, ~10 Min)
- **Track C:** Bot-Pilot `--smart 10` (DONE) — siehe worklog/audits/2026-04-25/bot-pilot.md

## Phase A Audit — abgeschlossen 2026-04-25 13:53

- `worklog/audits/2026-04-25/MASTER.md` — 98 Findings, 6 P0, 34 P1
- Brand 8.6/10, UX 7.4/10, FM-Mechanics 7.6/10, Fantasy 5.4/10
- Money-Pfade clean (preventClose 6/6 Money-Modals)

## Zuletzt

- **Slice 193** (2026-04-25) — AuthProvider-Perf + Auth-Race-Gate (Slice 192 Root-Cause, S, PASS).
- **Slice 192** (2026-04-24) — Defensive Guard NULL-Player Holdings + Type-Truth-Fix (M, REWORK→PASS).
- **Slice 191** (2026-04-24) — Hygiene-Kombi H+G+C+I + Audit Bilder/Scouting/Form (XS-Kombi, PASS).
- **Slice 190** (2026-04-24) — CI-Check Cron-Route-Registry-Audit + D39 DISTILL.
- **Slice 189** (2026-04-24) — Ghost-Prevention Player-Insert-Trigger.

**Session 2026-04-24/25 Total:** 16 Slices — Output-Rekord. D36-D39 DISTILLs.

Offen (Backlog):
- **Holdings-RPC-Migration:** PostgREST nested-select → SECURITY DEFINER RPC (langfristig)
- **HomeDashboard filterValidHoldings Helper** (Slice 192 #2, optional)
- **GTM-Push** (Anil-Entscheidung)
- **181g** JoinConfirmDialog Custom-DOM-Refactor
- **Research-Seed:** Bot-Posts fuer Scout-Consensus-UX
- **L5-Data-Drift:** 11% ohne perf_l5
- **Vercel Pro Restore** (CEO)

**Anil-Action-Items:**
- 3 Beta-Tester anrufen + Zoom-Calls
- Vercel-Plan-Entscheidung
- TR-Locale-Reviewer organisieren
- **Cold-Verify nach Deploy:** Inkognito-Open auf bescout.net → Manager → Aufstellen-Tab → keine Ghost-Rows mehr
