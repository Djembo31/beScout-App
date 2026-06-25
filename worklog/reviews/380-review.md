# Review — Slice 380 (E-1: Fußball-Liga an die Event-Aufstellung binden)

**Reviewer:** Cold-Context-Agent · **Datum:** 2026-06-25 · **time-spent:** ~9 min

## Verdict: PASS

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT (pre-existing, NICHT von 380 eingeführt) | migration `rpc_save_lineup` Track-F-Wildcard-Block | Bei `events.club_id IS NULL` + `league_id` gesetzt + Wildcard-Delta ≠ 0 → `invalid_event_no_league` (Track F leitet Wildcard-Liga aus `club_id → clubs.league_id` ab, nicht aus neuem `events.league_id`). Spec Edge #9 (clubless+league_id) wird nur vom Liga-Gate respektiert, nicht von der Wildcard-Buchung. **Heute kein Live-Treffer** (alle 207 Events haben club_id, AC2). | Optional in E-4 (vereinslose Events): Track-F-Lookup auf `COALESCE(v_event.league_id, (SELECT league_id FROM clubs WHERE id=v_event.club_id))`. Kein Blocker für 380. |
| 2 | NIT | migration DECLARE `v_event_league_id -- Track F addition` | Kommentar leicht irreführend (neues Gate nutzt `v_event.league_id` direkt, andere Variable). Harmlos. | Bei nächstem Touch präzisieren. |

## One-Line
Ja — sauber gebauter additiver Gate, byte-identische Money-Baseline, vollständiges TS-Plumbing und i18n; ein Senior würde das so mergen.

## Belege (Kurz)
- **Liga-Block** korrekt platziert (nach bench-holdings, vor min_sc). `IF v_event.league_id IS NOT NULL` → bei NULL übersprungen (AC2/AC3 regression-frei). Money/Wildcard/Salary/max_per_club byte-identisch zur Live-Baseline (D87).
- **Wildcard-Slots** werden mitgeprüft (alle 12, ohne Wildcard-Ausnahme) — gewollt (sonst Gate via Wildcard umgehbar). Spec Edge #5.
- **S200/J3-Propagation vollständig** über 8 Achsen (Type, Mapper, INSERT, Klon-select, EDITABLE_FIELDS ×2, build*Payload ×2, Form-State, Modal-Select). Kein Drift.
- **Error-Code** `playerNotInEventLeague`: KNOWN_KEYS + Regex + DE/TR vorhanden, kein i18n-Leak. KEIN CHECK/Enum-Drift (RPC-Return-Wert, kein DB-Constraint → S330/S379-Falle trifft nicht).
- **Compliance** ok (neutrale Fußball-Terminologie, kein dynamischer Wert/$SCOUT).
- **fail-closed JOIN** (Edge #4/AC7) live bestätigt.

## Positive
- Lückenlose Propagation der häufigsten Drift-Klasse (optional-Field-Addition).
- Echter Live-BEGIN…ROLLBACK-Smoke AC3-AC7 + proacl-Verify + has_gate-Body-Check.
- Scope-Disziplin: Lineup-Picker-Vorfilter explizit E-1b (kein Silent-Cap).

## Entscheidung
PASS — beide Findings sind non-blocking NITs (Finding #1 = E-4-Vormerkung, kein Live-Effekt). Kein REWORK nötig. Track-F/E-4-Hinweis in E5-Roadmap aufnehmen.
