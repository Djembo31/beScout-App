# 013 — Turkish Player-Name NFC-Normalize (TURK-03)

## Ziel

1 Spieler (`T. İnce`, id=`bb44cdb4-...`) hat `last_name` in NFD-dekomposierter Form (bytes `49 cc 87 ...` = `I` + U+0307 combining dot above + `nce`), waehrend alle anderen İ-Namen in NFC-komposierter Form (byte `c4 b0` = U+0130 single codepoint) vorliegen. TURK-03 Test (`last_name.includes('İ')`) findet den Spieler via SQL `ILIKE '%İ%'` (Postgres ist Codepoint-agnostisch), aber der JS-Consumer-Check `includes('İ')` (U+0130 literal) scheitert → Test fails.

Fix: NFC-normalize alle Player-Namen. Idempotent: Rows bereits in NFC bleiben identisch. Nur 1 Row aendert sich. Defensiver Ansatz fuer Prevention zukuenftiger Import-Drift.

## Klassifizierung

- **Slice-Groesse:** XS (1 Migration, 1 Row effektiv betroffen)
- **Scope:** **CTO-autonom** — Data-Hygiene auf Player-Namens-Feld. Kein Money/Trade-Impact (Spielername aendert sich visuell NICHT, nur byte-Kodierung). Keine Business-Logik-Aenderung.

## Betroffene Files

| File | Aenderung |
|------|-----------|
| `supabase/migrations/20260417040000_players_nfc_normalize.sql` (NEW) | `UPDATE players SET first_name = normalize(first_name, NFC), last_name = normalize(last_name, NFC) WHERE ...` |

## Acceptance Criteria

1. Migration angewandt.
2. `SELECT COUNT(*) FROM players WHERE last_name != normalize(last_name, NFC) OR first_name != normalize(first_name, NFC)` = 0.
3. `T. İnce`-Row hat `last_name` bytes `c4b0...` (NFC) nach Migration.
4. TURK-03 Test gruen (plus TURK-04, TURK-05 bleiben gruen).

## Edge Cases

1. **Andere Tabellen** (clubs.name, profiles.display_name, profiles.handle) — NICHT in Scope dieses Slices. Separater Slice falls Tests scheitern. TURK-06/TURK-07 bleiben gruen → andere Tabellen sind OK.
2. **NFC-IMMUTABLE-CHECK** (CHECK constraint `last_name = normalize(last_name, NFC)`): Nice-to-have als Prevention, aber `normalize()` ist `IMMUTABLE` nur ab PG14 garantiert. Skip fuer jetzt, separater Slice wenn Import-Path-Fix notwendig wird.
3. **Render-Impact**: Die visuell identischen Zeichen aendern sich nur in ihrer Unicode-Repraesentation. In allen Browsern/Fonts gleiche Darstellung. Kein UX-Impact.

## Proof-Plan

- `worklog/proofs/013-before-after.txt` — Byte-Repraesentation des Ziel-Rows vorher/nachher
- `worklog/proofs/013-tests.txt` — TURK-* Suite vitest (10/10 gruen)

## Scope-Out

- **Import-Path-Fix**: Welcher Import-Pfad hat NFD-Form eingefuegt? Investigation separater Slice. Aktuell 1-Row-Drift, kein systematisches Problem.
- **NFC-CHECK constraint** auf players.*.name: separater Slice falls Drift wiederkehrt.
- **Normalisierung fuer clubs.name, profiles.*, research_posts, etc.**: separat, wenn sich Drift dort zeigt.

## Stages

- SPEC — dieses File
- IMPACT — inline (Data-only, idempotent)
- BUILD — 1 Migration (UPDATE statement)
- PROVE — before/after bytes + tests
- LOG — commit + log.md
