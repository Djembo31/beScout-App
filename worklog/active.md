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
done_332: Club-Bounty (is_user_bounty=false) zahlte heute Admin aus EIGENEM Wallet bei Approval (Live-Befund, kein Minting). A=Escrow bei Erstellung aus Treasury. 4 Trigger/Edits: escrow (BEFORE INSERT, Admin-Gate+Guard+Debit) · settle (status: cancelled/closed→Refund, completed→flag off) · resync (reward_cents, Defense-in-Depth) · approve-Edit (escrowt→KEIN Admin-Abzug). User-Bounties unangetastet. PREREQ-FIX: bounties_status_check fehlte 'completed' → Approval war broken (0 je). Force-rollback-verifiziert (behavioral: admin unverändert, submitter +95%, treasury −reward).
next: Polls (REIN-Geldmaschine, D86, Roadmap P1-P4) · weitere Event-Quellen (bescout/sponsor/user) · Fan-Reward-Engine.
```

## Zuletzt (Treasury-Serie 2026-06-17)
- **332** Club-Bounties ans Treasury (Escrow, mirror 331). PASS.
- **331** Events ans Treasury (Prize-Escrow, 5-Quellen-Modell, nur type='club'). PASS.
- **330b** Saldo Debit-Reconcile + Kontoauszug. **330** CSF-Engine ans Treasury. **329** Treasury-Fundament.
- **Polls-Modell D86** (REIN-Geldmaschine) konzipiert: `worklog/concepts/polls-engagement-monetization-model.md`.

**Strategie D80:** Sommer Tech-First. 🚨 API-Football-Key gesperrt → players.club blockiert.
