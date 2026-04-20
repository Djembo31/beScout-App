# Slice 110 — Auth+Wallet Robustness (Trading-Confidence)

**Status:** spec
**Size:** M (3-5 Files, backwards-kompatibel additive)
**CEO-Scope:** false (keine Fee-Logik, keine Money-Flow-Änderung — reine Provider-API-Erweiterung + Button-Disable-Guard)
**Vorgeplant in:** `worklog/proofs/107-trace-after.md` Zeile 55, "Slice 108 (AuthProvider-Refactor)" ursprünglich

## Ehrliche Einordnung

In meiner ursprünglichen B/A-Empfehlung hatte ich Slice 110 als "Professional-Level Robustness" beschrieben. Nach Code-Review ist der Stand **besser als ich dachte**:

- `WalletProvider` hat schon MAX_RETRIES + exponential backoff + visibility-change-recovery + null-safe `balanceCents`.
- `AuthProvider` hat schon `loading`/`profileLoading`, hat 3-query-Fallback, hat grace-period bei token-refresh, hat safety-timer, hat Sentry-GDPR-Wipe.
- `BuyModal` hat schon `afford = balanceCents !== null && balanceCents >= totalCents` → button ist automatisch disabled bei `balanceCents === null`.

**Was noch fehlt für echte Professional-Robustness:**

1. **Staleness-Awareness**: Provider weiß nicht, ob balance "frisch" (< 30s fetched) oder "sehr alt" ist. Consumers haben keine Handhabe.
2. **Fetch-In-Flight State**: Während eines Refetches sehen Consumers den alten Wert als "valid". Könnte zu Confirm-Race führen (User klickt, Balance war gerade invalidiert, Server-State differs).
3. **Auth-Shape ist anämisch**: `{ user: U|null, loading: bool }` zwingt Consumers dazu, mehrere Booleans zu kombinieren. Ein discriminated-union-Helper macht Intent klarer.

## Ziel

Drei konkrete additive API-Erweiterungen + Consumer-Migration für Buy/Sell-Pfade, damit Trading-Confirm-Clicks nie gegen stale oder in-flight balance feuern. **Keine Performance-Änderung erwartet.** Keine Money-Flow-Änderung.

## Betroffene Files

**Edit:**
- `src/components/providers/WalletProvider.tsx` — neue States (`isFetching`, `lastFetchOk`) + Derived (`isBalanceFresh`) im Context.
- `src/components/providers/AuthProvider.tsx` — `useAuthState()` discriminated-union helper **ODER** neue Export ohne AuthContext-Änderung.
- `src/components/player/detail/BuyModal.tsx` — Button-Guard erweitern um `!wallet.isBalanceFresh`. Loading-Indicator subtil.
- `src/components/player/detail/SellModal.tsx` — analog (Sell nutzt aber `holdings` nicht `balance` — nur bei BuyOrder ist balance relevant). Nur Scope: anstelle NEUE Guard ein bestehender Review ob alles ok.
- `src/features/market/components/shared/BuyOrderModal.tsx` — Button-Guard wie BuyModal.

**Neu:**
- `src/components/providers/__tests__/WalletProvider.test.tsx` — Ergänzungen für neue States (oder neue Test-Datei).
- `src/components/player/detail/__tests__/BuyModal.test.tsx` — Guard-Behaviour testen (wenn Test noch nicht existiert).

**Unangetastet:**
- `TopBar`, `SideNav`, `MarketContent`, `MissionBanner`, `ProfileView`, `TipButton`, `CreateBountyModal`, `useEventActions`, `useTradeActions`, `useOffersState`, `usePlayerTrading`, `PlayerContent`, `page.tsx (home)` — nutzen `useWallet()` für Anzeige, nicht für Confirm-Gate. Keine Änderung nötig.

## Acceptance Criteria

1. `WalletContextValue` erhält 3 neue Felder:
   - `isFetching: boolean` — true während aktivem fetchBalance-Call
   - `lastFetchOk: number | null` — unix ms des letzten erfolgreichen Fetches, null solange nie ok
   - `isBalanceFresh: boolean` — derived: `lastFetchOk !== null && (Date.now() - lastFetchOk) < 30_000` und NICHT `isFetching`
2. Defaultwerte in `createContext`-default matchen: `isFetching: false, lastFetchOk: null, isBalanceFresh: false`.
3. `fetchBalance` setzt `isFetching = true` beim Start, `lastFetchOk = Date.now()` on success, `isFetching = false` on finish.
4. Retry-Path: `lastFetchOk` wird NICHT aktualisiert bei failure — bleibt null oder alt → `isBalanceFresh = false`.
5. Neuer Export `useAuthState()` in `AuthProvider.tsx`:
   ```ts
   export function useAuthState(): 'hydrating' | 'anonymous' | 'authenticated' {
     const { user, loading } = useUser();
     if (loading && !user) return 'hydrating';
     if (!user) return 'anonymous';
     return 'authenticated';
   }
   ```
   Note: User kann "hydrating" mit cached User haben (sessionStorage hydrate done, Supabase check pending) — in diesem Fall soll `'authenticated'` retourniert werden, weil `loading: false` schon nach cache-hydrate.
6. `BuyModal` BuyForm submit-button + BuyOrderModal confirm-button: Additional disabled condition `|| !wallet.isBalanceFresh`. `afford` bleibt.
7. Wenn `isBalanceFresh === false` aber `balanceCents !== null`: subtile "Saldo wird aktualisiert..." Zeile unter der Balance-Anzeige (i18n DE + TR). Kein Modal-Block, nur Info.
8. `SellModal` Review: prüfen ob Confirm relevantes balance nutzt. Falls nicht (Sell nutzt quantity aus holdings), kein Guard nötig — nur in Spec dokumentieren.
9. Vitest-Ergänzungen:
   - WalletProvider: testen dass `isFetching`/`lastFetchOk`/`isBalanceFresh` korrekt transitionieren (mock supabase)
   - BuyModal / BuyOrderModal: button bleibt disabled wenn `isBalanceFresh: false` (mock useWallet)
10. `npx tsc --noEmit` clean.
11. `npx vitest run` — 0 failures (gegenüber Baseline 2835 passing).
12. Post-Deploy smoke: manueller Click-Test in Playwright oder Chrome-DevTools (reload /market als jarvis-qa, BuyModal öffnen, Confirm-Button aktiv).

## Edge Cases

1. **User wechselt Account**: `fetchBalance` fires, aber `prevUserId.current !== user.id` → cached balance wird discarded (`setBalanceCentsRaw(null)`). `isBalanceFresh` → `false` bis neuer Fetch. ✓ korrekt.
2. **MAX_RETRIES erreicht + User öffnet BuyModal**: `lastFetchOk === null`, `isBalanceFresh === false`, button disabled. Tooltip o.ä. zeigt "Bitte Seite neu laden" o.ä. — aber Scope ist button-disable, nicht UI-recovery. Bei visibility-change greift bestehender Retry.
3. **User hat 29s-alte Balance + clickt Buy**: `isBalanceFresh === true`. Click fires. Balance wird in Buy-Mutation optimistic-updated. ✓ kein Problem.
4. **User hat 31s-alte Balance + clickt Buy**: `isBalanceFresh === false`. Button disabled. User muss warten auf Refetch oder Page-Reload. ⚠ UX-Annahme: In Beta okay, post-Beta evtl. auto-refetch bei Modal-Open.
5. **Double-Click innerhalb 500ms**: `isBuying` war schon disabled-guard → doppelt disabled wegen Kombi `isBuying || !isBalanceFresh`. ✓ kein Regress.
6. **Auth state 'hydrating' mit cached user**: AuthProvider setzt `loading: false` sofort nach ssCache-Hydrate (Zeile 219-225). `useAuthState()` returnt `'authenticated'` obwohl Supabase-Session-Check noch läuft. ✓ korrekt, weil user-object im Context ist. Wenn Supabase-Session abgelaufen, feuert onAuthStateChange später + clearUserState → `'anonymous'`.
7. **BuyOrderModal (Limit-Order)**: Confirm-button disabled bei `!isBalanceFresh` — **aber** Limit-Orders reservieren balance in `locked_balance`, nicht `balance`. Confirm fires `create_buy_order` RPC, nicht `buy_player_sc`. Escrow-Pattern prüft server-side. Guard ist trotzdem sinnvoll weil UI-Preview der "Cost" auf `balance` basiert.
8. **Anonymous User navigiert /market**: `useWallet()` returnt defaults `{ balanceCents: null, isFetching: false, lastFetchOk: null, isBalanceFresh: false }`. BuyModal sollte gar nicht öffbar sein für anonymous — wenn doch, button-disabled. ✓ safe.

## Proof-Plan

- `worklog/proofs/110-tsc-clean.txt` — tsc output
- `worklog/proofs/110-vitest.txt` — test run summary
- `worklog/proofs/110-wallet-provider-api.md` — diff der WalletContextValue API + consumer-migration-notes
- `worklog/proofs/110-buymodal-guard.md` — Screenshot oder HTML-snapshot der "Saldo wird aktualisiert..." Zeile + disabled button
- `worklog/proofs/110-post-deploy-smoke.md` — Chrome DevTools click-test auf bescout.net

## Scope-Out (bewusst nicht in 110)

- Auto-Refetch bei Modal-Open wenn `!isBalanceFresh` — Post-Beta Polish, nicht kritisch jetzt.
- Full Auth-State-Machine als XState/Zustand Store — Scope-Creep, Overkill für current Needs.
- WalletProvider zu React Query migrieren — gröbere Refactoring, eigener Slice falls sinnvoll.
- Trading-Race-Condition Fuzzing (Chaos-Testing) — separater Slice.
- CLS-Regression aus Slice 104/107 — nicht 110-Scope.

## Risiken

1. **Consumer-Regression**: 17 Files importieren `useWallet()`. Neue Felder sind OPTIONAL (nicht required) — Default-Werte im createContext decken ab. Keine Breaking Change für existing Consumers.
2. **Over-Disable**: Wenn `isBalanceFresh` zu häufig `false` ist (z.B. bei nervigen Retries), wird Buy-Button zu oft disabled. Mitigation: 30s-Fenster ist generous; visibility-change-recovery existiert bereits.
3. **useAuthState Widerspruch**: Edge case aus #6 — wenn Hydration-Phase "authenticated" meldet obwohl Supabase-Check noch läuft, könnten optimistische Actions in Race laufen. Aber: bestehende loading-Semantik schon so. Slice 110 ändert das NICHT, dokumentiert es nur klarer.

## Kompatibilität mit Slice 109

Slice 109 hat `useHomeDashboard` auf `enabled: !!uid` gegated. Funktioniert weiterhin — `useAuthState === 'authenticated'` impliziert `uid !== undefined`. Keine Abhängigkeit.
