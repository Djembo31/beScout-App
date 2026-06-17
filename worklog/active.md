# Active Slice

```
status: idle
slice: 332
title: ✅ DONE — Club-Bounties ans Treasury (Escrow bei Erstellung)
stage: LOG complete
size: M
type: Migration (Money, CEO)
spec: worklog/specs/332-club-bounties-treasury.md
review: worklog/reviews/332-review.md (PASS, 4 LOW/INFO)
proof: worklog/proofs/332-club-bounties-treasury.md
done_332: Club-Bounty (is_user_bounty=false) zahlte heute Admin aus EIGENEM Wallet bei Approval (Live-Befund, kein Minting). A=Escrow bei Erstellung aus Treasury. 4 Trigger/Edits: escrow (BEFORE INSERT, Admin-Gate+Guard+Debit) · settle (BEFORE UPDATE OF status: cancelled/closed→Refund, completed→flag off) · resync (BEFORE UPDATE OF reward_cents, Defense-in-Depth) · approve_bounty_submission-Edit (treasury_escrowed=true → KEIN Admin-Wallet-Abzug). User-Bounties unangetastet. PREREQ-FIX: bounties_status_check fehlte 'completed' → Approval war komplett broken (0 je). Prod-applied + force-rollback-verifiziert (behavioral: admin unverändert, submitter +95%, treasury −reward).
next: Polls (REIN-Geldmaschine, D86, Roadmap P1-P4) · weitere Event-Quellen (bescout/sponsor/user) · Fan-Reward-Engine.
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
