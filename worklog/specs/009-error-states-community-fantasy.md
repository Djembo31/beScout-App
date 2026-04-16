# 009 — Error-States Community/Fantasy (B-06)

## Ziel

Eliminiere verbliebene Raw-Error-Leaks in Club-Admin + Fantasy-Prediction-UI. Die J2/J3-Error-Pattern-Härtung (Service wirft i18n-Keys, Consumer resolved via `mapErrorToKey + normalizeError + te()`) ist in Trading + Bounties + Wildcards + Lineups konsistent angewandt — NUR die letzten 4 Leak-Stellen im Admin-Events-Hook + Prediction-Modal zeigen noch `err.message` bzw. raw RPC-Response direkt dem User.

Drift-Klasse: `setError(err instanceof Error ? err.message : t('fallback'))` → bei Service-Throw mit i18n-Key (wie `'insufficient_wildcards'`) oder Supabase-Raw-Error (`"violates check constraint"`) sieht User unuebersetzten Text.

## Klassifizierung

- **Slice-Groesse:** S (2 Files, ~10 LOC per file)
- **Scope:** **CTO-autonom** (defensive Anpassung auf etabliertes Pattern, kein User-facing-Copy-Change, keine Money-Logik)
- **Referenz:** Walkthrough 04-blocker-a.md B-06; `.claude/rules/common-errors.md` "i18n-Key-Leak via Service-Errors" (J1 Reviewer + J3 bestaetigt); `src/features/fantasy/hooks/useEventActions.ts:187` canonical pattern

## Betroffene Files

| File | Leak-Stellen | Fix |
|------|-------------|-----|
| `src/components/admin/hooks/useClubEventsActions.ts` | Z.44 (handleCreate result.error), Z.53 (handleCreate catch), Z.67 (handleStatusChange result.error), Z.72 (handleStatusChange catch), Z.85 (handleSimulate result.error), Z.96 (handleSimulate catch) | Alle via `mapErrorToKey(normalizeError(...))` + `tErrors()`-Resolve |
| `src/components/fantasy/CreatePredictionModal.tsx` | Z.130 (result.error), Z.133 (err.message) | Gleicher Pattern |

## Acceptance Criteria

1. `useClubEventsActions.ts` importiert `mapErrorToKey, normalizeError` aus `@/lib/errorMessages`.
2. `useClubEventsActions.ts` nutzt `useTranslations('errors')` parallel zu `useTranslations('admin')` (Namespace-Split `tErrors`).
3. Alle 3 `catch (err)` Bloecke verwenden `setError(tErrors(mapErrorToKey(normalizeError(err))))` statt `setError(err instanceof Error ? err.message : ...)`.
4. Alle 3 `if (!result.success)` Bloecke verwenden `setError(result.error ? tErrors(mapErrorToKey(result.error)) : t('<specific-fallback>'))`.
5. Gleiche 2 Aenderungen in `CreatePredictionModal.tsx` (Z.130+133) — `tErrors` via `useTranslations('errors')`.
6. tsc clean.
7. Diff ≤ 40 LOC, 2 Files.

## Edge Cases

1. **result.error ist leer/undefined** → Fallback auf existing `t('eventCreateError')` / `t('genericError')` etc.
2. **result.error ist bereits ein i18n-Key** (z.B. `'eventCreateFailed'`) → `mapErrorToKey` passthrough via `KNOWN_KEYS`-Set.
3. **result.error ist Supabase-Raw-Text** (z.B. `"violates check constraint"`) → Regex-Match in `ERROR_MAP` → passendes Key ODER `'generic'`-Fallback.
4. **err ist kein Error-Instance** → `normalizeError(err)` wandelt String/Object in String, dann `mapErrorToKey`.
5. **`tErrors(key)` gibt key zurueck statt Text** (fehlende Uebersetzung) → User sieht i18n-Key statt text. Fix-Option: `te()` (als Fallback-Aware). Aber hier `t()` da wir wissen: die 34+ KNOWN_KEYS sind alle in `messages/de.json` + `messages/tr.json` uebersetzt (laut `lib/errorMessages.ts`).
6. **messaging.json hat key nicht** → next-intl Dev-Mode wirft Error (audit-safe), Prod rendert key. Akzeptabel.

## Proof-Plan

- `worklog/proofs/009-diff.txt` — git diff der 2 Files
- `worklog/proofs/009-tsc.txt` — tsc clean
- `worklog/proofs/009-tests.txt` — vitest run auf service tests (kein Regression)

## Scope-Out

- **`src/app/(auth)/login/page.tsx` x4** — Auth-Error-Exposure (Supabase-Auth-Raw-Text). Anders gelagert: Auth-Errors sind EN/vendor-text, nicht i18n-Keys. Separater Slice (Auth-UX-Polish).
- **Anti-Pattern-ESLint-Rule** — Forbid `setError(err.message)` durch ESLint-Regel. Nice-to-have, separater Slice.
- **Error-Boundary-Component** — Reaktion auf unerwartete Exceptions in React-Tree. Separater Slice.
- **Testing-Coverage** — Diese Files haben keine Tests fuer Error-Paths. Defensiv-Slice, kein Testing-Ausbau.

## Stages

- SPEC — dieses File
- IMPACT — inline (Consumer-Side-Fix, kein Service-Contract-Change)
- BUILD — 2 File-Edits
- PROVE — diff + tsc + tests
- LOG — commit + log.md
