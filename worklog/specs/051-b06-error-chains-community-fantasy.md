# Slice 051 — B-06 Error-Chains Community + Fantasy

**Groesse:** S
**CEO-Scope:** NEIN (i18n-polish, kein UX-Regression)
**Variante-2-Position:** #8/10

## Ziel

J3-Pattern (`te(mapErrorToKey(normalizeError(err)))`) analog zum Trading-Bereich auf Community + Fantasy Error-Chains anwenden. Finde + fix raw-err.message-Leaks.

## Hintergrund

J3 Reviewer (2026-04-14, common-errors.md "i18n-Key-Leak via Service-Errors") hat aufgezeigt: Service throw `new Error('handleReserved')` → Consumer `setError(err.message)` → User sieht raw i18n-key.

Fix-Pattern in Trading-Bereich war: `tErrors(mapErrorToKey(normalizeError(err)))`. Community + Fantasy sollten analog sein.

## Findings (Audit 2026-04-18)

- **Fantasy:** Fast komplett sauber — `useLineupSave.ts` + `useEventActions.ts` nutzen bereits `te(mapErrorToKey(...))` Pattern.
- **Community:** **7 raw err.message leaks gefunden** in:
  - `useCommunityActions.ts` (6x — handleAdminDeletePost, handleTogglePin, handleCreateResearch, 4x generic `genericError`-Fallbacks)
  - `ReportModal.tsx` (1x — reportContent catch)

## Fixes

**`src/components/community/hooks/useCommunityActions.ts`:**
- handleAdminDeletePost: raw `err.message` → `tErrors(mapErrorToKey(normalizeError(err)))`
- handleTogglePin: gleich
- handleCreateResearch: gleich
- 4 weitere Handler mit gleichem Pattern
- Zusaetzlich: `result.error` von RPC-Response-Objects via `tErrors(mapErrorToKey(result.error))` resolved (war vorher `result.error ?? t('genericError')` → raw key moeglich)

**`src/components/community/ReportModal.tsx`:**
- Added `mapErrorToKey` + `normalizeError` + `tErrors = useTranslations('errors')` imports
- result.error UND catch-block auf resolved keys

## Acceptance Criteria

1. Keine `err instanceof Error ? err.message` patterns in `src/components/community/`. ✅ (grep = 0)
2. Alle result.error-Return-Values via `tErrors` resolved. ✅
3. tsc clean. ✅
4. 72/72 useCommunityActions.test.ts gruen. ✅

## Proof

`worklog/proofs/051-error-chain-audit.txt`
