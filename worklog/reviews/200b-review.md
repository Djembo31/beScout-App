# Review — Slice 200b Wave 4 Polish-Sweep

**Date:** 2026-04-26
**Reviewer:** Cold-Context-Reviewer-Agent (Opus, read-only)
**Scope:** Spec `worklog/specs/200b-wave4-polish-sweep.md` + git diff (3 source files + 2 i18n)

## Verdict: PASS

Alle 4 Items (3 newly-implemented + 1 already-fixed-marker) spec-konform umgesetzt. Findings ausschliesslich LOW/INFO.

## Spec-Coverage

- [x] **FM-10.1** Tier-CTA-Card mit Progress-Bar, `getNextTierInfo()` helper, `AIRDROP_TIER_THRESHOLDS` sync zu Migration `20260417170000_refresh_airdrop_score_trigger_internal.sql:77` (verifiziert: bronze=0/silber=200/gold=500/diamond=1000), Skip auf 'diamond', `role="progressbar"` + aria-label.
- [x] **FM-8.3** Range-Filter Toggle (in-session useState), `useMemo`-filtered, Empty-State, role="tablist"+role="tab"+aria-selected.
- [x] **F-10** Salary-UX Info-Icon mit `title`-Tooltip + aria-label, hardcoded `<span>Budget</span>` durch i18n ersetzt.
- [x] **R-03** Already-fixed-marker via `GlobalLeaderboard.tsx:19` `'manager'`-Tab. GW-Filter "Letzte GW/Saison" zusätzlich gewünscht aber Backend-needed → Slice 201 deferred (begründet).
- [x] tsc clean.
- [x] DE+TR i18n alle 8 Keys vorhanden in beiden Locales (verified line-by-line).

## Findings

| # | Severity | File:Line | Issue | Resolution |
|---|----------|-----------|-------|------------|
| 1 | LOW | `MysteryBoxHistorySection.tsx:170-184` | `min-h-[32px]` unter 44px Touch-Target-Min. Internal-consistent mit existierendem `historyEquipmentCta` (Z.149) und `GlobalLeaderboard`-Tabs. | Etablished sub-control convention. Backlog: globaler Touch-Target-Audit als eigene Slice. |
| 2 | LOW | `EventDetailFooter.tsx:79` | `title`-Attribut für Tooltip funktioniert auf Mobile nur via Long-Press. | Polish-Step akzeptabel (Spec-aware). Custom Tooltip-Component → Slice 201 Backlog. |
| 3 | LOW | `EventDetailFooter.tsx:79` | `<span>` mit `title` ist nicht keyboard-fokussierbar. Screen-Reader via aria-label OK, aber Sehende-Keyboard-User nicht. | Optional `tabIndex={0}` für Keyboard-Discoverability. Nicht-Blocker. |
| 4 | INFO | `airdrop/page.tsx` | `getNextTierInfo` defensive null-coalesce für `AIRDROP_TIER_ORDER[idx + 1] ?? null` redundant da TS exhaustive type garantiert. | Akzeptabel. |
| 5 | INFO | `airdrop/page.tsx:147` | IIFE-Pattern `{myEntry && (() => { ... })()}` — fragmentiert Render-Tree, alternative helper-Function ausserhalb. | Stilistisch — kein Fix nötig. |
| 6 | INFO | Spec-vs-Reality | Spec sagt R-03 = `AirdropLeaderboard.tsx oder Page-Filter`. Implementierung verweist auf `GlobalLeaderboard.tsx` (`/rankings`). Punch-List-Kategorie (Fantasy P1) erfüllt durch Manager-Tab in Rankings. | Begründung im Spec-Briefing dokumentiert. |
| 7 | INFO | `salaryHint` Wording | "Salary basiert auf Form der letzten 5 Spiele (perfL5)" — mischt EN-Domain-Term + DE-Prosa. Konsistent mit existierendem `salaryCap*`-i18n-Cluster. | Akzeptabel — bestehendes Wording-Cluster. |

## Pre-Existing-Code-Check (D45-Lesson aus 200a)

Verifiziert grep'd:
- `nextTier|threshold` in `src/components/airdrop/` → 0 hits ✓
- `salaryHint|budgetLabel` in `src/` → nur in EventDetailFooter (neu) ✓
- `historyRangeLabel` → nur in MysteryBoxHistorySection (neu) ✓
- `'manager'` Dim-Tab in `GlobalLeaderboard.tsx:19` existiert pre-Slice → R-03 already-fixed-Marker korrekt ✓

## Threshold-Konsistenz (FM-10.1)

Verifiziert: Migration `20260417170000_refresh_airdrop_score_trigger_internal.sql:77`:
```sql
v_tier := CASE WHEN v_total >= 1000 THEN 'diamond' WHEN v_total >= 500 THEN 'gold' WHEN v_total >= 200 THEN 'silber' ELSE 'bronze' END;
```
Component-Konstante `AIRDROP_TIER_THRESHOLDS = { bronze: 0, silber: 200, gold: 500, diamond: 1000 }` exakt synchron. ✓

## Wording-Compliance (business.md)

- "Brauche {points} Pkt. für {tier}" — neutral ✓
- "{tier} için {points} puan eksik" — TR neutral ✓
- "30 Tagen keine Boxen geöffnet" / "Son 30 günde kutu açılmadı" — neutral ✓
- "Salary basiert auf Form der letzten 5 Spiele" — neutral, kein Gewinn-/Profit-Vokabular ✓
- "perfL5" — Code-Begriff in user-Text. Akzeptabel (existing pattern via `salaryCapHint`).

## i18n-Audit

8 neue Keys verified in BEIDEN Locales:
- `airdrop.nextTierHint` + `airdrop.nextTierProgressLabel`
- `inventory.historyRangeLabel/All/Last30d/Empty`
- `fantasy.budgetLabel/salaryHint`

## Positive

- **Threshold-Sync-Comment** referenziert Migration explizit — Drift-Prevention aktiv codifiziert.
- **Pre-Existing-Code-Grep** angewandt (D45-Lesson aus 200a) — Duplicate-Risk vermieden.
- **A11y-Korrektheit:** `role="tablist"`+`role="tab"`+`aria-selected` auf Filter, `role="progressbar"`+`aria-valuenow/min/max`+`aria-label` auf Bar.
- **Math-Clamping** sauber: `Math.max(0, ...)` + `Math.min(100, ...)`.
- **Range-Filter erscheint nur wenn history>0** — verhindert UI-Noise im Empty-State.
- **Wording-Compliant** durchgängig.

## Knowledge-Capture (Backlog für Reviewer-Drafts)

- **Threshold-Sync-Comment-Pattern:** Komponente referenziert Migration-File:Line in Code-Comment — neue Drift-Prevention-Konvention, könnte als Pattern in `memory/patterns.md` aufgenommen werden.
- **Touch-Target-Polish-Drift Audit:** `min-h-[32px]` ist systematisch sub-44px. Polish-Sweep-Backlog: globaler Audit `grep "min-h-\[32px\]"` als M-T-Compliance-Slice.

## Time-spent

~22 min.

## Summary

4/4 Items spec-konform. Threshold-Konstanten DB-synchron, i18n vollständig, Wording-compliant. R-03 als already-fixed-marker via existing `GlobalLeaderboard.tsx`-Manager-Tab dokumentiert. Findings sind ausschließlich LOW/INFO. **Slice ist mergebar.**

**Effective closed in 200b:** 3 Items (FM-10.1 + FM-8.3 + F-10).
**Already-fixed-marker:** R-03 (existing `GlobalLeaderboard.tsx:19` `'manager'`-Tab).
