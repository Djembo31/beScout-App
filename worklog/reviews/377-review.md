# Review — Slice 377: BeScout-Events zahlen Prize aus dem Plattform-Topf (E3 RAUS-Kanal #2)

**Reviewer:** Cold-Context reviewer-Agent · **Datum:** 2026-06-25 · **Scope:** Money/CEO · **time-spent:** 16 min

## verdict: PASS

Money-saubere, chirurgische Erweiterung. Zero-Sum über den ganzen Flow verifiziert (score_event-Timing live bestätigt), Club-Pfad byte-identisch, Zwei-Treasury-Resync schließt die Minting-Hintertür auch für bescout und verbessert nebenbei das 331-Refund-Targeting, Deckungs-Check in allen 4 debit-Pfaden strikt `<`. 8/8 Force-Rollback-Smokes grün. Einziger offener Punkt (`club_id`-only-Edit) ist pre-existing und bewusst dokumentiert — kein Merge-Blocker.

## findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | LOW | resync, gesamtes Trigger-Set | Pre-existing `club_id`-only-Hole bleibt offen, jetzt auch für bescout relevant. Resync feuert nur auf `BEFORE UPDATE OF prize_pool, type` — NICHT auf `club_id`. `club_id`-A→B bei gleichem prize_pool+type='club' → Kaution bleibt still bei Club A. Dokumentiert in Spec §11 als pre-existing seit 331. | Out-of-scope (kein realer Admin-Flow). Bei künftigem `club_id`-Edit-Pfad: Spalte in Trigger-Watch-Liste + per-Club Refund/Re-Escrow OLD↔NEW. Für 377 OK. |
| 2 | NIT | Migration | Funktions-Bodies via CREATE OR REPLACE ohne Trigger-Re-Attach (Bindings stabil, Proof bestätigt). Stil-Divergenz zu 331/335. | Kein Fix nötig. |
| 3 | NIT | settle `v_distributed` | cancelled liest v_distributed nicht (ELSE = voller Pool). Korrekt. | — |

## Money-Fokus (5 Punkte) — alle ✓
1. **Zero-Sum** ✓ — score_event setzt reward_amount (195d Z.875) VOR `UPDATE status='ended'` (Z.891); settle liest in derselben TX gesetzte Werte. v_scored_count=0-Pfad → voller Refund. AC-03 (refund=2000) bestätigt Timing empirisch. Netto Topf −D, Wallets +D, Σ=0.
2. **Resync Zwei-Treasury** ✓ — Held aus OLD (type-diskriminiert), Target aus NEW, Delta pro Treasury. type-Switch sauber; Club-Refund an OLD.club_id (Halter) = Verbesserung gegen 331 (nutzte NEW.club_id). Keine Doppel-Escrow/Minting-Hintertür. AC-05 bestätigt.
3. **Club-Pfad byte-identisch** ✓ — escrow/settle/resync club-Zweige Wort-für-Wort = 331/335-Baseline (clubs FOR UPDATE, withdrawals-Subtraktion, strikt `<`, event_prize). AC-07 + Bindings stabil.
4. **Deckungs-Check alle debit-Pfade** ✓ — escrow-club, escrow-platform, resync-club, resync-platform; alle strikt `<`.
5. **Edge** ✓ — prize=0 Guard (AC-08), book NULL-Return nie erreicht (Guards), settle-Idempotenz via DISTINCT + prize_escrowed:=false.

## errors-db.md Regression-Check — alle ✓
- CREATE OR REPLACE PATCH-AUDIT (S156/S356): Baseline live (D87), Club-Konstanten byte-identisch, kein Drift wie 343→337.
- Bank-Ledger balance_after SUM unter Row-Lock (S329): Deckungs-Check SUM nach `platform_treasury FOR UPDATE`, reentrant.
- status/type-CHECK-Drift (S330/335/359): source 'bescout_event' (357), status 'cancelled' (335), type 'bescout' alle im CHECK; db-invariants-Snapshot nicht betroffen.
- Escrow+Settle+Resync (S331): alle 3 Trigger für beide Treasuries.

## Learnings (Knowledge-Flywheel)
- **Generalisierung S331:** Wenn ein Escrow-Resync-Trigger auf mehrere Quell-Treasuries erweitert wird, MUSS der Refund-Zweig an den **Halter** (`OLD.<tenant_id>`) buchen, nicht `NEW.<tenant_id>` — sonst Refund ans falsche Konto bei gleichzeitigem Tenant-Switch. → errors-db.md.
- Resync-Trigger mit `BEFORE UPDATE OF prize_pool, type` deckt `tenant_id`-only-Edits nicht ab — editierbarer Tenant-Diskriminator gehört in die Watch-Liste ODER als bewusste Lücke dokumentieren (377 tat letzteres).
