# Slice 386 — E-3 Alters-Fenster (`age_min`/`age_max` Aufstellungs-Regel)

**Slice-Type:** Migration (Money-nahe RPC) + Service + UI + i18n
**Größe:** S
**Scope:** Money-nah / §3 — neue Regel-Prüfung läuft im selben Validator-Block wie 385, VOR INSERT + VOR Wildcard-Bewegung (fail-closed). Selbst gebaut, Reviewer-Pflicht.
**CEO-Entscheid:** Anil 2026-06-25 (AskUserQuestion) — nächster Slice = E-3 Alters-Fenster.

---

## 1. Problem-Statement (Evidence)

Slice 385 hat das **Fundament** für Aufstellungs-Regeln gebaut (JSONB `events.lineup_rules` + generischer Validator in `rpc_save_lineup`), aber nur EINE Regel-Art (`min_per_own_club`). Das Zielbild (Epic `event-creator-liga-epic.md` §3b, D107): „einfach aber mächtig, wildeste Kombinationen" — z. B. „nur U21-Event" oder „Veteranen-Event". Dieser Slice fügt die erste **Erweiterung** hinzu: ein Alters-Fenster.

**Daten-Check (verifiziert 2026-06-25, Voraussetzung des Handoffs):** `players.age` (integer) ist zu **99,4 %** befüllt (4529/4556 aktive Spieler im Bereich 14..50). Regel baut auf echten Daten, nicht auf Luft.

**Gemeldeter Design-Schwachpunkt aus 385 (wird hier behoben):** Der „generische" Validator hat einen **global hartcodierten Wert-Bound `1..11`** für ALLE Regeltypen. Das ist nicht generisch — `1..11` passt nur zu Zähl-Regeln (`min_per_own_club`). Eine Alters-Regel (Werte 18/21/35) würde fälschlich als `invalid_lineup_rule_value` abgelehnt. → Dieser Slice zieht den Bound **pro Regeltyp** ein. Damit ist das Fundament wirklich generisch für alle Folge-Regeln (MV-Deckel, Nation, Positions-Quote).

**Evidence:**
- Epic `worklog/notes/event-creator-liga-epic.md` §5 (E-3-Regel-Erweiterungen).
- `memory/decisions.md` **D107** (Zwei-Töpfe + JSONB-Regel-Liste, Weg B).
- Handoff-Anker „➡️ NÄCHSTER SLICE = E-3-Regel-Erweiterungen".

## 2. Lösungs-Design

**Kein Schema-Change** (das ist der Sinn von Weg B / D107) — `age_min`/`age_max` sind neue Einträge in der bestehenden `events.lineup_rules`-JSONB-Liste.

**RPC (`rpc_save_lineup` CREATE OR REPLACE gegen Live-Baseline):** Im bestehenden Validator-Block (385):
- Whitelist erweitern: `type IN ('min_per_own_club','age_max','age_min')`.
- **Globalen `1..11`-Bound entfernen**, Bounds **pro Regeltyp** in die jeweilige CASE-Verzweigung: `min_per_own_club` → 1..11 (byte-äquivalent zu 385); `age_max`/`age_min` → 14..50.
- **Neue Branches `age_max`/`age_min`:** prüfen ALLE aufgestellten Spieler (Starter `v_all_slots` **+ Bank `v_bench_uids`** — Scope-Spiegel der E-1-Liga-Bindung, weil Auto-Sub Bank-Spieler einwechselt). `age_max`: jeder Spieler `age <= value`. `age_min`: jeder `age >= value`. **Fail-closed bei `age IS NULL`** → Reject (Spieler kann Eignung nicht beweisen; konsistent zu E-1-Liga-Bindung `club_id IS NULL` → reject). Reject-Codes: `age_max_exceeded` / `age_min_not_met` (mit `limit`, `player_id`, `age`).
- Neue DECLARE-Variable `v_player_age INT`.
- Global bleibt: NULL-Check + numerischer Regex `^[0-9]+$` (alle Regeln sind nicht-negative Integer).

**Read-Pfad:** KEINE Änderung — `lineup_rules` (ganze JSONB-Liste) ist seit 385 in allen 3 Selects + Mapper + Type + EDITABLE_FIELDS. Age sind nur weitere Listen-Einträge.

**Write-Pfad:** Serialisierungs-Helper von „EIN Feld" auf „echte Regel-Liste" generalisieren — `rulesFromForm()` baut die Liste aus allen aktiven Feldern (`minPerOwnClub` **+** `ageMin` **+** `ageMax`). Das behebt nebenbei die 385-Scope-Out-Falle „Form serialisiert nur min_per_own_club → andere Regel ginge verloren". Form bekommt 2 neue Felder + 2 Inputs (beide Builder). `LineupRule`-Type wird Union der 3 Typen.

## 3. Betroffene Files

| File | Änderung | Warum |
|------|----------|-------|
| `supabase/migrations/20260625230000_e3_age_lineup_rule.sql` | `rpc_save_lineup` CREATE OR REPLACE: Whitelist + per-type Bounds + age-Branches (Starter+Bank, fail-closed) + `v_player_age` | Regel + Bound-Fix |
| `src/types/index.ts` (`LineupRule`) | Union: `'min_per_own_club' \| 'age_min' \| 'age_max'` | Type-Wahrheit |
| `src/components/admin/hooks/types.ts` | `EventFormState.ageMin/ageMax` + `INITIAL_FORM_STATE` | Form-State |
| `src/components/admin/hooks/useEventForm.ts` | Helper `ruleValue`/`rulesFromForm` (generalisiert) · `populateFromEvent` · `buildCreatePayload`/`buildUpdatePayload` | Form↔Regel-Liste |
| `src/components/admin/EventFormModal.tsx` | 2 Zahlen-Inputs (age min/max, min14 max50) + Labels-Type-Felder | UI-Eingabe |
| `src/components/admin/AdminEventsTab.tsx` (Club-Admin) | Labels via `t('ageMinLabel')` etc. | i18n-Builder |
| `src/app/(app)/bescout-admin/AdminEventsManagementTab.tsx` (Platform) | Labels DE-hardcoded (S196-exempt) | Platform-Builder |
| `src/features/fantasy/hooks/useEventActions.ts` | Cases `age_max_exceeded`/`age_min_not_met` → `addToast(t(...))` | Fehler-UX |
| `messages/de.json` + `messages/tr.json` | Toast-Keys `ageMaxExceeded`/`ageMinNotMet` (fantasy-ns) + `ageMin/Max Label/Placeholder/Hint` (admin-ns) | i18n |

## 4. Code-Reading-Liste (Pflicht VOR Implementation) — ✅ alle gelesen

1. **LIVE `pg_get_functiondef('public.rpc_save_lineup')`** — ✅ gelesen. Validator-Block (385) iteriert `jsonb_array_elements`, hat global `1..11`. `v_all_slots`=12 Starter, `v_bench_uids`=Bank. E-1-Liga-Bindung prüft Starter+Bank fail-closed (Scope-Vorbild). **Baseline = dieser Live-Body, NICHT Migrations-Datei** (D87/PATCH-AUDIT).
2. `src/components/admin/hooks/useEventForm.ts` — ✅ `minPerOwnClubFromRules`/`rulesFromMinPerOwnClub` (Z.15-25), `populateFromEvent` (Z.54), `buildCreatePayload` (Z.196), `buildUpdatePayload` (Z.243).
3. `src/components/admin/hooks/types.ts` — ✅ `EventFormState` (Z.18 minPerOwnClub) + `INITIAL_FORM_STATE` (Z.63).
4. `src/components/admin/EventFormModal.tsx` — ✅ minPerOwnClub-Input (Z.332-355, `isFieldDisabled('lineup_rules')`), Labels-Type (Z.46-48).
5. `src/features/fantasy/hooks/useEventActions.ts` — ✅ Error-Switch (Z.409-421), `min_per_own_club_not_met` liest `event.lineupRules?.find(...)`.
6. `src/types/index.ts` — ✅ `LineupRule` (Z.739), `DbEvent.lineup_rules` (Z.789).
7. `src/features/fantasy/services/events.mutations.ts` — ✅ createEvent insert (Z.81), Klon-Select+Map (Z.141/194), EDITABLE_FIELDS (Z.283/291) — `lineup_rules` schon drin, **KEIN EDITABLE_FIELDS-Count-Change** (age serialisiert in bestehende Spalte → keine 380/382-CI-Rot-Falle).
8. `AdminEventsTab.tsx` (Z.47-50) + `AdminEventsManagementTab.tsx` (Z.31-38) — ✅ zwei Label-Quellen (Club via `t()`, Platform DE-hardcoded).
9. `messages/de.json`/`tr.json` — ✅ Lineup-Toast-Keys @ Z.976 (fantasy-ns), Admin-Labels @ Z.2844 (admin-ns) → neue Keys in DENSELBEN Namespaces (S333).

## 5. Pattern-References

- **S385** — direktes Vorbild: Validator-Mechanik, JSONB-Serialisierung im Form, beide Label-Builder, Error-Toast-Kette.
- **D107** — Aufstellungs-Regeln = JSONB-Liste, neue Regel = kein Schema-Change.
- **E-1 Liga-Bindung (S380)** — Scope-Vorbild „Starter + Bank, fail-closed bei NULL" für eine Per-Spieler-Eignungs-Regel.
- **errors-db.md PATCH-AUDIT** — CREATE-OR-REPLACE gegen Live-Body; alle Nicht-Validator-Blöcke byte-identisch (Konstanten prüfen).
- **S333** (MISSING_MESSAGE) — i18n-Key im richtigen Namespace, Live-Render-Console-Scan.
- **S196** — Platform-Admin DE-hardcoded ist exempt (strukturell kein MISSING_MESSAGE).

## 6. Acceptance Criteria (executable)

- **AC-1 [HAPPY age_max]** Event `lineup_rules=[{type:'age_max',value:21}]`, Lineup nur ≤21-Spieler (Starter+Bank) → `{ok:true}`. VERIFY: SQL force-rollback.
- **AC-2 [REJECT age_max]** Gleiches Event, ein Starter mit age 30 → `{ok:false, error:'age_max_exceeded', limit:21}`. FAIL-IF: ok:true ODER Resource-Move.
- **AC-3 [REJECT age_max Bank]** age_max:21, alle Starter ≤21 aber ein **Bank**-Spieler age 30 → `{ok:false, error:'age_max_exceeded'}` (Bank wird geprüft).
- **AC-4 [HAPPY/REJECT age_min]** `age_min:30`: Lineup alle ≥30 → ok:true; ein Spieler age 22 → `{ok:false, error:'age_min_not_met', limit:30}`.
- **AC-5 [FAIL-CLOSED null age]** age_max:21 + ein aufgestellter Spieler mit `age IS NULL` → Reject (`age_max_exceeded`, age:null). Dokumentiert fail-closed.
- **AC-6 [BOUNDS]** `age_max` mit value 13 und 51 → beide `invalid_lineup_rule_value`. `min_per_own_club` mit 0 und 99 → weiterhin `invalid_lineup_rule_value` (Regression 385 AC-4).
- **AC-7 [MULTI-RULE]** `lineup_rules=[{min_per_own_club:5},{age_max:25}]` → beide werden geprüft; Verletzung einer → passender Reject. Form-Serialisierung erhält BEIDE (kein Verlust).
- **AC-8 [NO-RESOURCE-MOVE]** Bei jedem Reject (AC-2/3/4/5/6): `holding_locks` unverändert + kein `user_wildcards`-Delta. VERIFY: force-rollback Vorher/Nachher-Count.
- **AC-9 [NULL/EMPTY Regression]** `lineup_rules=NULL` und `[]` → No-Op, Lineup speichert wie bisher (alle Bestands-Events).
- **AC-10 [PATCH-AUDIT]** Alle Nicht-Validator-Blöcke (E-1 Liga, max_per_club, salary_cap, bench, wildcard spend/earn, INSERT/UPDATE) byte-identisch. Validator-Block: nur Whitelist + Bound-Relokation + age-Branches additiv.
- **AC-11 [WRITE-PFAD]** Admin setzt „max. Alter 21" → `events.lineup_rules` enthält `{type:'age_max',value:21}` (+ ggf. weitere). Leer → Eintrag fehlt; alles leer → `NULL`. VERIFY: SQL nach Live-Create.
- **AC-12 [tsc/tests]** `pnpm exec tsc --noEmit` grün + `CI=true pnpm exec vitest run` grün.
- **AC-13 [UI-live post-Deploy]** EventFormModal rendert beide Age-Inputs in beiden Buildern, 0 Console-Errors, kein MISSING_MESSAGE, Mobile 393px. Reject-Toast user-facing.

## 7. Edge Cases

| Fall | Verhalten |
|------|-----------|
| `age_max` value 13 / 51 | `invalid_lineup_rule_value` (Anti-Müll-Bound 14..50) |
| Spieler `age IS NULL` bei aktiver Alters-Regel | Reject (fail-closed) — dokumentiert |
| Bank-Spieler verletzt Alters-Regel | Reject (Bank wird geprüft, Auto-Sub-Schutz) |
| `age_min > age_max` (unmögliche Kombi) | Jede Regel einzeln geprüft → alle Spieler rejecten → faktisch leeres erlaubtes Set (harmlos, Builder-Warnung = E-4) |
| `lineup_rules=NULL`/`[]` | No-Op (Regression-safe) |
| Mehrere Regeln (min_per_own_club + age) | Loop prüft alle, erste Verletzung returnt |
| Form mit min_per_own_club UND age gesetzt | `rulesFromForm` serialisiert beide (385-Verlust-Falle behoben) |
| age_max ohne `club_id`-Event | age-Regel ist club-unabhängig → wirkt normal (anders als min_per_own_club) |

## 8. Self-Verification Commands

```bash
# 1. Live-Baseline VOR Edit (Patch-Audit-Anker) — mcp execute_sql pg_get_functiondef
# 2. Write-Pfad vollständig
grep -rn "ageMin\|ageMax\|age_min\|age_max" src/components/admin/ src/features/fantasy/
# 3. i18n DE+TR neue Keys, gleicher Namespace
grep -n "ageMaxExceeded\|ageMinNotMet\|ageMinLabel\|ageMaxLabel" messages/de.json messages/tr.json
# 4. tsc + tests
pnpm exec tsc --noEmit && CI=true pnpm exec vitest run
# 5. Force-rollback Money-Smoke (BEGIN…ROLLBACK): AC-1..AC-10 + user_wildcards-Delta=0 bei Reject
```

## 9. Open-Questions

- **CEO-geklärt:** Richtung = Alters-Fenster (AskUserQuestion).
- **CTO-Entscheidungen (Anil-Veto möglich, in Slice-Summary gemeldet):** (a) Bound 14..50; (b) Alters-Regel gilt Starter **+ Bank** fail-closed; (c) Error-Code-Namen; (d) zwei getrennte Felder age_min/age_max statt „Fenster"-Doppelfeld.
- **Keine offene CEO-Frage.** Echtzeit-Treffer-Anzeige + Multi-Regel-Dropdown-Builder bleiben Scope-Out (E-4/E-6).

## 10. Proof-Plan

- `worklog/proofs/386-age-rule-smoke.txt` — force-rollback SQL-Smoke AC-1..AC-10 + Patch-Audit-Diff.
- `worklog/proofs/386-vitest.txt` — vitest + tsc-Output.
- `worklog/proofs/386-eventform-age.png` — Playwright post-Deploy: Age-Inputs beide Builder, kein MISSING_MESSAGE, Mobile 393px (PNG gitignored, DOM-Evaluate als Backup wie 385).

## 11. Scope-Out

- Weitere Regel-Typen (`nation_in`/max-pro-Nation, `mv_max_eur`, `position_quota`) — je eigener Folge-Slice (kein Schema-Change).
- Creator-Builder mit „Bedingung hinzufügen ▾" + Echtzeit-Treffer-Anzeige — E-4/E-6.
- `age_min > age_max`-Konsistenz-Warnung im Builder — E-4.
- Geburtsdatum-genaue Stichtags-Logik (statt `players.age`-Integer) — nicht nötig, age reicht.

## 12. Stage-Chain (geplant)

SPEC (jetzt) → IMPACT: inline (grep-verifiziert, kein neuer Consumer ggü. 385) → BUILD (selbst, kein Worktree) → REVIEW (reviewer-Agent, Money-nah Pflicht) → PROVE (force-rollback-Smoke + vitest + Playwright post-Deploy) → LOG (+ Epic E-3-Block reconcilen + Knowledge-Kopplung fantasy.md prüfen + ggf. errors-db Bound-per-Type-Pattern).

## 13. Pre-Mortem (S — 5 Szenarien)

1. **Patch-Audit-Drift:** CREATE-OR-REPLACE vergisst Live-Block → Lineup-Bruch. **Mit:** AC-10 Diff.
2. **Bound-Relokation-Fehler:** Global-Bound entfernt aber nicht pro-Typ ersetzt → min_per_own_club akzeptiert 99. **Mit:** AC-6 (min 0/99 weiter invalid).
3. **Resource-Move bei Reject:** age-Branch versehentlich nach spend_wildcards → Wildcard verbrannt. **Mit:** AC-8, Block bleibt vor INSERT.
4. **Bank nicht geprüft:** age-Loop nur Starter → „nur U21" via Bank umgehbar. **Mit:** AC-3.
5. **`v_player_age` nicht deklariert / Cast-Crash bei nicht-numerischem value:** **Mit:** DECLARE + globaler `^[0-9]+$`-Guard VOR `::INT`.
