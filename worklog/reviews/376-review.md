# Review — Slice 376 (Monats-Liga Payout aus Plattform-Topf)

**Reviewer:** reviewer-agent (cold context) · **Datum:** 2026-06-25 · **Scope:** Money/CEO
**Verdict:** CONCERNS (Money-Logik PASS-grade; Concerns sind Artefakt/Prozess-Ebene, beide behoben)
**Time-spent:** 14 min

## Money-Logik — PASS auf allen geprüften Achsen
- **Zero-Sum:** Debit gegen `v_total_paid` (actual), Coverage gegen `v_total_needed` (max) — korrekte Asymmetrie für Winner ohne Wallet. Σ Wallet-Credits == Topf-Debit == Topf-Abfluss. ✓
- **Race-frei:** Coverage-Check unter Singleton-Row-Lock; `book_platform_treasury` re-lockt in derselben Txn = harmloser re-entranter No-Op. ✓
- **Idempotenz-Asymmetrie:** RAISE rollt Snapshot-Inserts zurück → Monat retry-bar; Pre-Persist-Guards bleiben jsonb-RETURN. Bewusst + korrekt. ✓
- **overall-Median:** `(a+b+c)-GREATEST-LEAST` exakt + ties-safe, ORDER BY nutzt dieselbe Expr. ✓
- **Reward-Konstanten:** 500000/250000/100000 byte-identisch (PATCH-AUDIT S356-Klasse). ✓
- **Genesis-Seed:** idempotent (NOT EXISTS), source-CHECK-Widening additiv/safe. ✓
- **Compliance:** keine user-facing €/Investment-Wording berührt. ✓

## Findings
| Sev | Location | Issue | Fix | Status |
|-----|----------|-------|-----|--------|
| HIGH | supabase/migrations/ | Angewandte Migration lag nicht als Repo-File vor (`apply_migration` schrieb nur in DB) → greenfield-reset reproduziert RPC nicht, PATCH-AUDIT-Byte-Diff unauditierbar | Migration-File `20260625130000_slice376_*.sql` mit exaktem angewandtem SQL schreiben + committen | ✅ BEHOBEN |
| MEDIUM | worklog/active.md + reviews/ | Review nicht persistiert, active.md noch BUILD | Review nach worklog/reviews/376-review.md, active.md → PROVE/REVIEW | ✅ BEHOBEN |
| LOW (flag, pre-existing) | close_monthly_liga ORDER BY | Median-ORDER BY ohne deterministischen Tiebreaker bei exakten Ties am Rang-3-Cutoff — geerbt aus der per-Dim-Rangfolge, NICHT von 376 eingeführt | Optionaler Folge-Slice (Tiebreaker user_id), kein Blocker | offen (pre-existing) |

## Verified-against
- `20260624120000_slice_357_platform_treasury_foundation.sql` (book_platform_treasury + ledger-CHECK + get_platform_balance)
- `20260415050200_ar54_j9_close_monthly_liga_wallet_payout.sql` (vorheriger Minting-Body, Design-Diff)
- Live `pg_get_functiondef('close_monthly_liga')` post-Migration.
