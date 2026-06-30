# Slice 470 — Perf: Covering-Indizes für 49 unindexed Foreign Keys

**Status:** SPEC · **Größe:** S · **Slice-Type:** Migration (Perf) · **Scope:** CEO autonom-Go (Anil „Policies/Index Perf-Lane") · **Datum:** 2026-06-30

> Additive Indizes (kein Access/Integrität berührt) → reine Perf. Proof = Advisor-Count + Index-Existenz.

## 1. Problem Statement
Supabase-Advisor `unindexed_foreign_keys`: **49 FK-Constraints ohne Covering-Index** → suboptimale Join-/Cascade-Performance. Autoritative Advisor-Liste (49 fkey_names) extrahiert.

## 2. Lösungs-Design
Für genau die 49 advisor-geflaggten FK-Constraints (by conname) ein Covering-Index auf die FK-Spalte(n): `CREATE INDEX IF NOT EXISTS idx_<table>_<cols> ON public.<table>(<cols>)`. DO-Loop über die conname-Liste (Spalten aus pg_constraint aufgelöst) — **additiv, idempotent, kein DROP/Rewrite**. Non-concurrent OK (FK-Spalten auf kleinen-bis-moderaten Tabellen: config + lineups/scores/etc., schneller Build).

## 3. Betroffene Files
| File | Aktion | Begründung |
|------|--------|------------|
| `supabase/migrations/20260630160000_slice_470_fk_indexes.sql` | NEU | DO-Loop CREATE INDEX, via apply_migration |

## 4. Code-Reading-Liste
- Advisor `unindexed_foreign_keys` (49 connames) — **ERLEDIGT** (autoritativ extrahiert; meine Hand-Covering-Query war PG-Array-Semantik-falsch → Advisor-Liste vertraut).
- `database.md` (FK/Index) · keine FK-Spalte auf Riesen-Tabelle (trades/transactions/holdings nicht in der Liste) → Lock-Build schnell.

## 5. Pattern-References
- Supabase-Advisor `0001_unindexed_foreign_keys`.
- §0 (Akkretion: fehlende Indizes = strukturelle Schuld) — additive Heilung.

## 6. Acceptance Criteria
```
AC-01: [PERF] alle 49 FK-Constraints haben nach Apply einen Covering-Index
  VERIFY: count der 49 connames mit Covering-Index (FK-cols = leading index-cols)
  EXPECTED: 49
  FAIL IF: < 49
AC-02: [REGRESSION] kein Funktions-/Integritäts-Change (nur Indizes additiv)
  VERIFY: db-invariants.test.ts
  EXPECTED: Failure-Menge unverändert 3 (INV-19/32/33)
  FAIL IF: neue Failure
AC-03: [IDEMPOTENZ] CREATE INDEX IF NOT EXISTS → 2. Run no-op
```

## 7. Edge Cases
| # | Case | Expected | Mitigation |
|---|------|----------|------------|
| 1 | Index existiert schon | skip | IF NOT EXISTS |
| 2 | Multi-Spalten-FK (lineups slots = 1 Spalte je) | Index auf alle FK-cols | conkey-Auflösung in Reihenfolge |
| 3 | Index-Name > 63 Zeichen | truncate | left(name,63) |
| 4 | Lock beim Build (lineups/scores) | kurz (moderate Tabellen) | non-concurrent OK |

## 8. Self-Verification
```bash
npx vitest run src/lib/__tests__/db-invariants.test.ts
# Live: count der 49 connames mit Covering-Index = 49
```

## 10. Proof-Plan
49 connames → 49 mit Covering-Index nach Apply + db-invariants unverändert → `worklog/proofs/470-fk-indexes.txt`

## 11. Scope-Out
- `auth_rls_initplan` (71) · `unused_index` (21) · `multiple_permissive_policies` (81) = separate Slices (RLS-Rewrite / DROP-Risiko / Access-Merge-Urteil).

## 12. Stage-Chain
SPEC → IMPACT (skipped: additive Indizes) → BUILD (1 Migration) → PROVE (Covering-Count + db-invariants) → REVIEW (reviewer Perf-DB) → CEO-Apply → LOG

## 13. Pre-Mortem
| # | Failure | Prob | Mitigation | Detection |
|---|---------|------|------------|-----------|
| 1 | Index-Name-Kollision | LOW | IF NOT EXISTS + table-prefix | apply-Fehler |
| 2 | falsche Spalte indiziert | LOW | conkey aus pg_constraint (Wahrheit) | AC-01 Covering-Check |
| 3 | langer Lock | LOW | keine Riesen-Tabelle in Liste | — |

## Open Risiko
Reine additive Indizes (IF NOT EXISTS) für advisor-autoritative FK-Liste. Kein Access/Integrität/Body. Restrisiko ~0 (additiv); db-invariants bestätigt kein Funktions-Change.
