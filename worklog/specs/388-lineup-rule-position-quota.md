# Slice 388 — E-3 Min-pro-Position (Formations-Steuerung)

**Slice-Type:** Migration (Money-nahe RPC) + Service + UI + i18n
**Größe:** S
**Scope:** Money-nah / §3 — Regel im selben Validator-Block wie 385/386, VOR INSERT + Wildcard-Move, fail-closed. Reviewer-Pflicht.
**CEO-Entscheid:** Anil 2026-06-26 (AskUserQuestion) — Positions-Regel = **Min-pro-Position** (Formations-Steuerung), nicht Max (redundant zur Formation) und nicht Formations-Whitelist.

---

## 1. Problem-Statement (Evidence)

Zweite E-3-Regel-Erweiterung nach 386 (Alter). Anil will thematische Events („Angriffs-Liga: min. 3 Stürmer", „defensiv: min. 4 Verteidiger"). **Design-Klärung (Anil-bestätigt):** Eine *Max*-pro-Position wäre meist redundant — die Formation fixiert die Startelf-Slot-Verteilung bereits. Eine *Min*-pro-Position ist nicht redundant: sie verbietet Formationen/Kader, die zu wenige Spieler einer Position haben → echte Steuerung.

**Schlüssel-Fund (Live-RPC gelesen):** `rpc_save_lineup` validiert **Startelf-Slots NICHT positions-genau** (nur Bank: bench_gk=GK, bench-outfield=DEF/MID/ATT). Darum zählt die Regel nach **`players.position`** (echte Position des aufgestellten Spielers), NICHT nach Slot-Index — sonst wäre sie nur eine Formations-Zählung. So wirkt „min. 3 ATT" als echte Kader-Komposition.

**Evidence:** Epic `event-creator-liga-epic.md` §5 (`position_quota`). AskUserQuestion 2026-06-26. D107 (JSONB-Regel-Liste, kein Schema-Change).

## 2. Lösungs-Design

**Kein Schema-Change** (Weg B). Neue Regel-Art = positions-geschlüsselt: `{"type":"min_per_position","position":"ATT","value":3}`.

**RPC (`rpc_save_lineup` CREATE OR REPLACE gegen Live-Baseline = Post-386-Body):**
- Whitelist + `'min_per_position'`.
- Neuer Branch: Position validieren (`rule->>'position' IN ('GK','DEF','MID','ATT')`, sonst `invalid_lineup_rule_value`), Wert-Bound 1..11 (pro Typ, wie 386-Muster), dann Starter (`v_all_slots`) mit `players.position = <pos>` zählen; `< value` → `min_per_position_not_met` (mit position, min, used).
- Scope = **Starter only** (`v_all_slots`, 12) — es geht um die Komposition der gefeldten XI, konsistent zu `min_per_own_club`. (Bank sind Ersatz, zählen nicht zur Soll-Komposition.)
- DECLARE `v_rule_position TEXT; v_pos_count INT;`.

**Type:** `LineupRuleType` += `'min_per_position'`; `LineupRule` wird Union (Basis-Variante `{type, value}` + `{type:'min_per_position', position: PlayerPositionCode, value}`). `PlayerPositionCode = 'GK'|'DEF'|'MID'|'ATT'`.

**Form:** 4 flache Felder `minPosGk/minPosDef/minPosMid/minPosAtt`. `rulesFromForm` pusht je gesetztem Feld eine `min_per_position`-Regel. `populateFromEvent` liest via positions-aware Finder. Helper `posRuleValueFromRules(rules, position)`.

**UI:** 4 Inputs (min1/max11) gruppiert „Mindestens pro Position". Beide Builder-Labels (Club `t()` + Platform DE-hardcoded). Toast `min_per_position_not_met`.

## 3. Betroffene Files

| File | Änderung |
|------|----------|
| `supabase/migrations/20260626…_e3_position_quota.sql` | rpc_save_lineup CREATE OR REPLACE: min_per_position-Branch + DECLARE |
| `src/types/index.ts` | LineupRule Union + PlayerPositionCode + LineupRuleType |
| `src/components/admin/hooks/types.ts` | EventFormState minPos* + INITIAL |
| `src/components/admin/hooks/useEventForm.ts` | posRuleValueFromRules + rulesFromForm erweitern + populate |
| `src/components/admin/EventFormModal.tsx` | 4 Inputs + Labels-Type |
| `src/components/admin/AdminEventsTab.tsx` | Club-Labels t() |
| `src/app/(app)/bescout-admin/AdminEventsManagementTab.tsx` | Platform-Labels DE |
| `src/features/fantasy/hooks/useEventActions.ts` | min_per_position_not_met Toast |
| `messages/de.json`+`tr.json` | Keys |

## 4. Code-Reading-Liste — ✅ gelesen
1. Live `rpc_save_lineup` (Post-386, D87) — Validator-Block-Struktur, v_all_slots, players.position-Existenz (100% befüllt). Startelf NICHT positions-validiert → Zählung nach players.position korrekt.
2. useEventForm.ts (386) — ruleValueFromRules/rulesFromForm-Muster.
3. types.ts/EventFormModal.tsx/AdminEventsTab.tsx/AdminEventsManagementTab.tsx (386) — Feld+Label+Input-Muster.
4. useEventActions.ts (386) — Toast-Case-Muster.
5. de/tr.json (386) — Namespaces (fantasy error / admin labels).

## 5. Pattern-References
- S386/S385 (direktes Vorbild: Validator-Branch, Serialisierung, beide Builder, Toast).
- errors-db S386 (Bound PRO REGELTYP; Per-Spieler-Regel-Scope).
- errors-db PATCH-AUDIT (CREATE-OR-REPLACE gegen Live-Body).
- S333 (i18n-Namespace).

## 6. Acceptance Criteria
- **AC-1 [HAPPY]** `[{min_per_position,ATT,2}]`, Lineup mit ≥2 ATT-Spielern (players.position) → ok:true.
- **AC-2 [REJECT]** gleiche Regel, nur 1 ATT-Spieler → `min_per_position_not_met` (position ATT, min 2, used 1).
- **AC-3 [POSITION-INVALID]** `position:'XYZ'` → `invalid_lineup_rule_value`.
- **AC-4 [BOUNDS]** value 0 und 99 → `invalid_lineup_rule_value`.
- **AC-5 [count-by-players.position]** ein ATT-Spieler in DEF-Slot platziert zählt als ATT (players.position, nicht Slot). VERIFY: Lineup mit ATT-Spieler im def-Slot erfüllt min_per_position ATT.
- **AC-6 [MULTI]** `[{age_max,30},{min_per_position,DEF,2}]` → beide geprüft.
- **AC-7 [NO-RESOURCE-MOVE]** Reject → holding_locks unverändert + 0 wildcard-delta.
- **AC-8 [REGRESSION]** 385/386-Regeln (min_per_own_club bounds, age) weiter korrekt.
- **AC-9 [NULL/EMPTY]** lineup_rules NULL/[] → no-op.
- **AC-10 [PATCH-AUDIT]** Nicht-Validator-Blöcke byte-identisch.
- **AC-11 [WRITE]** Admin setzt „min ATT 3" → `events.lineup_rules` enthält `{type:'min_per_position',position:'ATT',value:3}`.
- **AC-12 [tsc/tests]** tsc 0 + vitest grün.
- **AC-13 [UI-live]** 4 Inputs beide Builder, kein MISSING_MESSAGE, Mobile 393px.

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| position fehlt/ungültig | invalid_lineup_rule_value |
| value 0/99 | invalid_lineup_rule_value |
| min_pos_gk=2 (unmöglich) | rejectet faktisch alles (formation hat 1 GK) — harmlos, Builder-Warnung E-4 |
| ATT-Spieler im DEF-Slot | zählt als ATT (players.position) |
| NULL/[] | no-op |
| Multi-Regel | alle geprüft, erste Verletzung returnt |

## 8. Self-Verification
```bash
grep -rn "minPos\|min_per_position" src/components/admin src/features/fantasy
grep -n "minPerPositionNotMet\|minPosGkLabel" messages/de.json messages/tr.json
pnpm exec tsc --noEmit && CI=true pnpm exec vitest run
# force-rollback Smoke AC-1..AC-10
```

## 9. Open-Questions
- CEO-geklärt: Min-pro-Position (Formations-Steuerung).
- CTO-Zone: keyed type vs 4 types (→ keyed, erweiterbar), Starter-only-Scope, Bound 1..11, Position-Codes im Toast roh (GK/DEF/MID/ATT international).
- Scope-Out: max_per_position, Echtzeit-Treffer-Anzeige, Builder-Warnung unmöglicher Kombi (E-4).

## 10. Proof-Plan
- `worklog/proofs/388-position-quota-smoke.txt` (force-rollback AC-1..AC-10 + PATCH-AUDIT).

## 11. Scope-Out
- max_per_position · nation_in · mv_max_eur · Multi-Regel-Builder/Treffer-Anzeige (E-4).

## 12. Stage-Chain
SPEC → IMPACT inline → BUILD (selbst) → REVIEW (reviewer) → PROVE (smoke + vitest) → LOG (+ fantasy.md/errors-db Kopplung + Epic-Reconcile). UI-Playwright post-Deploy gebündelt mit 386 AC-13.

## 13. Pre-Mortem (S)
1. Position-Injection/Cast → position-Whitelist VOR Count. 2. Bound vergessen → AC-4. 3. Slot- statt players.position-Zählung → AC-5 deckt. 4. Patch-Audit-Drift → AC-10. 5. Resource-Move bei Reject → AC-7.
