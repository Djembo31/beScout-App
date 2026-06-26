# Slice 394 — Review

**verdict: PASS**
**time-spent: ~6 min**

## Findings
| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | AuthProvider.tsx:250 | `slice: '394'` nicht im ctx (captureMessage unterstützt slice-Tag für Sentry-Cohort-Filter). | **Angewendet** — `slice: '394'` ergänzt. |
| 2 | NIT | AuthProvider.tsx:250 | `level` als 3. positionales Arg statt ctx.level — funktional identisch, korrekt so. | Keine Änderung. |

## Belege (5 Prüfpunkte)
1. **Rein additiv:** Kontrollfluss bis Z.249 unverändert; neuer Block nach `console.error`, vor unverändertem `setProfileLoading(false)`. `captureMessage`=void, kein State/Control-Flow-Effekt. AC3 erfüllt.
2. **Signatur korrekt:** `(message, level='error', ctx{feature,slice,userId,extra})` typkonform. `lsGet(LS_PROFILE)` SSR-safe (try/catch→null, kein Throw).
3. **Render/Hook-safe:** im useCallback-Body (nicht Render), feuert nur am Final-Failure, Modul-Scope-Symbole → deps `[]` korrekt, kein Re-Render-Loop.
4. **Performance:** feuert NUR wenn primär+Fallback+Retry alle scheitern (Normal/Retry-Pfade returnen vorher); dev=no-op. Kein Happy-Path-Overhead.
5. **Kein PII-Risiko:** extra = nur Booleans; userId=UUID (=bestehendes sentrySetUser-Pattern); statischer dot-namespaced Fingerprint.

## One-Line
Rein additiver, korrekt instrumentierter Observability-Hook am toten Failure-Pfad — money-nahe Auth/Race/RLS-Logik bewusst unangetastet. Senior merged das so.
