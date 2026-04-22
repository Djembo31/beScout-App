# Review — Slice 152a (useWallet Query-Hook Foundation)

**Reviewer:** Primary-Claude Self-Review (scope ist Foundation-only, kein
Behavior-Change; Reviewer-Agent kommt nach Welle 3 gegen ganzes Slice 152)
**Datum:** 2026-04-23
**Scope:** 2 neue Files + 2 Doku-Files. Keine modifizierten Files.
**Verdict:** **PASS**

## Files im Scope

- `src/lib/hooks/useWallet.ts` (NEU, 189 LOC) — Query-Hook + 4 Helpers
- `src/lib/hooks/__tests__/useWallet.test.ts` (NEU, 13 Tests) — via test-writer-Agent TDD (sah Implementation nie)
- `worklog/specs/152-wallet-provider-to-query.md` (NEU) — Slice-152-Gesamt-Spec
- `worklog/proofs/152-usewallet-tests.txt` (NEU) — vitest-Output

## Prüfmatrix

### 1. Ferrari-Norm-Konformität (useToggleFollowClub-Blaupause)

| Kriterium | Check |
|---|---|
| `'use client'` Directive | ✅ |
| Query-Key user-scoped + prefix-compatibel mit `qk.wallet.all` | ✅ `walletQueryKey(uid) = ['wallet', uid]`, prefix-match mit `['wallet']` |
| `enabled` guard bei no-user | ✅ `enabled: !!userId` |
| `staleTime` explizit gesetzt | ✅ 30_000 ms (identisch zu altem Freshness-Window) |
| Observability für Query-Errors | ✅ `logSilentCatch('wallet.fetch', query.error)` |
| Mutation-Helpers folgen `setQueryData`/`invalidateQueries` Pattern | ✅ 4 Helpers (setBalance/setLocked/invalidate/remove) |
| Reference-stable bei same-value | ✅ `if (prev.balance === new) return prev` |
| No-op bei null/undefined Cache | ✅ explizit geprüft |
| Merge preserves other fields | ✅ `{ ...prev, balance: new }` — preserves locked_balance + timestamps |

### 2. common-errors.md Checks

| Pattern | Relevanz | Check |
|---|---|---|
| `.single()` vs `.maybeSingle()` | — | nicht relevant (getWallet nutzt bereits `.maybeSingle()` im Service) |
| Error-Swallowing | HIGH | ✅ `getWallet` throwt (Service-Layer Slice 092+) — Query retries 3x via React-Query-Default |
| pgBouncer Read-After-Write | HIGH | ✅ adressiert: `setWalletBalance` im onSuccess (deterministic), `invalidateWallet` erst im onSettled |
| Silent-Catch ohne Observability | HIGH | ✅ `logSilentCatch('wallet.fetch')` |
| Dual-State-Drift (D18) | HIGH | ✅ Design eliminiert — Query-Cache ist einzige Wahrheit |

### 3. TypeScript-Striktheit

- `UseWalletResult` Interface explizit exportiert, nicht implicit-any in Return ✅
- `DbWallet | null` korrekt typed (getWallet-Signatur) ✅
- `readonly [string, string]` für query-key (immutable tuple) ✅
- Keine `as any` oder `as unknown as` Casts ✅
- `QueryClient` Parameter explizit typed ✅

### 4. Tests (TDD-Validierung)

| Kriterium | Check |
|---|---|
| Test-Writer hatte Implementation NICHT gesehen | ✅ (worktree-isoliert, Spec-only Briefing) |
| 13 Szenarien ≥ 13 AC-Punkte aus Spec | ✅ eins-zu-eins Abdeckung |
| Jeder Test hat WARUM-Kommentar | ✅ (per test-writer Report) |
| Kein `toBeDefined()`-Tautology | ✅ (konkrete Werte geprüft) |
| Reference-Stability Test (`toBe` vs `toEqual`) | ✅ (#10 prüft same-reference) |
| Prefix-Match Test für invalidateWallet | ✅ (#12 seedet 2 user-scoped keys) |
| vitest grün (13/13) | ✅ 3.81s |
| tsc clean | ✅ |

**Design-Abweichung transparent:** Test-Writer hat `vi.useFakeTimers` durch `vi.spyOn(Date, 'now')` ersetzt (React-Query-internal-Promise-Deadlock mit fake-timers). Selbe Semantik, andere Mechanik. Ehrlich im Report dokumentiert — kein versteckter Workaround.

### 5. JSDoc-Qualität

- File-Header erklärt Motivation (State-Sync-Audit Klasse C) ✅
- Jeder Export hat JSDoc ✅
- `@example`-Blöcke für Consumer-relevante Helpers ✅
- pgBouncer-Referenz zu common-errors.md ✅
- Konflikt-Vermeidungs-Kommentar zu keys.ts (warum kein Edit dort jetzt) ✅

## Findings

**Keine Blocker.** Zwei Minor-Observations für spätere Migration-Wellen (nicht-blocking):

- **NIT-1 (Welle 2):** `setWalletBalance` current-signatur nimmt `userId` explizit. Alternative wäre Hook-Var `const uid = useUser().user?.id`. Aber: der Helper ist bewusst außerhalb des Hooks aufrufbar (in onSuccess-Handlern von Mutations wo kein Hook-Context mehr aktiv ist). Signatur bleibt.
- **NIT-2 (Welle 3):** `removeWalletFromCache` ist Plural-Targeted (`['wallet']` prefix). Könnte theoretisch auch Cross-User-Wallets eines Multi-Account-Scenarios treffen — aber Multi-Account ist nicht supported (BeScout = single-session). Akzeptabel.

## Nächste Migration-Wellen

- **Welle 1 (152b):** 10 read-only Consumer → Import-Swap. Review-Gate: Self-Review reicht (triviale Substitution).
- **Welle 2 (152c):** 5 Mutation-Consumer → `setBalanceCents/refreshBalance` → `setWalletBalance/invalidateWallet`. Review-Gate: **Reviewer-Agent pflicht** (Behavior-Change, Money-Path).
- **Welle 3 (152d):** Provider-Delete + 5 Tests + AuthProvider-signOut-Cleanup. Review-Gate: **Reviewer-Agent pflicht** (Cross-Cutting).

Reviewer-Agent-Briefing für Welle 2+3: "Jede Abweichung zur `useToggleFollowClub`-Blaupause ist ein Finding" (Ferrari-Norm-Check).

## Proof-Artefakt

- `worklog/proofs/152-usewallet-tests.txt` — vitest 13/13 green (3.81s)
- tsc --noEmit clean (bestätigt nach File-Write)

## Rollback-Pfad

`git revert <commit>` — Hook + Test sind isoliert, keine Consumer betroffen. Reversibel ohne Folge-Aufwand.
