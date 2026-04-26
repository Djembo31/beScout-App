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

## Zuletzt

- **Slice 201b** (2026-04-26) — Holders-Distribution-Mini-Bar (FM 4.3). M-Slice CTO unter voller Autonomie. RPC `get_player_holders_concentration` LIVE + ConcentrationBar Mini-SVG mit Color-Coding lazy-loaded in expanded TransferList. Reviewer PASS (3 cosmetic NITs, F2 inline). DB-Verify 86.1% Top-10-Concentration auf testplayer. Punch-Liste 79 → 80/98 (~82%).
- **Slice 201a** (2026-04-26) — Per-Trade-Player-Link in Transactions (FM 6.1). S-Slice. Service+Hook+UI. Self-Review (D35).
- **Slice 200** (2026-04-26) — Trades-Volume-7d Backend + Sort-UI (FM 4.4). M-Slice. Bonus-Fix PLAYER_SELECT_COLS Latent-Bug.
- **Slice 203** (2026-04-26) — XS-Mini-Polish + DISTILL Slice 202.
- **Slice 200b** (2026-04-26) — Wave 4 Polish-Sweep. 3 closed + 1 already-fixed-marker. Reviewer PASS.
- **Slice 200a** (2026-04-26) — Wave 3 Polish-Sweep. 4 closed + 1 already-fixed-marker. Reviewer REWORK→PASS post-Heal.
- **Slice 199** (2026-04-25) — Backend-Aggregat-RPC-Wave. 4 closed. Reviewer PASS.

## Backlog (priorisiert)

- **Slice 200**: fm 4.4 `players.trades_volume_7d` Column-Migration + Aggregations-Strategie (Trigger vs Materialized View vs Cron) + Frontend Sort-Pill — Schema-Change auf existing Table → CEO-scope (3 Optionen)
- **Slice 201**: Backend-Slice fuer FM-6.1 (Per-Trade-Player-Link) + FM-4.3 (Holders-Distribution) + M-01 (Mission-Hints kontextabhaengig) — neue RPCs/Definitions
- **Slice 201c** (M-01 Mission-Hints kontextabhaengig) — Mission-System-Erweiterung mit kontext-aware Hints fuer Fantasy-Tab. M-Slice mit DB-catalog-Erweiterung.
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
