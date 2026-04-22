# Slice 144c Review — 2026-04-22

**Verdict:** PASS

**Reviewer:** `reviewer`-Agent Dispatch Nr. 1 (Cold-Context).

**Scope reviewed:**
- `worklog/specs/144c-last-squad-check-before-transfer-skip.md` — 7 ACs
- `scripts/tm-squad-scrape-local.ts:194-258` (processClub inner loop, gehuntet)
- `worklog/proofs/144c-logic-proof.txt` — tsc + diff + 4-Pfade-Walkthrough
- Referenz: `worklog/reviews/144b-review.md` Finding #3 (Bug-Identifikation)
- Referenz: Slice 144 Spec AC7, Slice 144b Integrity-Math

## Spec-Coverage

Alle 7 ACs erfüllt (AC1-AC7 verifiziert).

## Findings

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | NITPICK | tm-squad-scrape-local.ts log-wording | "last_squad_check gesetzt" erschien faelschlich auch im dry-run-Pfad wo gar nichts gesetzt wird | **FIXED**: Log-Lines jetzt nach dry/prod gesplittet — dry sagt "would set", prod sagt "set" nach success (und nur bei success, nicht bei error) |
| 2 | OBSERVATION | Proof | Proof-Plan in Spec nannte `144c-dry-run.log`, Proof-File hat nur Logik-Walkthrough | **SCOPE-OUT**: dry-run braucht TM-Access + 50-70s Runtime, Logic-Proof + tsc + diff reichen fuer XS logic-reorder. Empirische Verifikation kommt in naechstem Full-Run (Slice 144f oder direkt) |
| 3 | OBSERVATION | Cross-Club Detection fuer null-club-id | Players mit `club_id IS NULL` werden durch `!== club.clubId` als transfer-detected klassifiziert | **POSITIV**: Fix sorgt dafuer dass diese Players jetzt auch `last_squad_check`-Signal bekommen → erleichtert 144e Audit (nachgelagerter Slice) |

## Reviewer-spezifische Pruefpunkte

1. **Stats-Counter nicht verfaelscht:** `players_transfer_detected++` vor UPDATE, semantisch Detection-Counter (konsistent zum existing `players_updated_shirt++` Pattern).
2. **Keine club_id-Hintertuer:** UPDATE-Objekt hart-kodiert `{ last_squad_check: now }`, kein spread/merge. `continue` nach Z.229 macht den club_id-UPDATE-Pfad Z.255-257 unerreichbar im Transfer-Skip-Fall.
3. **Dry-run korrekt:** `continue` vor UPDATE-Call, keine DB-Writes. Log-Line zeigt Intent.
4. **Error-Handling konsistent:** console.log + continue (analog Z.255-256), kein throw. Best-effort Batch-Semantik.
5. **Math-Erwartung naechster Full-Run:** `last_squad_check_populated == matched` (nicht hart == 2841 wegen Kader-Drift zwischen Runs).
6. **Architektur sauber:** 2-Pfade (transfer-skip + dry/prod) mit je eigenem continue — lesbar, kein Refactor-Bedarf.

## Positive

- **Saubere Single-Field-UPDATE** — keine Merge-Gefahr mit club_id/shirt_number/market_value
- **Dry-run-Pfad explizit instrumentiert** mit eigener Log-Line
- **Kommentar-Block** dokumentiert das *warum* (Hintertuer-Vermeidung)
- **Error-Handling konsistent** zum existing pattern
- **Counter-Semantik durchgedacht**
- **Proof logically rigorous** — 4-Pfade-Walkthrough deckt alle Kombinationen ab

## Learnings-Kandidaten

1. **Pattern fuer `patterns.md`:** "Single-field-UPDATE als Signal-Only" — hart-kodiertes Objekt-Literal schuetzt gegen spread/merge-Drift.
2. **common-errors.md Section 1 ergaenzen:** "Early-Continue-Antipattern" — Side-Effect-Commits vor Early-Exit-Gates ziehen (heartbeat, last_seen, last_attempt). Analog zu "Cron-Guard API vs DB-Count" Slice 140.

**Time-spent:** ~18 min (Reviewer) + ~3 min (NITPICK-Rework).
