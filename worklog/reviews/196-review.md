# Slice 196 Review — Cross-Cutting P1-Sweep (Track A+B+C)

**Datum:** 2026-04-25
**Reviewer:** reviewer-Agent (Cold-Context Opus)
**Verdict:** CONCERNS → PASS (nach Hot-Fix MAJOR-1 inline)
**Time-Spent:** 35 minutes

## Summary

Slice 196 hat 3 parallel-dispatched Tracks (Brand-Token-Migration, UX-Patterns, Loader2→Skeleton+Founding-Bar) sauber zusammengefuehrt. **30 Files merged, 16/98 Findings closed (≈16%, vorher 6%)**, alle drei Tracks haben ihre Pflicht-Scope abgearbeitet. Der manuelle Conflict-Resolve auf `founding/page.tsx` ist exemplarisch sauber.

## Findings

### CRITICAL (block merge)
keine

### MAJOR (must-fix-before-Beta)

| # | File:Line | Issue | Status |
|---|-----------|-------|--------|
| MAJOR-1 | `src/features/manager/components/intel/StatsTab.tsx:19` | `STATUS_DOT.doubtful: 'bg-yellow-400'` inkonsistent zu `STATUS_TEXT.doubtful: 'text-status-doubtful'` Z26. Track A hat in derselben File text migriert, aber dot vergessen. Visual-Drift Amber vs Yellow-400. | **HEALED inline** — Z19 → `bg-status-doubtful`. |
| MAJOR-2 | `src/features/manager/components/intel/StatsTab.tsx:18-22` | STATUS_DOT.injured/suspended/fit sind plain-Tailwind, doubtful jetzt Token. Konsistenz-Outlier: alle 4 auf Token oder doubtful zurueck zu plain. | **DEFERRED** — Anil-Decision (Token-Set-Strategie). Punch-Liste Slice 198 Discussion-Item. |

### MINOR (nice-to-have, Backlog)

| # | File:Line | Issue | Punch-Liste-Slice |
|---|-----------|-------|-------------------|
| MINOR-1 | `airdrop/page.tsx:78` | Inline-Hex `#B9F2FF` (Diamond-Tier). Track A nur Gold migriert. | Brand P3 #15 — already in Punch-Liste, Slice 198 |
| MINOR-2 | `kaderHelpers.tsx:106` | `bg-yellow-400` MinutesBar. Anderer Use-Case. | Backlog |
| MINOR-3 | `fantasy/helpers.ts:81` | `bg-yellow-500` percentile-color. | Backlog |
| MINOR-4 | `tailwind.config.ts:18` | Token-Naming `status-doubtful` alleine. Token-Set-Strategie offen. | Slice 198 Discussion |

## Cross-File-Sanity

`founding/page.tsx` Manual-Merge: alle 9 Audit-Punkte ✓ (Skeleton + i18n-Imports + te-Hook + 2 catch-Branches + Total-Progress-Bar + Tier-Progress-Bar + Hooks-Order + addToast-celebration legitim).

Track-A 10-File-Audit: 9/10 ✓, **1× MAJOR-1 (StatsTab Z19) — gefixt**.

## Tailwind-Token-Verification

`tailwind.config.ts:18` `status-doubtful: "#F59E0B"` korrekt registriert. WCAG-AA gegen `#0a0a0a`: 8.85:1 (PASS).

## Knowledge-Flywheel

**Pattern fuer `errors-frontend.md`:**

```
### Hardcoded German addToast/Error-Strings (Slice 196 Track B)

User-facing components mit `addToast('Ein Fehler ist aufgetreten', 'error')` umgehen i18n und brechen TR-Locale.

Audit-CI-Detector:
  grep -rn "addToast\\('[A-Z]" src/ | grep -v "bescout-admin\\|__tests__"

Fix-Pattern:
  const te = useTranslations('errors');
  catch (err) { addToast(te(mapErrorToKey(normalizeError(err))), 'error'); }
```

→ **In errors-frontend.md aufnehmen** (i18n-Section).

## Punch-Liste-Status nach Slice 196

**Closed: 22/98 (≈22%)** — vorher 6/98.

| Domain | Total | done | offen | Δ Slice 196 |
|---|---|---|---|---|
| Brand | 18 | 7 | 11 | +7 |
| UX | 27 | 8 | 19 | +8 |
| FM | 26 | 1 | 25 | +1 |
| Fantasy | 27 | 6 | 21 | unchanged |
| **TOTAL** | **98** | **22** | **76** | **+16** |

**Top-5-P1 fuer Slice 197:** fm 1.1 (Form-L5-Filter), fm 1.2/4.1 (MV-Trend), F-02 (Formationen), F-08 (Countdown-Sekunden), K-01 (FDR-Strip).

## Empfehlung

1. ✅ Hot-Fix MAJOR-1 inline applied
2. Pattern in `errors-frontend.md` aufnehmen
3. Punch-Liste auf 22 closed updaten
4. PROVE-Stage commit + Vitest 372/373 (1 skipped, kein fail) verify
5. Direkt zu 195e weiter (parallel-dispatch laeuft schon)

**Verdict:** CONCERNS resolved → **PASS** nach 1-Zeilen-Hot-Fix.
