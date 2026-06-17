# Review — Slice 332: Club-Bounties ans Treasury (Escrow bei Erstellung)

Reviewer: Cold-Context-Agent · 2026-06-17 · time-spent: 18 min

## Verdict: PASS

4 Findings, alle LOW/INFO/pre-existing/out-of-scope.

## Findings
| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | LOW | escrow-trigger | book_club_treasury macht eigenes clubs FOR UPDATE — Trigger lockt davor nochmal. Reentrant in 1 TX, kein Deadlock. | Belassen (Defense-in-Depth). |
| 2 | LOW (out-of-scope) | bounties.ts createUserBounty | reward_cents-Max-Drift: Service erlaubt bis 100M, RPC-Text sagt 1M $SCOUT, CHECK cappt 100k. Betrifft nur USER-Bounties. | Separater Slice. |
| 3 | INFO | escrow-Guard | AC3 (Unterdeckung) nur strukturell (reward gedeckelt, Clubs haben Millionen). Guard 1:1 zu 331 AC2 (dort behavioral grün). | Akzeptabel. |
| 4 | INFO | auto_close_expired_bounties | Cron-RPC ohne getrackte Migration (AR-43). 332 hängt korrekt am 'closed'-Output. | Backlog (Greenfield-Sicherheit). |

## Verifizierte Blindspots
- **PATCH-AUDIT approve-Edit:** evolvierte Live-Baseline 1:1 erhalten (auth-Guard, club-admin-Check, User-Branch+locked_balance, 5%-Fee, completed-Status, auto-reject); EINZIGE Änderung = Club-Payer-Debit gewrappt in `IF NOT treasury_escrowed`. REVOKE/GRANT AR-44-konform.
- **Admin-Gate doppelt:** RLS bounties_admin_insert (created_by=auth.uid() AND Admin/club_admin) + Trigger-Gate. is_user_bounty=true umgeht nichts (skippt Escrow → User-Pfad).
- **Settle:** completed (approve) → flag off kein Refund; cancelled/closed → Refund; Doppel-Refund-Schutz via flag + status-DISTINCT-Guard.
- **Resync** deckt 0→X / X→Y / X→0. **5%-Burn** = bestehende Logik, keine Fee-Änderung (kein CEO-Approval nötig).

## Kern-Beweis (behavioral)
Treasury −100.000 (Erstellung) · Admin-Wallet UNVERÄNDERT · Submitter +95.000 · bounty=completed. Zero-sum, Verein zahlt aus Kasse statt Admin-Tasche.

## PREREQ-Fix
bounties_status_check kannte 'completed' nicht (approve setzt es) → JEDE Approval failte (latent, 0 approved je). Additiv gefixt — entsperrt toten Auszahl-Pfad.

## Learnings (Flywheel)
errors-db.md: status-CHECK-Drift = Schwester von transactions.type-CHECK-Drift (Slice 330). Regel: jeder neue Status-/Type-Literal-Write braucht CHECK-Sync-Verifikation. Promotet.

## Summary
Low-risk Money-Migration, sauber gespiegelt von 331, PATCH-AUDIT-konform, alle Escrow-Achsen + Admin-Gate abgesichert. PASS.
