# Slice 390 — E-3 `mv_min_eur` (Star-Event) + `max_per_position` (zwei Spiegel-Regeln)

**Status:** SPEC · **Größe:** M · **Slice-Type:** Migration (Money-nahe RPC) + Service + UI + i18n · **Scope:** Money-nah / §3 — zwei additive Branches im Validator (Post-389-Baseline), VOR INSERT + Wildcard-Move. Reviewer-Pflicht. · **Datum:** 2026-06-26
**CEO:** Anil 2026-06-26 — „alle E-3-Regeln rein, dann ein Playwright-Durchlauf". Nationen-Regeln zuerst Normalisieren-Slice (391), daher hier nur die zwei nationality-unabhängigen Spiegel.

---

## 1. Problem-Statement
Zwei triviale Spiegel-Regeln vervollständigen den E-3-Regelsatz (nach 385/386/388/389):
- **`max_per_position`** = Spiegel von `min_per_position` (388): „höchstens N Starter einer Position" (z. B. „max. 2 Stürmer" = defensives Event).
- **`mv_min_eur`** = Spiegel von `mv_max_eur` (389): „jede Karte Marktwert ≥ N" = Star-Event (Gegenstück zum Underdog).

Kein Schema-Change (Weg B/D107), exakt die etablierten Muster.

## 2. Lösungs-Design
**RPC (`rpc_save_lineup` CREATE OR REPLACE gegen Live-Baseline Post-389):** zwei neue ELSIF-Branches + Whitelist `+'max_per_position','mv_min_eur'`. Keine neuen DECLARE nötig (`v_rule_position`/`v_pos_count`/`v_player_mv` existieren). `v_rule_value` ist bereits BIGINT (389).
- `max_per_position` (`{type,position,value}`): Position-Whitelist GK/DEF/MID/ATT, Bound 1..11, zählt **Starter** (`v_all_slots`) nach `players.position`, reject wenn `> value` → `max_per_position_exceeded` (position, max, used). **Starter-only** (Komposition, wie min_per_position).
- `mv_min_eur` (`{type,value}` EUR): Bound 1..1e9, **Starter + Bank**, reject wenn `mv IS NULL OR mv = 0 OR mv < value` → `mv_min_not_met` (limit, player_id, mv). **Fail-closed bei MV=0/NULL** (Star-Event: unbekannter Wert kann Floor nicht beweisen — konsistent zu 389). Eingabe in Mio. €, DB EUR (`Math.round(×1e6)`).

**Type:** `LineupRuleType` += beide. `LineupRule`-Union: Basis-Variante += `'mv_min_eur'`; Positions-Variante type += `'max_per_position'`.

**Form:** 4 Felder `maxPosGk/Def/Mid/Att` + `mvMinMillions`. Helper generalisieren: `posRuleValueFromRules(rules, type, position)` (type-Param) + `mvFromRules(rules, type)` (type-Param). `rulesFromForm`: `pushPos(type, position, raw)` + `pushMv(type, raw)`.

**UI (`EventFormModal`):** max-pro-Position-Gruppe (4 Inputs, reuse Positions-Kürzel `minPos*`-Labels) + mv-min-Input (step 0,1, decimal). Beide Builder. Toasts `max_per_position_exceeded` / `mv_min_not_met` (Limit in Mio.).

## 3. Betroffene Files
| File | Änderung |
|------|----------|
| `supabase/migrations/20260626140000_e3_mvmin_maxpos.sql` | rpc_save_lineup CREATE OR REPLACE: Whitelist + 2 Branches |
| `src/types/index.ts` | LineupRuleType + LineupRule Union (mv_min_eur, max_per_position) |
| `src/components/admin/hooks/types.ts` | EventFormState maxPos* + mvMinMillions + INITIAL |
| `src/components/admin/hooks/useEventForm.ts` | posRuleValueFromRules(+type) · mvFromRules(+type) · rulesFromForm pushPos/pushMv(+type) · populate |
| `src/components/admin/EventFormModal.tsx` | Label-Type + max-Pos-Gruppe + mv-min-Input |
| `src/components/admin/AdminEventsTab.tsx` | Club-Labels t() |
| `src/app/(app)/bescout-admin/AdminEventsManagementTab.tsx` | Platform-Labels DE |
| `src/features/fantasy/hooks/useEventActions.ts` | 2 Toast-Cases |
| `messages/de.json` + `tr.json` | maxPerPositionExceeded/mvMinNotMet (fantasy) + maxPerPositionGroup/Hint + mvMin Label/Placeholder/Hint (admin) |

## 4. Code-Reading-Liste — ✅ gelesen (alle aus 389-Session frisch)
1. Live `rpc_save_lineup` Post-389 (D87) — Validator-Struktur, BIGINT bereits da, min_per_position + mv_max_eur als Branch-Vorbilder.
2. useEventForm.ts — posRuleValueFromRules/mvMaxMillionsFromRules/rulesFromForm (389-Stand).
3. types.ts EventFormState + INITIAL (389-Stand).
4. EventFormModal.tsx — min-Pos-Gruppe (Z.418) + mv-max-Input (Z.457) als Render-Vorbilder.
5. useEventActions.ts — Toast-Switch (mv_max_exceeded/min_per_position_not_met als Vorbild).
6. messages/de/tr.json — fantasy-Toast (~980) + admin-Labels (~2861).

## 5. Pattern-References
- S388 (min_per_position: Positions-Whitelist VOR Count, players.position, Starter-only) — direktes Vorbild max_per_position.
- S389 (mv_max_eur: BIGINT, Starter+Bank, fail-closed MV=0, Mio→EUR) — direktes Vorbild mv_min_eur.
- errors-db PATCH-AUDIT (CREATE-OR-REPLACE gegen Live-Body).
- S333 (i18n-Namespace) · S196 (Platform DE-hardcoded exempt).
- D100 (€ user-facing nur für MV-Referenz erlaubt).

## 6. Acceptance Criteria
- **AC-1 [HAPPY max_pos]** `[{max_per_position,ATT,2}]`, ≤2 ATT-Starter → ok:true.
- **AC-2 [REJECT max_pos]** gleiche Regel, 3 ATT-Starter → `max_per_position_exceeded` (position ATT, max 2, used 3).
- **AC-3 [max_pos POSITION-INVALID/BOUND]** position 'XYZ' → invalid; value 0/99 → invalid.
- **AC-4 [HAPPY mv_min]** `[{mv_min_eur, 50000000}]`, alle Starter+Bank MV≥50M → ok:true.
- **AC-5 [REJECT mv_min]** ein Spieler MV 1M < 50M → `mv_min_not_met` (limit 50000000).
- **AC-6 [FAIL-CLOSED mv_min MV=0]** MV=0-Spieler bei mv_min → reject (mv:0).
- **AC-7 [mv_min BOUND]** value 0 → invalid; value 2e9 → invalid (BIGINT, kein Crash).
- **AC-8 [MULTI]** `[{max_per_position,DEF,2},{mv_min_eur,1000000}]` → beide geprüft.
- **AC-9 [NO-RESOURCE-MOVE]** jeder Reject → holding_locks unverändert + 0 wildcard-delta.
- **AC-10 [REGRESSION]** 385/386/388/389-Regeln weiter korrekt (min_per_position, mv_max_eur, age, own_club Bounds).
- **AC-11 [NULL/EMPTY]** lineup_rules NULL/[] → no-op.
- **AC-12 [PATCH-AUDIT]** Nicht-Validator-Blöcke byte-identisch; nur Whitelist + 2 Branches additiv.
- **AC-13 [WRITE]** Admin „max ATT 2" → `{type:'max_per_position',position:'ATT',value:2}`; „min MV 50 Mio" → `{type:'mv_min_eur',value:50000000}`.
- **AC-14 [tsc/tests]** tsc 0 + vitest grün.
- **AC-15 [UI-live]** GEBÜNDELT — ein Playwright-Durchlauf am Ende (390 + 386/388/389): Inputs beide Builder, kein MISSING_MESSAGE, Mobile 393px.

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| max_per_position position fehlt/ungültig | invalid_lineup_rule_value |
| max_per_position value 0/99 | invalid |
| max_pos value > vorhandene (z.B. max ATT 11, nur 2) | ok (used 2 ≤ 11) |
| mv_min MV=0/NULL | reject (fail-closed) |
| mv_min value 2e9 | invalid (BIGINT, kein ::INT-Crash) |
| mv_min Admin tippt 0,5 | → 500000 EUR |
| max_per_position + min_per_position gleiche Position (z.B. min2/max1 unmöglich) | beide geprüft → faktisch leeres Set (harmlos, Builder-Warnung E-4) |
| NULL/[] | no-op |

## 8. Self-Verification
```bash
grep -rn "maxPos\|max_per_position\|mvMin\|mv_min_eur" src/components/admin src/features/fantasy src/types
grep -n "maxPerPositionExceeded\|mvMinNotMet\|maxPerPositionGroupLabel\|mvMinLabel" messages/de.json messages/tr.json
pnpm exec tsc --noEmit && CI=true pnpm exec vitest run
# force-rollback Smoke AC-1..AC-12
```

## 9. Open-Questions
- **CEO-geklärt:** beide Regeln rein, Nationen separat (391 zuerst).
- **CTO-Zone:** Bounds (max_pos 1..11, mv_min 1..1e9); max_per_position Starter-only (Komposition); mv_min Starter+Bank fail-closed; Error-Codes; reuse Positions-Kürzel-Labels für max-Gruppe.
- **Scope-Out:** Nationen-Regeln (391/392), Echtzeit-Treffer-Anzeige + Multi-Regel-Builder (E-4).

## 10. Proof-Plan
- `worklog/proofs/390-mvmin-maxpos-smoke.txt` — force-rollback AC-1..AC-12 + PATCH-AUDIT.
- `worklog/proofs/390-vitest.txt` — vitest + tsc.
- UI: gebündelter Playwright-Durchlauf (eigener Proof am Ende der E-3-Reihe).

## 11. Scope-Out
- `nation_in` + `max_per_nation` → Slice 392 (nach Normalisieren-Slice 391).
- Builder „Bedingung hinzufügen ▾" + Echtzeit-Treffer → E-4/E-6.

## 12. Stage-Chain
SPEC → IMPACT inline → BUILD (selbst) → REVIEW (reviewer, Money-nah) → PROVE (force-rollback + vitest; UI gebündelt) → LOG (+ Epic-Reconcile + fantasy.md/errors-db Kopplung).

## 13. Pre-Mortem (M — 5 Szenarien)
1. Patch-Audit-Drift → AC-12 functiondef-Assertion.
2. max_per_position als `>` statt `>=`-Fehler (off-by-one) → AC-1/AC-2 (max 2: used 2 ok, used 3 reject).
3. mv_min `<` vs `<=` Verwechslung → AC-4/AC-5 (≥ floor ok).
4. mv_min MV=0 fälschlich Pass (0 < floor wäre eh reject, aber explizit `= 0` für Klarheit) → AC-6.
5. Helper-Generalisierung bricht min_per_position/mv_max (type-Param falsch durchgereicht) → AC-10 Regression.
