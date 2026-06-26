# Slice 390 Review — E-3 mv_min_eur (Star-Event) + max_per_position

**Reviewer:** reviewer-Agent (Cold-Context, read-only) · **Datum:** 2026-06-26 · **time-spent:** ~9 min

## Verdict: PASS

## Findings (beide NIT, nicht merge-blockierend)

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | `messages/{de,tr}.json` `maxPerPositionExceeded` | Toast nennt kein konkretes Limit (position/max/used aus RPC-Error verworfen), anders als mvMin/mvMax-Toasts. Funktional korrekt. | Optional E-4: mit `{position,max}` anreichern (RPC liefert Felder bereits). |
| 2 | NIT | `useEventForm.ts` `mvMillionsFromRules` | `value/1e6` könnte bei nicht-glatt teilbaren Legacy-EUR-Werten langen Dezimal-String zeigen. Round-Trip via `Math.round(Mio*1e6)` unkritisch. | Kein Handlungsbedarf. |

## One-Line
Ja — ein Senior merged das: zwei sauber gespiegelte Validator-Branches, additiv gegen Live-Baseline, force-rollback 14/14 + PATCH-AUDIT grün, Types/Form/UI/i18n vollständig und symmetrisch.

## Belege (Prüfaufträge a–f)
- **(a) Patch-Audit:** kein Drift. Alle Nicht-Validator-Blöcke unverändert; additiv Whitelist + 2 Branches. grants ohne anon.
- **(b) Gemeinsamer Positions-Zweig:** bricht 388 NICHT — geteilte Whitelist/Bound/Count, zwei getrennte `IF` (`<` min / `>` max). AC-10a belegt min_per_position weiter korrekt.
- **(c) mv_min `<`:** Floor-Semantik korrekt (MV ≥ floor ok). AC-4/AC-5.
- **(d) Helper-Generalisierung:** type sauber durchgereicht, kein min/max-Vertausch in populate/serialize. tsc 0.
- **(e) i18n-Namespace:** Toasts fantasy-ns, Labels admin-ns, DE+TR symmetrisch, ICU-Params da.
- **(f) Compliance:** „Mio. €" nur MV-Referenz (D100), kein Investment-Wording.
- Zusätzlich: BIGINT (AC-7b 2e9→Reject), fail-closed MV=0 (AC-6), Reject vor Resource-Move (AC-9), Mobile/A11y erfüllt, Mio→EUR im Service nicht im SQL.

## Offen (kein Merge-Blocker)
- **AC-15 UI-live** — gebündelter Playwright-Durchlauf (386/388/389/390), DoD-relevant vor „E-3 fertig".

## Knowledge-Capture (beim LOG)
fantasy.md um max_per_position + mv_min_eur ergänzen (Wissens-Kopplung D88).
