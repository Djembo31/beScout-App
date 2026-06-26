# Slice 389 — E-3 Marktwert-Deckel pro Karte (`mv_max_eur`, Underdog-Events)

**Status:** SPEC · **Größe:** S · **Slice-Type:** Migration (Money-nahe RPC) + Service + UI + i18n · **Scope:** Money-nah / §3 — Regel im selben Validator-Block wie 385/386/388, VOR INSERT + Wildcard-Move, fail-closed. Reviewer-Pflicht. · **Datum:** 2026-06-26
**CEO-Entscheid (AskUserQuestion 2026-06-26):** (1) nächster Slice = `mv_max_eur` (Underdog). (2) MV=0 → **fail-closed (ablehnen)**. (3) Admin-Eingabe = **Millionen €**, DB speichert EUR-Ganzzahl.

---

## 1. Problem-Statement (Evidence)

Dritte E-3-Regel-Erweiterung nach 386 (Alter) + 388 (Position). Anil will „Underdog-Events" — Aufstellungen nur aus günstigen Spielern (D107: „einfach aber mächtig, wildeste Kombinationen"). Diese Regel deckelt den Marktwert jeder aufgestellten Karte.

**Daten-Fund (Live verifiziert 2026-06-26, korrigiert den Handoff):** `players.market_value_eur` ist **`integer` in EUR** und **nie NULL** (0 NULLs von 4556). Aber **621 Spieler (13,6 %) haben MV = 0** — *das* ist der Edge, kein Null-Edge. Davon sind **491 (79 %) U21-Jugend**, aber **32 haben hohe Leistung** (perf_l5 ≥ 60 → wahrscheinlich Mis-Scrapes). **20 MV=0-Spieler stecken in echten Holdings** → der Edge ist real, nicht theoretisch. Werte: min positiv €10.000, Median €2M, max €200M.

**CEO-Entscheid MV=0 = fail-closed:** Anil priorisiert Integrität (kein versteckter Star im Underdog-Event) über Inklusion. Konsequenz: 491 echte Jugendspieler bleiben aus Underdog-Events ausgesperrt → **Backlog: Daten-Qualitäts-Slice** (32 Mis-Scrapes re-scrapen, dann MV=0-Behandlung re-evaluieren).

**Gefundener Design-Schwachpunkt im Live-Validator (wird hier behoben):** Der generische Validator castet den Regelwert mit `(v_rule->>'value')::INT`. Für Alter (≤50) / Position / own_club (≤11) harmlos. Ein MV-Wert in EUR kann jedoch > INT-Max (2.147.483.647) werden (Admin tippt z. B. 3000 Mio → 3e9 EUR) → der `::INT`-Cast **wirft eine unbehandelte Exception** statt sauberem Reject. → Slice zieht `v_rule_value` auf **`BIGINT`** (alle bestehenden Branches nutzen kleine Werte → unkritisch) + Bound, eliminiert die Overflow-Klasse für alle künftigen Großwert-Regeln. **Heute kein Live-Bug** (max value heute = 50), aber `mv_max_eur` würde ihn einführen → mit-mitigiert.

**Evidence:** Epic `event-creator-liga-epic.md` §5 (`mv_max_eur` Underdog). D107 (JSONB-Regel-Liste, kein Schema-Change). Handoff-Anker „mv_max_eur (Underdog; Null-Edge entscheiden)".

## 2. Lösungs-Design

**Kein Schema-Change** (Weg B). Neue Regel = `{"type":"mv_max_eur","value":<EUR-Ganzzahl>}`. Wert in **EUR** gespeichert (= DB-Spalten-Einheit → null SQL-Umrechnung auf dem Money-nahen Pfad = sicherste Stelle). Admin gibt **Millionen** ein; UI rechnet `Math.round(millionen × 1.000.000)` → EUR (eine Umrechnung, in den 2 Form-Serialisierungs-Grenzen, getestet).

**RPC (`rpc_save_lineup` CREATE OR REPLACE gegen Live-Baseline = Post-388-Body):**
- DECLARE: `v_rule_value INT` → **`BIGINT`** (Overflow-Fix) + neu `v_player_mv INT`.
- Whitelist erweitern: `… ,'mv_max_eur', …`.
- Neuer Branch `mv_max_eur`: Bound `v_rule_value < 1 OR v_rule_value > 1000000000` → `invalid_lineup_rule_value` (€1 Mrd Headroom, < BIGINT-Max). Dann ALLE aufgestellten Spieler (Starter `v_all_slots` 1..12 **+ Bank `v_bench_uids`** — Eignungs-Regel wie Alter, Auto-Sub wechselt Bank ein): `SELECT market_value_eur INTO v_player_mv`. **Fail-closed:** `v_player_mv IS NULL OR v_player_mv = 0 OR v_player_mv > v_rule_value` → `mv_max_exceeded` (mit `limit`=EUR, `player_id`, `mv`).
- Scope = **Starter + Bank** (Eignung, Scope-Spiegel age/E-1), NICHT Starter-only (das ist Komposition = own_club/position).

**Type (`src/types/index.ts`):** `LineupRuleType` += `'mv_max_eur'`; Basis-Variante der `LineupRule`-Union erweitern (`'min_per_own_club' | 'age_min' | 'age_max' | 'mv_max_eur'`).

**Form (`useEventForm.ts` + `types.ts`):** neues flaches Feld `mvMaxMillions: string` (in Millionen). Reader `mvMaxMillionsFromRules` (EUR/1e6 → Millionen-String). `rulesFromForm` bekommt dedizierten `pushMvMax` (parseFloat, `m > 0`, `Math.round(m*1e6)`) — eigener Helper, weil `parseInt` Dezimalstellen wie 0,5 abschneiden würde. `populateFromEvent` + `INITIAL_FORM_STATE` ergänzen.

**UI (`EventFormModal.tsx`):** 1 Zahlen-Input (`step=0.1`, `min=0`, `inputMode=decimal`), gruppiert nach min-pro-Position. Beide Builder: Club via `t()` (AdminEventsTab), Platform DE-hardcoded (AdminEventsManagementTab, S196-exempt). Toast `mv_max_exceeded` (`useEventActions`), Limit user-facing in Mio. (EUR/1e6).

**Read-Pfad:** KEINE Änderung — `lineup_rules` ist seit 385 in allen 3 Selects + Mapper + Type + EDITABLE_FIELDS. MV ist nur ein weiterer Listen-Eintrag → **kein EDITABLE_FIELDS-Count-Change** (keine 380/382-CI-Rot-Falle).

## 3. Betroffene Files

| File | Änderung |
|------|----------|
| `supabase/migrations/20260626130000_e3_mv_max_lineup_rule.sql` | `rpc_save_lineup` CREATE OR REPLACE: `v_rule_value`→BIGINT + `v_player_mv` + Whitelist + mv_max_eur-Branch (Starter+Bank, fail-closed bei 0/NULL) |
| `src/types/index.ts` | `LineupRuleType` + `LineupRule`-Basis-Variante += `'mv_max_eur'` |
| `src/components/admin/hooks/types.ts` | `EventFormState.mvMaxMillions` + `INITIAL_FORM_STATE` |
| `src/components/admin/hooks/useEventForm.ts` | `mvMaxMillionsFromRules` + `pushMvMax` in `rulesFromForm` + `populateFromEvent` |
| `src/components/admin/EventFormModal.tsx` | Label-Type `mvMax/Placeholder/Hint` + 1 Input |
| `src/components/admin/AdminEventsTab.tsx` | Club-Labels via `t('mvMaxLabel')` etc. |
| `src/app/(app)/bescout-admin/AdminEventsManagementTab.tsx` | Platform-Labels DE-hardcoded |
| `src/features/fantasy/hooks/useEventActions.ts` | Case `mv_max_exceeded` → Toast (Limit in Mio.) |
| `messages/de.json` + `tr.json` | `mvMaxExceeded` (fantasy-ns @~980) + `mvMaxLabel/Placeholder/Hint` (admin-ns @~2861) |

## 4. Code-Reading-Liste (Pflicht VOR Implementation) — ✅ alle gelesen

1. **LIVE `pg_get_functiondef('rpc_save_lineup(…22 args…)')`** — ✅ gelesen. Validator-Block (Post-388): whitelist + global `^[0-9]+$`-Guard + `::INT`-Cast (← Overflow-Risiko für MV) + per-Typ-Bounds. `v_all_slots`=12 Starter, `v_bench_uids`=Bank. age-Branch = exaktes Scope-Vorbild (Starter+Bank, fail-closed). **Baseline = dieser Live-Body, NICHT Migrations-Datei (D87/PATCH-AUDIT).**
2. **Live `players`-Schema** — ✅ `market_value_eur integer` (EUR, nie NULL, 13,6 % =0), kein `is_active` (`status`). MV-Verteilung verifiziert (s. §1).
3. `src/components/admin/hooks/useEventForm.ts` — ✅ `ruleValueFromRules`/`posRuleValueFromRules`/`rulesFromForm` (pushVal/pushPos), `populateFromEvent` Z.70-106, `buildCreate/UpdatePayload` rufen `rulesFromForm(form)`.
4. `src/components/admin/hooks/types.ts` — ✅ `EventFormState` (Z.18-24 Regel-Felder) + `INITIAL_FORM_STATE` (Z.69-75).
5. `src/components/admin/EventFormModal.tsx` — ✅ Regel-Inputs Z.344-452 (`isFieldDisabled('lineup_rules')`), Label-Type Z.46-60.
6. `src/features/fantasy/hooks/useEventActions.ts` — ✅ Error-Switch Z.412-436, `*_not_met` liest `event.lineupRules?.find(...)`.
7. `src/types/index.ts` — ✅ `LineupRuleType`/`LineupRule`/`PlayerPositionCode` Z.741-745, `DbEvent.lineup_rules` Z.795.
8. `AdminEventsTab.tsx` (Z.50-56) + `AdminEventsManagementTab.tsx` (Z.36-51) — ✅ zwei Label-Quellen.
9. `messages/de.json`/`tr.json` — ✅ fantasy-Toast @978-980, admin-Labels @2855-2861. Neue Keys in DENSELBEN Namespaces (S333).

## 5. Pattern-References

- **S386/S388/S385** — direktes Vorbild: Validator-Branch, JSONB-Serialisierung im Form, beide Builder, Toast-Kette.
- **D107** — Aufstellungs-Regel = JSONB-Liste, neue Regel = kein Schema-Change.
- **D100** — `market_value_eur` = Transfermarkt-Referenz in €; € user-facing NUR für MV erlaubt (RewardsTab zeigt MV live in €). → „Mio. €"-Label compliant.
- **age-Branch (S386)** — Scope-Vorbild „Starter + Bank, fail-closed bei fehlendem Wert" für Eignungs-Regel.
- **errors-db PATCH-AUDIT** — CREATE-OR-REPLACE gegen Live-Body; Nicht-Validator-Blöcke byte-identisch (Konstanten prüfen).
- **errors-db S386** — Bound PRO REGELTYP (kein globaler Bound).
- **S333** — i18n-Key im richtigen Namespace + Live-Render-Console-Scan.
- **S196** — Platform-Admin DE-hardcoded exempt.

## 6. Acceptance Criteria (executable)

- **AC-1 [HAPPY]** Event `lineup_rules=[{type:'mv_max_eur',value:5000000}]`, Lineup nur Spieler mit MV>0 und ≤5M (Starter+Bank) → `{ok:true}`. VERIFY: SQL force-rollback.
- **AC-2 [REJECT]** Gleiches Event, ein Starter mit MV 50M → `{ok:false, error:'mv_max_exceeded', limit:5000000}`. FAIL-IF: ok:true ODER Resource-Move.
- **AC-3 [REJECT Bank]** alle Starter ≤5M, aber ein **Bank**-Spieler MV 50M → `{ok:false, error:'mv_max_exceeded'}` (Bank geprüft).
- **AC-4 [FAIL-CLOSED MV=0]** cap 5M + ein aufgestellter Spieler mit `market_value_eur=0` → Reject (`mv_max_exceeded`, mv:0). Dokumentiert fail-closed (CEO-Entscheid).
- **AC-5 [BOUNDS]** `mv_max_eur` value 0 → `invalid_lineup_rule_value`; value 2.000.000.000 (>1e9) → `invalid_lineup_rule_value` (kein `::INT`-Overflow-Crash dank BIGINT). Regression: `min_per_own_club` 0/99 weiter invalid (385 AC-4), age 13/51 invalid (386).
- **AC-6 [MULTI-RULE]** `[{age_max:21},{mv_max_eur:1000000}]` → beide geprüft; Verletzung einer → passender Reject. Form-Serialisierung erhält BEIDE.
- **AC-7 [NO-RESOURCE-MOVE]** Bei jedem Reject (AC-2/3/4/5): `holding_locks` unverändert + 0 `user_wildcards`-Delta. VERIFY: force-rollback Vorher/Nachher-Count.
- **AC-8 [NULL/EMPTY Regression]** `lineup_rules=NULL` / `[]` → No-Op, Lineup speichert wie bisher.
- **AC-9 [PATCH-AUDIT]** Alle Nicht-Validator-Blöcke (E-1 Liga, max_per_club, bench, salary_cap, wildcard, INSERT/UPDATE, holding_locks) byte-identisch. Validator: nur DECLARE-Typ + Whitelist + mv-Branch additiv.
- **AC-10 [WRITE-PFAD]** Admin tippt „Max. Marktwert 5 Mio" → `events.lineup_rules` enthält `{type:'mv_max_eur',value:5000000}`. Tippt 0,5 → value 500000. Leer → Eintrag fehlt. VERIFY: SQL nach Live-Create / Unit-Logik.
- **AC-11 [tsc/tests]** `pnpm exec tsc --noEmit` grün + `CI=true pnpm exec vitest run` grün.
- **AC-12 [UI-live post-Deploy]** EventFormModal rendert MV-Input in beiden Buildern, 0 Console-Errors, kein MISSING_MESSAGE, Mobile 393px. Reject-Toast user-facing in Mio.

## 7. Edge Cases

| Fall | Verhalten |
|------|-----------|
| value 0 / >1e9 EUR | `invalid_lineup_rule_value` (Bound) |
| `::INT`-Overflow bei Riesenwert | unmöglich — `v_rule_value` BIGINT + Bound VOR Vergleich |
| Spieler `market_value_eur=0` | Reject (fail-closed, CEO) |
| Spieler `market_value_eur` NULL (existiert nicht in Daten, defensiv) | Reject (fail-closed) |
| Bank-Spieler verletzt MV-Deckel | Reject (Bank geprüft, Auto-Sub-Schutz) |
| Admin tippt 0,5 (Mio) | → 500000 EUR gespeichert (Math.round) |
| Admin tippt 0 / negativ | kein Eintrag (`m > 0`-Guard) |
| `lineup_rules=NULL`/`[]` | No-Op |
| Multi-Regel (age + mv) | Loop prüft alle, erste Verletzung returnt |
| mv_max_eur ohne `club_id`-Event | club-unabhängig → wirkt normal (anders als min_per_own_club) |

## 8. Self-Verification Commands

```bash
# 1. Live-Baseline VOR Edit (Patch-Audit-Anker) — pg_get_functiondef (22-arg-Signatur!)
# 2. Write-Pfad vollständig
grep -rn "mvMax\|mv_max_eur" src/components/admin/ src/features/fantasy/ src/types/
# 3. i18n DE+TR neue Keys, gleicher Namespace
grep -n "mvMaxExceeded\|mvMaxLabel\|mvMaxHint" messages/de.json messages/tr.json
# 4. tsc + tests
pnpm exec tsc --noEmit && CI=true pnpm exec vitest run
# 5. Force-rollback Money-Smoke (BEGIN…ROLLBACK): AC-1..AC-9 + wildcard/holding_locks-Delta=0 bei Reject
```

## 9. Open-Questions

- **CEO-geklärt:** (a) Richtung = mv_max_eur; (b) MV=0 → fail-closed; (c) Eingabe in Millionen.
- **CTO-Entscheidungen (Anil-Veto möglich, in Slice-Summary gemeldet):** Bound 1..1e9 EUR; Scope = Starter+Bank (Eignung, wie Alter); `v_rule_value`→BIGINT (Overflow-Fix); Error-Code `mv_max_exceeded`; Speicher-Einheit EUR (DB-konform).
- **Keine offene CEO-Frage.** Echtzeit-Treffer-Anzeige + Multi-Regel-Dropdown-Builder = Scope-Out (E-4/E-6).

## 10. Proof-Plan

- `worklog/proofs/389-mv-max-smoke.txt` — force-rollback SQL-Smoke AC-1..AC-9 + Patch-Audit-Diff.
- `worklog/proofs/389-vitest.txt` — vitest + tsc-Output.
- `worklog/proofs/389-eventform-mv.png` — Playwright post-Deploy: MV-Input beide Builder, kein MISSING_MESSAGE, Mobile 393px (PNG gitignored, DOM-Evaluate als Backup wie 385/386/388).

## 11. Scope-Out

- Weitere Regel-Typen (`nation_in`/max-pro-Nation, `max_per_position`) — je Folge-Slice.
- **Daten-Qualitäts-Slice: 32 MV=0-Mis-Scrapes re-scrapen**, dann MV=0-Fail-closed evtl. lockern (491 echte Jugend wieder spielbar) — Backlog (braucht API-Football-Key / Re-Scraper).
- Creator-Builder „Bedingung hinzufügen ▾" + Echtzeit-Treffer-Anzeige — E-4/E-6.
- Min-Marktwert (`mv_min_eur`, „Star-Event") — Folge-Slice (Spiegel, trivial).

## 12. Stage-Chain (geplant)

SPEC (jetzt) → IMPACT: inline (grep-verifiziert, kein neuer Consumer ggü. 388) → BUILD (selbst, kein Worktree) → REVIEW (reviewer-Agent, Money-nah Pflicht) → PROVE (force-rollback-Smoke + vitest + Playwright post-Deploy) → LOG (+ Epic E-3-Block reconcilen + Knowledge fantasy.md/errors-db: BIGINT-Bound-Pattern + MV-Backlog).

## 13. Pre-Mortem (S — 5 Szenarien)

1. **Patch-Audit-Drift:** CREATE-OR-REPLACE vergisst Live-Block → Lineup-Bruch. **Mit:** AC-9 Diff.
2. **`::INT`-Overflow:** Großwert crasht statt Reject. **Mit:** BIGINT + AC-5 (2e9 → sauberer Reject).
3. **Einheit-Mismatch:** Form schickt Millionen statt EUR oder vergisst Math.round → Deckel um Faktor 1e6 falsch. **Mit:** AC-10 (5→5000000, 0,5→500000) + dedizierter `pushMvMax`-Test.
4. **MV=0-Falsch-Pass:** `> v_rule_value` allein lässt 0 durch (Star-Schmuggel). **Mit:** expliziter `= 0`-Zweig + AC-4.
5. **Bank nicht geprüft:** „nur billig" via teure Bank umgehbar. **Mit:** AC-3 (Bank-Loop).
