# Slice 084 — Player-Row-Dedup (Same-Club Duplicates)

**Status:** SPEC → BUILD
**CEO-Scope:** NEIN (0 Holdings/Orders/Trades betroffen — Data-Integrity-Only)
**Stage-Chain:** SPEC → IMPACT (skipped — 0 Money-Impact) → BUILD → PROVE → LOG

## Ziel

2 Same-Club Duplicate-Rows auf `club_id=NULL` setzen (analog Slice 081d).
Canonical Row (ältere, mit Match-History) bleibt sichtbar.

## Betroffene Rows

| Canonical (behalten) | Fake (`club_id=NULL`) | Club | Grund |
|----------------------|------------------------|------|-------|
| `b73f8f3a-176b-4139-90ce-99c8a1fe2069` Jake O'Brien | `791ff869-be13-4365-868b-7e6a585ce501` | Everton | Fake hat 0 matches, älter=Canonical |
| `a72fc666-7b7d-4425-9b87-3263cf26ebc5` Nico O'Reilly | `65f98e3d-3292-4f79-b8c4-c3fc0e5395c5` | Man City | Fake hat 0 matches, älter=Canonical |

**Kriterium Canonical:** Höhere `matches` + früherer `created_at`.
**Kriterium Fake:** `matches = 0` + jüngerer `created_at` (16.04. Sync-Contamination).

## Acceptance

1. Beide Fake-Rows: `club_id=NULL`, `api_football_id=NULL` (damit sync-daily sie nicht re-linkt).
2. Canonical-Rows unverändert (keine Property-Merge nötig, Money-Invariant).
3. Manchester City + Everton Kader-Count `-1` jeweils.
4. 0 Holdings betroffen (vorab verifiziert per SQL).
5. INV-40 (neu): `same-club-duplicates` = 0.

## Proof-Plan

- SQL: Before/After Kader-Counts Everton + Man City
- SQL: `same-club-duplicates = 0`
- Tests: INV-36..40 grün
- Money-Invariant: sum_mv + sum_ref + holdings byte-identisch

## Edge Cases

1. **Apostrophe-Match:** `O'Brien` + `O'Reilly` nutzten normale `'`-Chars (nicht smart-quote `'`). TRIM + LOWER greift.
2. **api_football_id unterschiedlich:** Fake-Rows haben je eine verschiedene api_football_id — die muss auch auf NULL gesetzt werden, sonst re-linkt sync-daily beim nächsten Run.
3. **Re-Contamination-Prevention:** INV-40 catcht zukünftige Duplicates automatisch.

## Scope-Out

- 11 Ghost-Rows (`club_id=NULL`) sind bereits via Slice 081d clean — nichts zu tun.
- Holdings-Merge-Logic: nicht nötig (0 Holdings an Fake-Rows).
- Transferierte Spieler (verschiedene Clubs, gleicher Name) — separate Analyse.
