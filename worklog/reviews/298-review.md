# CTO Review: Slice 298 — /club + /clubs Contract-Level Lifecycle-E2E (Demo-Step-8)

**Reviewer:** reviewer-Agent (cold-context, read-only) · **Datum:** 2026-06-13 · **Time-spent:** ~11 min

## Verdict: PASS

## Spec-Coverage
- [x] Test A `/clubs` Discovery-Contract (AC-A1…A5) — alle 5 ACs als `test.step` implementiert
- [x] Test B `/club/[slug]` Detail-Contract (AC-B1…B7) — alle 7 ACs implementiert
- [x] Verkabelung: playwright-Projekt `club-lifecycle` + `test:club-lifecycle`-Script + non-blocking nightly-Step
- [x] Scope-Out eingehalten: kein src/**-Runtime-Change, kein /admin, kein TR-Run, `club.spec.ts` unverändert

## Validierung der 7 spezifischen Risiken

| # | Risiko | Befund |
|---|--------|--------|
| 1 | Active-Tab-Anker `aria-selected` statt `text-gold` | **KORREKT.** TabBar.tsx:48-52 — bei accentColor (=clubColor) aktiver Tab via Inline-style; `text-gold` greift NUR im `!accentColor`-Branch. `aria-selected={isActive}` ist einzig verlässlicher Anker. |
| 2 | Error-Absence `{exact:true}` Punkt-Variante | **KORREKT.** `common.errorLoadFailed`="…werden." (MIT Punkt) == DATA_LOAD_FAILED. `fantasy.dataLoadFailed` OHNE Punkt → exact matcht nicht → kein over-broad failure surface. |
| 3 | i18n-Leak-Regex Namespaces vollständig | **AUSREICHEND.** Deckt /clubs+/club Namespaces; best-effort wie 293-Caveat. |
| 4 | AC-A3 „data-path resolved" nicht „Daten existieren" | **KORREKT.** Card-visible (Skeleton cleared) + ErrorState absent = Query resolved. 293-Pattern sauber. |
| 5 | first()-Locator 282a-Falle | **VERMIEDEN.** Card nur `toBeVisible()`, nicht geklickt; Navigation via direktem `goto`. |
| 6 | Mobile-Overflow ≤1px | **KORREKT.** Sub-Pixel-Toleranz, 293-Pattern. |
| 7 | Verkabelung + nightly non-blocking | **KORREKT.** `if: always()` + `continue-on-error: true`, Mirror fantasy-lifecycle. |

## Findings
| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NITPICK | spec.ts:38 | `legal`/`tips` aus 293-Pattern fehlen in Leak-Allowlist. /club hat aktuell keinen Disclaimer → kein realer Gap. | Optional `legal` ergänzen (Zukunftssicherheit Membership/Compliance). **→ ÜBERNOMMEN.** |
| 2 | NITPICK | spec.ts:142 | AC-B4 prüft nicht dass andere Tabs `aria-selected=false` werden. TabBar garantiert Exklusivität strukturell. | Kein Fix nötig. |
| 3 | INFO | proof:18-20 | `test:club-lifecycle` Inline-Env greift nicht auf Windows cmd.exe (= test:fantasy-lifecycle-Eigenschaft); CI=Linux OK. | Kein Fix — konsistent mit 293. |

## Positive
- Lückenlose Anker-Verifikation gegen echte Source (kein Raten — testing.md-Vorgabe erfüllt).
- 293-Blueprint sauber übertragen: contract-not-value, retries:1, pageerror-Collector (≠ console.error, AC-B7 dokumentiert), exact:true, ≤1px-Mobile, own-login.
- Regression-Anker für 3 Slices verdrahtet: 286 (Cold-Load-Filter), 297 (4-Tab-Split + Mobile-393px), 282a (kein Card-Click).
- Non-blocking-Promotion konsistent mit 293 §11.

## Post-Review Aktionen (Primary-Claude)
- NITPICK #1 übernommen: `legal` zur I18N_LEAK-Allowlist ergänzt + Re-Run grün.
- testing.md Knowledge-Note ergänzt (Slice 298 als zweites Lifecycle-E2E-Beispiel + aria-selected-Anker-Lehre).
- NITPICK #2 + INFO #3: akzeptiert, kein Fix (strukturell garantiert / konsistent mit Vorgänger).

## Summary
Vorbildliche Umsetzung des 293-Contract-Patterns auf Club-Pages. Alle 7 Risiken gegen echte Source verifiziert. Nur kosmetische Nitpicks. Merge-ready.
