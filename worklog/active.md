# Active Slice

```
status: active
slice: 208
stage: PROVE
spec: worklog/specs/208-trend-sparkline-mini-chart.md
impact: skipped (pure-frontend, single-File, existing data, kein Cross-Domain)
proof: worklog/proofs/208-vitest.txt
review: worklog/reviews/208-review.md
```

## Zuletzt

- **Slice 207** (2026-04-26) — Most-Owned Discovery Batch (K-02). M-Slice via Worktree-Agent (escaped — CTO konsolidiert) + 2 Migrations (v1→v2 Heal). Anonymized-Aggregate-RPC #4 der Pattern-#38-Series. Discovery `/clubs` zeigt pro ClubCard "🔥 X% besitzen Y. Müller" (FPL-Trust-Signal). Reviewer PASS (2 NITs nicht-blockierend). 11/11 vitest PASS. Punch-Liste 84 → 85/98 (~87%).
- **Slice 205** (2026-04-26) — ScoutConsensus Reliability-Indicator (FM 5.2). XS-Slice. Tier-Badge low/medium/high im Header basierend auf qualifiziertem Report-Count (1-9/10-49/50+). D46-Reuse research-data, kein neuer Service. Self-Review (D35 Pattern-Wiederholung Slice 201b ConcentrationBar Tier-Color-Coding). FM-Mechanics 26/26 (100% closed). Punch-Liste 83 → 84/98 (~86%).
- **Slice 204** (2026-04-26) — Squad-Tab Fantasy-Pick-Rate (K-03). S-Slice. PickRateBadge auf /club/[slug] Spieler-Tab Cards-View, D46-Reuse `useEventPlayerPickRates` (Slice 195e RPC). Reviewer CONCERNS→PASS post-Heal (Badge-Position `top-2 right-2` ueberlappte L5-Score → `bottom-2 right-2` Footer-Bereich). Punch-Liste 82 → 83/98 (~85%).
- **Slice 201d** (2026-04-26) — Prediction-Consensus-Hint (C-03). M-Slice CTO unter voller Autonomie. RPC `get_prediction_consensus` LIVE + PredictionConsensusHint mit Top-3 Distribution-Bars + Color-Coding amber/purple. 3. RPC der Anonymized-Aggregate-Series. Self-Review (D35). Punch-Liste 81 → 82/98 (~84%).
- **Slice 201c** (2026-04-26) — Fantasy-Context-Hints (M-01). S-Slice. State-derived Hints via pure-deriver. Self-Review.
- **Slice 201b** (2026-04-26) — Holders-Distribution-Mini-Bar (FM 4.3). M-Slice. Reviewer PASS.
- **Slice 201a** (2026-04-26) — Per-Trade-Player-Link in Transactions (FM 6.1). S-Slice.
- **Slice 200b** (2026-04-26) — Wave 4 Polish-Sweep. 3 closed + 1 already-fixed-marker. Reviewer PASS.
- **Slice 200a** (2026-04-26) — Wave 3 Polish-Sweep. 4 closed + 1 already-fixed-marker. Reviewer REWORK→PASS post-Heal.
- **Slice 199** (2026-04-25) — Backend-Aggregat-RPC-Wave. 4 closed. Reviewer PASS.

## Backlog (priorisiert)

- **Slice 200**: fm 4.4 `players.trades_volume_7d` Column-Migration + Aggregations-Strategie (Trigger vs Materialized View vs Cron) + Frontend Sort-Pill — Schema-Change auf existing Table → CEO-scope (3 Optionen)
- **Slice 201**: Backend-Slice fuer FM-6.1 (Per-Trade-Player-Link) + FM-4.3 (Holders-Distribution) + M-01 (Mission-Hints kontextabhaengig) — neue RPCs/Definitions
- **K-03** Squad-Tab Fantasy-Pick-Rate — Backend-Aggregat-RPC (analog Slice 199 most-owned, kann mit existing-RPC-Reuse?).
- **FM 5.2** Differential-Sentiment ScoutConsensus — Backend-RPC + UI-Indicator.
- **FM 6.2** Trend-Sparkline-Mini-Chart Aggregation — Backend-Aggregat + Mini-Chart.
- **FM 10.2 + 10.3** Airdrop Personal-Score-History + Friends-Filter — Backend-Aggregate + Filter-UI.
- **C-03/K-03** Aggregate-Hint + Squad Fantasy-Pick-Rate — Backend-Aggregat-RPC.
- **UX 20** MembershipSection Subscribe ohne Confirm-Step — Money-Risk, CEO-Approval pflicht.
- **F-09** BPS-Bonus-System — Scoring-RPC-Erweiterung, Money-Path, CEO-Approval pflicht.
- **Holdings-RPC-Migration** (PostgREST → SECURITY DEFINER, post-Beta)
- **L5-Data-Drift Audit** (11% ohne perf_l5)
- **TR-Locale-Reviewer** organisieren (Anil-Action)

## Anil-Action-Items

- **3 Beta-Tester anrufen** (Familie/Freunde, min 1 TR)
- **Vercel-Plan-Entscheidung** (Hobby vs Pro)
- **TR-Locale-Reviewer organisieren**
- **Slice 200 Aggregations-Strategie-Approval** (3 Optionen: Trigger / MV / Cron)
- **Inkognito-Verify** auf bescout.net Manager → keine Ghost-Rows mehr
- **TR-Wording-Review Slice 200a:** "Tümü / Aktif / Tamamlandı / Bu görünümde görev yok / Etki Gücü"
- **TR-Wording-Review Slice 202:** "Tier Karşılaştırması / Üst tier'da ne ekstra alıyorum? Tüm avantajların tam dökümü. / Özellik / Fiyat / Kredi / Geçiş Bonusu / İşlem İndirimi / Limit / Ekstralar / Dahil / Dahil değil"
- **TR-Wording-Review Slice 208:** "Trend ({days} gün)" / "Günlük net"
