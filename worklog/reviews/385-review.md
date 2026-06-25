# Review — Slice 385 (E-3 Aufstellungs-Regel-Fundament)

**Reviewer:** reviewer-Agent (Cold-Context, read-only) · 2026-06-25 · time-spent 11 min

## verdict: PASS

## findings (3 NIT — bewusst nicht geheilt, kosmetisch/Scope-Out)

| # | severity | location | issue | entscheid |
|---|----------|----------|-------|-----------|
| 1 | NIT | migration Z.245-250 | min_per_own_club-Count strukturell minimal anders als max_per_club (`v_event.club_id IS NOT NULL AND p.club_id = ...` statt `p.club_id IS NOT NULL`), funktional identisch (Gleichheits-Predikat schließt NULL implizit aus). Kein Bug. | belassen — funktional korrekt, live bewiesen (AC-7) |
| 2 | NIT | migration Z.237 | Obergrenze `>11` global statt formationsabhängig (7er → min 8..11 nie erfüllbar). | dokumentierter Scope-Out (Spec Edge-Case + Builder-Treffer-Anzeige = E-4) |
| 3 | NIT | useEventActions.ts | Toast-`min` aus `event.lineupRules` (Cache) statt RPC-Error-Payload. Kosmetisch (nur Toast-Zahl); Server-Reject autoritativ. | belassen — optional später; Reject-Korrektheit unberührt |

## one-line
Ja — ein Senior würde das mergen: byte-additiver Validator, fail-closed, nachweislich kein Ressourcen-Move bei Reject, S200-Read/Write/Type/i18n-Kette lückenlos.

## Belege (Kern)
- **PATCH-AUDIT:** nur 4 DECLARE-Vars + 1 Validator-Block additiv; E-1/max_per_club/bench/holdings/salary_cap/Track-F-Wildcard/INSERT byte-erhalten (Proof B `keeps_e1`+`keeps_maxclub` true). ACL kein anon (AR-44).
- **Validator:** läuft VOR INSERT + VOR spend/earn_wildcards; AC-6 live (Reject → lineups=0/locks=0). Fail-closed unknown type. Cast-Schutz Regex VOR `::INT` (Pre-Mortem #5 / errors-db Cast-Trap).
- **S200:** lineup_rules in allen 3 Selects (inkl. getAllEventsAdmin=Edit-Populate) + /api/events `select('*')` + DbEvent + FantasyEvent + Mapper + LineupRule-Alias.
- **Write:** createEvent insert + EDITABLE_FIELDS ×2 + Klon-Select+Map + Serialisierung null-bei-leer/0/NaN.
- **i18n:** DE+TR vollständig, richtige Namespaces (fantasy/admin), compliance-konform.
- **CI-Klasse 380/382/384:** EDITABLE_FIELDS-Count nachgezogen (27/26 + toContain). 142 Tests + tsc clean.

## Positive
- AC-6 nicht behauptet sondern via force-rollback DO-Block (RAISE EXCEPTION) mit Vorher/Nachher-Count bewiesen — stärkste Money-Path-Proof-Form.
- Clubless fail-closed dokumentiert UND live bewiesen (AC-7).
- D87-Live-Baseline-Regel eingehalten.

## Offen
- AC-12 UI-Playwright post-Deploy (wie S384 bewusst nach Vercel-Deploy von main).

## Knowledge-Kopplung (D88, feedback_knowledge_coupling_active_grep)
- Reviewer-Hinweis: docs/knowledge/domain/fantasy.md im LOG aktiv per grep prüfen (generischer lineup_rules-Validator-Mechanismus = Erweiterungs-Rezept). Kein neues errors-*.md-Pattern nötig (bestehende Patterns korrekt angewendet).
