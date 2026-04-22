# Slice 144e — WER-Cluster null-club-id Audit (XS investigativ)

**Datum:** 2026-04-22
**Groesse:** XS (investigative Audit + evtl. Fix)
**CEO-Scope:** nein (Data-Cleanup, keine Money/Trading)

## Ziel

Die 19 Players im Werder-Cluster (WER) die in Slice 144b als `DB=null → TM=Werder` transfer-detected auftauchten auditieren: Sind es Slice 081d Cross-Club-Contamination-Reste (club_id wurde faelschlich auf null gesetzt), oder sind es legitime "unclubbed" Cases?

## Betroffene Files

Nur Investigation — **keine Code-Changes** primaer. Falls Fix noetig:
- Supabase SQL UPDATE (via `mcp__supabase__execute_sql`)
- evtl. dokumentierende Regel in `.claude/rules/common-errors.md`

## Acceptance Criteria

1. Gesamt-Zahl `players WHERE club_id IS NULL` ermittelt (Scope-Groessenordnung).
2. WER-Cluster spezifisch: 19 Players die 144b als Werder-transfer-detected flagged, sind diese ALLE null-club-id in der DB?
3. Fuer jeden null-club-id Player: hat er `matches > 0` oder `last_appearance_gw > 0`? Wenn ja → war mal in einem Club, Club-Link wurde verloren.
4. Entscheidung: Fix-Via-UPDATE (setze club_id auf Werder fuer die 19) ODER als "legitim null" dokumentieren.
5. Wenn Fix: INV-40 oder Regel-Ergaenzung INV-39 fuer `players.club_id IS NULL` + `last_appearance_gw > 0`.

## Proof-Plan

`worklog/proofs/144e-audit.txt`: Ergebnisse aller Audit-Queries + Entscheidung + ggf. UPDATE-Log.

## Scope-Out

- Allgemeiner null-club-id-Clean-Up (wenn >100 Players null sind, wird separater Slice noetig).
- Andere Cluster jenseits Werder — erst WER-spezifisch auditieren, dann entscheiden ob Expansion.
- Slice 081d Re-Check gesamter Scope (>1 Tag Arbeit, nicht 144e).
