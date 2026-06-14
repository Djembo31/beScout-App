# Active Slice

```
status: idle
slice: 318
stage: LOG complete ✅ DONE
spec: worklog/specs/318-api-push-row-derived.md
impact: inline (Spec §4: /api/push nur via firePush; resolveDeepLink lokal; 2 push-agnostische notifications-Tests; service-role im pushSender)
proof: worklog/proofs/318-api-push-row-derived.txt
review: worklog/reviews/318-review.md (PASS, 3 LOW/INFO non-blocking)
decision: S7 Phase-2 #4. /api/push trust client title/body/userId/url → Phishing. Fix: Push-Inhalt server-seitig aus Notification-Row ableiten (client sendet nur notificationId, client-generierte UUID wegen cross-user SELECT-RLS). Residual cross-user-Insert-RLS = eigener Follow-up-Slice.
```

## Zuletzt

- **Slice 318** (2026-06-14, in Arbeit) — S7 Phase-2 #4: /api/push Row-Derived (P1 Security). Push-Inhalt aus DB-Row statt Client-Free-Text; externer-URL-Phishing-Vektor geschlossen.
- **Slice 317** (2026-06-14) — S7 Phase-2 #3: profiles_update Spalten-Whitelist + apply_referral_code RPC (fix security, PASS, live `6452afe8`).
- **Slice 316** (2026-06-14) — S7 Phase-2 #1+#2: Founding-Pass Money-Härtung (fix money, PASS, live `f1061653`).
- **Slice 315** (2026-06-14) — S7 Phase-1 Abschluss: Creator + Identity + Admin (docs). 9/9 Domänen.
- **Slice 314** (2026-06-14) — S7 Phase-1 Mapping P1-Batch: Club + Social + Gamification (docs).

**🚨 API-Football-Key seit 06.05. suspendiert** → blockiert 284b + Fantasy-#2/#7 (Anil: dashboard.api-football.com).
**TR-Review offen (Anil):** `market.bulkSellResult`, `rankings.noMarketMovement`, `fantasy.matchLive` (=„Canlı").
**Backlog (316-Reviewer):** Founding-Pass-Kaufstrecke für normale User tot (Admin-gated RPC, kein Public-Purchase + kein Payment-Gateway).
**Backlog (318):** `notifications_insert_any_authenticated` cross-user RLS → cross-user-Notification-Creation auf SEC-DEFINER-RPCs (großer Slice).

Nächstes nach 318: S7 Phase-2 P0/P1 Queue LEER → P1-Demo Quick-Wins (Social #1 i18n, Club #3/#4, Gamif #1-3, Identity #3/#4) ODER post-Beta-Migrationen ODER API-Key-blockierte Punkte.
