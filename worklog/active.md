# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
started: —
```

## Letzter Slice: 081c — Orphan Stale Contracts ✅

1434 Spieler mit `contract_end > 12 Mon. in Vergangenheit` als stale markiert. Total stale: 2367 (52% der DB). Money-Invariant byte-identisch. INV-38 als CI-Guard aktiv.

**Phase-A Flag-Trilogie abgeschlossen** (081 + 081b + 081c). Naechste Stufe: Re-Scraper (082) oder Frontend-Filter (083).

## Vorher: 081b — Paired-Poisoning ✅

36 Spieler in 18 Paired-Clustern (2-3 Rows mit identisch mv + contract_end + last_name) als stale markiert. **Arda Yilmaz + Baris Alper Fall geschlossen.** Money-Invariant byte-identisch. Total stale jetzt 933.

## Vorher: 081 — Data-Cleanup Phase A.1 ✅

897 Spieler mit verdaechtigen Duplicate-MV/contract_end-Clustern als `mv_source='transfermarkt_stale'` markiert. **ZERO Money-Drift** — Trigger-Guard hielt, Money-Invariant byte-identisch vor/nach Migration.

### Durchgefuehrt
- **Migration 1**: `mv_source` Spalte + CHECK constraint + Flag 268 Rows (Cluster >= 10)
- **Migration 2**: Erweiterung auf Cluster >= 4 → 629 additional geflaggt (total 897)
- **INV-36**: CI-Regression-Guard im `db-invariants.test.ts`. Bei zukuenftigen Poisoning-Imports failt der Test.

### Proof
- `worklog/proofs/081-before.txt` — Baseline-Invariant (sum_mv, sum_ref, holdings)
- `worklog/proofs/081-after.txt` — byte-identischer Post-State + INV-36 green
- Migration DB-seitig angewendet, `mv_source` Distribution: 897 stale / 3659 unknown / 4556 total

### Scope-Out (→ Folgeslices)
- **A.1b — Paired Poisoning (Cluster 2-3)**: Arda Yilmaz + Baris Alper Fall. Eigene Detection ueber SELF-JOIN auf (last_name, mv, contract_end).
- **A.1c — Orphan Stale Contract**: contract_end < current_date - 6 Monate → Altbestand-Flag.
- **A.2 — Re-Scraper-Run**: lokale Playwright ueber alle 897 stale Spieler. Welle 1: DE+TR Ligen (Prio 1+2), Welle 2: EU-Top-3.
- **A.3 — Frontend-Filter** in `getPlayersByClubId`: Altbestand-Exclusion.

### Strategischer Kontext (neu seit heute)
Anil's Scope-Korrektur: **alle 7 Ligen launch-ready**, nicht nur Sakaryaspor/TFF1.
- Prio 1: Bundesliga, 2. Bundesliga (DE-Heimat)
- Prio 2: Süper Lig, TFF 1. Lig (TR-Wurzeln)
- Prio 3: Premier League, La Liga, Serie A (EU-Top)
- Alle Ligen Ziel >=95% MV-Coverage.
- Details: `memory/feedback_scope_all_leagues_launch_ready.md`

### Phase-Plan Uebersicht
- **Phase A — Emergency Cleanup**: Slice 081 (✅), 081b (Paired), 081c (Orphan Contract), 082 (Re-Scraper), 083 (Frontend-Filter)
- **Phase B — SoT-Architektur**: `player_field_sources` Tabelle + Priority-Map + Staleness-Policy
- **Phase C — Monitoring**: Daily Reconciliation Cron + Data-Quality-Dashboard

### CI-Blocker noch offen
- `useMarketData.test.ts:283` — computePlayerFloor referencePrice fallback. CEO-Decision pending.
