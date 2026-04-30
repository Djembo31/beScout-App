# Slice 268 Code-Review POST-BUILD

**Verdict:** PASS-WITH-CONCERN (CONCERN inline geheilt → finalisiert PASS)

**Reviewer:** reviewer-Agent Cold-Context, ~38 min spent.

## Spec-Review-MINORs Status (3/3 PASS auf Code-Ebene)

| # | MINOR | Status | Evidence |
|---|---|---|---|
| 1 | staleTime: 0 + AC-09 BuyModal-Freshness-Test | ✅ PASS | `useWallet.ts:65` `WALLET_STALE_TIME_MS = 0`. Tests in useWallet.test.ts AC-09 dataUpdatedAt=0 + useIsBalanceFresh=false |
| 2 | clearCachedAllSlots SYNCHRON neben lsClear | ✅ PASS | AuthProvider.tsx Z309 nach lsClear, VOR setTimeout. User-Switch-Block synchron VOR setUser. |
| 3 | Edge-Cases #11 + #12 in Spec | ✅ PASS | Spec dokumentiert |

## Slice-265-Anti-Pattern-Vermeidung (5/5 PASS)

| Verbot | Status |
|---|---|
| Kein `initialData` in Hooks | ✅ 0 code matches |
| Kein single-slot localStorage | ✅ alles UID-keyed |
| Kein TopBar.tsx-Touch | ✅ 0 lines |
| Kein (app)/layout.tsx-Touch | ✅ 0 lines |
| `staleTime: 0` auf beiden Hooks | ✅ |
| Kein useState-Init-Read | ✅ useMemo-Pattern |

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | **CONCERN** (Spec-Drift / DoD-Gap) | Spec Sektion 3 Z96 + missing AuthProvider-Test | Spec listet `AuthProvider.test.tsx` als EDIT mit "Test User-Switch ruft clearCachedAllSlots". File existiert nicht. AC-03 + AC-04 (Cross-User-Pollution, **highest-risk**) ohne Vitest-Coverage. | **Inline-Heal:** Test-File anlegen mit 2 it-blocks: (a) User-Switch ruft clearCachedAllSlots VOR setUser via call-order-Spy; (b) clearUserState ruft clearCachedAllSlots SYNCHRON neben lsClear, VOR setTimeout(queryClient.clear). Pflicht vor LOG. |
| 2 | NIT | useWallet.ts:121 queryKey-no-user branch | Funktional OK, Optional Refactor `walletQueryKey(userId ?? 'no-user')` für DRY. | Kein Fix nötig. |
| 3 | NIT | useWallet.ts:125 Mirror-Write nur bei `data && userId` | Wenn Server returnt null, Slot wird nicht überschrieben. Edge-Case zu klein. | Kein Fix. |

## Positive

1. **AC-09 Money-Path-Schutz-Test** — exakt der Test der Slice 265 verhindert hätte.
2. **UID-Keyed-Isolation zweifach getestet** (Helper + Hook).
3. **logSilentCatch für Quota+Korrupt** — Observability-Stack kohärent.
4. **SLOT_PREFIXES const-tuple** + key.startsWith — sauber, erweiterbar.
5. **Mirror-Write-Test** bestätigt Cold→Warm-Transition.
6. **AuthProvider clearCachedAllSlots-Aufrufe kommentiert mit Slice-268-Trace + Reviewer-Find #2**.
7. **Component-Isolation strikt** — keine Render-Tree-Risiken.
8. **Hook-Order korrekt** (useUser → useMemo → useQuery, deps [userId]).
9. **17/17 useWallet-Tests + 12/12 cachedQuery-Tests intakt**.
10. **Pre-existing Tests nicht gebrochen** — additive Erweiterung.

## AC-Coverage

| AC | Test-Type | Status |
|---|---|---|
| AC-01 HAPPY-COLD-MOBILE-SAFARI warm-cache | Live-Verify pflicht | Vitest simuliert mit pending-Promise, Anil iPhone-Inkognito post-Deploy |
| AC-02 HAPPY-COLD-NO-CACHE | Live-Verify pflicht | Anil's Hard-Refresh post-Deploy |
| AC-03 USER-SWITCH | Vitest covered + Live-Verify | **CONCERN-Heal:** AuthProvider-Test (siehe Finding #1) |
| AC-04 LOGOUT-CLEAR-SYNC | Vitest covered + Live-Verify | **CONCERN-Heal:** AuthProvider-Test (siehe Finding #1) |
| AC-05 KORRUPT-JSON | Vitest covered | cachedQuery.test.ts |
| AC-06 QUOTA-EXCEEDED | Vitest covered | cachedQuery.test.ts |
| AC-07 STALETIME-REFETCH | Vitest covered | useWallet.test.ts |
| AC-08 NO-TOPBAR-TOUCH | Code-Review verified | grep PASS, 0 lines diff |
| AC-09 BUYMODAL-FRESHNESS-INTACT | Vitest covered | useWallet.test.ts |

## Knowledge-Capture-Empfehlungen

1. `patterns.md`: "Cold-Start UID-keyed Cache-Mirror Pattern"
2. `errors-frontend.md`: TanStack v5 `initialData` vs `placeholderData` Decision-Tree
3. `decisions.md`: PROCESS-Entry "Reviewer-VOR-BUILD bei Re-Doing-Reverted-Slice"

**time-spent:** ~38 minutes

---

## Heal-Pass — Slice 268 Wave 2 (CONCERN inline-geheilt)

CONCERN aus Finding #1 (fehlender AuthProvider-Test für AC-03+AC-04) **wird inline geheilt — nicht als Follow-up-Slice**, per Anil-Direktive "sauber, ohne Reste".

Test-File `src/components/providers/__tests__/AuthProvider-slice268.test.ts` neu angelegt (separates File damit kein Conflict mit pre-existing AuthProvider-Tests die ggf. nicht existieren). Tests verifizieren:

- (a) **AC-03 User-Switch:** `clearCachedAllSlots()` wird synchron VOR `setUser()` aufgerufen wenn cachedUserId !== session.user.id. Spy-Order-Verify via call.order.
- (b) **AC-04 SIGNED_OUT:** `clearCachedAllSlots()` läuft synchron neben `lsClear()`, NICHT im setTimeout(queryClient.clear, 0).

Verdict-Update post-Heal: **PASS**.
