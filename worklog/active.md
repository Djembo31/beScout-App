# Active Slice

```
status: in-progress
slice: 348
title: csf_multiplier raus — toten CSF-Multiplier aus Fan-Rank entfernen (D83/D93)
stage: PROVE
size: M
slice-type: Migration
spec: worklog/specs/348-remove-csf-multiplier.md
impact: inline (Live-functiondef-verifiziert: nur calculate_fan_rank liest die Spalte, keine Views/Indexe/Trigger/RLS, kein UI-Reader)
proof: worklog/proofs/348-remove-csf-multiplier.txt (Wave 1 ✅ AC5/6/7; Wave 2 SQL folgt nach Apply)
review: worklog/reviews/348-review.md (CONCERNS → Doku-Findings #1/#2 gefixt; Code/Migration PASS)
next: Wave 1 committet + gepusht → Vercel-Deploy abwarten → Wave 2 Migration applien (DROP COLUMN) → PROVE → LOG
```

## Kontext

Track B aus der Pro-Stand-Roadmap (`worklog/notes/348-pro-stand-roadmap.md` Phase B), von Anil gewählt.
`csf_multiplier` ist **toter Ballast**: Live `liquidate_player` ist `proportional_v3_2026_06_17` und liest die Spalte GAR NICHT (rein proportionale CSF-Auszahlung seit Slice 330). Entfernen hat **null Money-Effekt** — live verifiziert.

## Deploy-Ordering (D82, harter Constraint)
- `getFanRanking` IST gemountet → das live `.select('...csf_multiplier...')` läuft. DROP COLUMN würde altes Bundle brechen.
- **Wave 1 (TS) zuerst deployen**, dann **Wave 2 (Migration: RPC-Rewrite + DROP COLUMN)**.
