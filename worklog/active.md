# Active Slice

```
status: idle
slice: 317
stage: LOG complete ✅ DONE
spec: worklog/specs/317-profiles-rls-column-whitelist.md (inkl. 317b Folge-Fix)
impact: inline (Writer-Audit Spec §4, KORRIGIERT: + applyReferralCode client-Writer → 317b RPC)
proof: worklog/proofs/317-profiles-rls-guard.txt
review: worklog/reviews/317-review.md (REWORK→RESOLVED via 317b→PASS)
decision: S7 Phase-2 #3. profiles_update RLS hat with_check=NULL → User kann verified/top_role/plan/level self-setzen. Fix: BEFORE-UPDATE-Trigger (SEC INVOKER) friert 11 sensible Spalten gegen OLD ein; Bypass via current_user NOT IN (authenticated,anon) ODER GUC. Kein Bestandscode-Patch (alle Writer SEC DEFINER=postgres).
```

## Zuletzt

- **Slice 317** (2026-06-14, in Arbeit) — S7 Phase-2 #3: profiles_update Spalten-Whitelist (P1 Security). BEFORE-UPDATE-Trigger friert verified/top_role/plan/level/subscription_*/is_demo/referral_code/invited_by[_club] gegen direkten Client-.update().
- **Slice 316** (2026-06-14) — S7 Phase-2 #1+#2: Founding-Pass Money-Härtung (fix money, PASS, live `f1061653`).
- **Slice 315** (2026-06-14) — S7 Phase-1 Abschluss: Creator + Identity + Admin (docs). 9/9 Domänen gemappt.
- **Slice 314** (2026-06-14) — S7 Phase-1 Mapping P1-Batch: Club + Social + Gamification (docs).
- **Slice 313** (2026-06-14) — S7-P2/P3-Reste D77-Verifikation + rating-Chain-Bridge-Pattern (docs).

**🚨 API-Football-Key seit 06.05. suspendiert** → blockiert 284b + Fantasy-#2/#7 (Anil: dashboard.api-football.com).
**TR-Review offen (Anil):** `market.bulkSellResult`, `rankings.noMarketMovement`, `fantasy.matchLive` (=„Canlı").
**Backlog (316-Reviewer):** Founding-Pass-Kaufstrecke für normale User tot (Admin-gated RPC, kein Public-Purchase + kein Payment-Gateway) → eigener Slice/Produkt-Entscheidung.

Nächstes nach 317: S7 Phase-2 #4 (/api/push cross-user, P1 Security).
