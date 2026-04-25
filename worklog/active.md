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

## Naechste Aktion

**Slice 197 — FM-Mechanics-Fundament** (5 Sub-Slices, ~2-3 Tage). SPEC ready: `worklog/specs/197-fm-mechanics-fundament.md`.

Schliesst 6 P1-Findings: fm 1.1 (Form-L5-Filter universal), fm 1.2/4.1 (MV-Trend), F-02 (Formationen 3-5-2/4-5-1/5-3-2/5-4-1), F-08 (Countdown-Sekunden), K-01 (5-GW-FDR-Strip).

Build-Order rest:
- 195e (4 Std) Differentials-RPC + Player-Card-Badge
- 195c-UI (30 Min) EventFormModal max_per_club Number-Input
- 195f (Backlog, Auto-Sub Audit Trail UI — siehe 195d-Review M2)

Alle in `worklog/specs/195-fantasy-mechanics-overhaul.md` spezifiziert.

## Phase A Audit + Master-Bericht

`worklog/audits/2026-04-25/MASTER.md` — 98 Findings, **6 P0 alle in Fantasy-Domain**, Money-Pfade clean. Trading/Market/Profile/Community sind tester-ready, Fantasy-Lineup braucht 195d.

## Bot-Pool

50 Bots (44 aktiv, 6 Login-Rate-Limit), Pool ~4M $SCOUT. Live-Test 2026-04-25 `--smart 50`: **284 Trades, 0 Bugs**.

Manuell startbar:
```bash
npx tsx e2e/bots/ai/run-loop.ts            # 15 bots / 30 min / 8h auto-stop
npx tsx e2e/bots/ai/run-loop.ts 25 20 12   # custom
```

## Zuletzt

- **Slice 195d** (2026-04-25) — Bench + Auto-Sub (L, parallel-dispatch, CONCERNS→Healed→PASS)
- **Slice 195c** (2026-04-25) — Event max_per_club Backend (S, PASS)
- **Slice 195b** (2026-04-25) — Boost-Chip Rename + AR-44 Hardening (S, PASS)
- **Slice 195a** (2026-04-25) — Captain-Multiplier 1.1× (XS, PASS)
- **Slice 193** (2026-04-25) — AuthProvider-Perf + Auth-Race-Gate (S, PASS)

**Session 2026-04-25 Total:** 5 Slices, 1 Phase-A-Audit, 1 Major-Slice (195d) parallel via 3 Agents + Reviewer + Healer.

## Backlog (priorisiert)

- **195e** Differentials-RPC + Player-Card-Badge (4 Std)
- **195c-UI** EventFormModal max_per_club (30 Min, Pattern aus salaryCap)
- **195f** Auto-Sub Audit Trail UI (subs_applied JSONB + Slot-Badge "SUB", siehe 195d-Review M2)
- **MV-Trend systemisch** (Slice 197, FM-Audit P1, Comunio-Standard)
- **Form-L5-Filter universalisieren** (Slice 197, FM-Audit P1)
- **Holdings-RPC-Migration** (PostgREST → SECURITY DEFINER, post-Beta)
- **L5-Data-Drift Audit** (11% ohne perf_l5)
- **TR-Locale-Reviewer** organisieren

## Anil-Action-Items

- **3 Beta-Tester anrufen** (Familie/Freunde, min 1 TR)
- **Vercel-Plan-Entscheidung** (Hobby vs Pro)
- **TR-Locale-Reviewer organisieren**
- **Inkognito-Verify** auf bescout.net Manager → keine Ghost-Rows mehr (Slice 192/193)
