# Slice 161 Review

**Verdict:** PASS
**Reviewer:** reviewer-agent (cold-context, via Agent-tool dispatch)
**Date:** 2026-04-23
**Scope:** 2 Files (LeaguesSection + MissionBanner), 4 Handler vom D17-Pattern auf useSafeMutation-Ferrari-Blueprint #28.

## Spec-Coverage

- [x] 4 Handler via `useSafeMutation` + `safeTrigger`, keine legacy `useState<boolean>`/`useState<string|null>` mehr
- [x] `disabled` auf Buttons via `mut.isPending`
- [x] Per-Row pending in MissionBanner via `claimMut.variables?.missionId` (analog Slice 159)
- [x] Error-Handling via `throw new Error` in mutationFn → onError addToast/setClaimError
- [x] Success-Path identisch (Toast, invalidate, close, setMissions, delayed ticket/wallet/notifications invalidate)
- [x] Tests grün (319/319)
- [x] `tsc --noEmit` clean
- [x] Scope-Revision: AirdropScoreCard korrekt ausgeschlossen (display-only verifiziert)

## Findings

| # | Severity | File:Line | Issue | Suggested Fix |
|---|----------|-----------|-------|---------------|
| 1 | NIT | LeaguesSection.tsx:10 · MissionBanner.tsx:16 | Singleton `queryClient` statt `useQueryClient()`-Hook. Slice 157/156/153a/159-FanWishModal nutzen Hook (P2.2-Konvention). Slice 161 führt Singleton zurück. Konvention-Drift. | **Backlog:** Patterns.md #28 explizit um "Hook für Money-Path, Singleton OK für non-Money" erweitern ODER Follow-up-Slice 161b migriert auf Hook. Technisch harmlos (same instance). |
| 2 | NIT | LeaguesSection.tsx Modals | Kein `preventClose={mut.isPending}` — User kann via ESC/Backdrop Modal während RPC schließen. | **Out-of-Scope** laut Spec Edge-Case #4. Backlog: analog common-errors.md §5 J2+J3-Pattern nachziehen. |
| 3 | NIT | LeaguesSection.tsx onError × 3 | `err.message \|\| t('unknownError')` — `\|\|`-Fallback redundant weil mutationFn bereits `throw new Error(result.error ?? t('unknownError'))` macht. | **Backlog:** konsistent mit 157 Review Finding #3 (`showError(err.message \|\| err)`). `showError(err)` würde reichen. |
| 4 | INFO | MissionBanner.tsx:126 | `useCallback([user, claimMut])` — claimMut ist neues Objekt pro Render (Object.assign-Return), Memoization no-op. | Keine Aktion — konsistent mit 157 Blueprint Finding #5. useSafeMutation.ts:143 dokumentiert das. |
| 5 | INFO | MissionBanner.tsx:80-117 | Kein `onMutate`/Optimistic. Reward-Betrag ist DB-seitig bestimmt, Optimistic-Skip korrekt (non-deterministisch). | Matches Blueprint-Rule "Optimistic nur wenn deterministisch". |

**Keine HIGH / MEDIUM / REWORK / FAIL.**

## Prüfungs-Antworten

1. **Blueprint-Konsistenz:** PASS. Alle 4 Handler — mutationFn wirft bei !success, onSuccess-Flow sequenziell, onError korrekt, errorTag pro Handler (`leagues.create/join/leave`, `missions.claim`).
2. **Service-Return-Semantik:** PASS. `Awaited<ReturnType<...>>` erbt optionale Felder. onSuccess-Guards sauber (`result.new_balance != null`). Edge: `result.leagueName` bei join könnte undefined sein — Toast `"joined: undefined"` theoretisch möglich, unwahrscheinlich. Non-blocking.
3. **Consumer-Kompat:** PASS. Alle Buttons auf `mut.isPending`. Regression-grep bestätigt 0 D17-Code-Hits.
4. **Per-Row-Pending:** PASS. Semantik byte-identisch zu Legacy (`claiming === m.id` + `disabled={claiming !== null}`).
5. **Test-Setup:** INFO. Mock-Expansion ist etablierte Test-Konvention (19+ andere Test-Files gleicher Pattern). Kein Dokumentations-Bedarf.
6. **Error-Handling-Parity:** PASS. LeaguesSection: `err.message || fallback` semantisch äquivalent, defensiver. MissionBanner: `mapErrorToKey` hat Pass-Through für known-keys → Resolver korrekt.
7. **confirm()-edge:** PASS. Cancel → kein safeTrigger, kein State-Change.
8. **ESLint useCallback-dep:** PASS. `claimMut` im dep-array enthalten. Kein tatsächliches Warning.

## Positive

- **Blueprint-Reife:** Copy-Paste aus 159 — 4 Handler ohne neue Patterns. Einheits-Shape bestätigt.
- **errorTag vollständig:** Observability-Hook für alle 4 Handler.
- **i18n-Key-Resolver-Pfad sauber:** J7B-06 Regression-Schutz erhalten.
- **Scope-Revision dokumentiert:** AirdropScoreCard-Skip in Spec erklärt.
- **Regression-Grep-Proof messbar:** 0 Code-Hits nach Refactor.
- **Klasse-D (useCountUp):** Nicht-Anwendbarkeit korrekt eingeschätzt.
- **API unchanged:** Keine Downstream-Breaking-Changes.

## Learnings (Knowledge-Capture für Session-End)

1. **Konvention-Codification gebraucht (Finding #1):** `useQueryClient()` Hook vs Singleton-Import. Slice 157 begann Hook-Migration, 159-Split war uneinheitlich, 161 zurück zu Singleton. **Entweder patterns.md #28 um Regel erweitern oder Slice 161b Mini-Cleanup.** Aktuell als NIT Backlog.

2. **Test-Mock-Expansion-Pattern:** Beim Migrieren eines Components auf useSafeMutation (via transitive ToastProvider-Import) muss der Component-Test-File ToastProvider-Stub + lucide-react-Icons (AlertCircle, CheckCircle2, Info, Loader2, X) mocken. Pattern etabliert in 19+ Test-Files — implicit convention.

3. **Scope-Revision als Signal für Audit-Stale:** `worklog/proofs/150-mutation-audit.md` listete AirdropScoreCard als Tier-2 "claim airdrop". Code-Realität: display-only. Audit-Listen sollten jährlich oder bei Scope-Fragen verifiziert werden. Dokumentiert in aktiver.md-Update.

## Summary

Mustergültiger Copy-Paste-Ferrari-Refactor. 4 Handler auf Blueprint #28, errorTag-Observability durchgehend, Service-Return-Semantik sauber, Per-Row-Pending konsistent zu 159. 5 NITs, alle non-blocking + Backlog (Konvention-Drift `useQueryClient`, `preventClose` out-of-scope, `err.message ||` Redundanz). Tier-2-Data-Integrity von 5/8 auf 6/8. Commit-freigabe.
