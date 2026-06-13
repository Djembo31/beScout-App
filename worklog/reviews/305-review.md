# CTO Review: Slice 305 — Orphan Community-Valuation Removal

## Verdict: CONCERNS (non-blocking — Residuen in-slice abgearbeitet)

DB-Drop-Removal-Chain ist sauber und airtight — RED/GREEN-Proof für Kern (2 Files + Barrel + RPC-Map + DROP FUNCTION/2 TABLE) hält §11.3-Prüfung stand. Zwei orphan Residuen zurückgelassen (Tooling-Allowlist + i18n) — genau die „Existenz ≠ Verwendung"-Drift die das Slice tilgen sollte. Non-fatal → CONCERNS. **Beide in-slice abgearbeitet (F-1 + F-2).**

## Spec-Coverage
- [x] AC-1 grep 0 Live-Refs · [x] AC-2 Files+Barrel+RPC-Map · [x] AC-3 DB-Drop (to_regclass NULL, rpc 0) · [x] AC-4 tsc 0 + 191/191

## Findings
| # | Sev | Issue | Status |
|---|-----|-------|--------|
| F-1 | MINOR | `orphan-component-detector.ts:74-75` KNOWN_ORPHANS-Eintrag für gelöschte CommunityValuation blieb | ✅ in-slice entfernt |
| F-2 | MINOR | 9 orphan i18n-Keys (de+tr 4655-4665) exklusiv von CommunityValuation; `floorPrice`/`saving` shared → behalten | ✅ in-slice: 9 entfernt, 2 shared behalten (grep-verifiziert) |
| F-3 | NIT | Proof „2 table-list" angeblich falsch | **Reviewer-Misread** — git-diff-cached bestätigt 3 Entfernungen: RPC-shape-map (1051) + public-tables-doc-map `player_fair_values` (1623) + RLS-table-array `player_valuations` (1690). Proof war korrekt; Wording präzisiert. |
| F-4 | NIT | Daten-Verlust-Diligence: kein MAX(created_at)-Beleg vor DROP | Post-hoc akzeptiert (Reviewer-Analyse LOW: orphan seit Slice 227 → strukturell kein Write möglich). Future-Regel notiert. |

## Daten-Verlust-Analyse (Reviewer, Blindspot-Fokus)
**Risiko NIEDRIG, akzeptabel.** `submit_player_valuation` (mit user_id) = einziger Write-Pfad, nur von valuations.ts (nur von CommunityValuation, orphan seit ≥Slice 227) gerufen → nach Orphan-Werden war neuer User-Write **strukturell unmöglich**. S7-Audit verifizierte 5+5 als Pre-Orphan-Testdaten. Null User-Impact.

## Code-Pfad-Bruch-Analyse (Reviewer)
Kein anderer Pfad bricht: Migration-Grep nur 3 Files (Baseline-CREATE, REVOKE, 305-DROP). `DROP TABLE IF EXISTS` ohne CASCADE = richtige Safety-Choice (würde bei übersehener FK *failen*); erfolgreicher DROP = empirische 0-FK-Bestätigung. DROP-Reihenfolge RPC→Tabellen korrekt.

## db-invariants.test.ts Struktur-Integrität (Reviewer, explizit geprüft)
Airtight. `RPC_SHAPE_WHITELIST` iteriert + queryt `get_rpc_jsonb_keys` pro RPC; übersehener Eintrag hätte „RPC not found"-FAIL getriggert. Grüner 191/191-Run **beweist** strukturelle Korrektheit — selbst-detektierender Guard.

## Positive
- DROP-Reihenfolge korrekt begründet. `IF EXISTS` + kein CASCADE = defensiv/idempotent.
- RPC-Map-Entfernung mit Removal-Marker-Kommentar (Spur für Reviewer).
- Test-Mechanik macht übersehene Einträge selbst-detektierend → GREEN-Suite = echter Guard.

## Learnings (in-slice promoted)
- errors-frontend.md „Dead-Wrapper-File (Slice 280)" erweitert: Dead-Feature-Removal RED-State-Karte MUSS 4 Residuen-Achsen abdecken — (1) Code/Service, (2) DB-Objekte, (3) i18n-Keys (messages/*.json exklusiv-konsumiert), (4) Tooling-Allowlists (orphan-detector KNOWN_ORPHANS, baselines). Grep-Pflicht: `grep -rn "<Feature>" messages/ scripts/ .claude/`.
- DROP-TABLE mit user_id-Spalte: Pflicht-Proof-Zeile `SELECT COUNT(*), MAX(created_at)` VOR DROP (Diligence muss vor irreversiblem Drop dokumentiert sein).

## time-spent
~21 min
