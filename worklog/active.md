# Active Slice

```
status: paused (Phase 1 done, Phase 2 pending User-Verify)
slice: 095
stage: PROVE (Phase 1) → waiting for bescout.net verify → BUILD (Phase 2)
spec: (inline, log.md 095 entry)
impact: documented in 095-phase1-after.txt
proof: worklog/proofs/095-phase1-after.txt
```

## Slice 095 Phase 1 COMPLETE

- 2 SECURITY DEFINER RPCs applied (handle+is_own projection, anon sparkline)
- PublicTrade type + 10 Files migrated
- tsc clean, 202/202 tests green

## Phase 2 User-Gate

**Bevor Phase 2 applied werden kann, bitte:**
1. Warte Vercel-Deploy (~3-5 min nach push)
2. Verify auf bescout.net:
   - Marktplatz: sparklines rendern normal
   - Player-Page → Trading-Tab: trade list zeigt handles korrekt (@username + "Du" flag bei own trades)
   - YourPosition zeigt P&L wenn du Holdings hast
3. **Offene Design-Frage**: club_admins brauchen trade-access für ihre club-player queries (club.ts:385/420/737/752)
   - Option A: zusätzliche RLS-Branch mit club_admins JOIN (teuer per-row)
   - Option B: club-queries auf SECURITY DEFINER RPCs migrieren (mehr scope)
   - Option C: RPC-Helper `is_club_admin_for_trade(player_id)` STABLE (mittel)

Nach User-OK: apply Phase 2 RLS-tighten migration.
