# Slice 393 — Review

**verdict: PASS** (ohne Auflagen)
**time-spent: 7 min**

## Findings
| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | INFO (Scope-Out, korrekt) | errorMessages.ts / Validator | ~20 weitere `rpc_save_lineup`-Reject-Codes fallen weiterhin auf `'generic'` (`insufficient_sc`, `salary_cap_exceeded`, `max_per_club_exceeded`, `too_many_wildcards`, `wildcards_not_allowed`, `unknown_lineup_rule`, `invalid_lineup_rule_value`, `extra_slot_for_formation`, `invalid_slot_count_*`, `captain_slot_empty`, `wildcard_slot_*`, `bench_outfield_position_mismatch`, `bench_player_not_found`, `must_enter_first`, `event_locked`, `gk_required`, `invalid_formation`, `auth_mismatch`, `invalid_event_no_league`). | Außerhalb Slice-Scope (9 E-3-Regel-Codes). Optionaler Folge-Slice „Lineup-Reject-Coverage komplett". |
| 2 | NIT | errorMessages.ts | `unknown_lineup_rule`/`invalid_lineup_rule_value` = Admin-Konfig-Fehler (Manager-irrelevant) → `generic` hier akzeptabel. | Nichts zu tun. |

## Belege
1. **Code-Parität EXAKT:** alle 9 KNOWN_KEYS matchen 1:1 die `'error'`-Literale im kanonischen `rpc_save_lineup` (Live = Migration `20260626160000`). Keine snake/camel-Drift. Passthrough-Mechanik (`KNOWN_KEYS.has(raw)→return raw`) korrekt, identisch zu `bench_*`/`player_not_in_event_league`.
2. **DE+TR 9/9**, gleiche Zeilen (3679-3687), nicht-leer, kein Dup, JSON valide → kein MISSING_MESSAGE-Risiko (AC2 erfüllt).
3. **Wording compliant:** deskriptive Reject-Texte, kein Glücksspiel/Securities-Vokabular. „Marktwert"/„piyasa değeri" = neutrales Spieler-Attribut (nur die Kausal-Phrase „Marktwert steigt→Fee" ist verboten).
4. **JSON/Drift OK.**
5. **Vollständige Abdeckung für den Scope:** alle Codes des `lineup_rules`-Validator-Loops gemappt; übrige stammen aus anderen Validierungsblöcken = vorbestehende Gap, kein Scope-Creep.

## One-Line
Sauberer i18n-Passthrough-Slice exakt im Pattern bestehender Codes — ein Senior würde das ohne Bedenken mergen.
