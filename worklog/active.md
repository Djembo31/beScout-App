# Active Slice

```
status: in-progress
slice: 202
stage: LOG
spec: worklog/specs/202-wave5-polish-sweep.md
impact: skipped (kein Schema/RPC/Service, frontend-only)
proof: worklog/proofs/202-tsc-grep-i18n.txt
review: worklog/reviews/202-review.md
```

## Zuletzt

- **Slice 202** (2026-04-26) — Wave 5 Polish-Sweep (S, single-track sequenziell). 3 Frontend-only Items closed (Brand-12 PitchView Token, Brand-2 .gold-pulse-bg Utility, FM-9.3 TierComparisonMatrix) + Punch-Liste-Status-Sync (5 stale-Items audit-stale-korrigiert). Reviewer PASS (2 MINOR, F1 inline-gehealt). D48 1. produktive Bestätigung. Punch-Liste 70/98 → 75/98 closed (~76%).
- **Slice 200b** (2026-04-26) — Wave 4 Polish-Sweep. 3 closed + 1 already-fixed-marker. Reviewer PASS.
- **Slice 200a** (2026-04-26) — Wave 3 Polish-Sweep. 4 closed + 1 already-fixed-marker. Reviewer REWORK→PASS post-Heal.
- **Slice 199** (2026-04-25) — Backend-Aggregat-RPC-Wave. 4 closed. Reviewer PASS.
- **Slice 198b** (2026-04-25) — Polish-Sweep Wave 2. 11 closed. Reviewer PASS.

## Backlog (priorisiert)

- **Slice 200**: fm 4.4 `players.trades_volume_7d` Column-Migration + Aggregations-Strategie (Trigger vs Materialized View vs Cron) + Frontend Sort-Pill — Schema-Change auf existing Table → CEO-scope (3 Optionen)
- **Slice 201**: Backend-Slice fuer FM-6.1 (Per-Trade-Player-Link) + FM-4.3 (Holders-Distribution) + M-01 (Mission-Hints kontextabhaengig) — neue RPCs/Definitions
- **Slice 203 Wave 6 Polish-Rest**: Brand 10 PlayerPicker bg-black/60 (1-line) + UX 12 (Missions Auth-Loading Loader2→Skeleton) + UX 20 MembershipSection Confirm-Step (Money-Risk → CEO-Approval). Frontend-only-Pool nahezu erschoepft (~3 Items).
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
