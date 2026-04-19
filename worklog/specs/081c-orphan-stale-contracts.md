# Slice 081c — Orphan Stale Contracts

**Status:** SPEC
**CEO-Scope:** JA (Money-Critical field semantics, grosser Scope)
**Stage-Chain:** SPEC → IMPACT (skipped) → BUILD → PROVE → LOG

## Ziel

1434 Spieler mit `contract_end < CURRENT_DATE - INTERVAL '12 months'` (Vertrag mindestens 1 Jahr abgelaufen, nicht aktualisiert) als `mv_source='transfermarkt_stale'` markieren. Diese Spieler haben entweder (a) verlängert ohne TM-Update, (b) transferiert, oder (c) nicht mehr aktiv. In allen Faellen sind die TM-Daten stale.

## Schwelle-Rationale

- 6 Monate: 2240 Spieler — zu aggressiv, fresh-expired Contracts (2025-Q4) miterfasst
- 12 Monate: **1434 Spieler** — konservativ, nur eindeutig stale (Vertrag >1 Jahr um)
- 24 Monate: ~650 Spieler — zu wenig, laesst 2024er Stale durchgehen

Gewaehlt: **12 Monate** — balanced.

## Betroffene Files

- `supabase/migrations/20260420121500_slice_081c_flag_orphan_stale_contracts.sql` (NEW)
- `src/lib/__tests__/db-invariants.test.ts` (+INV-38)
- `worklog/proofs/081c-after.txt`

## Acceptance

1. 1434 zusaetzliche Rows auf `transfermarkt_stale` gesetzt (Total stale: 933+1434 = 2367).
2. Money-Invariant byte-identisch.
3. INV-38 grün: kein unflagged Player mit contract_end < heute − 12 Mon.
4. Holdings-Balances / Orders unveraendert.

## Edge Cases

1. **Heute noch aktive Spieler mit falschem TM contract_end**: Genau der Sinn. Flag → Re-Scraper holt aktuellen Contract.
2. **56 Spieler in Holdings**: Flag aendert keine Balances, nur Re-Verify-Signal.
3. **17 offene Orders**: Orders laufen normal weiter, Order-Matching durch Flag nicht beeinflusst.
4. **Holdings werden sichtbar mit "Wert wird überprüft"-Badge** (separater UI-Slice, nicht Teil 081c).
