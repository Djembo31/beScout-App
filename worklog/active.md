# Active Slice

```
status: idle
slice: 348
title: ✅ DONE — csf_multiplier raus (toter CSF-Multiplier aus Fan-Rank, D83/D93)
stage: LOG complete
size: M
slice-type: Migration
spec: worklog/specs/348-remove-csf-multiplier.md
impact: inline (Live-functiondef-verifiziert: nur calculate_fan_rank las die Spalte, keine Views/Indexe/Trigger/RLS, kein UI-Reader)
proof: worklog/proofs/348-remove-csf-multiplier.txt (Wave 1 AC5/6/7 + Wave 2 AC1-AC8 live ✅)
review: worklog/reviews/348-review.md (CONCERNS → Doku-Findings #1/#2 gefixt; Code/Migration PASS)
next: Pro-Stand-Roadmap weiter — worklog/notes/348-pro-stand-roadmap.md (Polls-Reste ODER S7-Leaderboard-Konsolidierung)
```

## Aktueller Stand

- **Slice 348 ✅ live + applied.** `csf_multiplier` ist vollständig raus: Spalte `fan_rankings.csf_multiplier` gedroppt, RPC-Variable + Return-Feld weg, TS-Layer 0 Treffer, Docs aktualisiert. **0 Money-Effekt** (liquidate_player war seit Slice 330 proportional_v3, las die Spalte nie — live verifiziert). 2-Wellen-Deploy (D82): TS zuerst (ef8ecc1f), dann Migration nach Ready-Deploy.
- Pro-Stand-Roadmap (Track B abgehakt). Nächste Anil-Wahl: **(A) Polls-Reste** (exklusive Treue-Umfragen `min_fan_rank` / Abo-Early-Access), **(C) S7-Leaderboard-Konsolidierung** (scout_scores/user_stats/airdrop_scores), oder **Club-Fan-Board mounten** (W2-B, schneller sichtbarer Gewinn).
