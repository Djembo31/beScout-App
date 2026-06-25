# Slice 386 Review — E-3 Alters-Fenster (age_min/age_max)

**Reviewer:** Cold-Context reviewer-Agent · **Datum:** 2026-06-25 · **time-spent:** 14 min

## Verdict: PASS (mergebar)

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NITPICK | `useEventForm.ts:24-27` (`rulesFromForm.push`) | Guard ist `n >= 1`, nicht `n >= 14` für Age. Tippfehler „5" im Age-Feld serialisiert `{age_max:5}` → RPC rejected korrekt (`invalid_lineup_rule_value`), aber User sieht Fehler erst beim Lineup-Speichern, nicht beim Event-Erstellen. Funktional safe (server fail-closed), nur UX-Latenz. | Optional E-4: Builder-seitige Min-Bound-Validierung 14..50 vor Submit. Kein Blocker. |
| 2 | NITPICK | Migration age-Branch | Zwei nahezu identische Loop-Bodies (Starter `v_all_slots` + Bank `v_bench_uids`) mit dupliziertem age-Check. Bewusst gewählt (Scope-Spiegel E-1-Liga-Bindung macht es genauso). | Akzeptabel. Keine Aktion. |

→ Beide NITPICK bewusst nicht geheilt (UX-Polish = E-4 Scope-Out · Duplikation = E-1-Pattern-Konsistenz).

## One-Line
Ja — ein Senior würde das mergen: additiver Validator gegen Live-Baseline, fail-closed, Resource-Move strikt nach dem Validator, 15/15 ACs force-rollback-bewiesen, i18n vollständig DE+TR im korrekten Namespace.

## Belege (Fokus-Punkte)

1. **PATCH-AUDIT (PASS).** Alle Nicht-Validator-Blöcke byte-identisch zur 385-Baseline (E-1 Liga, max_per_club, salary_cap, bench, wildcard spend/earn, INSERT/UPDATE, holding_locks). Einzige Änderungen: DECLARE `v_player_age`, Whitelist-Erweiterung, Bound-Relokation in min_per_own_club-CASE, additiver age-Branch. Bestätigt via `pg_get_functiondef`-ILIKE (Konstanten-Audit S356-konform: `age_bound(14..50)` + `count_bound(1..11)` beide `true`).
2. **Starter+Bank fail-closed (PASS).** Beide Loops prüfen `age IS NULL OR > max OR < min` → Reject. Konsistent zu E-1. AC-3 (Bank) + AC-5 (null) PASS. Auto-Sub-Umgehung geschlossen.
3. **Bound-Relokation bricht 385 NICHT (PASS).** AC-6c/6d (min_per_own_club 0/99 → weiter invalid).
4. **Serialisierung — 385-Verlust-Falle behoben (PASS).** `rulesFromForm` baut Liste aus allen 3 Feldern. AC-7 Multi-Rule PASS.
5. **i18n (PASS, S333).** `ageMaxExceeded`/`ageMinNotMet` in `fantasy`-ns; Builder-Labels in `admin`-ns. Beide Namespaces korrekt, DE+TR vollständig, Platform DE-hardcoded (S196-exempt).
6. **Resource-Move (PASS).** Validator VOR INSERT + spend/earn_wildcards. AC-8 (locks 0→0) PASS.

## Positive
- `v_player_age` deklariert; nicht-numerischer value durch `^[0-9]+$`-Guard vor `::INT` abgefangen (Pre-Mortem #5).
- Discriminated-Union-Reject-Shape konsistent.
- Daten-Voraussetzung verifiziert (players.age 99,4%), nicht angenommen.
- `LineupRuleType` sauber extrahiert, Form-Helper typsicher generisch — echtes Fundament für Folge-Regeln.
- Mobile: Inputs `min-h-[44px]`, `inputMode="numeric"`, `aria-label`, `htmlFor`.

## Learning für Knowledge-Capture (errors-db.md)
**Generischer JSONB-Regel-Validator — Wert-Bound PRO REGELTYP, nie global.** Ein global hartcodierter Bound (`1..11`) in einer als generisch deklarierten Validator-Schleife ist ein latenter Fundament-Bug: passt nur zur ersten Regel-Art, blockt jede neue Regel mit anderem Wertebereich (age 14..50, künftig mv_max in Mio). Bei generischem Listen-Validator den Bound von Anfang an in die per-type CASE legen.
