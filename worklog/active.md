# Active Slice

```
status: in-progress
slice: 203
stage: LOG
spec: inline (XS-Slice — Brand 10 1-line Token-Migration gleiches Pattern wie Brand 8/9/11)
impact: skipped (kein Schema/RPC/Service)
proof: worklog/proofs/203-tsc-grep.txt
review: self-review (D35 trivial-pattern-Wiederholung)
```

## Zuletzt

- **Slice 203** (2026-04-26) — XS-Mini-Polish + DISTILL Slice 202 (Brand 10 + UX 12 audit-stale-marker + Pattern #37 + D48-Update + foundingPasses-Comment). Self-Review (D35 trivial-pattern). Punch-Liste 75/98 → 77/98 (~79%).
- **Slice 202** (2026-04-26) — Wave 5 Polish-Sweep (S). 3 Items closed + Punch-Liste-Sync. Reviewer PASS (2 MINOR, F1 inline-gehealt). D48 1. produktive Bestätigung.
- **Slice 200b** (2026-04-26) — Wave 4 Polish-Sweep. 3 closed + 1 already-fixed-marker. Reviewer PASS.
- **Slice 200a** (2026-04-26) — Wave 3 Polish-Sweep. 4 closed + 1 already-fixed-marker. Reviewer REWORK→PASS post-Heal.
- **Slice 199** (2026-04-25) — Backend-Aggregat-RPC-Wave. 4 closed. Reviewer PASS.

## Backlog (priorisiert)

- **Slice 200**: fm 4.4 `players.trades_volume_7d` Column-Migration + Aggregations-Strategie (Trigger vs Materialized View vs Cron) + Frontend Sort-Pill — Schema-Change auf existing Table → CEO-scope (3 Optionen)
- **Slice 201**: Backend-Slice fuer FM-6.1 (Per-Trade-Player-Link) + FM-4.3 (Holders-Distribution) + M-01 (Mission-Hints kontextabhaengig) — neue RPCs/Definitions
- **UX 20** MembershipSection Subscribe ohne Confirm-Step — Money-Risk, CEO-Approval pflicht (Slice 201 oder eigene Money-Slice). LETZTES Frontend-only-Item, aber Money-Path → CEO.
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
