# CTO Review: Slice 157 — useOffersState Ferrari-Refactor

**Reviewer:** reviewer-agent (Cold-Context, 1M-window)
**Date:** 2026-04-23
**Duration:** 35 minutes

---

## Verdict: **PASS**

Mustergültiger Ferrari-Refactor. 4× `useSafeMutation` mit pgBouncer-safe Wallet-Invalidation, Money-Path Sentry-Observability via errorTag, Consumer-API byte-identisch. Blueprint 153a + 156 konsequent gefolgt. 25 Tests grün (12 pre-Ferrari migriert + 13 neue Ferrari-Assertions). Nur 5 NITs, alle non-blocking.

---

## Spec-Coverage

- [x] **A1** — 4× `useSafeMutation` mit errorTag (`market.offerAccept`, `market.offerReject`, `market.offerCounter`, `market.offerCancel`).
- [x] **A2** — `onSettled: invalidateWallet(qc)` bei allen 4 Mutations.
- [x] **A3** — Consumer-API unveraendert. OffersTab.tsx:384-459 destructure-Pattern unberührt (18 Properties).
- [x] **A4** — `actionId` derived aus accept/reject/cancel mut.isPending + mut.variables.
- [x] **A5** — `countering` derived aus counterMut.isPending.
- [x] **A6** — Rapid-Click Guard via `mut.isPending` vor `mutateAsync`.
- [x] **A7** — `useQueryClient()` statt Singleton.
- [x] **A8** — 25 Tests grün, tsc clean.

## Findings

| # | Severity | File:Line | Issue | Status |
|---|----------|-----------|-------|--------|
| 1 | NIT | useOffersState.ts:127-128 | Kommentar `"rejectOffer selbst moves kein Geld, aber Sender-side-escrow release kann impliziert sein"` ist subtil irreführend. Defensive invalidate ist per Spec Edge-Case #5 akzeptiert, Kommentar kann präzisiert werden. | Defer (NIT, non-blocking) |
| 2 | NIT | useOffersState.ts:258-262 | `actionId`-Derivation via `(isPending && variables?.offerId) \|\| ...` weniger explicit als 156 Blueprint ternary. | Defer — 156-Konsistenz BACKLOG |
| 3 | NIT | useOffersState.ts:98/124/153/179 | `showError(err.message \|\| err)` ist belt-and-suspenders; `showError(err)` reicht (`useErrorToast` normalisiert intern). | Defer — Mini-Audit-Backlog über alle showError-Call-Sites |
| 4 | NIT | useOffersState.ts:90-96 | `acceptMut.onSuccess` liest `offers.find()` aus Closure. Bei Tab-Wechsel mid-flight → `offers` state changed, `find` könnte miss. Fallback: `invalidateTradeQueries` wird nicht gefeuert (kein Crash). | Defer — pre-compute playerId aus offer als mutation-variable wäre robuster BACKLOG |
| 5 | NIT | useOffersState.ts:202/215/231/243 | `useCallback`-deps inkludieren mut-refs die pro-Render neu sind (Object.assign). Matches 156 Blueprint. | Keine Aktion. |

**Keine HIGH / MED / REWORK-Findings.**

## Prüffokus-Antworten

### Optimistic-Scope bewusst Skip — ✅ Korrekt
Bei cross-user-transfer sind Client-Side-Updates unzuverlässig (unbekannter Wallet-Delta, Fee-Split server-side, counter-offer erzeugt neue Row mit neuem ID). Konsistent mit 153a `cancelBuyOrder` (auch ohne Optimistic bei Escrow-Flows).

### pgBouncer onSettled bei allen 4 Handlern — ✅ Defensive OK
Reject ist borderline — Current-User-Wallet nicht touched (nur Sender-Wallet bei counter-reject). Invalidate ist harmlos (extra Refetch, Spec Edge-Case #5 akzeptiert).

### Consumer-API-Kompatibilität — ✅ Byte-identisch
OffersTab.tsx:384-459: 18 Properties unverändert. Wrapper async+void mit swallowed throw. Kein anderes Consumer-Call-Site.

### Ferrari-Blueprint-Konformität — ✅ 1:1 zu 153a + 156
`useQueryClient()` + `useSafeMutation` + errorTag + `onSettled invalidateWallet` + derived-state.

### Test-Refraiming (rapid-click Assertion) — ✅ Pragmatisch korrekt
`exposes actionId while accept is in-flight` statt strict RPC-count. UI-Gate (disabled-button via actionId) ist das echte Race-Gate. Kommentar im Test begründet Timing-Fragility. Konsistent zu 153b.

## Against common-errors.md

- §1 Silent-Catch: Wrapper-try/catch schluckt nur Reject — onError+errorTag+logSilentCatch greift ✓
- §2 pgBouncer Read-After-Write: onSettled invalidateWallet ✓
- §5 i18n-Key-Leak: Service wirft Keys, Hook resolved via useErrorToast ✓
- D18 React-setState-Race: 4× useSafeMutation mit synchronem isPending-Guard ersetzt Legacy useState+setActionId ✓
- Money-RPC Idempotency (151c.2): Server-side in acceptOffer/cancelOffer. Client-Guard Defense-in-Depth. Scope-out ✓

## Against trading.md

- BIGINT cents ✓ (priceCents = Math.round(parseFloat(counterPrice) * 100))
- Fee-Split server-side ✓
- Escrow Pattern unchanged ✓
- Closed Economy ✓

## Positive Highlights

1. File-Header JSDoc erklärt Ausgangslage, Blueprint, jede Design-Entscheidung.
2. Inline-Why-Kommentare bei allen 4 onSettled (pgBouncer + Escrow-Timing).
3. Ferrari-Pattern 1:1 zu 156.
4. Typsicherheit: `Awaited<ReturnType<...>>`, keine Casts.
5. Test-Migration auf QueryClientProvider sauber.
6. 13 neue Ferrari-Tests decken onSettled+errorTag+state-exposure.
7. Pragmatische Test-Refraiming (actionId-Gate vs strict RPC-count) mit begründetem Kommentar.
8. invalidPrice pre-check vor mutateAsync — kein RPC-Waste.
9. counterModal state-reset nur im onSuccess — bleibt bei Fehler offen für Retry.

## Learnings für Knowledge Capture

- **memory/patterns.md** BACKLOG: "Money-Path Defensive Wallet-Invalidate" — bei RPCs mit cross-user-Wallet-Effects ist `invalidateWallet(qc)` im onSettled defensiv legitim (1 extra Refetch, deckt Edge-Cases).
- **common-errors.md §5** BACKLOG: `showError(err.message || err)` ist redundant — `showError(err)` reicht. Audit-Idee: grep `"showError(err.message"`.
- **Blueprint-Invariante** (Slice 157 first-of-kind): Optional skip Optimistic-Updates wenn Client-deterministischer Delta unknown ist (cross-user-transfer). Kriterium: "Ist der delta pre-computable?" NEIN → Skip ist korrekt.

## Summary

**PASS — go ahead zu PROVE + COMMIT.** 5 NITs sind allesamt non-blocking und gehören in Follow-up Slices (158+) oder Knowledge-Capture-Updates.
