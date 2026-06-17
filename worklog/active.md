# Active Slice

```
status: idle
slice: 331
title: ✅ DONE — Events ans Treasury (Voll-Reconcile, nur type='club')
stage: LOG complete
size: L
type: Migration (Money, CEO)
spec: worklog/specs/331-events-treasury-reconcile.md
review: worklog/reviews/331-review.md (CONCERNS → Finding #1 geheilt → PASS)
proof: worklog/proofs/331-events-treasury-escrow.md
done_331: 5-Quellen-Modell (events.type=Geldquelle) verifiziert; NUR type='club' escrowt aus Vereins-Treasury, Rest mintet weiter (eigene Slices). 3 Trigger: BEFORE INSERT escrow (guard+debit), BEFORE UPDATE OF status settle (ended→Rest zurück), BEFORE UPDATE OF prize_pool/type resync (Reviewer-Finding #1 Money-Leck: editierbarer Topf/Typ umging Escrow → geheilt). score_event NICHT angefasst. createNextGameweekEvents Batch→Loop (skip+log bei Unterdeckung). i18n + errorMap. Prod-applied, force-rollback-verifiziert (escrow/guard/ended-refund/partial/grandfather/resync). Pre-existing geflaggt: 'cancelled' kein gültiger events.status (UI-Cancel broken).
next: weitere RAUS-Kanäle (Polls/Bounties ans Treasury) + Plattform-/Sponsor-/User-Quellen für bescout/special/sponsor/creator-Events + Fan-Reward-Engine.
```

## Zuletzt
- **Slice 330** (2026-06-17 DONE) — CSF-Engine ans Treasury. Reviewer PASS. Latenter Liquidations-Constraint-Bug mitgefixt (Knowledge-Flywheel: errors-db.md transactions.type-CHECK-Drift).
- **Slice 329** (2026-06-17 DONE) — Club-Treasury-Fundament: Ledger + book_club_treasury (SUM-gehärtet 329b) + Einnahmen-Verbuchung + Abo-Bug-Fix.
- **Strategie 2026-06-15/16** — CSF/Treasury-Zielbild (`worklog/concepts/csf-club-treasury-model.md`). 1 $SCOUT = 1 Cent.

**Strategie D80:** Sommer Tech-First. 🚨 API-Football-Key gesperrt → players.club blockiert.
</content>
