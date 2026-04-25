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

## Naechste Aktion (Session 2026-04-26)

**Slice 195d — Bench + Auto-Sub** ist der naechste grosse Schritt (2 Tage, parallel-dispatch).

Build-Order rest:
- 195d (2 Tage) Bench (4 Slots) + Auto-Sub Position-Match
- 195e (4 Std)  Differentials-RPC + Player-Card-Badge
- 195c-UI (30 Min) EventFormModal max_per_club Number-Input

Alle drei sind in `worklog/specs/195-fantasy-mechanics-overhaul.md` spezifiziert.

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

- **Slice 195c** (2026-04-25) — Event max_per_club Backend (S, PASS)
- **Slice 195b** (2026-04-25) — Boost-Chip Rename + AR-44 Hardening (S, PASS)
- **Slice 195a** (2026-04-25) — Captain-Multiplier 1.1× (XS, PASS)
- **Slice 193** (2026-04-25) — AuthProvider-Perf + Auth-Race-Gate (S, PASS)
- **Slice 192** (2026-04-24) — Holdings NULL-Player Defensive Guard (M, REWORK→PASS)

**Session 2026-04-25 Total:** 6 Commits, 4 Slices, 1 Phase-A-Audit, Bot-Suite Live.

## Backlog (priorisiert)

- **195d** Bench + Auto-Sub (2 Tage, parallel-dispatch backend+frontend) — **morgen**
- **195e** Differentials-RPC + Player-Card-Badge (4 Std)
- **195c-UI** EventFormModal max_per_club (30 Min, Pattern aus salaryCap)
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
