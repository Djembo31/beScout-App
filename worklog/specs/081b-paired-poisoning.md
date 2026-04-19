# Slice 081b — Paired-Poisoning (Cluster 2-3 mit gleichem last_name)

**Status:** SPEC
**CEO-Scope:** JA (Money-Critical — market_value_eur semantics)
**Stage-Chain target:** SPEC → IMPACT (skipped — data-flag only) → BUILD → PROVE → LOG

## Ziel (1 Satz)

36 Spieler in 18 Paared-Clustern (2-3 Rows mit identisch mv+contract_end UND gleichem TR-normalisiertem last_name — z.B. Arda Yilmaz + Baris Alper Yılmaz bei Galatasaray) werden als `mv_source='transfermarkt_stale'` markiert, damit Phase-A.2-ReScraper sie gezielt neu pullt.

## Kontext

Slice 081 hat Cluster >= 4 erfasst. Der konkrete "Aydin/Arda Yilmaz"-Fall den Anil gemeldet hat war aber nur ein Paar (Cluster=2, beide MV=26.000.000, contract_end=2021-07-10). Dieser Slice fängt genau solche Paare — aber nur wenn AUCH der last_name übereinstimmt (normalisiert via TR-Diakritika-Strip). Das verhindert False-Positives bei legitimen identischen MVs verschiedener Spieler.

Sekundäre Erkenntnis während Probe-Query: mehrere "Paare" sind tatsächlich **echte duplizierte Player-Rows** (Mio Backhaus × 2, Marco Friedl × 2, Senne Lynen + Senne Maaike Lynen etc.) — eigene Bug-Klasse (Player-Dedup, Slice 081d).  Stale-Flag ist für beide Fälle korrekt und legal.

## Betroffene Files

| File | Aenderung |
|------|----------|
| `supabase/migrations/NNN_slice_081b_flag_paired_poisoning.sql` | NEW — UPDATE mit SELF-JOIN auf (mv, contract_end, norm_last) |
| `src/lib/__tests__/db-invariants.test.ts` | +INV-37 Regression-Guard fuer Paired-Poisoning |
| `worklog/proofs/081b-before.txt` + `081b-after.txt` | Invariant + Counts |

## IMPACT

Skipped: Nur Data-Flag. MV unveraendert, Trigger feuert nicht, keine Service-Changes.

## Acceptance Criteria

1. Migration erfasst genau 36 Spieler, alle kommen auf `mv_source='transfermarkt_stale'`.
2. `market_value_eur` + `reference_price` SUM byte-identisch vor/nach.
3. INV-37 greift: fail wenn Cluster 2-3 mit gleichem norm_last existieren die nicht als stale markiert sind.
4. Arda Yilmaz UND Baris Alper Yılmaz sind beide nach Migration `mv_source='transfermarkt_stale'`.
5. tsc clean, INV-36 + INV-37 gruen.

## Edge Cases

1. **TR-Diakritika**: `ı` (U+0131) vs `i` (U+0069) muessen matchen. `LOWER(TRANSLATE(name, 'şçğıöüİŞÇĞÖÜ', 'scgiouisCGOU'))` pattern aus common-errors.md.
2. **Multi-word last_names**: "von Bergmann" vs "Bergmann" — wuerden NICHT matchen. Das ist korrekt — false-positive-arm.
3. **Legitime Pairs** (2 Spieler desselben Clubs, gleicher Nachname, identisch MV zufaellig): Mit Schwelle 2 + last_name-match sehr unwahrscheinlich. Wenn doch: manuelle Unflag via `UPDATE players SET mv_source='manual_verified' WHERE id=X`.
4. **Exposure 0 Holdings, 0 Orders** laut Probe-Query — risk-free.

## Proof-Plan

1. Before: `SELECT COUNT(*) FROM players WHERE mv_source='transfermarkt_stale'` (soll 897 sein).
2. Migration.
3. After: soll 933 sein (897 + 36).
4. Invariant: sum_mv + sum_ref + holdings identisch.
5. INV-37: green.
6. Arda Yilmaz: `mv_source='transfermarkt_stale'`.
