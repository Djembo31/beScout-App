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

- **Slice 201a** (2026-04-26) — Per-Trade-Player-Link in Transactions (FM 6.1). S-Slice CTO unter voller Autonomie. Service `getTradePlayersByIds` + Hook `useTradePlayerMap` + Component-Erweiterung. DB-Verify 144 trade-tx, 72 trades, 40 Players. Self-Review (D35). Punch-Liste 78 → 79/98 (~81%).
- **Slice 200** (2026-04-26) — Trades-Volume-7d Backend + Sort-UI (FM 4.4). M-Slice. Migration LIVE + Cron + Frontend Sort-Pill. Reviewer PASS (5 NIT/INFO). Bonus-Fix Slice 197d Latent-Bug.
- **Slice 203** (2026-04-26) — XS-Mini-Polish + DISTILL Slice 202.
- **Slice 202** (2026-04-26) — Wave 5 Polish-Sweep (S). 3 Items closed.
- **Slice 200b** (2026-04-26) — Wave 4 Polish-Sweep. 3 closed + 1 already-fixed-marker. Reviewer PASS.
- **Slice 200a** (2026-04-26) — Wave 3 Polish-Sweep. 4 closed + 1 already-fixed-marker. Reviewer REWORK→PASS post-Heal.
- **Slice 199** (2026-04-25) — Backend-Aggregat-RPC-Wave. 4 closed. Reviewer PASS.

## Backlog (priorisiert)

- **Slice 200**: fm 4.4 `players.trades_volume_7d` Column-Migration + Aggregations-Strategie (Trigger vs Materialized View vs Cron) + Frontend Sort-Pill — Schema-Change auf existing Table → CEO-scope (3 Optionen)
- **Slice 201**: Backend-Slice fuer FM-6.1 (Per-Trade-Player-Link) + FM-4.3 (Holders-Distribution) + M-01 (Mission-Hints kontextabhaengig) — neue RPCs/Definitions
- **Slice 201b** (FM-4.3 Holders-Distribution-Mini-Bar) — neuer Aggregat-RPC `get_player_holders_concentration(player_id)` + Mini-SVG-Bar in PlayerRow. M-Slice, eigene Session.
- **Slice 201c** (M-01 Mission-Hints kontextabhaengig) — Mission-System-Erweiterung mit kontext-aware Hints fuer Fantasy-Tab. M-Slice mit DB-catalog-Erweiterung.
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
