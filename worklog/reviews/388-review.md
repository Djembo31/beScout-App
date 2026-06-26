# Slice 388 Review — E-3 Min-pro-Position (min_per_position)

**Reviewer:** Cold-Context reviewer-Agent · **Datum:** 2026-06-26 · **time-spent:** 9 min

## Verdict: PASS (mergebar)

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | `useEventActions.ts` | `minPerPositionNotMet`-Toast generisch (ohne position/min-Param), während 385/386 die Schwelle einsetzen. RPC liefert position+min+used im Error-Body, wird aber im Service nur als `err.message` durchgereicht. | Optional E-4: Toast mit Position/Min. Kein Blocker. |
| 2 | NIT | Migration Validator | `min_per_position` zählt nur Starter (`v_all_slots`), Bank ignoriert — bewusst & korrekt für Komposition (konsistent zu min_per_own_club), aber Divergenz zu age (Starter+Bank). | Keine Aktion; in fantasy.md dokumentieren (Drift-Prävention) → erledigt im LOG. |

## One-Line
Sauberer additiver Folge-Slice im 385/386-Muster — Validator-Branch fail-closed, Whitelist-VOR-Count, Bound pro Typ, PATCH-AUDIT gegen Live-functiondef grün, TS-Union typsicher, i18n DE+TR komplett; ein Senior merged das.

## Belege
1. **PATCH-AUDIT:** Live-functiondef `keeps_maxclub/salary/e1/wc/385/386 = true`, `has_388 + has_pos_count = true`. Nur additiv: 2 DECLARE + Whitelist-Anhang + ELSIF-Branch. Nicht-Validator-Blöcke byte-identisch.
2. **Position-Whitelist VOR Count:** `NOT IN ('GK','DEF','MID','ATT') → invalid` vor `SELECT COUNT`. Kein Cast/Injection. AC-3 PASS.
3. **Bound pro Typ (S386):** `< 1 OR > 11` im Branch, nicht global. 385/386 unberührt (AC-8a/8b PASS).
4. **TS-Union:** `r.position` nur nach `r.type==='min_per_position'`-Guard. rulesFromForm/posRuleValueFromRules typsicher.
5. **players.position-Zählung (Kern, AC-5):** ATT-Spieler im DEF-Slot → min ATT 3 erfüllt (used=3) + min DEF 2 verletzt (used=1). Slot-unabhängig.
6. **Resource-Move:** Validator VOR INSERT + spend/earn_wildcards. AC-7 (locks=0) PASS.
7. **i18n (S333):** minPerPositionNotMet (fantasy-ns) + minPos*Label (admin-ns), DE+TR echt unterschiedlich, beide Builder bedient, conditional-render → kein MISSING_MESSAGE. business.md: neutrale Fantasy-Mechanik, keine verbotenen Begriffe.

force-rollback 13/13 PASS. AC-13 (UI-live) post-Deploy gebündelt mit 386 (legitimer Deferral).
